const fs = require('fs');
const path = require('path');

const officialRoot = path.resolve(__dirname, '../../official-account');
const adminRoot = path.resolve(__dirname, '../../admin');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml; charset=utf-8'
};

function serveStaticAsset(url, res, options) {
  let rawPath = url.pathname.replace(options.mountPattern, '') || options.indexFile || 'index.html';
  try {
    rawPath = decodeURIComponent(rawPath);
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return true;
  }

  const relativePath = path.normalize(rawPath);
  const targetPath = path.resolve(options.root, relativePath);
  const relativeToRoot = path.relative(options.root, targetPath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return true;
  }

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return true;
  }

  const ext = path.extname(targetPath);
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream'
  });
  fs.createReadStream(targetPath).pipe(res);
  return true;
}

function serveOfficialAsset(url, res) {
  return serveStaticAsset(url, res, {
    root: officialRoot,
    mountPattern: /^\/official\/?/,
    indexFile: 'index.html'
  });
}

function serveAdminAsset(url, res) {
  return serveStaticAsset(url, res, {
    root: adminRoot,
    mountPattern: /^\/admin\/?/,
    indexFile: 'index.html'
  });
}

module.exports = {
  serveOfficialAsset,
  serveAdminAsset
};
