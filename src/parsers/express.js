const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all'];
const bodyParams = require('./body-params');

function parse(content, filePath) {
  const routes = [];
  const routerPrefixes = extractRouterPrefixes(content);

  routes.push(...parseAppMethods(content, filePath));
  routes.push(...parseRouterMethods(content, filePath, routerPrefixes));

  for (const route of routes) {
    route.bodyParams = extractBodyParamsForRoute(content, route);
  }

  return routes;
}

function extractBodyParamsForRoute(content, route) {
  if (!['post', 'put', 'patch'].includes(route.method)) {
    return [];
  }

  const params = [];
  const lineIndex = findRouteStart(content, route);
  if (lineIndex < 0) return params;

  const handlerBody = bodyParams.extractHandlerBody(content, lineIndex);
  if (handlerBody) {
    params.push(...bodyParams.parseReqBody(handlerBody));
    params.push(...bodyParams.parseValidationMiddleware(handlerBody, content));
  }

  return mergeParams(params);
}

function findRouteStart(content, route) {
  const patterns = [
    new RegExp(
      `\\b(?:app|router)\\s*\\.\\s*${route.method}\\s*\\(\\s*['"\`]${escapeRegExp(route.path)}['"\`]`,
      'i'
    ),
    new RegExp(
      `\\b(?:app|router)\\s*\\.\\s*${route.method}\\s*\\(\\s*['"\`]${escapeRegExp(stripPrefix(route.path))}['"\`]`,
      'i'
    )
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match.index;
    }
  }
  return -1;
}

function stripPrefix(path) {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash > 0) {
    return path.slice(lastSlash) === '/' ? path : '/' + path.split('/').pop();
  }
  return path;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mergeParams(params) {
  const seen = new Map();
  for (const p of params) {
    if (seen.has(p.name)) {
      const existing = seen.get(p.name);
      if (existing.type === 'unknown' && p.type !== 'unknown') {
        seen.set(p.name, p);
      }
    } else {
      seen.set(p.name, p);
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
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
