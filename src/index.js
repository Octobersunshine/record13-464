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
  const seen = new Map();
  for (const route of routes) {
    const key = `${route.method}:${route.path}:${route.file}`;
    if (!seen.has(key)) {
      seen.set(key, route);
    } else {
      const existing = seen.get(key);
      if ((!existing.bodyParams || existing.bodyParams.length === 0) && route.bodyParams && route.bodyParams.length > 0) {
        seen.set(key, route);
      }
    }
  }
  return [...seen.values()].sort((a, b) => {
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
  const paramsPad = 40;

  const header = [
    pad('方法', methodPad),
    pad('路径', pathPad),
    pad('文件', filePad),
    pad('入参', paramsPad)
  ].join(' | ');

  const separator = [
    '-'.repeat(methodPad),
    '-'.repeat(pathPad),
    '-'.repeat(filePad),
    '-'.repeat(paramsPad)
  ].join('-|-');

  const rows = routes.map(r => {
    const paramsStr = formatParamsInline(r.bodyParams);
    return [
      pad(r.method.toUpperCase(), methodPad),
      pad(r.path, pathPad),
      pad(r.file, filePad),
      pad(paramsStr, paramsPad)
    ].join(' | ');
  });

  const hasBodyParams = routes.some(r => r.bodyParams && r.bodyParams.length > 0);
  const detailLines = [];
  if (hasBodyParams) {
    detailLines.push('', '', '=== 详细入参结构 ===');
    for (const r of routes) {
      if (r.bodyParams && r.bodyParams.length > 0) {
        detailLines.push('');
        detailLines.push(`${r.method.toUpperCase()} ${r.path} (${r.file})`);
        detailLines.push(formatParamsDetail(r.bodyParams));
      }
    }
  }

  const countLine = `\n共找到 ${routes.length} 个接口`;

  return [header, separator, ...rows, countLine, ...detailLines].join('\n');
}

function formatParamsInline(params) {
  if (!params || params.length === 0) return '-';
  return params.map(p => {
    const req = p.required ? '*' : '';
    return `${req}${p.name}:${p.type}`;
  }).join(', ');
}

function formatParamsDetail(params) {
  if (!params || params.length === 0) return '  (无参数)';
  const maxName = Math.max(...params.map(p => p.name.length), 4);
  const maxType = Math.max(...params.map(p => p.type.length), 4);
  return params.map(p => {
    const req = p.required ? '(必填)' : '(可选)';
    const src = p.source ? `[${p.source}]` : '';
    return `  ${pad(p.name, maxName)} : ${pad(p.type, maxType)} ${req} ${src}`;
  }).join('\n');
}

function toMarkdown(routes) {
  const lines = [
    '# 接口路由汇总',
    '',
    `共扫描到 **${routes.length}** 个接口`,
    '',
    '| 方法 | 路径 | 文件 | 入参 |',
    '| --- | --- | --- | --- |'
  ];

  for (const r of routes) {
    const paramsStr = formatParamsMarkdown(r.bodyParams);
    lines.push(`| ${r.method.toUpperCase()} | ${r.path} | ${r.file} | ${paramsStr} |`);
  }

  const routesWithParams = routes.filter(r => r.bodyParams && r.bodyParams.length > 0);
  if (routesWithParams.length > 0) {
    lines.push('', '## 接口入参详情', '');
    for (const r of routesWithParams) {
      lines.push(`### ${r.method.toUpperCase()} ${r.path}`, '');
      lines.push(`> 文件: ${r.file}`, '');
      lines.push('| 参数名 | 类型 | 必填 | 来源 |');
      lines.push('| --- | --- | --- | --- |');
      for (const p of r.bodyParams) {
        lines.push(`| ${p.name} | ${p.type} | ${p.required ? '是' : '否'} | ${p.source || '-'} |`);
      }
      lines.push('');
    }
  }

  const grouped = groupByMethod(routes);
  lines.push('## 按请求方法分组', '');
  for (const [method, list] of Object.entries(grouped)) {
    lines.push(`### ${method.toUpperCase()} (${list.length} 个)`, '');
    for (const r of list) {
      const paramsStr = r.bodyParams && r.bodyParams.length > 0
        ? ` (${r.bodyParams.length} 个参数)`
        : '';
      lines.push(`- \`${r.path}\` - ${r.file}${paramsStr}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatParamsMarkdown(params) {
  if (!params || params.length === 0) return '-';
  return params.map(p => {
    const req = p.required ? '**' : '';
    return `${req}${p.name}${req}:${p.type}`;
  }).join('<br>');
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
