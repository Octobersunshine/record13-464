const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all'];

function parse(content, filePath) {
  const routes = [];

  routes.push(...parseKoaRouter(content, filePath));
  routes.push(...parseKoaRouterDecorator(content, filePath));

  return routes;
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
        `\\b${routerVar}\\s*\\.\\s*${method}\\s*\\(\\s*['"\`]?([^'\`\\s,)]+)['"\`]?`,
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
