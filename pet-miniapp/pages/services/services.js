const { request } = require('../../utils/request');
const { serviceDuration } = require('../../utils/format');

Page({
  data: {
    categories: [],
    activeCategory: 'all',
    services: []
  },

  onLoad(options) {
    this.setData({
      activeCategory: options.category || 'all'
    });
    this.loadServices();
  },

  onShow() {
    const category = wx.getStorageSync('selectedServiceCategory');
    if (!category) {
      return;
    }
    wx.removeStorageSync('selectedServiceCategory');
    if (category === this.data.activeCategory && this.data.services.length) {
      return;
    }
    this.setData({ activeCategory: category }, () => this.loadServices());
  },

  async loadServices() {
    wx.showNavigationBarLoading();
    try {
      const data = await request(`/api/services?category=${this.data.activeCategory}`);
      this.setData({
        categories: data.categories,
        services: data.services.map((item) => ({
          ...item,
          durationText: serviceDuration(item.duration)
        }))
      });
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },

  selectCategory(event) {
    const activeCategory = event.currentTarget.dataset.id;
    this.setData({ activeCategory }, () => this.loadServices());
  },

  bookService(event) {
    const id = event.currentTarget.dataset.id;
    wx.setStorageSync('selectedServiceId', id);
    wx.switchTab({ url: '/pages/booking/booking' });
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' });
  }
});
