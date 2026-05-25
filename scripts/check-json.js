const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', 'runtime']);
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
    if (fullPath.endsWith('.json')) {
      files.push(fullPath);
    }
  }
}

walk(root);

for (const file of files) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(root, file)} JSON invalid: ${error.message}`);
  }
}

console.log(`JSON ok (${files.length} files)`);
