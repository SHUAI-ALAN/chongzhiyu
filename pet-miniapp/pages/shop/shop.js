const { request } = require('../../utils/request');

Page({
  data: {
    categories: [],
    activeCategory: 'all',
    products: [],
    cartCount: 0
  },

  onLoad() {
    this.loadProducts();
  },

  onShow() {
    const app = getApp();
    this.setData({ cartCount: app.globalData.cart.length });
  },

  async loadProducts() {
    wx.showNavigationBarLoading();
    try {
      const data = await request(`/api/products?category=${this.data.activeCategory}`);
      this.setData({
        categories: data.categories,
        products: data.products
      });
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },

  selectCategory(event) {
    const activeCategory = event.currentTarget.dataset.id;
    this.setData({ activeCategory }, () => this.loadProducts());
  },

  addToCart(event) {
    const id = event.currentTarget.dataset.id;
    const product = this.data.products.find((item) => item.id === id);
    if (!product) {
      return;
    }
    const app = getApp();
    app.globalData.cart.push(product);
    this.setData({ cartCount: app.globalData.cart.length });
    wx.showToast({ title: '已加入购物袋', icon: 'success' });
  }
});
