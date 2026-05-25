const { request } = require('../../utils/request');

Page({
  data: {
    services: [],
    serviceNames: [],
    serviceIndex: 0,
    selectedService: {},
    petTypes: ['狗狗', '猫咪', '其他'],
    petTypeIndex: 0,
    slots: [],
    times: [],
    selectedDate: '',
    selectedTime: '',
    submitting: false,
    form: {
      petName: '',
      petType: 'dog',
      customerName: '',
      phone: '',
      remark: ''
    }
  },

  onShow() {
    const pendingServiceId = wx.getStorageSync('selectedServiceId');
    if (this.data.services.length && !pendingServiceId) {
      return;
    }
    this.loadServices();
  },

  async loadServices() {
    try {
      const data = await request('/api/services');
      const serviceId = wx.getStorageSync('selectedServiceId');
      const serviceIndex = Math.max(0, data.services.findIndex((item) => item.id === serviceId));
      const selectedService = data.services[serviceIndex] || data.services[0] || {};
      this.setData({
        services: data.services,
        serviceNames: data.services.map((item) => item.name),
        serviceIndex,
        selectedService
      });
      wx.removeStorageSync('selectedServiceId');
      this.loadSlots(selectedService.id);
    } catch (error) {
      wx.showToast({ title: error.message || '服务加载失败', icon: 'none' });
    }
  },

  async loadSlots(serviceId) {
    if (!serviceId) {
      return;
    }
    try {
      const data = await request(`/api/slots?serviceId=${serviceId}`);
      const firstDate = data.slots[0] || {};
      this.setData({
        slots: data.slots,
        selectedDate: firstDate.date || '',
        times: firstDate.times || [],
        selectedTime: ''
      });
    } catch (error) {
      wx.showToast({ title: error.message || '时段加载失败', icon: 'none' });
    }
  },

  handleServiceChange(event) {
    const serviceIndex = Number(event.detail.value);
    const selectedService = this.data.services[serviceIndex];
    this.setData({ serviceIndex, selectedService });
    this.loadSlots(selectedService.id);
  },

  handlePetTypeChange(event) {
    const petTypeIndex = Number(event.detail.value);
    const petType = ['dog', 'cat', 'other'][petTypeIndex];
    this.setData({
      petTypeIndex,
      'form.petType': petType
    });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  selectDate(event) {
    const selectedDate = event.currentTarget.dataset.date;
    const day = this.data.slots.find((item) => item.date === selectedDate);
    this.setData({
      selectedDate,
      times: day ? day.times : [],
      selectedTime: ''
    });
  },

  selectTime(event) {
    const available = event.currentTarget.dataset.available;
    if (available === false || available === 'false') {
      return;
    }
    this.setData({
      selectedTime: event.currentTarget.dataset.time
    });
  },

  validate() {
    const { form, selectedService, selectedDate, selectedTime } = this.data;
    if (!selectedService.id) return '请选择服务项目';
    if (!form.petName) return '请填写宠物昵称';
    if (!form.customerName) return '请填写联系人';
    if (!/^1\d{10}$/.test(form.phone)) return '请填写正确手机号';
    if (!selectedDate) return '请选择预约日期';
    if (!selectedTime) return '请选择预约时段';
    return '';
  },

  async submitBooking() {
    const message = this.validate();
    if (message) {
      wx.showToast({ title: message, icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const payload = {
        ...this.data.form,
        serviceId: this.data.selectedService.id,
        date: this.data.selectedDate,
        time: this.data.selectedTime
      };
      await request('/api/bookings', {
        method: 'POST',
        data: payload
      });
      wx.showModal({
        title: '预约已提交',
        content: '门店会尽快与你确认服务细节。',
        showCancel: false
      });
      this.setData({
        selectedTime: '',
        form: {
          petName: '',
          petType: this.data.form.petType,
          customerName: '',
          phone: '',
          remark: ''
        }
      });
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
