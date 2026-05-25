const form = document.querySelector('#subscribeForm');
const message = document.querySelector('#formMessage');
const button = form.querySelector('button');
const bookingCategory = document.querySelector('#bookingCategory');
const bookingDateTime = document.querySelector('#bookingDateTime');
const boardingStartDateTime = document.querySelector('#boardingStartDateTime');
const boardingEndDateTime = document.querySelector('#boardingEndDateTime');
const authButton = document.querySelector('#authButton');
const authModal = document.querySelector('#authModal');
const authClose = document.querySelector('#authClose');
const authForm = document.querySelector('#authForm');
const authTitle = document.querySelector('#authTitle');
const authSubmit = document.querySelector('#authSubmit');
const authModeToggle = document.querySelector('#authModeToggle');
const authMessage = document.querySelector('#authMessage');
const profileModal = document.querySelector('#profileModal');
const profileClose = document.querySelector('#profileClose');
const profileSummary = document.querySelector('#profileSummary');
const profileBookings = document.querySelector('#profileBookings');
const profileOrders = document.querySelector('#profileOrders');
const profileBookingCount = document.querySelector('#profileBookingCount');
const profileOrderCount = document.querySelector('#profileOrderCount');
const phoneForm = document.querySelector('#phoneForm');
const passwordForm = document.querySelector('#passwordForm');
const showPhoneFormButton = document.querySelector('#showPhoneFormButton');
const showPasswordFormButton = document.querySelector('#showPasswordFormButton');
const logoutButton = document.querySelector('#logoutButton');
const profileMessage = document.querySelector('#profileMessage');

const storeFields = {
  navBrandName: document.querySelector('#navBrandName'),
  heroBrandName: document.querySelector('#heroBrandName'),
  heroSlogan: document.querySelector('#heroSlogan'),
  storeStatus: document.querySelector('#storeStatus'),
  storeHours: document.querySelector('#storeHours'),
  storeAddress: document.querySelector('#storeAddress'),
  storePromoTitle: document.querySelector('#storePromoTitle'),
  storePromoText: document.querySelector('#storePromoText'),
  storePhoneLink: document.querySelector('#storePhoneLink'),
  noticeBand: document.querySelector('#noticeBand'),
  noticeList: document.querySelector('#noticeList')
};

const bookingState = {
  categories: [],
  services: [],
  slots: []
};

let authMode = 'login';
let currentUser = null;

function setText(node, value) {
  if (node && value) {
    node.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function optionHtml(value, label) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
}

function formatMoney(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(date, time) {
  return [date, time].filter(Boolean).join(' ');
}

function renderNotices(notices = []) {
  const activeNotices = notices.filter((notice) => notice.enabled !== false);
  if (!storeFields.noticeBand || !storeFields.noticeList || !activeNotices.length) {
    return;
  }

  storeFields.noticeBand.hidden = false;
  storeFields.noticeList.innerHTML = activeNotices.map((notice) => `
    <span class="notice-item ${notice.level === 'important' ? 'important' : ''}">
      ${escapeHtml(notice.title)}：${escapeHtml(notice.content)}
    </span>
  `).join('');
}

function setCurrentUser(user) {
  if (!user) {
    currentUser = null;
    window.localStorage.removeItem('petHomeUser');
    authButton.textContent = '登录 / 注册';
    updateGuestFields();
    return;
  }
  currentUser = user;
  window.localStorage.setItem('petHomeUser', JSON.stringify(user));
  authButton.textContent = `${user.accountName || user.name} · 个人中心`;
  updateGuestFields();
}

function updateGuestFields() {
  const isGuest = !currentUser;
  document.querySelectorAll('.guest-field').forEach((node) => {
    node.hidden = !isGuest;
  });
  const customerNameInput = form.querySelector('[name="customerName"]');
  const phoneInput = form.querySelector('[name="phone"]');
  if (customerNameInput) {
    customerNameInput.required = isGuest;
    if (!isGuest) customerNameInput.value = '';
  }
  if (phoneInput) {
    phoneInput.required = isGuest;
    if (!isGuest) phoneInput.value = '';
  }
}

function setAuthMode(nextMode) {
  authMode = nextMode;
  const isRegister = authMode === 'register';
  const phoneInput = authForm.querySelector('[name="phone"]');
  authTitle.textContent = isRegister ? '注册' : '登录';
  authSubmit.textContent = isRegister ? '注册' : '登录';
  authModeToggle.textContent = isRegister ? '已有账号？去登录' : '没有账号？去注册';
  authForm.dataset.mode = authMode;
  phoneInput.required = isRegister;
  phoneInput.disabled = !isRegister;
  phoneInput.hidden = !isRegister;
  if (!isRegister) {
    phoneInput.value = '';
  }
  authMessage.textContent = '';
}

function renderProfile(profile) {
  const user = profile.user || currentUser;
  const bookings = profile.bookings || [];
  const orders = profile.orders || [];

  profileSummary.innerHTML = `
    <div>
      <span>用户名</span>
      <strong>${escapeHtml(user.accountName || user.name)}</strong>
    </div>
    <div>
      <span>姓名</span>
      <strong>${escapeHtml(user.name || '-')}</strong>
    </div>
    <div>
      <span>手机号</span>
      <strong>${escapeHtml(user.phone || '-')}</strong>
    </div>
    <div>
      <span>等级</span>
      <strong>${escapeHtml(user.level || user.userTypeLabel || '-')}</strong>
    </div>
    <div>
      <span>余额</span>
      <strong>${formatMoney(user.balance)}</strong>
    </div>
    <div>
      <span>积分</span>
      <strong>${Number(user.points || 0)}</strong>
    </div>
  `;

  profileBookingCount.textContent = `${bookings.length} 条`;
  profileBookings.innerHTML = bookings.length ? bookings.map((booking) => `
    <article class="profile-item">
      <div>
        <strong>${escapeHtml(booking.serviceName || '预约')}</strong>
        <span>${escapeHtml(formatDateTime(booking.date, booking.time))}</span>
      </div>
      <em>${escapeHtml(booking.statusLabel || booking.status || '')}</em>
      ${booking.remark ? `<p>${escapeHtml(booking.remark)}</p>` : ''}
    </article>
  `).join('') : '<p class="empty-text">暂无预约记录</p>';

  profileOrderCount.textContent = `${orders.length} 条`;
  profileOrders.innerHTML = orders.length ? orders.map((order) => `
    <article class="profile-item">
      <div>
        <strong>${escapeHtml(order.title || '消费记录')}</strong>
        <span>${escapeHtml(order.date || order.createdAt || '')}</span>
      </div>
      <em>${formatMoney(order.amount)}</em>
      ${order.remark ? `<p>${escapeHtml(order.remark)}</p>` : ''}
    </article>
  `).join('') : '<p class="empty-text">暂无消费记录</p>';
}

function hideProfileForms() {
  phoneForm.hidden = true;
  passwordForm.hidden = true;
  phoneForm.reset();
  passwordForm.reset();
}

async function loadProfile() {
  if (!currentUser) {
    return;
  }
  profileMessage.textContent = '';
  const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(currentUser.id)}`);
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || '个人信息加载失败');
  }
  setCurrentUser(result.data.user);
  renderProfile(result.data);
}

async function openProfile() {
  if (!currentUser) {
    authModal.hidden = false;
    setAuthMode('login');
    return;
  }
  profileModal.hidden = false;
  hideProfileForms();
  profileSummary.innerHTML = '<p class="empty-text">加载中...</p>';
  profileBookings.innerHTML = '';
  profileOrders.innerHTML = '';
  try {
    await loadProfile();
  } catch (error) {
    profileMessage.textContent = error.message || '个人信息加载失败';
  }
}

function applyStoreConfig(store) {
  setText(storeFields.navBrandName, store.brandName);
  setText(storeFields.heroBrandName, store.brandName);
  setText(storeFields.heroSlogan, store.slogan);
  setText(storeFields.storeStatus, store.status);
  setText(storeFields.storeHours, store.openingHours);
  setText(storeFields.storeAddress, store.address);
  setText(storeFields.storePromoTitle, store.promoTitle);
  setText(storeFields.storePromoText, store.promoText);

  if (storeFields.storePhoneLink && store.phone) {
    storeFields.storePhoneLink.textContent = store.phone;
    storeFields.storePhoneLink.href = `tel:${store.phone}`;
  }

  if (store.brandName) {
    document.title = `${store.brandName} | 宠物洗护寄养会员服务`;
  }

  renderNotices(store.notices || []);
}

async function loadStoreConfig() {
  try {
    const response = await fetch('/api/config');
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '门店信息加载失败');
    }
    applyStoreConfig(result.data.store);
  } catch (error) {
    setText(storeFields.storeAddress, '门店信息暂时无法加载');
  }
}

function getSelectedCategory() {
  return bookingState.categories.find((item) => item.id === bookingCategory.value);
}

function getDefaultService(categoryId) {
  return bookingState.services.find((item) => item.category === categoryId) || bookingState.services[0];
}

function isBoardingSelected() {
  return bookingCategory.value === 'boarding';
}

function flattenSlots(slots) {
  return slots.flatMap((day) => (
    day.times
      .filter((time) => time.available)
      .map((time) => ({
        value: `${day.date}|${time.time}`,
        label: `${day.label} ${day.weekday} ${time.time}`,
        date: day.date,
        time: time.time
      }))
  ));
}

function renderDateTimeOptions(slots) {
  const options = flattenSlots(slots);
  const html = options.length
    ? options.map((item) => optionHtml(item.value, item.label)).join('')
    : '<option value="">暂无可约时段</option>';
  bookingDateTime.innerHTML = html;
  boardingStartDateTime.innerHTML = html;
  boardingEndDateTime.innerHTML = html;
}

function updateBookingMode() {
  const boarding = isBoardingSelected();
  document.querySelectorAll('.boarding-field').forEach((node) => {
    node.hidden = !boarding;
  });
  document.querySelectorAll('.single-time-field').forEach((node) => {
    node.hidden = boarding;
  });
  bookingDateTime.required = !boarding;
  boardingStartDateTime.required = boarding;
  boardingEndDateTime.required = boarding;
}

async function loadBookingSlots() {
  const service = getDefaultService(bookingCategory.value);
  if (!service) {
    renderDateTimeOptions([]);
    return;
  }
  const response = await fetch(`/api/slots?serviceId=${encodeURIComponent(service.id)}`);
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || '时段加载失败');
  }
  bookingState.slots = result.data.slots || [];
  renderDateTimeOptions(bookingState.slots);
  updateBookingMode();
}

async function loadBookingOptions() {
  try {
    const response = await fetch('/api/services');
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '服务加载失败');
    }
    bookingState.categories = (result.data.categories || []).filter((item) => item.id !== 'all');
    bookingState.services = result.data.services || [];
    bookingCategory.innerHTML = bookingState.categories
      .map((item) => optionHtml(item.id, item.name))
      .join('');
    await loadBookingSlots();
  } catch (error) {
    message.textContent = error.message || '预约信息加载失败';
  }
}

function parseDateTime(value) {
  const [date, time] = String(value || '').split('|');
  return { date, time };
}

bookingCategory.addEventListener('change', loadBookingSlots);

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const guestName = String(data.get('customerName') || '').trim();
  const guestPhone = String(data.get('phone') || '').trim();
  if (!currentUser && (!guestName || !/^1\d{10}$/.test(guestPhone))) {
    message.textContent = '请填写姓名和正确联系方式。';
    return;
  }
  const selectedCategory = getSelectedCategory();
  const service = getDefaultService(bookingCategory.value);
  const petWeight = String(data.get('petWeight') || '').trim();
  const baseRemark = String(data.get('remark') || '').trim();
  const boarding = isBoardingSelected();
  const selectedDateTime = parseDateTime(data.get('dateTime'));
  const startDateTime = parseDateTime(data.get('startDateTime'));
  const endDateTime = parseDateTime(data.get('endDateTime'));
  const remarkParts = [
    selectedCategory ? `服务类目：${selectedCategory.name}` : '',
    petWeight ? `宠物体重：${petWeight}kg` : '',
    boarding ? `寄养时间：${startDateTime.date} ${startDateTime.time} 至 ${endDateTime.date} ${endDateTime.time}` : '',
    baseRemark
  ].filter(Boolean);

  button.disabled = true;
  button.textContent = '提交中';
  message.textContent = '';

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serviceId: service.id,
        petName: currentUser ? (currentUser.accountName || currentUser.name) : guestName,
        petType: data.get('petType'),
        customerName: currentUser ? (currentUser.name || currentUser.accountName) : guestName,
        phone: currentUser ? currentUser.phone : guestPhone,
        date: boarding ? startDateTime.date : selectedDateTime.date,
        time: boarding ? startDateTime.time : selectedDateTime.time,
        remark: remarkParts.join('；')
      })
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '预约提交失败');
    }
    message.textContent = result.message || '预约已提交，门店会尽快联系你。';
    form.reset();
    await loadBookingSlots();
  } catch (error) {
    message.textContent = error.message || '预约提交失败，请稍后重试。';
  } finally {
    button.disabled = false;
    button.textContent = '提交预约';
  }
});

authButton.addEventListener('click', () => {
  if (currentUser) {
    openProfile();
    return;
  }
  authModal.hidden = false;
  authMessage.textContent = '';
  setAuthMode('login');
});

authClose.addEventListener('click', () => {
  authModal.hidden = true;
});

authModal.addEventListener('click', (event) => {
  if (event.target === authModal) {
    authModal.hidden = true;
  }
});

profileClose.addEventListener('click', () => {
  profileModal.hidden = true;
});

profileModal.addEventListener('click', (event) => {
  if (event.target === profileModal) {
    profileModal.hidden = true;
  }
});

showPhoneFormButton.addEventListener('click', () => {
  const nextHidden = !phoneForm.hidden ? true : false;
  hideProfileForms();
  phoneForm.hidden = nextHidden;
  profileMessage.textContent = '';
});

showPasswordFormButton.addEventListener('click', () => {
  const nextHidden = !passwordForm.hidden ? true : false;
  hideProfileForms();
  passwordForm.hidden = nextHidden;
  profileMessage.textContent = '';
});

authModeToggle.addEventListener('click', () => {
  authMessage.textContent = '';
  setAuthMode(authMode === 'login' ? 'register' : 'login');
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const phoneInput = authForm.querySelector('[name="phone"]');
  phoneInput.disabled = authMode !== 'register';
  const data = new FormData(authForm);
  const payload = {
    accountName: String(data.get('accountName') || '').trim(),
    password: String(data.get('password') || '')
  };
  if (authMode === 'register') {
    payload.phone = String(data.get('phone') || '').trim();
  }
  const submitButton = authForm.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  authMessage.textContent = '';

  try {
    const response = await fetch(authMode === 'register' ? '/api/register' : '/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '登录注册失败');
    }
    setCurrentUser(result.data.user);
    authMessage.textContent = result.message || '登录成功';
    window.setTimeout(() => {
      authModal.hidden = true;
    }, 600);
  } catch (error) {
    authMessage.textContent = error.message || '登录注册失败';
  } finally {
    submitButton.disabled = false;
  }
});

phoneForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) {
    profileMessage.textContent = '请先登录';
    return;
  }
  const submitButton = phoneForm.querySelector('button');
  const data = new FormData(phoneForm);
  submitButton.disabled = true;
  profileMessage.textContent = '';
  try {
    const response = await fetch('/api/user/phone', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser.id,
        phone: String(data.get('phone') || '').trim()
      })
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '手机号修改失败');
    }
    setCurrentUser(result.data.user);
    profileMessage.textContent = result.message || '手机号已更新';
    hideProfileForms();
    await loadProfile();
  } catch (error) {
    profileMessage.textContent = error.message || '手机号修改失败';
  } finally {
    submitButton.disabled = false;
  }
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) {
    profileMessage.textContent = '请先登录';
    return;
  }
  const submitButton = passwordForm.querySelector('button');
  const data = new FormData(passwordForm);
  const newPassword = String(data.get('newPassword') || '');
  const confirmPassword = String(data.get('confirmPassword') || '');
  if (newPassword !== confirmPassword) {
    profileMessage.textContent = '两次输入的新密码不一致';
    return;
  }
  submitButton.disabled = true;
  profileMessage.textContent = '';
  try {
    const response = await fetch('/api/user/password', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser.id,
        currentPassword: String(data.get('currentPassword') || ''),
        newPassword,
        confirmPassword
      })
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '密码修改失败');
    }
    setCurrentUser(result.data.user);
    profileMessage.textContent = result.message || '密码已更新';
    hideProfileForms();
  } catch (error) {
    profileMessage.textContent = error.message || '密码修改失败';
  } finally {
    submitButton.disabled = false;
  }
});

logoutButton.addEventListener('click', () => {
  setCurrentUser(null);
  profileModal.hidden = true;
});

try {
  setCurrentUser(JSON.parse(window.localStorage.getItem('petHomeUser') || 'null'));
} catch (error) {
  window.localStorage.removeItem('petHomeUser');
}
setAuthMode('login');
loadStoreConfig();
loadBookingOptions();
