const loginPanel = document.querySelector('#accountLoginPanel');
const dashboard = document.querySelector('#accountDashboard');
const loginForm = document.querySelector('#accountLoginForm');
const loginMessage = document.querySelector('#accountLoginMessage');
const accountAuthTitle = document.querySelector('#accountAuthTitle');
const accountAuthCopy = document.querySelector('#accountAuthCopy');
const accountAuthSubmit = document.querySelector('#accountAuthSubmit');
const accountAuthModeToggle = document.querySelector('#accountAuthModeToggle');
const logoutButton = document.querySelector('#logoutButton');
const walletBalance = document.querySelector('#walletBalance');
const walletMeta = document.querySelector('#walletMeta');
const accountNameText = document.querySelector('#accountNameText');
const accountPhoneText = document.querySelector('#accountPhoneText');
const petCountText = document.querySelector('#petCountText');
const groomingNoticeText = document.querySelector('#groomingNoticeText');
const bookingList = document.querySelector('#bookingList');
const bookingMessage = document.querySelector('#bookingMessage');
const bookingPrev = document.querySelector('#bookingPrev');
const bookingNext = document.querySelector('#bookingNext');
const bookingPageInfo = document.querySelector('#bookingPageInfo');
const orderList = document.querySelector('#orderList');
const orderPrev = document.querySelector('#orderPrev');
const orderNext = document.querySelector('#orderNext');
const orderPageInfo = document.querySelector('#orderPageInfo');
const petList = document.querySelector('#petList');
const showPetFormButton = document.querySelector('#showPetFormButton');
const petForm = document.querySelector('#petForm');
const petPhotoLabel = document.querySelector('#petPhotoLabel');
const petFormMessage = document.querySelector('#petFormMessage');
const phoneForm = document.querySelector('#phoneForm');
const passwordForm = document.querySelector('#passwordForm');
const showPhoneFormButton = document.querySelector('#showPhoneFormButton');
const showPasswordFormButton = document.querySelector('#showPasswordFormButton');
const profileMessage = document.querySelector('#profileMessage');
const paymentModal = document.querySelector('#paymentModal');
const paymentClose = document.querySelector('#paymentClose');
const paymentSummary = document.querySelector('#paymentSummary');
const bookingSuccessModal = document.querySelector('#bookingSuccessModal');
const bookingSuccessClose = document.querySelector('#bookingSuccessClose');
const bookingSuccessSummary = document.querySelector('#bookingSuccessSummary');
const bookingSuccessOrders = document.querySelector('#bookingSuccessOrders');
const accountTabs = document.querySelector('#accountTabs');
const accountHeroEn = document.querySelector('.account-hero .eyebrow');
const accountHeroTitle = document.querySelector('.account-hero h1');
const accountHeroIntro = document.querySelector('.account-hero p:last-child');
const accountSummary = document.querySelector('.account-summary');
const accountBookingForm = document.querySelector('#accountBookingForm');
const accountBookingCategory = document.querySelector('#accountBookingCategory');
const accountBookingDateTime = document.querySelector('#accountBookingDateTime');
const accountBoardingStartDateTime = document.querySelector('#accountBoardingStartDateTime');
const accountBoardingEndDateTime = document.querySelector('#accountBoardingEndDateTime');
const appointmentMessage = document.querySelector('#appointmentMessage');
const accountCategoryCards = document.querySelector('#accountCategoryCards');
const accountPetQuickField = document.querySelector('#accountPetQuickField');
const accountPetQuickCards = document.querySelector('#accountPetQuickCards');
const accountPetTypeCards = document.querySelector('#accountPetTypeCards');
const accountPetType = document.querySelector('#accountPetType');
const accountPetSizeCards = document.querySelector('#accountPetSizeCards');
const accountPetSize = document.querySelector('#accountPetSize');
const accountPetWeight = document.querySelector('#accountPetWeight');
const accountPricePreview = document.querySelector('#accountPricePreview');
const accountTimeCards = document.querySelector('#accountTimeCards');
const accountBoardingStartCards = document.querySelector('#accountBoardingStartCards');
const accountBoardingEndCards = document.querySelector('#accountBoardingEndCards');

let currentUser = null;
let currentProfile = { bookings: [], orders: [] };
let selectedPetPhoto = '';
let authMode = 'login';
let activeView = 'booking';
let bookingPage = 1;
const bookingPageSize = 10;
let orderPage = 1;
const orderPageSize = 10;
let appointmentSubmitting = false;
const appointmentState = {
  categories: [],
  services: [],
  petSizeOptions: [],
  servicePriceRules: {
    sizeDeltas: {},
    typeDeltasByCategory: {}
  },
  slots: [],
  selectedPetId: '',
  dateTime: '',
  startDateTime: '',
  endDateTime: ''
};

const viewTitles = {
  booking: { title: '服务预约', en: 'Service Booking' },
  orders: { title: '订单管理', en: 'Orders' },
  pets: { title: '宠物档案', en: 'Pets' },
  profile: { title: '个人中心', en: 'Profile' },
  history: { title: '账单明细', en: 'Billing' }
};

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMoney(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(date, time) {
  return [date, time].filter(Boolean).join(' ');
}

function formatLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function optionHtml(value, label) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
}

function getCurrentPetType() {
  return accountPetType.value || 'dog';
}

function getCurrentPetSize() {
  return accountPetSize.value || '';
}

function inferPetSizeByWeight(petType, weight) {
  const value = Number(weight);
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  if (petType === 'cat') {
    if (value < 4) return 'small';
    if (value < 7) return 'medium';
    return 'large';
  }
  if (petType === 'dog') {
    if (value < 7) return 'small';
    if (value < 18) return 'medium';
    return 'large';
  }
  if (value < 5) return 'small';
  if (value < 15) return 'medium';
  return 'large';
}

function calculateAppointmentPrice(service, petType, petSize) {
  if (!service) {
    return 0;
  }
  const rules = appointmentState.servicePriceRules || {};
  const typeDeltas = (rules.typeDeltasByCategory || {})[service.category] || {};
  const amount = Number(service.price || 0)
    + Number((rules.sizeDeltas || {})[petSize] || 0)
    + Number(typeDeltas[petType] || 0);
  return Math.max(0, Math.round(amount));
}

function categoryStartPrice(categoryId) {
  const categoryServices = appointmentState.services.filter((item) => item.category === categoryId);
  if (!categoryServices.length) {
    return 0;
  }
  const prices = categoryServices.flatMap((service) => ['dog', 'cat', 'other'].map((type) => (
    calculateAppointmentPrice(service, type, 'small')
  )));
  return Math.min(...prices);
}

function sizeRangeText(option, petType = getCurrentPetType()) {
  if (!option) return '';
  return (option.ranges && (option.ranges[petType] || option.ranges.other)) || option.hint || '';
}

function updatePricePreview() {
  const petType = getCurrentPetType();
  const service = getAppointmentService(accountBookingCategory.value, petType);
  const petSize = getCurrentPetSize();
  const price = calculateAppointmentPrice(service, petType, petSize || 'small');
  const size = appointmentState.petSizeOptions.find((item) => item.id === petSize);
  const sizeText = size ? `${size.name} ${sizeRangeText(size, petType)}` : '请选择体型';
  accountPricePreview.querySelector('strong').textContent = formatMoney(price);
  accountPricePreview.querySelector('small').textContent = `${petTypeLabel(petType)} · ${sizeText}，最终以到店确认为准。`;
}

function setPetType(type) {
  const nextType = ['dog', 'cat', 'other'].includes(type) ? type : 'other';
  accountPetType.value = nextType;
  syncChoiceCards(accountPetTypeCards, nextType, 'data-pet-type');
  renderPetSizeCards();
  updatePricePreview();
}

function setPetSize(size) {
  accountPetSize.value = size || '';
  syncChoiceCards(accountPetSizeCards, accountPetSize.value, 'data-pet-size');
  updatePricePreview();
}

function renderPetSizeCards() {
  const petType = getCurrentPetType();
  const selectedSize = getCurrentPetSize();
  accountPetSizeCards.innerHTML = appointmentState.petSizeOptions.map((item) => `
    <button class="${item.id === selectedSize ? 'active' : ''}" type="button" data-pet-size="${escapeHtml(item.id)}">
      <strong>${escapeHtml(item.name)}</strong>
      <small>${escapeHtml(sizeRangeText(item, petType))}</small>
    </button>
  `).join('');
}

function getSelectedAppointmentCategory() {
  return appointmentState.categories.find((item) => item.id === accountBookingCategory.value);
}

function getDefaultAppointmentService(categoryId) {
  return appointmentState.services.find((item) => item.category === categoryId) || appointmentState.services[0];
}

function getAppointmentService(categoryId = accountBookingCategory.value, petType = getCurrentPetType()) {
  const categoryServices = appointmentState.services.filter((item) => item.category === categoryId);
  if (!categoryServices.length) {
    return appointmentState.services[0];
  }
  if (categoryId === 'boarding') {
    const matched = categoryServices.find((item) => {
      const text = `${item.name || ''} ${item.suitable || ''}`;
      if (petType === 'cat') return text.includes('猫');
      if (petType === 'dog') return text.includes('狗') || text.includes('犬');
      return false;
    });
    if (matched) return matched;
  }
  return categoryServices[0];
}

function isAccountBoardingSelected() {
  return accountBookingCategory.value === 'boarding';
}

function parseAppointmentDateTime(value) {
  const [date, time] = String(value || '').split('|');
  return { date, time };
}

function flattenAppointmentSlots(slots) {
  return slots.flatMap((day) => (
    day.times
      .filter((time) => time.available)
      .map((time) => ({
        value: `${day.date}|${time.time}`,
        label: `${day.label} ${day.weekday} ${time.time}`
      }))
  ));
}

function syncChoiceCards(container, value, attribute) {
  container.querySelectorAll(`button[${attribute}]`).forEach((button) => {
    button.classList.toggle('active', button.getAttribute(attribute) === value);
  });
}

function setAuthMode(nextMode) {
  authMode = nextMode === 'register' ? 'register' : 'login';
  const isRegister = authMode === 'register';
  loginForm.dataset.mode = authMode;
  accountAuthTitle.textContent = isRegister ? '注册服务中心账号' : '登录后查看账户';
  accountAuthCopy.textContent = isRegister
    ? '注册时填写用户名、手机号和密码，之后预约会自动带出联系方式。'
    : '登录后可以查看订单、管理宠物档案，也能直接用已有宠物快速预约。';
  accountAuthSubmit.textContent = isRegister ? '注册并登录' : '登录';
  accountAuthModeToggle.textContent = isRegister ? '已有账号？去登录' : '没有账号？去注册';
  loginForm.querySelectorAll('.account-register-only').forEach((node) => {
    node.hidden = !isRegister;
    node.disabled = !isRegister;
    node.required = isRegister;
  });
}

function renderTimeCards(container, select, options, stateKey) {
  const selectedValue = options.some((item) => item.value === appointmentState[stateKey])
    ? appointmentState[stateKey]
    : (options[0] ? options[0].value : '');
  appointmentState[stateKey] = selectedValue;
  select.value = selectedValue;
  container.innerHTML = options.length
    ? options.map((item, index) => `
      <button class="${item.value === selectedValue ? 'active' : ''}" type="button" data-time-value="${escapeHtml(item.value)}">
        <strong>${escapeHtml(item.label.split(' ').slice(-1)[0] || item.label)}</strong>
        <small>${escapeHtml(item.label.replace(/\s+\S+$/, ''))}</small>
      </button>
    `).join('')
    : '<p class="empty-text dark">暂无可约时段</p>';
}

function renderAppointmentSlots(slots) {
  const options = flattenAppointmentSlots(slots);
  const html = options.length
    ? options.map((item) => optionHtml(item.value, item.label)).join('')
    : '<option value="">暂无可约时段</option>';
  accountBookingDateTime.innerHTML = html;
  accountBoardingStartDateTime.innerHTML = html;
  accountBoardingEndDateTime.innerHTML = html;
  renderTimeCards(accountTimeCards, accountBookingDateTime, options, 'dateTime');
  renderTimeCards(accountBoardingStartCards, accountBoardingStartDateTime, options, 'startDateTime');
  renderTimeCards(accountBoardingEndCards, accountBoardingEndDateTime, options, 'endDateTime');
  updatePricePreview();
}

function updateAppointmentMode() {
  const boarding = isAccountBoardingSelected();
  document.querySelectorAll('.account-boarding-field').forEach((node) => {
    node.hidden = !boarding;
  });
  document.querySelectorAll('.account-single-time-field').forEach((node) => {
    node.hidden = boarding;
  });
  accountBookingDateTime.required = !boarding;
  accountBoardingStartDateTime.required = boarding;
  accountBoardingEndDateTime.required = boarding;
  updatePricePreview();
}

async function loadAppointmentSlots() {
  const service = getAppointmentService();
  if (!service) {
    renderAppointmentSlots([]);
    updateAppointmentMode();
    return;
  }
  const response = await fetch(`/api/slots?serviceId=${encodeURIComponent(service.id)}`);
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || '时段加载失败');
  }
  appointmentState.slots = result.data.slots || [];
  renderAppointmentSlots(appointmentState.slots);
  updateAppointmentMode();
}

async function loadAppointmentOptions() {
  try {
    const response = await fetch('/api/services');
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '服务加载失败');
    }
    appointmentState.categories = (result.data.categories || []).filter((item) => item.id !== 'all');
    appointmentState.services = result.data.services || [];
    appointmentState.petSizeOptions = result.data.petSizeOptions || [];
    appointmentState.servicePriceRules = result.data.servicePriceRules || appointmentState.servicePriceRules;
    accountBookingCategory.innerHTML = appointmentState.categories.map((item) => optionHtml(item.id, item.name)).join('');
    accountCategoryCards.innerHTML = appointmentState.categories.map((item, index) => {
      const startPrice = categoryStartPrice(item.id);
      return `
        <button class="${index === 0 ? 'active' : ''}" type="button" data-category-id="${escapeHtml(item.id)}">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${startPrice ? `¥${Number(startPrice || 0).toFixed(0)} 起` : '可预约'}</small>
        </button>
      `;
    }).join('');
    renderPetSizeCards();
    updatePricePreview();
    await loadAppointmentSlots();
  } catch (error) {
    appointmentMessage.textContent = error.message || '预约信息加载失败';
  }
}

function petTypeLabel(type) {
  return {
    dog: '狗狗',
    cat: '猫猫',
    other: '其他'
  }[type] || type || '宠物';
}

function setCurrentUser(user) {
  currentUser = user || null;
  if (!currentUser) {
    window.localStorage.removeItem('petHomeUser');
    loginPanel.hidden = false;
    dashboard.hidden = true;
    logoutButton.hidden = true;
    accountTabs.hidden = true;
    accountSummary.hidden = true;
    return;
  }
  window.localStorage.setItem('petHomeUser', JSON.stringify(currentUser));
  loginPanel.hidden = true;
  dashboard.hidden = false;
  logoutButton.hidden = false;
  accountTabs.hidden = false;
}

function bookingText(booking) {
  if (booking.status === 'pending') return '已预约，等待商家确认';
  if (booking.status === 'confirmed') return '商家已确认，请按预约时间到店';
  if (booking.status === 'completed' && booking.paymentStatus !== 'paid') return '服务已完成，待支付';
  if (booking.status === 'completed' && booking.paymentStatus === 'paid') return '已完成并支付';
  return booking.statusLabel || booking.status || '';
}

function petAvatar(pet) {
  if (pet.photo) {
    return `<img src="${escapeHtml(pet.photo)}" alt="${escapeHtml(pet.name)}">`;
  }
  return `<span>${escapeHtml(String(pet.name || '宠').slice(0, 1))}</span>`;
}

function petProfileComplete(pet) {
  return Boolean(pet && pet.type && (pet.weight || inferPetSizeByWeight(pet.type, pet.weight)));
}

function resetQuickPetSelection() {
  appointmentState.selectedPetId = '';
  accountPetQuickCards.querySelectorAll('button[data-quick-pet-id]').forEach((button) => {
    button.classList.remove('active');
  });
}

function fillAppointmentFromPet(pet) {
  if (!pet) return;
  appointmentState.selectedPetId = pet.id;
  setPetType(pet.type || 'other');
  accountPetWeight.value = pet.weight || '';
  const inferredSize = inferPetSizeByWeight(pet.type, pet.weight);
  setPetSize(inferredSize);
  accountPetQuickCards.querySelectorAll('button[data-quick-pet-id]').forEach((button) => {
    button.classList.toggle('active', button.dataset.quickPetId === pet.id);
  });
  appointmentMessage.textContent = inferredSize
    ? `已带入 ${pet.name} 的档案，可继续选择时间。`
    : `${pet.name} 的体重不完整，请补选体型后再预约。`;
}

function renderQuickPets(pets = []) {
  if (!accountPetQuickField) return;
  accountPetQuickField.hidden = !pets.length;
  if (!pets.length) {
    accountPetQuickCards.innerHTML = '';
    return;
  }
  accountPetQuickCards.innerHTML = pets.map((pet) => {
    const complete = petProfileComplete(pet);
    const detail = [petTypeLabel(pet.type), pet.weight ? `${pet.weight}kg` : '需补体重/体型']
      .filter(Boolean)
      .join(' · ');
    return `
      <button class="${appointmentState.selectedPetId === pet.id ? 'active' : ''}" type="button" data-quick-pet-id="${escapeHtml(pet.id)}">
        <span class="mini-pet-avatar">${petAvatar(pet)}</span>
        <strong>${escapeHtml(pet.name)}</strong>
        <small>${escapeHtml(detail)}</small>
        ${complete ? '<em>快捷预约</em>' : '<em>需补全</em>'}
      </button>
    `;
  }).join('');
}

function renderSummary(user) {
  const pets = user.pets || [];
  const duePets = pets.filter((pet) => pet.groomingDue);
  walletBalance.textContent = formatMoney(user.balance);
  walletMeta.textContent = `${user.level || user.userTypeLabel || '普通用户'} · ${Number(user.points || 0)} 积分`;
  accountNameText.textContent = user.accountName || user.name || '-';
  accountPhoneText.textContent = user.phone || '-';
  petCountText.textContent = `${pets.length} 位`;
  groomingNoticeText.textContent = duePets.length
    ? `${duePets.map((pet) => pet.name).join('、')} 建议预约洗护`
    : '洗护状态良好';
}

function renderBookings(bookings = []) {
  const total = bookings.length;
  const totalPages = Math.max(1, Math.ceil(total / bookingPageSize));
  bookingPage = Math.min(bookingPage, totalPages);
  const start = (bookingPage - 1) * bookingPageSize;
  const pageBookings = bookings.slice(start, start + bookingPageSize);
  if (!pageBookings.length) {
    bookingList.innerHTML = '<p class="empty-text dark">暂无订单</p>';
  } else {
    bookingList.innerHTML = pageBookings.map((booking) => `
      <article class="account-item ${booking.canPay ? 'payable' : ''}">
        <div>
          <strong>${escapeHtml(booking.serviceName || '预约服务')}</strong>
          <span>预约时间：${escapeHtml(formatDateTime(booking.date, booking.time))}</span>
          <span>提交时间：${escapeHtml(formatLocalDateTime(booking.createdAt))}</span>
          ${booking.completedAt ? `<span>完成时间：${escapeHtml(formatLocalDateTime(booking.completedAt))}</span>` : ''}
          <p>${escapeHtml(bookingText(booking))}</p>
        </div>
        <div>
          <em>${formatMoney(booking.amount)}</em>
          <small>${escapeHtml(booking.paymentStatusLabel || '')}</small>
          ${booking.canPay ? `
            <button type="button" data-pay-booking-id="${escapeHtml(booking.id)}">
              ${currentUser.userType === 'member' ? '余额支付' : '扫码支付'}
            </button>
          ` : ''}
        </div>
      </article>
    `).join('');
  }
  bookingPageInfo.textContent = `第 ${bookingPage} / ${totalPages} 页，共 ${total} 条`;
  bookingPrev.disabled = bookingPage <= 1;
  bookingNext.disabled = bookingPage >= totalPages;
}

function renderPets(pets = []) {
  if (!pets.length) {
    petList.innerHTML = '<p class="empty-text dark">暂无宠物档案</p>';
    return;
  }
  petList.innerHTML = pets.map((pet) => `
    <article class="pet-card ${pet.groomingDue ? 'due' : ''}">
      <div class="pet-avatar">${petAvatar(pet)}</div>
      <div>
        <strong>${escapeHtml(pet.name)}</strong>
        <span>${escapeHtml([petTypeLabel(pet.type), pet.breed, pet.age, pet.weight ? `${pet.weight}kg` : ''].filter(Boolean).join(' · '))}</span>
        <p>${pet.lastGroomedAt ? `上次洗护：${escapeHtml(pet.lastGroomedAt)}${pet.groomingDays !== null ? `，距今 ${pet.groomingDays} 天` : ''}` : '还未记录洗护时间'}</p>
        ${pet.groomingTip ? `<em>${escapeHtml(pet.groomingTip)}</em>` : ''}
      </div>
      <div class="pet-card-actions">
        <button type="button" data-book-pet-id="${escapeHtml(pet.id)}">预约洗护</button>
        <button type="button" data-delete-pet-id="${escapeHtml(pet.id)}">删除</button>
      </div>
    </article>
  `).join('');
}

function renderOrders(orders = []) {
  const total = orders.length;
  const totalPages = Math.max(1, Math.ceil(total / orderPageSize));
  orderPage = Math.min(orderPage, totalPages);
  const start = (orderPage - 1) * orderPageSize;
  const pageOrders = orders.slice(start, start + orderPageSize);
  if (!pageOrders.length) {
    orderList.innerHTML = '<p class="empty-text dark">暂无账单明细</p>';
  } else {
    orderList.innerHTML = pageOrders.map((order) => `
      <article class="account-item">
        <div>
          <strong>${escapeHtml(order.title || '账单明细')}</strong>
          <span>提交时间：${escapeHtml(formatLocalDateTime(order.bookingCreatedAt || order.createdAt))}</span>
          ${order.bookingDate || order.bookingTime ? `<span>预约时间：${escapeHtml(formatDateTime(order.bookingDate, order.bookingTime))}</span>` : ''}
          ${order.bookingCompletedAt ? `<span>完成时间：${escapeHtml(formatLocalDateTime(order.bookingCompletedAt))}</span>` : ''}
          ${order.remark ? `<p>${escapeHtml(order.remark)}</p>` : ''}
        </div>
        <div>
          <em>${formatMoney(order.amount)}</em>
          <small>${escapeHtml(order.status || '')}</small>
        </div>
      </article>
    `).join('');
  }
  orderPageInfo.textContent = `第 ${orderPage} / ${totalPages} 页，共 ${total} 条`;
  orderPrev.disabled = orderPage <= 1;
  orderNext.disabled = orderPage >= totalPages;
}

function renderProfile(profile) {
  currentProfile = profile;
  setCurrentUser(profile.user);
  renderSummary(profile.user);
  renderBookings(profile.bookings || []);
  renderPets(profile.user.pets || []);
  renderQuickPets(profile.user.pets || []);
  renderOrders(profile.orders || []);
  setActiveView(activeView);
}

function setActiveView(view) {
  activeView = view;
  const title = viewTitles[activeView] || viewTitles.booking;
  accountHeroEn.textContent = title.en;
  accountHeroTitle.textContent = title.title;
  if (accountHeroIntro) {
    accountHeroIntro.hidden = true;
  }
  accountSummary.hidden = !['profile', 'pets'].includes(activeView);
  document.querySelectorAll('[data-summary-view]').forEach((node) => {
    node.hidden = node.dataset.summaryView !== activeView;
  });
  document.querySelectorAll('.account-view').forEach((node) => {
    node.hidden = node.dataset.accountView !== activeView;
  });
  accountTabs.querySelectorAll('button[data-tab-target]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tabTarget === activeView);
  });
}

async function loadProfile() {
  if (!currentUser) return;
  const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(currentUser.id)}`);
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || '账户信息加载失败');
  }
  renderProfile(result.data);
}

accountAuthModeToggle.addEventListener('click', () => {
  loginMessage.textContent = '';
  setAuthMode(authMode === 'login' ? 'register' : 'login');
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector('button');
  const data = new FormData(loginForm);
  appointmentSubmitting = true;
  submitButton.disabled = true;
  loginMessage.textContent = '';
  const payload = {
    accountName: String(data.get('accountName') || '').trim(),
    password: String(data.get('password') || '')
  };
  if (authMode === 'register') {
    payload.phone = String(data.get('phone') || '').trim();
  }
  try {
    const response = await fetch(authMode === 'register' ? '/api/register' : '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '登录注册失败');
    }
    setCurrentUser(result.data.user);
    await loadProfile();
  } catch (error) {
    loginMessage.textContent = error.message || '登录注册失败';
  } finally {
    appointmentSubmitting = false;
    submitButton.disabled = false;
  }
});

logoutButton.addEventListener('click', () => {
  setCurrentUser(null);
});

accountTabs.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-tab-target]');
  if (!button) return;
  setActiveView(button.dataset.tabTarget);
});

accountBookingCategory.addEventListener('change', loadAppointmentSlots);

accountCategoryCards.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-category-id]');
  if (!button) return;
  accountBookingCategory.value = button.dataset.categoryId;
  syncChoiceCards(accountCategoryCards, button.dataset.categoryId, 'data-category-id');
  updatePricePreview();
  await loadAppointmentSlots();
});

accountPetTypeCards.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-pet-type]');
  if (!button) return;
  resetQuickPetSelection();
  setPetType(button.dataset.petType);
});

accountPetSizeCards.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-pet-size]');
  if (!button) return;
  setPetSize(button.dataset.petSize);
});

accountPetWeight.addEventListener('input', () => {
  const inferredSize = inferPetSizeByWeight(getCurrentPetType(), accountPetWeight.value);
  if (inferredSize) {
    setPetSize(inferredSize);
  } else {
    updatePricePreview();
  }
});

accountPetQuickCards.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-quick-pet-id]');
  if (!button) return;
  const pet = (currentProfile.user?.pets || []).find((item) => item.id === button.dataset.quickPetId);
  fillAppointmentFromPet(pet);
});

[accountTimeCards, accountBoardingStartCards, accountBoardingEndCards].forEach((container) => {
  container.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-time-value]');
    if (!button) return;
    const stateKey = container === accountTimeCards
      ? 'dateTime'
      : container === accountBoardingStartCards
        ? 'startDateTime'
        : 'endDateTime';
    const select = container === accountTimeCards
      ? accountBookingDateTime
      : container === accountBoardingStartCards
        ? accountBoardingStartDateTime
        : accountBoardingEndDateTime;
    appointmentState[stateKey] = button.dataset.timeValue;
    select.value = button.dataset.timeValue;
    syncChoiceCards(container, button.dataset.timeValue, 'data-time-value');
  });
});

accountBookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (appointmentSubmitting) return;
  if (!currentUser) {
    appointmentMessage.textContent = '请先登录后预约';
    return;
  }
  const submitButton = accountBookingForm.querySelector('button[type="submit"]');
  const data = new FormData(accountBookingForm);
  const selectedCategory = getSelectedAppointmentCategory();
  const selectedPet = (currentProfile.user?.pets || []).find((item) => item.id === appointmentState.selectedPetId);
  const petType = String(data.get('petType') || getCurrentPetType()).trim();
  const service = getAppointmentService(accountBookingCategory.value, petType);
  const petSize = String(data.get('petSize') || getCurrentPetSize()).trim();
  const petWeight = String(data.get('petWeight') || '').trim();
  const sizeOption = appointmentState.petSizeOptions.find((item) => item.id === petSize);
  const price = calculateAppointmentPrice(service, petType, petSize || 'small');
  const baseRemark = String(data.get('remark') || '').trim();
  const boarding = isAccountBoardingSelected();
  const selectedDateTime = parseAppointmentDateTime(appointmentState.dateTime);
  const startDateTime = parseAppointmentDateTime(appointmentState.startDateTime);
  const endDateTime = parseAppointmentDateTime(appointmentState.endDateTime);
  const remarkParts = [
    selectedCategory ? `服务类目：${selectedCategory.name}` : '',
    selectedPet ? `宠物名字：${selectedPet.name}` : '宠物名字：未选择档案',
    sizeOption ? `宠物体型：${sizeOption.name}（${sizeRangeText(sizeOption, petType)}）` : '',
    petWeight ? `宠物体重：${petWeight}kg` : '',
    `预估价格：${formatMoney(price)}`,
    boarding ? `寄养时间：${startDateTime.date} ${startDateTime.time} 至 ${endDateTime.date} ${endDateTime.time}` : '',
    baseRemark
  ].filter(Boolean);

  if (!service) {
    appointmentMessage.textContent = '请选择服务类目';
    return;
  }
  if (!petSize) {
    appointmentMessage.textContent = '请先选择宠物体型。小/中/大会影响预估价格。';
    return;
  }
  if (!selectedDateTime.date && !boarding) {
    appointmentMessage.textContent = '请选择预约时间';
    return;
  }
  if (boarding && (!startDateTime.date || !endDateTime.date)) {
    appointmentMessage.textContent = '请选择寄养开始和结束时间';
    return;
  }

  submitButton.disabled = true;
  appointmentSubmitting = true;
  appointmentMessage.textContent = '';
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: service.id,
        petName: selectedPet ? selectedPet.name : (currentUser.accountName || currentUser.name),
        petType,
        petSize,
        petWeight,
        customerName: currentUser.name || currentUser.accountName,
        phone: currentUser.phone,
        date: boarding ? startDateTime.date : selectedDateTime.date,
        time: boarding ? startDateTime.time : selectedDateTime.time,
        remark: remarkParts.join('；')
      })
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '预约提交失败');
    }
    appointmentMessage.textContent = result.message || '预约已提交，商家会尽快确认';
    bookingSuccessSummary.textContent = `${service.name || '预约服务'}，${selectedPet ? `${selectedPet.name}，` : ''}预估 ${formatMoney(result.data.booking.amount || price)}，预约时间：${formatDateTime(boarding ? startDateTime.date : selectedDateTime.date, boarding ? startDateTime.time : selectedDateTime.time)}。商家会尽快确认。`;
    bookingSuccessModal.hidden = false;
    accountBookingForm.reset();
    resetQuickPetSelection();
    setPetType('dog');
    setPetSize('');
    await loadAppointmentSlots();
    bookingPage = 1;
    await loadProfile();
  } catch (error) {
    appointmentMessage.textContent = error.message || '预约提交失败，请稍后重试';
  } finally {
    appointmentSubmitting = false;
    submitButton.disabled = false;
  }
});

bookingPrev.addEventListener('click', () => {
  if (bookingPage > 1) {
    bookingPage -= 1;
    renderBookings(currentProfile.bookings || []);
  }
});

bookingNext.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil((currentProfile.bookings || []).length / bookingPageSize));
  if (bookingPage < totalPages) {
    bookingPage += 1;
    renderBookings(currentProfile.bookings || []);
  }
});

orderPrev.addEventListener('click', () => {
  if (orderPage > 1) {
    orderPage -= 1;
    renderOrders(currentProfile.orders || []);
  }
});

orderNext.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil((currentProfile.orders || []).length / orderPageSize));
  if (orderPage < totalPages) {
    orderPage += 1;
    renderOrders(currentProfile.orders || []);
  }
});

bookingList.addEventListener('click', async (event) => {
  const payButton = event.target.closest('button[data-pay-booking-id]');
  if (!payButton) return;
  const booking = currentProfile.bookings.find((item) => item.id === payButton.dataset.payBookingId);
  if (!booking) return;
  bookingMessage.textContent = '';
  if (currentUser.userType !== 'member') {
    paymentSummary.textContent = `${booking.serviceName || '预约服务'}，应付 ${formatMoney(booking.amount)}。`;
    paymentModal.hidden = false;
    return;
  }
  payButton.disabled = true;
  try {
    const response = await fetch(`/api/user/bookings/${encodeURIComponent(booking.id)}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '支付失败');
    }
    bookingMessage.textContent = result.message || '支付成功';
    setCurrentUser(result.data.user);
    await loadProfile();
  } catch (error) {
    bookingMessage.textContent = error.message || '支付失败，请稍后重试';
  } finally {
    payButton.disabled = false;
  }
});

paymentClose.addEventListener('click', () => {
  paymentModal.hidden = true;
});

paymentModal.addEventListener('click', (event) => {
  if (event.target === paymentModal) paymentModal.hidden = true;
});

bookingSuccessClose.addEventListener('click', () => {
  bookingSuccessModal.hidden = true;
});

bookingSuccessModal.addEventListener('click', (event) => {
  if (event.target === bookingSuccessModal) bookingSuccessModal.hidden = true;
});

bookingSuccessOrders.addEventListener('click', () => {
  bookingSuccessModal.hidden = true;
  setActiveView('orders');
});

showPetFormButton.addEventListener('click', () => {
  petForm.hidden = !petForm.hidden ? true : false;
  petFormMessage.textContent = '';
});

petForm.photo.addEventListener('change', () => {
  const file = petForm.photo.files && petForm.photo.files[0];
  selectedPetPhoto = '';
  petPhotoLabel.textContent = file ? file.name : '选择照片';
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    petFormMessage.textContent = '请选择图片文件';
    petForm.photo.value = '';
    petPhotoLabel.textContent = '选择照片';
    return;
  }
  if (file.size > 520000) {
    petFormMessage.textContent = '图片过大，请选择 500KB 以内的图片';
    petForm.photo.value = '';
    petPhotoLabel.textContent = '选择照片';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    selectedPetPhoto = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});

petForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) {
    petFormMessage.textContent = '请先登录';
    return;
  }
  const submitButton = petForm.querySelector('button[type="submit"]');
  const data = new FormData(petForm);
  submitButton.disabled = true;
  petFormMessage.textContent = '';
  try {
    const response = await fetch('/api/user/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        name: String(data.get('name') || '').trim(),
        type: String(data.get('type') || '').trim(),
        breed: String(data.get('breed') || '').trim(),
        age: String(data.get('age') || '').trim(),
        weight: String(data.get('weight') || '').trim(),
        lastGroomedAt: String(data.get('lastGroomedAt') || '').trim(),
        photo: selectedPetPhoto
      })
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '宠物档案保存失败');
    }
    setCurrentUser(result.data.user);
    petForm.reset();
    selectedPetPhoto = '';
    petPhotoLabel.textContent = '选择照片';
    petForm.hidden = true;
    await loadProfile();
  } catch (error) {
    petFormMessage.textContent = error.message || '宠物档案保存失败';
  } finally {
    submitButton.disabled = false;
  }
});

petList.addEventListener('click', async (event) => {
  const bookButton = event.target.closest('button[data-book-pet-id]');
  if (bookButton && currentUser) {
    const pet = (currentProfile.user?.pets || []).find((item) => item.id === bookButton.dataset.bookPetId);
    const groomingCategory = appointmentState.categories.find((item) => item.id === 'grooming');
    if (groomingCategory) {
      accountBookingCategory.value = groomingCategory.id;
      syncChoiceCards(accountCategoryCards, groomingCategory.id, 'data-category-id');
      await loadAppointmentSlots();
    }
    fillAppointmentFromPet(pet);
    setActiveView('booking');
    return;
  }

  const deleteButton = event.target.closest('button[data-delete-pet-id]');
  if (!deleteButton || !currentUser) return;
  deleteButton.disabled = true;
  try {
    const response = await fetch(`/api/user/pets/${encodeURIComponent(deleteButton.dataset.deletePetId)}?userId=${encodeURIComponent(currentUser.id)}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || '宠物档案删除失败');
    }
    setCurrentUser(result.data.user);
    await loadProfile();
  } catch (error) {
    petFormMessage.textContent = error.message || '宠物档案删除失败';
  } finally {
    deleteButton.disabled = false;
  }
});

function hideProfileForms() {
  phoneForm.hidden = true;
  passwordForm.hidden = true;
  phoneForm.reset();
  passwordForm.reset();
}

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

phoneForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const submitButton = phoneForm.querySelector('button');
  const data = new FormData(phoneForm);
  submitButton.disabled = true;
  profileMessage.textContent = '';
  try {
    const response = await fetch('/api/user/phone', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
  if (!currentUser) return;
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
      headers: { 'Content-Type': 'application/json' },
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

try {
  setCurrentUser(JSON.parse(window.localStorage.getItem('petHomeUser') || 'null'));
} catch (error) {
  window.localStorage.removeItem('petHomeUser');
  setCurrentUser(null);
}

setAuthMode('login');
setActiveView(activeView);
loadAppointmentOptions();

if (currentUser) {
  loadProfile().catch((error) => {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    loginMessage.textContent = error.message || '账户信息加载失败';
  });
}
