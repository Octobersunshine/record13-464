const STATUS = {
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  DEVELOPMENT: 'development'
};

const STATUS_LABEL = {
  active: '上线中',
  deprecated: '废弃',
  development: '开发中'
};

const DEPRECATED_PATTERNS = [
  /@deprecated/i,
  /\b废弃\b/,
  /\bdeprecated\b/i,
  /@Deprecated/,
  /\/\/\s*废弃/,
  /\/\*\s*废弃/,
  /\/\/\s*deprecated/i,
  /\/\*\s*deprecated/i
];

const DEVELOPMENT_PATTERNS = [
  /@beta/i,
  /@experimental/i,
  /@dev/i,
  /@development/i,
  /\b开发中\b/,
  /\b待上线\b/,
  /\bTODO\b/,
  /\bWIP\b/i,
  /\bbeta\b/i,
  /\bexperimental\b/i,
  /\/\/\s*开发中/,
  /\/\*\s*开发中/,
  /\/\/\s*TODO/,
  /\/\/\s*WIP/i,
  /@Beta/,
  /@Experimental/,
  /@Dev/
];

const ACTIVE_PATTERNS = [
  /@active/i,
  /@production/i,
  /\b上线中\b/,
  /\b生产\b/,
  /\bactive\b/i,
  /\bproduction\b/i,
  /\/\/\s*上线中/,
  /\/\*\s*上线中/,
  /\/\/\s*生产/,
  /\/\*\s*生产/
];

function extractPrecedingComments(content, position) {
  const beforeContent = content.slice(0, position);
  const lines = beforeContent.split('\n');
  const currentLineIdx = lines.length - 1;

  const comments = [];
  const commentLines = [];

  for (let i = currentLineIdx; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '') continue;

    if (line.startsWith('//')) {
      commentLines.unshift(line);
      continue;
    }

    if (line.startsWith('*') || line.startsWith('/*')) {
      commentLines.unshift(line);
      if (line.startsWith('/*')) break;
      continue;
    }

    if (line.endsWith('*/')) {
      commentLines.unshift(line);
      let j = i - 1;
      while (j >= 0) {
        const prevLine = lines[j].trim();
        commentLines.unshift(prevLine);
        if (prevLine.startsWith('/*')) break;
        j--;
      }
      break;
    }

    break;
  }

  return commentLines.join('\n');
}

function detectStatus(content, position) {
  const comments = extractPrecedingComments(content, position);
  if (!comments) return STATUS.ACTIVE;

  for (const pattern of DEPRECATED_PATTERNS) {
    if (pattern.test(comments)) return STATUS.DEPRECATED;
  }

  for (const pattern of DEVELOPMENT_PATTERNS) {
    if (pattern.test(comments)) return STATUS.DEVELOPMENT;
  }

  for (const pattern of ACTIVE_PATTERNS) {
    if (pattern.test(comments)) return STATUS.ACTIVE;
  }

  return STATUS.ACTIVE;
}

function getStatusLabel(status) {
  return STATUS_LABEL[status] || status;
}

module.exports = {
  STATUS,
  STATUS_LABEL,
  detectStatus,
  getStatusLabel
};
