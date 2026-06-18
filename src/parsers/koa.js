const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all'];
const bodyParams = require('./body-params');

function parse(content, filePath) {
  const routes = [];

  routes.push(...parseKoaRouter(content, filePath));
  routes.push(...parseKoaRouterDecorator(content, filePath));

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
      `\\brouter\\s*\\.\\s*${route.method === 'delete' ? 'del' : route.method}\\s*\\(\\s*['"\`]${escapeRegExp(stripPrefix(route.path))}['"\`]`,
      'i'
    ),
    new RegExp(
      `@${route.method.charAt(0).toUpperCase() + route.method.slice(1)}\\s*\\(\\s*['"\`]${escapeRegExp(route.path)}['"\`]`,
      'i'
    ),
    new RegExp(
      `@${route.method.charAt(0).toUpperCase() + route.method.slice(1)}\\s*\\(`,
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

function parseKoaRouter(content, filePath) {
  const routes = [];
  const prefix = extractKoaPrefix(content);

  const patterns = [
    /\brouter\s*\.\s*(get|post|put|delete|patch|head|options|all|del)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\brouter\s*\.\s*(get|post|put|delete|patch|head|options|all|del)\s*\(\s*`([^`]+)`/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let method = match[1].toLowerCase();
      if (method === 'del') method = 'delete';
      routes.push({
        method,
        path: joinPath(prefix, match[2]),
        file: filePath,
        line: getLineNumber(content, match.index)
      });
    }
  }

  const varRouterPattern = /(?:const|let|var)\s+(\w+)\s*=\s*new\s+Router\s*\(\s*\{[^}]*\}\s*\)/g;
  let match;
  while ((match = varRouterPattern.exec(content)) !== null) {
    const routerVar = match[1];
    const routeBlock = content.slice(match.index);

    for (const method of HTTP_METHODS) {
      const methodPattern = new RegExp(
        `\\b${routerVar}\\s*\\.\\s*${method === 'delete' ? 'del' : method}\\s*\\(\\s*['"\`]?([^'\`\\s,)]+)['"\`]?`,
        'g'
      );
      let m;
      while ((m = methodPattern.exec(routeBlock)) !== null) {
        routes.push({
          method: method === 'del' ? 'delete' : method,
          path: joinPath(prefix, m[1]),
          file: filePath,
          line: getLineNumber(content, match.index + m.index)
        });
      }
    }
  }

  return routes;
}

function parseKoaRouterDecorator(content, filePath) {
  const routes = [];

  const decoratorPatterns = [
    /@(Get|Post|Put|Delete|Patch|Head|Options|All)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /@(Get|Post|Put|Delete|Patch|Head|Options|All)\s*\(\s*`([^`]+)`\s*\)/g,
    /@(Get|Post|Put|Delete|Patch|Head|Options|All)\s*\(\s*\)/g
  ];

  for (const pattern of decoratorPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const path = match[2] || '/';
      routes.push({
        method,
        path,
        file: filePath,
        line: getLineNumber(content, match.index)
      });
    }
  }

  return routes;
}

function extractKoaPrefix(content) {
  const prefixPattern = /prefix\s*:\s*['"`]([^'"`]+)['"`]/;
  const match = content.match(prefixPattern);
  return match ? match[1] : '';
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
