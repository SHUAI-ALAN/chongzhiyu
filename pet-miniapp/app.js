App({
  globalData: {
    store: null,
    cart: []
  },

  onLaunch() {
    wx.setStorageSync('petHomeBootedAt', Date.now());
  }
});
