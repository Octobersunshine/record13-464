function extractHandlerBody(content, matchIndex) {
  const rest = content.slice(matchIndex);

  let arrowMatch = rest.match(/=>\s*\{/);
  let functionMatch = rest.match(/function\s*(?:\w+)?\s*\([^)]*\)\s*\{/);

  let braceIndex = -1;

  if (arrowMatch && functionMatch) {
    braceIndex = matchIndex + Math.min(arrowMatch.index + arrowMatch[0].length - 1,
                                       functionMatch.index + functionMatch[0].length - 1);
  } else if (arrowMatch) {
    braceIndex = matchIndex + arrowMatch.index + arrowMatch[0].length - 1;
  } else if (functionMatch) {
    braceIndex = matchIndex + functionMatch.index + functionMatch[0].length - 1;
  }

  if (braceIndex < 0) {
    arrowMatch = rest.match(/=>\s*\(/);
    if (arrowMatch) {
      const parenStart = matchIndex + arrowMatch.index + arrowMatch[0].length - 1;
      const result = extractParenthesized(content, parenStart);
      if (result) return result;
    }
    return null;
  }

  return extractBlock(content, braceIndex);
}

function extractParenthesized(content, openParenIndex) {
  let depth = 0;
  let inString = null;
  let inTemplate = false;

  for (let i = openParenIndex; i < content.length; i++) {
    const ch = content[i];
    const prev = content[i - 1];

    if (inString) {
      if (ch === inString && prev !== '\\') inString = null;
      continue;
    } else if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
    } else if (ch === '`') {
      inTemplate = true;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return content.slice(openParenIndex, i + 1);
      }
    }
  }
  return null;
}

function extractBlock(content, braceIndex) {
  let depth = 0;
  let start = -1;
  let inString = null;
  let inTemplate = false;

  for (let i = braceIndex; i < content.length; i++) {
    const ch = content[i];
    const prev = content[i - 1];

    if (inString) {
      if (ch === inString && prev !== '\\') inString = null;
      continue;
    } else if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
    } else if (ch === '`') {
      inTemplate = true;
    } else if (ch === '{') {
      depth++;
      if (depth === 1) start = i;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return content.slice(start, i + 1);
      }
    }
  }
  return null;
}

function parseReqBody(handlerBody) {
  if (!handlerBody) return [];

  const fields = new Set();
  const destructuringPatterns = [
    /\bconst\s*\{\s*([^}]+)\s*\}\s*=\s*(?:req|request|ctx\.request|ctx)\.body/g,
    /\blet\s*\{\s*([^}]+)\s*\}\s*=\s*(?:req|request|ctx\.request|ctx)\.body/g
  ];
  const directPatterns = [
    /\breq\.body\.(\w+)/g,
    /\brequest\.body\.(\w+)/g,
    /\bctx\.request\.body\.(\w+)/g,
    /\bctx\.body\.(\w+)/g,
    /\breq\.body\[['"`](\w+)['"`\]]/g,
    /\brequest\.body\[['"`](\w+)['"`\]]/g,
    /\bctx\.request\.body\[['"`](\w+)['"`\]]/g,
    /\bctx\.body\[['"`](\w+)['"`\]]/g
  ];

  for (const pattern of destructuringPatterns) {
    let match;
    while ((match = pattern.exec(handlerBody)) !== null) {
      const fieldStr = match[1];
      if (fieldStr) {
        fieldStr.split(',').forEach(f => {
          const name = f.trim().split(':')[0].split('=')[0].trim();
          if (name) fields.add(name);
        });
      }
    }
  }

  for (const pattern of directPatterns) {
    let match;
    while ((match = pattern.exec(handlerBody)) !== null) {
      fields.add(match[1]);
    }
  }

  return [...fields].map(name => ({ name, type: 'unknown', source: 'req.body' }));
}

function parseJoiSchema(content, schemaName) {
  const fields = [];
  const patterns = [
    new RegExp(
      `(?:const|let|var)\\s+${schemaName}\\s*=\\s*Joi\\.object\\s*\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\)`,
      'i'
    )
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      fields.push(...parseJoiFields(match[1]));
    }
  }

  return fields;
}

function parseJoiFields(objContent) {
  const fields = [];
  const fieldPattern = /(\w+)\s*:\s*Joi\.(\w+)(?:\(\))?/g;
  let match;
  while ((match = fieldPattern.exec(objContent)) !== null) {
    const fieldContext = objContent.slice(match.index, match.index + 200);
    fields.push({
      name: match[1],
      type: mapJoiType(match[2]),
      source: 'joi',
      required: /\.required\(\)/.test(fieldContext)
    });
  }
  return fields;
}

function mapJoiType(joiType) {
  const typeMap = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    array: 'array',
    object: 'object',
    date: 'date',
    bool: 'boolean',
    any: 'any'
  };
  return typeMap[joiType.toLowerCase()] || joiType;
}

function parseZodSchema(content, schemaName) {
  const fields = [];
  const patterns = [
    new RegExp(
      `(?:const|let|var)\\s+${schemaName}\\s*=\\s*z\\.object\\s*\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\)`,
      'i'
    )
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      fields.push(...parseZodFields(match[1]));
    }
  }

  return fields;
}

function parseZodFields(objContent) {
  const fields = [];
  const fieldPattern = /(\w+)\s*:\s*z\.(\w+)(?:\(\))?/g;
  let match;
  while ((match = fieldPattern.exec(objContent)) !== null) {
    const fieldContext = objContent.slice(match.index, match.index + 200);
    fields.push({
      name: match[1],
      type: mapZodType(match[2]),
      source: 'zod',
      required: !/\.optional\(\)/.test(fieldContext)
    });
  }
  return fields;
}

function mapZodType(zodType) {
  const typeMap = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    array: 'array',
    object: 'object',
    any: 'any',
    undefined: 'undefined',
    null: 'null',
    date: 'date'
  };
  return typeMap[zodType.toLowerCase()] || zodType;
}

function parseTsInterface(content, interfaceName) {
  const fields = [];
  const patterns = [
    new RegExp(
      `(?:interface|type)\\s+${interfaceName}\\s*(?:extends\\s*\\w+)?\\s*\\{([\\s\\S]*?)\\}`,
      'i'
    )
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      fields.push(...parseTsFields(match[1]));
    }
  }

  return fields;
}

function parseTsFields(objContent) {
  const fields = [];
  const fieldPattern = /(\w+)(\?)?\s*:\s*([\w<>\[\],\s]+?)(?:;|,|\n|$)/g;
  let match;
  while ((match = fieldPattern.exec(objContent)) !== null) {
    const type = match[3].trim();
    if (type && type !== 'undefined') {
      fields.push({
        name: match[1],
        type,
        source: 'typescript',
        required: match[2] !== '?'
      });
    }
  }
  return fields;
}

function parseValidationMiddleware(handlerBody, content) {
  if (!handlerBody) return [];

  const schemaNames = new Set();

  const validatePatterns = [
    /(?:\w+Schema|\w+Dto|\w+Body)\s*\.\s*(?:validate|parse|assert)\s*\(\s*(?:req|request|ctx\.request|ctx)\.body/gi,
    /(?:validate|check|schema)\s*\(\s*(\w+)/gi,
    /Joi\.assert\s*\(\s*(?:req|request|ctx\.request|ctx)\.body\s*,\s*(\w+)/gi,
    /:\s*(\w+(?:Request|Dto|Body|Schema))\s*=\s*(?:req|request|ctx\.request|ctx)\.body/gi,
    /<\s*(\w+(?:Request|Dto|Body|Schema))\s*>\s*\(\s*(?:req|request|ctx\.request|ctx)\.body/gi
  ];

  for (const pattern of validatePatterns) {
    let match;
    while ((match = pattern.exec(handlerBody)) !== null) {
      if (match[1]) {
        schemaNames.add(match[1]);
      } else {
        const fullMatch = match[0];
        const nameMatch = fullMatch.match(/^(\w+Schema|\w+Dto|\w+Body)/i);
        if (nameMatch) {
          schemaNames.add(nameMatch[1]);
        }
      }
    }
  }

  let fields = [];
  for (const name of schemaNames) {
    fields.push(...parseJoiSchema(content, name));
    fields.push(...parseZodSchema(content, name));
    fields.push(...parseTsInterface(content, name));
  }

  return fields;
}

module.exports = {
  extractHandlerBody,
  parseReqBody,
  parseJoiSchema,
  parseZodSchema,
  parseTsInterface,
  parseValidationMiddleware
};
