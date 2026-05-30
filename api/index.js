const runtime = require('../server/src/data/runtime');
const {
  isNeonStateEnabled,
  loadRuntimeState,
  saveRuntimeState
} = require('../server/src/data/neon-state');
const { route } = require('../server/src/routes');

function shouldSaveRuntimeState(req) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  try {
    if (isNeonStateEnabled()) {
      const state = await loadRuntimeState();
      if (state) {
        runtime.resetRuntimeState(state);
      }
    }
    await route(req, res, url);
    if (isNeonStateEnabled() && shouldSaveRuntimeState(req)) {
      await saveRuntimeState(runtime.dumpRuntimeState());
    }
  } catch (error) {
    res.writeHead(500, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ code: 500, message: error.message || '服务器错误' }));
  }
};
