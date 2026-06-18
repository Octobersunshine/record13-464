const fs = require('fs');
const path = require('path');
const expressParser = require('./parsers/express');
const koaParser = require('./parsers/koa');

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all'];

function findJsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsFiles(fullPath, files);
    } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanRoutes(targetDir) {
  const absoluteDir = path.resolve(targetDir);
  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`目录不存在: ${absoluteDir}`);
  }

  const jsFiles = findJsFiles(absoluteDir);
  const allRoutes = [];

  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(absoluteDir, file);

    const expressRoutes = expressParser.parse(content, relativePath);
    const koaRoutes = koaParser.parse(content, relativePath);

    allRoutes.push(...expressRoutes, ...koaRoutes);
  }

  return normalizeRoutes(allRoutes);
}

function normalizeRoutes(routes) {
  const seen = new Set();
  return routes
    .filter(route => {
      const key = `${route.method}:${route.path}:${route.file}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.path !== b.path) return a.path.localeCompare(b.path);
      return a.method.localeCompare(b.method);
    });
}

function formatOutput(routes, format = 'table') {
  if (format === 'json') {
    return JSON.stringify(routes, null, 2);
  }

  if (format === 'markdown') {
    return toMarkdown(routes);
  }

  return toTable(routes);
}

function toTable(routes) {
  const methodPad = 8;
  const pathPad = Math.max(40, ...routes.map(r => r.path.length));
  const filePad = Math.max(20, ...routes.map(r => r.file.length));

  const header = [
    pad('方法', methodPad),
    pad('路径', pathPad),
    pad('文件', filePad)
  ].join(' | ');

  const separator = [
    '-'.repeat(methodPad),
    '-'.repeat(pathPad),
    '-'.repeat(filePad)
  ].join('-|-');

  const rows = routes.map(r => [
    pad(r.method.toUpperCase(), methodPad),
    pad(r.path, pathPad),
    pad(r.file, filePad)
  ].join(' | '));

  const countLine = `\n共找到 ${routes.length} 个接口`;

  return [header, separator, ...rows, countLine].join('\n');
}

function toMarkdown(routes) {
  const lines = [
    '# 接口路由汇总',
    '',
    `共扫描到 **${routes.length}** 个接口`,
    '',
    '| 方法 | 路径 | 文件 |',
    '| --- | --- | --- |'
  ];

  for (const r of routes) {
    lines.push(`| ${r.method.toUpperCase()} | ${r.path} | ${r.file} |`);
  }

  const grouped = groupByMethod(routes);
  lines.push('', '## 按请求方法分组', '');
  for (const [method, list] of Object.entries(grouped)) {
    lines.push(`### ${method.toUpperCase()} (${list.length} 个)`, '');
    for (const r of list) {
      lines.push(`- \`${r.path}\` - ${r.file}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function groupByMethod(routes) {
  const groups = {};
  for (const r of routes) {
    if (!groups[r.method]) groups[r.method] = [];
    groups[r.method].push(r);
  }
  return groups;
}

function pad(str, len) {
  if (str.length >= len) return str.slice(0, len);
  return str + ' '.repeat(len - str.length);
}

module.exports = {
  scanRoutes,
  formatOutput,
  HTTP_METHODS
};
