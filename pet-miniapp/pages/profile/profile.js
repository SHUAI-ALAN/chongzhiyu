const { request } = require('../../utils/request');

Page({
  data: {
    member: {},
    orders: [],
    coupons: [],
    store: {}
  },

  onLoad() {
    this.loadProfile();
  },

  async loadProfile() {
    wx.showNavigationBarLoading();
    try {
      const [memberData, orderData, couponData, configData] = await Promise.all([
        request('/api/member'),
        request('/api/orders'),
        request('/api/coupons'),
        request('/api/config')
      ]);
      const member = {
        ...memberData.member,
        pets: (memberData.member.pets || []).map((item) => ({
          ...item,
          initial: item.name ? item.name.slice(0, 1) : ''
        }))
      };
      this.setData({
        member,
        orders: orderData.orders,
        coupons: couponData.coupons,
        store: configData.store
      });
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },

  callStore() {
    const phone = this.data.store.phone || '021-6688-8899';
    wx.makePhoneCall({ phoneNumber: phone });
  }
});
