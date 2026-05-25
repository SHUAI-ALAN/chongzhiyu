const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules']);
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (ignoredDirs.has(name)) {
      continue;
    }
    const fullPath = path.join(dir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
}

walk(root);

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(`JS syntax ok (${files.length} files)`);
