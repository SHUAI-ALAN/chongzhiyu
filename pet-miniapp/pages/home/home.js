const { request } = require('../../utils/request');
const { serviceDuration } = require('../../utils/format');

Page({
  data: {
    store: {},
    activeNotices: [],
    quickActions: [],
    featuredServices: [],
    products: []
  },

  onLoad() {
    this.loadHome();
  },

  async loadHome() {
    wx.showNavigationBarLoading();
    try {
      const [configData, serviceData, productData] = await Promise.all([
        request('/api/config'),
        request('/api/services'),
        request('/api/products')
      ]);
      const featuredServices = serviceData.services
        .filter((item) => item.featured)
        .map((item) => ({
          ...item,
          durationText: serviceDuration(item.duration)
        }));

      this.setData({
        store: configData.store,
        activeNotices: (configData.store.notices || [])
          .filter((item) => item.enabled !== false),
        quickActions: (configData.store.quickActions || []).map((item) => ({
          ...item,
          initial: item.label ? item.label.slice(0, 1) : ''
        })),
        featuredServices,
        products: productData.products.slice(0, 4)
      });
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },

  handleQuickAction(event) {
    const path = event.currentTarget.dataset.path;
    const id = event.currentTarget.dataset.id;

    if (id === 'boarding') {
      wx.setStorageSync('selectedServiceCategory', 'boarding');
      wx.switchTab({ url: '/pages/services/services' });
      return;
    }

    if (path && path.includes('/booking')) {
      wx.switchTab({ url: '/pages/booking/booking' });
      return;
    }

    if (path && path.includes('/shop')) {
      wx.switchTab({ url: '/pages/shop/shop' });
      return;
    }

    if (path && path.includes('/profile')) {
      wx.switchTab({ url: '/pages/profile/profile' });
      return;
    }

    if (path && path.includes('/services')) {
      wx.switchTab({ url: '/pages/services/services' });
    }
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' });
  },

  goBookingWithService(event) {
    const id = event.currentTarget.dataset.id;
    wx.setStorageSync('selectedServiceId', id);
    wx.switchTab({ url: '/pages/booking/booking' });
  },

  goServices() {
    wx.switchTab({ url: '/pages/services/services' });
  },

  goShop() {
    wx.switchTab({ url: '/pages/shop/shop' });
  }
});
