const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const miniappRoot = path.join(root, 'pet-miniapp');
const appJsonPath = path.join(miniappRoot, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const pages = appJson.pages || [];
const tabPages = new Set((appJson.tabBar && appJson.tabBar.list || []).map((item) => item.pagePath));
const errors = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(miniappRoot, relativePath));
}

for (const page of pages) {
  for (const ext of ['.js', '.json', '.wxml', '.wxss']) {
    if (!exists(`${page}${ext}`)) {
      errors.push(`Missing page file: ${page}${ext}`);
    }
  }
}

for (const page of tabPages) {
  if (!pages.includes(page)) {
    errors.push(`tabBar page is not declared in pages: ${page}`);
  }
}

function walk(dir, matcher, output = []) {
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, matcher, output);
      continue;
    }
    if (matcher(fullPath)) {
      output.push(fullPath);
    }
  }
  return output;
}

for (const file of walk(miniappRoot, (filePath) => filePath.endsWith('.wxml'))) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/\{\{[^}]*\.[a-zA-Z_$][\w$]*\(/g) || [];
  for (const match of matches) {
    errors.push(`Avoid function calls in WXML: ${path.relative(root, file)} ${match}`);
  }
}

for (const file of walk(miniappRoot, (filePath) => filePath.endsWith('.js'))) {
  const content = fs.readFileSync(file, 'utf8');
  const navigateMatches = content.matchAll(/wx\.navigateTo\(\s*\{\s*url:\s*['"]([^'"]+)['"]/g);
  for (const match of navigateMatches) {
    const target = match[1].replace(/^\//, '').split('?')[0];
    if (tabPages.has(target)) {
      errors.push(`Use wx.switchTab for tabBar page: ${path.relative(root, file)} -> ${match[1]}`);
    }
  }
  if (content.includes('localhost:8787')) {
    warnings.push(`Local API URL in ${path.relative(root, file)} is fine for dev; replace before production.`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

console.log(`Miniapp structure ok (${pages.length} pages)`);
