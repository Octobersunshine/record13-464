const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all'];

function parse(content, filePath) {
  const routes = [];
  const routerPrefixes = extractRouterPrefixes(content);

  routes.push(...parseAppMethods(content, filePath));
  routes.push(...parseRouterMethods(content, filePath, routerPrefixes));
  routes.push(...parseUseMiddleware(content, filePath, routerPrefixes));

  return routes;
}

function parseAppMethods(content, filePath) {
  const routes = [];
  const methodPatterns = [
    /\bapp\s*\.\s*(get|post|put|delete|patch|head|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\bapp\s*\.\s*(get|post|put|delete|patch|head|options|all)\s*\(\s*`([^`]+)`/g,
    /\brouter\s*\.\s*(get|post|put|delete|patch|head|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\brouter\s*\.\s*(get|post|put|delete|patch|head|options|all)\s*\(\s*`([^`]+)`/g
  ];

  for (const pattern of methodPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      routes.push({
        method: match[1].toLowerCase(),
        path: match[2],
        file: filePath,
        line: getLineNumber(content, match.index)
      });
    }
  }

  return routes;
}

function parseRouterMethods(content, filePath, routerPrefixes) {
  const routes = [];
  const varRouterPattern = /(?:const|let|var)\s+(\w+)\s*=\s*express\s*\.\s*Router\s*\(\s*(?:\{[^}]*\})?\s*\)/g;

  let match;
  while ((match = varRouterPattern.exec(content)) !== null) {
    const routerVar = match[1];
    const prefix = routerPrefixes[routerVar] || '';

    for (const method of HTTP_METHODS) {
      const methodPattern = new RegExp(
        `\\b${routerVar}\\s*\\.\\s*${method}\\s*\\(\\s*['"\`]?([^'\`\\s,)]+)['"\`]?`,
        'g'
      );
      let m;
      while ((m = methodPattern.exec(content)) !== null) {
        routes.push({
          method,
          path: joinPath(prefix, m[1]),
          file: filePath,
          line: getLineNumber(content, m.index)
        });
      }
    }
  }

  return routes;
}

function parseUseMiddleware(content, filePath, routerPrefixes) {
  const routes = [];

  const usePatterns = [
    /\bapp\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
    /\brouter\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g
  ];

  for (const pattern of usePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const prefix = match[1];
      const routerVar = match[2];
      if (routerPrefixes[routerVar]) {
        routerPrefixes[routerVar] = joinPath(prefix, routerPrefixes[routerVar]);
      } else {
        routerPrefixes[routerVar] = prefix;
      }
    }
  }

  return routes;
}

function extractRouterPrefixes(content) {
  const prefixes = {};
  const usePatterns = [
    /\bapp\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
    /\brouter\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g
  ];

  for (const pattern of usePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const prefix = match[1];
      const routerVar = match[2];
      if (!prefixes[routerVar]) {
        prefixes[routerVar] = prefix;
      } else {
        prefixes[routerVar] = joinPath(prefix, prefixes[routerVar]);
      }
    }
  }

  return prefixes;
}

function joinPath(prefix, path) {
  if (!prefix) return path;
  if (!path) return prefix;
  const p1 = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const p2 = path.startsWith('/') ? path : '/' + path;
  return p1 + p2;
}

function getLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

module.exports = { parse };
