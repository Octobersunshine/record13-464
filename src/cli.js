#!/usr/bin/env node

const path = require('path');
const { scanRoutes, formatOutput } = require('./index');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    targetDir: process.cwd(),
    format: 'table',
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--format' || arg === '-f') {
      options.format = args[++i] || 'table';
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.targetDir = arg;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Node.js 接口路由扫描工具

用法:
  route-scan [目录] [选项]

选项:
  -f, --format <格式>    输出格式: table (默认), json, markdown
  -o, --output <文件>    输出到指定文件
  -h, --help             显示帮助信息

示例:
  route-scan ./src
  route-scan ./my-project -f markdown
  route-scan -f json -o routes.json
`);
}

function main() {
  const options = parseArgs();
  const targetDir = path.resolve(options.targetDir);

  console.log(`扫描目录: ${targetDir}\n`);

  try {
    const routes = scanRoutes(targetDir);
    const output = formatOutput(routes, options.format);

    if (options.output) {
      const fs = require('fs');
      fs.writeFileSync(options.output, output, 'utf-8');
      console.log(`结果已保存到: ${path.resolve(options.output)}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error('扫描失败:', error.message);
    process.exit(1);
  }
}

main();
