const { route } = require('../server/src/routes');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  try {
    await route(req, res, url);
  } catch (error) {
    res.writeHead(500, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ code: 500, message: error.message || '服务器错误' }));
  }
};
