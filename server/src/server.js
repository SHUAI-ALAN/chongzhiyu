const http = require('http');
const { route } = require('./routes');

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  route(req, res, url).catch((error) => {
    res.writeHead(500, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ code: 500, message: error.message || '服务器错误' }));
  });
});

server.listen(port, host, () => {
  try {
    console.log(`宠之寓 API server running at http://${host}:${port}`);
  } catch (error) {
    // Some detached Windows shells do not keep stdout available.
  }
});
