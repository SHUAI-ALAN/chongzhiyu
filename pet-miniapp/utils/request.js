const BASE_URL = 'http://localhost:8787';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: options.timeout || 10000,
      header: {
        'Content-Type': 'application/json',
        ...(options.header || {})
      },
      success(response) {
        const payload = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300 && payload.code === 0) {
          resolve(payload.data);
          return;
        }
        reject(new Error(payload.message || '请求失败'));
      },
      fail(error) {
        const message = error.errMsg && error.errMsg.includes('request:fail')
          ? '无法连接后端，请确认本地 API 已启动'
          : error.errMsg || '网络请求失败';
        reject(new Error(message));
      }
    });
  });
}

module.exports = {
  BASE_URL,
  request
};
