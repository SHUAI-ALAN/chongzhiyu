const metricsNode = document.querySelector('#metrics');
const bookingListNode = document.querySelector('#bookingList');
const bookingPrev = document.querySelector('#bookingPrev');
const bookingNext = document.querySelector('#bookingNext');
const bookingPageInfo = document.querySelector('#bookingPageInfo');
const userListNode = document.querySelector('#userList');
const userOrderPanel = document.querySelector('#userOrderPanel');
const userOrderTitle = document.querySelector('#userOrderTitle');
const userOrderListNode = document.querySelector('#userOrderList');
const userOrderPrev = document.querySelector('#userOrderPrev');
const userOrderNext = document.querySelector('#userOrderNext');
const userOrderPageInfo = document.querySelector('#userOrderPageInfo');
const memberListNode = document.querySelector('#memberList');
const memberBalanceLogListNode = document.querySelector('#memberBalanceLogList');
const memberOrderListNode = document.querySelector('#memberOrderList');
const memberOrderPrev = document.querySelector('#memberOrderPrev');
const memberOrderNext = document.querySelector('#memberOrderNext');
const memberOrderPageInfo = document.querySelector('#memberOrderPageInfo');
const noticeListNode = document.querySelector('#noticeList');
const subscriberListNode = document.querySelector('#subscriberList');
const storeForm = document.querySelector('#storeForm');
const storeBrandName = document.querySelector('#storeBrandName');
const storeStatusInput = document.querySelector('#storeStatusInput');
const storePhoneInput = document.querySelector('#storePhoneInput');
const storeHoursInput = document.querySelector('#storeHoursInput');
const storeAddressInput = document.querySelector('#storeAddressInput');
const storeSloganInput = document.querySelector('#storeSloganInput');
const storePromoTitleInput = document.querySelector('#storePromoTitleInput');
const storePromoTextInput = document.querySelector('#storePromoTextInput');
const storeBookingTipTitleInput = document.querySelector('#storeBookingTipTitleInput');
const storeBookingTipTextInput = document.querySelector('#storeBookingTipTextInput');
const noticeForm = document.querySelector('#noticeForm');
const memberForm = document.querySelector('#memberForm');
const memberAccountName = document.querySelector('#memberAccountName');
const memberName = document.querySelector('#memberName');
const memberPhone = document.querySelector('#memberPhone');
const memberLevel = document.querySelector('#memberLevel');
const memberBalance = document.querySelector('#memberBalance');
const memberPoints = document.querySelector('#memberPoints');
const memberRemark = document.querySelector('#memberRemark');
const memberOrderForm = document.querySelector('#memberOrderForm');
const memberOrderMember = document.querySelector('#memberOrderMember');
const memberOrderTitle = document.querySelector('#memberOrderTitle');
const memberOrderAmount = document.querySelector('#memberOrderAmount');
const memberOrderDate = document.querySelector('#memberOrderDate');
const memberOrderStatus = document.querySelector('#memberOrderStatus');
const memberOrderRemark = document.querySelector('#memberOrderRemark');
const noticeTitle = document.querySelector('#noticeTitle');
const noticeLevel = document.querySelector('#noticeLevel');
const noticeContent = document.querySelector('#noticeContent');
const noticeEnabled = document.querySelector('#noticeEnabled');
const statusFilter = document.querySelector('#statusFilter');
const dateFilter = document.querySelector('#dateFilter');
const userTypeFilter = document.querySelector('#userTypeFilter');
const userKeywordFilter = document.querySelector('#userKeywordFilter');
const refreshButton = document.querySelector('#refreshButton');
const storeMeta = document.querySelector('#storeMeta');
const toast = document.querySelector('#toast');
const loginScreen = document.querySelector('#loginScreen');
const adminLoginForm = document.querySelector('#adminLoginForm');
const adminUsername = document.querySelector('#adminUsername');
const adminPassword = document.querySelector('#adminPassword');
const loginMessage = document.querySelector('#loginMessage');
const adminName = document.querySelector('#adminName');
const adminLogoutButton = document.querySelector('#adminLogoutButton');
const changeAdminPasswordButton = document.querySelector('#changeAdminPasswordButton');
const adminPasswordModal = document.querySelector('#adminPasswordModal');
const adminPasswordForm = document.querySelector('#adminPasswordForm');
const adminPasswordClose = document.querySelector('#adminPasswordClose');
const adminPasswordMessage = document.querySelector('#adminPasswordMessage');
const adminPageTitle = document.querySelector('#adminPageTitle');
const managementCenterButton = document.querySelector('#managementCenterButton');
const managementCenterClose = document.querySelector('#managementCenterClose');
const managementMenu = document.querySelector('#managementMenu');

const statusActions = [
  { status: 'confirmed', label: '确认', primary: true },
  { status: 'completed', label: '完成' },
  { status: 'canceled', label: '取消' }
];

function canChangeBookingStatus(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return false;
  if (['completed', 'canceled'].includes(currentStatus)) return false;
  if (nextStatus === 'confirmed') return currentStatus === 'pending';
  if (nextStatus === 'completed') return currentStatus === 'confirmed';
  if (nextStatus === 'canceled') return ['pending', 'confirmed'].includes(currentStatus);
  return false;
}

const userOrderState = {
  phone: '',
  name: '',
  page: 1,
  totalPages: 1
};

const memberOrderState = {
  page: 1,
  totalPages: 1
};

const bookingState = {
  page: 1,
  totalPages: 1
};

let activeAdminView = 'overview';
const adminViewTitles = {
  overview: { title: '运营概览' },
  store: { title: '门店信息' },
  bookings: { title: '订单管理' },
  users: { title: '用户管理' },
  notices: { title: '门店公告' },
  subscribers: { title: '订阅线索' }
};
const validAdminViews = new Set(Object.keys(adminViewTitles));

const adminAuth = {
  token: window.localStorage.getItem('petAdminToken') || '',
  admin: null
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(adminAuth.token ? { Authorization: `Bearer ${adminAuth.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    if (response.status === 401) {
      setAdminSession(null);
    }
    throw new Error(payload.message || '请求失败');
  }
  return payload.data;
}

function setAdminSession(data) {
  if (!data) {
    adminAuth.token = '';
    adminAuth.admin = null;
    window.localStorage.removeItem('petAdminToken');
    loginScreen.hidden = false;
    adminName.textContent = '';
    return;
  }
  adminAuth.token = data.token || adminAuth.token;
  adminAuth.admin = data.admin;
  if (data.token) {
    window.localStorage.setItem('petAdminToken', data.token);
  }
  loginScreen.hidden = true;
  adminName.textContent = `管理员：${data.admin.username}`;
}

async function checkAdminSession() {
  if (!adminAuth.token) {
    setAdminSession(null);
    return false;
  }
  try {
    const data = await api('/api/admin/session');
    setAdminSession({ admin: data.admin });
    return true;
  } catch (error) {
    setAdminSession(null);
    return false;
  }
}

function renderMetrics(summary) {
  const items = [
    ['总订单', summary.totalBookings],
    ['待确认', summary.pending],
    ['已确认', summary.confirmed],
    ['今日订单', summary.todayBookings],
    ['未来待服务', summary.upcoming],
    ['会员数', summary.members],
    ['会员余额', `¥${Number(summary.memberBalance || 0).toFixed(2)}`],
    ['公众号线索', summary.subscribers]
  ];
  metricsNode.innerHTML = items.map(([label, value]) => (
    `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`
  )).join('');
}

function setAdminView(view) {
  if (!validAdminViews.has(view)) {
    view = 'overview';
  }
  activeAdminView = view;
  const title = adminViewTitles[activeAdminView];
  adminPageTitle.textContent = title.title;
  document.querySelectorAll('.admin-view').forEach((node) => {
    node.hidden = node.dataset.adminView !== activeAdminView;
  });
  document.querySelectorAll('[data-admin-tab]').forEach((node) => {
    node.classList.toggle('active', node.dataset.adminTab === activeAdminView);
  });
  if (window.location.hash !== `#${activeAdminView}`) {
    window.history.replaceState(null, '', `#${activeAdminView}`);
  }
}

function renderStoreForm(store) {
  storeBrandName.value = store.brandName || '';
  storeStatusInput.value = store.status || '';
  storePhoneInput.value = store.phone || '';
  storeHoursInput.value = store.openingHours || '';
  storeAddressInput.value = store.address || '';
  storeSloganInput.value = store.slogan || '';
  storePromoTitleInput.value = store.promoTitle || '';
  storePromoTextInput.value = store.promoText || '';
  storeBookingTipTitleInput.value = store.bookingTipTitle || '';
  storeBookingTipTextInput.value = store.bookingTipText || '';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function formatSignedMoney(value) {
  const amount = Number(value || 0);
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}¥${amount.toFixed(2)}`;
}

function closeManagementMenu() {
  managementMenu.hidden = true;
}

function userFilterLabel(filterValue) {
  return {
    all: '全部用户',
    normal: '普通用户',
    basic: '初级会员',
    middle: '中级会员',
    senior: '高级会员'
  }[filterValue] || '用户';
}

function filterMembersByUserType(members, filterValue) {
  if (!filterValue || filterValue === 'all') {
    return members;
  }
  return members.filter((member) => member.level === filterValue);
}

function getVisibleBookingPetName(booking) {
  const petName = String(booking.petName || '').trim();
  const customerName = String(booking.customerName || '').trim();
  if (!petName || petName === customerName) {
    return '';
  }
  return petName;
}

function getVisibleBookingRemark(booking) {
  return String(booking.remark || '')
    .split('；')
    .map((part) => part.trim())
    .filter((part) => part && part !== '宠物名字：未选择档案')
    .join('；');
}

function renderBookings(bookings) {
  if (!bookings.length) {
    bookingListNode.innerHTML = '<div class="empty">暂无订单记录</div>';
    return;
  }

  bookingListNode.innerHTML = `
    <div class="admin-order-list">
      ${bookings.map((booking) => {
        const visiblePetName = getVisibleBookingPetName(booking);
        const visibleRemark = getVisibleBookingRemark(booking);
        const petLine = visiblePetName
          ? [visiblePetName, booking.petType].filter(Boolean).join(' · ')
          : '';
        const dateLines = [
          `预约 ${booking.date} ${booking.time}`,
          `提交 ${formatLocalDateTime(booking.createdAt)}`,
          booking.completedAt ? `完成 ${formatLocalDateTime(booking.completedAt)}` : ''
        ].filter(Boolean);
        return `
          <article class="admin-order-card">
            <div class="admin-order-main">
              <div class="admin-order-title">
                <strong>${escapeHtml(booking.serviceName || '订单项目')}</strong>
                <span class="status ${escapeHtml(booking.status)}">${escapeHtml(booking.statusLabel)}</span>
              </div>
              ${visibleRemark ? `<p class="admin-order-note">${escapeHtml(visibleRemark)}</p>` : ''}
              <div class="admin-order-person">
                <span>${escapeHtml(booking.customerName)}</span>
                <small>${escapeHtml(booking.phone)}</small>
                <em class="user-badge ${escapeHtml(booking.userType)}">
                  ${escapeHtml(booking.userTypeLabel)}${booking.memberLevelLabel ? ` · ${escapeHtml(booking.memberLevelLabel)}` : ''}
                </em>
                ${petLine ? `<small class="admin-order-pet">宠物：${escapeHtml(petLine)}</small>` : ''}
              </div>
            </div>
            <div class="admin-order-side">
              <strong>¥${Number(booking.amount || 0).toFixed(2)}</strong>
              <small>${escapeHtml(booking.paymentStatusLabel || booking.paymentStatus || '待支付')}</small>
              ${booking.paidAt ? `<small>${escapeHtml(formatLocalDateTime(booking.paidAt))}</small>` : ''}
              <div class="booking-actions">
                ${statusActions.map((action) => `
                  <button
                    class="${action.primary ? 'primary' : ''}"
                    data-booking-id="${escapeHtml(booking.id)}"
                    data-status="${action.status}"
                    ${canChangeBookingStatus(booking.status, action.status) ? '' : 'disabled'}
                  >${action.label}</button>
                `).join('')}
                ${(booking.paymentStatus || 'unpaid') !== 'paid' ? `
                  <button
                    class="primary"
                    data-booking-id="${escapeHtml(booking.id)}"
                    data-payment-status="paid"
                  >确认收款</button>
                ` : ''}
              </div>
              <div class="admin-order-dates">
                ${dateLines.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}
              </div>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderUsers(users) {
  if (!users.length) {
    userListNode.innerHTML = '<div class="empty">暂无匹配用户</div>';
    return;
  }

  userListNode.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>用户类型</th>
          <th>姓名 / 账户</th>
          <th>手机号</th>
          <th>会员信息</th>
          <th>来源</th>
          <th>记录</th>
          <th>最近活动</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((user) => `
          <tr>
            <td><span class="user-badge ${escapeHtml(user.level || user.userType)}">${escapeHtml(user.userTypeLabel)}</span></td>
            <td>
              <div class="cell-main">${escapeHtml(user.name || '-')}</div>
              <div class="cell-sub">${escapeHtml(user.accountName || '无账户名')}</div>
            </td>
            <td>${escapeHtml(user.phone)}</td>
            <td>
              <div class="cell-main">${user.levelLabel ? escapeHtml(user.levelLabel) : '-'}</div>
              <div class="cell-sub">余额 ¥${Number(user.balance || 0).toFixed(2)}</div>
            </td>
            <td>${escapeHtml(user.sources || '-')}</td>
            <td>
              <div class="cell-main">预约 ${Number(user.bookingCount || 0)}</div>
              <div class="cell-sub">订单 ${Number(user.orderCount || 0)}</div>
            </td>
            <td>${escapeHtml(user.lastSeenAt || '-')}</td>
            <td>
              <button
                data-user-phone="${escapeHtml(user.phone)}"
                data-user-name="${escapeHtml(user.name || user.accountName || user.phone)}"
              >查看订单</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderUserOrders(data) {
  if (!data.orders.length) {
    userOrderListNode.innerHTML = '<div class="empty">暂无消费记录</div>';
  } else {
    userOrderListNode.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>内容</th>
            <th>金额</th>
            <th>状态</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map((order) => `
            <tr>
              <td>${escapeHtml(order.date || order.createdAt || '-')}</td>
              <td>${escapeHtml(order.title)}</td>
              <td>¥${Number(order.amount || 0).toFixed(2)}</td>
              <td>${escapeHtml(order.status)}</td>
              <td>${escapeHtml(order.remark || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  userOrderState.page = data.page;
  userOrderState.totalPages = data.totalPages;
  userOrderPageInfo.textContent = `第 ${data.page} / ${data.totalPages} 页，共 ${data.total} 条`;
  userOrderPrev.disabled = data.page <= 1;
  userOrderNext.disabled = data.page >= data.totalPages;
}

async function loadUserOrders(phone, name, page = 1) {
  userOrderState.phone = phone;
  userOrderState.name = name;
  userOrderState.page = page;
  userOrderPanel.hidden = false;
  userOrderTitle.textContent = `${name} 的消费记录`;
  try {
    const data = await api(`/api/admin/user-orders?phone=${encodeURIComponent(phone)}&page=${encodeURIComponent(page)}&pageSize=10`);
    renderUserOrders(data);
  } catch (error) {
    showToast(error.message || '消费记录加载失败');
  }
}

function renderSubscribers(subscribers) {
  if (!subscribers.length) {
    subscriberListNode.innerHTML = '<div class="empty">暂无公众号预约提醒</div>';
    return;
  }

  subscriberListNode.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>手机号</th>
          <th>来源</th>
          <th>创建时间</th>
          <th>更新时间</th>
        </tr>
      </thead>
      <tbody>
        ${subscribers.map((item) => `
          <tr>
            <td><div class="cell-main">${escapeHtml(item.phone)}</div></td>
            <td>${escapeHtml(item.source)}</td>
            <td>${escapeHtml(item.createdAt)}</td>
            <td>${escapeHtml(item.updatedAt || '-')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderMemberOptions(members) {
  memberOrderMember.innerHTML = members.map((member) => (
    `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)} · ${escapeHtml(member.phone)}</option>`
  )).join('');
}

function renderMembers(members, filterValue = 'all') {
  if (!members.length) {
    memberListNode.innerHTML = `<div class="empty">暂无${escapeHtml(userFilterLabel(filterValue))}</div>`;
    return;
  }

  memberListNode.innerHTML = members.map((member) => `
    <article class="member-admin-item">
      <div>
        <div class="member-admin-head">
          <strong>${escapeHtml(member.name)}</strong>
          <span>${escapeHtml(member.accountName)}</span>
          <span class="member-level-badge">${escapeHtml(member.levelLabel)}</span>
        </div>
        <p>${escapeHtml(member.phone)} · 余额 ¥${Number(member.balance || 0).toFixed(2)} · 积分 ${Number(member.points || 0)}</p>
        <small>${escapeHtml(member.remark || '无备注')}</small>
      </div>
      <div class="member-actions">
        <select data-member-id="${escapeHtml(member.id)}" data-field="level">
          <option value="normal" ${member.level === 'normal' ? 'selected' : ''}>普通</option>
          <option value="basic" ${member.level === 'basic' ? 'selected' : ''}>初级</option>
          <option value="middle" ${member.level === 'middle' ? 'selected' : ''}>中级</option>
          <option value="senior" ${member.level === 'senior' ? 'selected' : ''}>高级</option>
        </select>
        <div class="member-balance-form">
          <input data-balance-value type="number" min="0" step="0.01" value="${Number(member.balance || 0)}" aria-label="调整后余额">
          <input data-balance-remark type="text" maxlength="60" placeholder="调整原因">
          <button data-member-id="${escapeHtml(member.id)}" data-action="save-balance" class="primary" type="button">保存余额</button>
        </div>
        <button data-member-id="${escapeHtml(member.id)}" data-action="delete-member" class="danger">删除</button>
      </div>
    </article>
  `).join('');
}

function renderMemberBalanceLogs(logs = []) {
  if (!logs.length) {
    memberBalanceLogListNode.innerHTML = '<div class="empty">暂无余额流水</div>';
    return;
  }

  memberBalanceLogListNode.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>会员</th>
          <th>变动</th>
          <th>余额</th>
          <th>来源</th>
          <th>操作人</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map((log) => {
    const delta = Number(log.deltaAmount || 0);
    return `
          <tr>
            <td>${escapeHtml(formatLocalDateTime(log.createdAt))}</td>
            <td>
              <div class="cell-main">${escapeHtml(log.memberName || log.accountName || log.phone)}</div>
              <div class="cell-sub">${escapeHtml(log.phone)}</div>
            </td>
            <td>
              <div class="balance-change ${delta >= 0 ? 'positive' : 'negative'}">${escapeHtml(formatSignedMoney(delta))}</div>
              <div class="cell-sub">${escapeHtml(log.changeTypeLabel || '余额变动')}</div>
            </td>
            <td>
              <div class="cell-main">¥${Number(log.balanceAfter || 0).toFixed(2)}</div>
              <div class="cell-sub">原 ¥${Number(log.balanceBefore || 0).toFixed(2)}</div>
            </td>
            <td>${escapeHtml(log.sourceId || log.sourceType || '-')}</td>
            <td>${escapeHtml(log.operatorName || '-')}</td>
            <td>${escapeHtml(log.remark || '-')}</td>
          </tr>
        `;
  }).join('')}
      </tbody>
    </table>
  `;
}

function renderMemberOrders(data) {
  const orders = data.orders || [];
  if (!orders.length) {
    memberOrderListNode.innerHTML = '<div class="empty">暂无会员订单</div>';
  } else {
    memberOrderListNode.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>会员</th>
            <th>订单内容</th>
            <th>金额</th>
            <th>状态</th>
            <th>日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map((order) => `
            <tr>
              <td>
                <div class="cell-main">${escapeHtml(order.memberName || order.accountName)}</div>
                <div class="cell-sub">${escapeHtml(order.phone)}</div>
              </td>
              <td>
                <div class="cell-main">${escapeHtml(order.title)}</div>
                <div class="cell-sub">${escapeHtml(order.remark || '无备注')}</div>
              </td>
              <td>¥${Number(order.amount || 0).toFixed(2)}</td>
              <td>${escapeHtml(order.status)}</td>
              <td>${escapeHtml(order.date)}</td>
              <td><button class="danger" data-order-id="${escapeHtml(order.id)}">删除</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  memberOrderState.page = data.orderPage || 1;
  memberOrderState.totalPages = data.totalOrderPages || 1;
  memberOrderPageInfo.textContent = `第 ${memberOrderState.page} / ${memberOrderState.totalPages} 页，共 ${data.totalOrders || 0} 条`;
  memberOrderPrev.disabled = memberOrderState.page <= 1;
  memberOrderNext.disabled = memberOrderState.page >= memberOrderState.totalPages;
}

function renderNotices(notices) {
  if (!notices.length) {
    noticeListNode.innerHTML = '<div class="empty">暂无门店公告</div>';
    return;
  }

  noticeListNode.innerHTML = notices.map((notice) => `
    <article class="notice-admin-item ${notice.enabled === false ? 'disabled' : ''}">
      <div>
        <div class="notice-admin-head">
          <strong>${escapeHtml(notice.title)}</strong>
          <span class="notice-level ${escapeHtml(notice.level || 'normal')}">
            ${notice.level === 'important' ? '重要' : '普通'}
          </span>
          <span class="notice-state">${notice.enabled === false ? '已隐藏' : '首页显示'}</span>
        </div>
        <p>${escapeHtml(notice.content)}</p>
        <small>${escapeHtml(notice.updatedAt || notice.createdAt || '')}</small>
      </div>
      <div class="notice-actions">
        <button data-notice-id="${escapeHtml(notice.id)}" data-action="toggle">
          ${notice.enabled === false ? '显示' : '隐藏'}
        </button>
        <button class="danger" data-notice-id="${escapeHtml(notice.id)}" data-action="delete">删除</button>
      </div>
    </article>
  `).join('');
}

async function loadDashboard() {
  refreshButton.disabled = true;
  try {
    const status = statusFilter.value;
    const date = dateFilter.value;
    const userType = userTypeFilter.value;
    const keyword = userKeywordFilter.value.trim();
    const [summaryData, bookingData, userData, memberData, noticeData, subscriberData] = await Promise.all([
      api('/api/admin/summary'),
      api(`/api/admin/bookings?status=${encodeURIComponent(status)}&date=${encodeURIComponent(date)}&page=${encodeURIComponent(bookingState.page)}&pageSize=10`),
      api(`/api/admin/users?type=${encodeURIComponent(userType)}&keyword=${encodeURIComponent(keyword)}`),
      api(`/api/admin/members?orderPage=${encodeURIComponent(memberOrderState.page)}&orderPageSize=10`),
      api('/api/admin/notices'),
      api('/api/admin/subscribers')
    ]);
    renderMetrics(summaryData.summary);
    renderStoreForm(summaryData.store);
    renderBookings(bookingData.bookings);
    bookingState.page = bookingData.page || 1;
    bookingState.totalPages = bookingData.totalPages || 1;
    bookingPageInfo.textContent = `第 ${bookingState.page} / ${bookingState.totalPages} 页，共 ${bookingData.total || 0} 条`;
    bookingPrev.disabled = bookingState.page <= 1;
    bookingNext.disabled = bookingState.page >= bookingState.totalPages;
    renderUsers(userData.users);
    renderMemberOptions(memberData.members);
    renderMembers(filterMembersByUserType(memberData.members, userType), userType);
    renderMemberBalanceLogs(memberData.balanceLogs || []);
    renderMemberOrders(memberData);
    renderNotices(noticeData.notices);
    renderSubscribers(subscriberData.subscribers);
    storeMeta.textContent = `${summaryData.store.openingHours} · ${summaryData.store.phone}`;
  } catch (error) {
    showToast(error.message || '加载失败');
  } finally {
    refreshButton.disabled = false;
  }
}

bookingListNode.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-booking-id]');
  if (!button) {
    return;
  }
  button.disabled = true;
  try {
    const payload = button.dataset.paymentStatus
      ? { paymentStatus: button.dataset.paymentStatus, paymentMethod: 'offline' }
      : { status: button.dataset.status };
    await api(`/api/admin/bookings/${encodeURIComponent(button.dataset.bookingId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    showToast(button.dataset.paymentStatus ? '收款状态已更新' : '预约状态已更新');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || '更新失败');
  } finally {
    button.disabled = false;
  }
});

storeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = storeForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const data = await api('/api/admin/store', {
      method: 'PATCH',
      body: JSON.stringify({
        brandName: storeBrandName.value,
        status: storeStatusInput.value,
        phone: storePhoneInput.value,
        openingHours: storeHoursInput.value,
        address: storeAddressInput.value,
        slogan: storeSloganInput.value,
        promoTitle: storePromoTitleInput.value,
        promoText: storePromoTextInput.value,
        bookingTipTitle: storeBookingTipTitleInput.value,
        bookingTipText: storeBookingTipTextInput.value
      })
    });
    renderStoreForm(data.store);
    storeMeta.textContent = `${data.store.openingHours} · ${data.store.phone}`;
    showToast('门店信息已保存');
  } catch (error) {
    showToast(error.message || '保存失败');
  } finally {
    button.disabled = false;
  }
});

memberForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = memberForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api('/api/admin/members', {
      method: 'POST',
      body: JSON.stringify({
        accountName: memberAccountName.value,
        name: memberName.value,
        phone: memberPhone.value,
        level: memberLevel.value,
        balance: memberBalance.value,
        points: memberPoints.value,
        remark: memberRemark.value
      })
    });
    memberForm.reset();
    memberBalance.value = 0;
    memberPoints.value = 0;
    showToast('会员已新增');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || '新增会员失败');
  } finally {
    button.disabled = false;
  }
});

memberListNode.addEventListener('change', async (event) => {
  const field = event.target.dataset.field;
  const memberId = event.target.dataset.memberId;
  if (!field || !memberId) {
    return;
  }
  try {
    await api(`/api/admin/members/${encodeURIComponent(memberId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: event.target.value })
    });
    showToast('会员信息已更新');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || '更新会员失败');
  }
});

memberListNode.addEventListener('click', async (event) => {
  const balanceButton = event.target.closest('button[data-action="save-balance"]');
  if (balanceButton) {
    const item = balanceButton.closest('.member-admin-item');
    const balanceInput = item ? item.querySelector('[data-balance-value]') : null;
    const remarkInput = item ? item.querySelector('[data-balance-remark]') : null;
    const remark = remarkInput ? remarkInput.value.trim() : '';
    if (!remark) {
      showToast('请填写余额调整原因');
      return;
    }
    balanceButton.disabled = true;
    try {
      await api(`/api/admin/members/${encodeURIComponent(balanceButton.dataset.memberId)}/balance`, {
        method: 'PATCH',
        body: JSON.stringify({
          balance: balanceInput ? balanceInput.value : '',
          remark
        })
      });
      showToast('会员余额已调整');
      await loadDashboard();
    } catch (error) {
      showToast(error.message || '调整余额失败');
    } finally {
      balanceButton.disabled = false;
    }
    return;
  }

  const button = event.target.closest('button[data-action="delete-member"]');
  if (!button) {
    return;
  }
  if (!window.confirm('确定删除这个会员及其订单吗？')) {
    return;
  }
  button.disabled = true;
  try {
    await api(`/api/admin/members/${encodeURIComponent(button.dataset.memberId)}`, {
      method: 'DELETE'
    });
    showToast('会员已删除');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || '删除会员失败');
  } finally {
    button.disabled = false;
  }
});

memberOrderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = memberOrderForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api('/api/admin/member-orders', {
      method: 'POST',
      body: JSON.stringify({
        memberId: memberOrderMember.value,
        title: memberOrderTitle.value,
        amount: memberOrderAmount.value,
        status: memberOrderStatus.value,
        date: memberOrderDate.value,
        remark: memberOrderRemark.value
      })
    });
    memberOrderForm.reset();
    memberOrderAmount.value = 0;
    memberOrderStatus.value = '已完成';
    memberOrderState.page = 1;
    showToast('会员订单已新增');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || '新增订单失败');
  } finally {
    button.disabled = false;
  }
});

memberOrderListNode.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-order-id]');
  if (!button) {
    return;
  }
  if (!window.confirm('确定删除这笔会员订单吗？')) {
    return;
  }
  button.disabled = true;
  try {
    await api(`/api/admin/member-orders/${encodeURIComponent(button.dataset.orderId)}`, {
      method: 'DELETE'
    });
    if (memberOrderListNode.querySelectorAll('tbody tr').length <= 1 && memberOrderState.page > 1) {
      memberOrderState.page -= 1;
    }
    showToast('会员订单已删除');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || '删除订单失败');
  } finally {
    button.disabled = false;
  }
});

noticeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = noticeForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api('/api/admin/notices', {
      method: 'POST',
      body: JSON.stringify({
        title: noticeTitle.value,
        content: noticeContent.value,
        level: noticeLevel.value,
        enabled: noticeEnabled.checked
      })
    });
    noticeForm.reset();
    noticeEnabled.checked = true;
    showToast('公告已新增');
    await loadDashboard();
  } catch (error) {
    showToast(error.message || '新增失败');
  } finally {
    button.disabled = false;
  }
});

noticeListNode.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-notice-id]');
  if (!button) {
    return;
  }
  const noticeId = button.dataset.noticeId;
  const action = button.dataset.action;
  button.disabled = true;
  try {
    if (action === 'delete') {
      if (!window.confirm('确定删除这条公告吗？')) {
        return;
      }
      await api(`/api/admin/notices/${encodeURIComponent(noticeId)}`, {
        method: 'DELETE'
      });
      showToast('公告已删除');
    } else {
      await api(`/api/admin/notices/${encodeURIComponent(noticeId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: button.textContent.trim() === '显示' })
      });
      showToast('公告状态已更新');
    }
    await loadDashboard();
  } catch (error) {
    showToast(error.message || '操作失败');
  } finally {
    button.disabled = false;
  }
});

refreshButton.addEventListener('click', () => {
  closeManagementMenu();
  loadDashboard();
});
statusFilter.addEventListener('change', () => {
  bookingState.page = 1;
  loadDashboard();
});
dateFilter.addEventListener('change', () => {
  bookingState.page = 1;
  loadDashboard();
});
userTypeFilter.addEventListener('change', loadDashboard);
userKeywordFilter.addEventListener('input', () => {
  window.clearTimeout(userKeywordFilter.timer);
  userKeywordFilter.timer = window.setTimeout(loadDashboard, 300);
});

userListNode.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-user-phone]');
  if (!button) {
    return;
  }
  await loadUserOrders(button.dataset.userPhone, button.dataset.userName, 1);
});

userOrderPrev.addEventListener('click', () => {
  if (userOrderState.page > 1) {
    loadUserOrders(userOrderState.phone, userOrderState.name, userOrderState.page - 1);
  }
});

userOrderNext.addEventListener('click', () => {
  if (userOrderState.page < userOrderState.totalPages) {
    loadUserOrders(userOrderState.phone, userOrderState.name, userOrderState.page + 1);
  }
});

memberOrderPrev.addEventListener('click', () => {
  if (memberOrderState.page > 1) {
    memberOrderState.page -= 1;
    loadDashboard();
  }
});

memberOrderNext.addEventListener('click', () => {
  if (memberOrderState.page < memberOrderState.totalPages) {
    memberOrderState.page += 1;
    loadDashboard();
  }
});

bookingPrev.addEventListener('click', () => {
  if (bookingState.page > 1) {
    bookingState.page -= 1;
    loadDashboard();
  }
});

bookingNext.addEventListener('click', () => {
  if (bookingState.page < bookingState.totalPages) {
    bookingState.page += 1;
    loadDashboard();
  }
});

document.querySelectorAll('[data-admin-tab]').forEach((node) => {
  node.addEventListener('click', (event) => {
    event.preventDefault();
    setAdminView(node.dataset.adminTab);
  });
});

managementCenterButton.addEventListener('click', () => {
  managementMenu.hidden = false;
});

managementCenterClose.addEventListener('click', closeManagementMenu);

managementMenu.addEventListener('click', (event) => {
  if (event.target === managementMenu) {
    closeManagementMenu();
  }
});

document.querySelectorAll('[data-admin-center-target]').forEach((node) => {
  node.addEventListener('click', () => {
    setAdminView(node.dataset.adminCenterTarget);
    closeManagementMenu();
  });
});

adminLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = adminLoginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  loginMessage.textContent = '';
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: adminUsername.value.trim(),
        password: adminPassword.value
      })
    });
    const payload = await response.json();
    if (!response.ok || payload.code !== 0) {
      throw new Error(payload.message || '登录失败');
    }
    setAdminSession(payload.data);
    adminLoginForm.reset();
    await loadDashboard();
  } catch (error) {
    loginMessage.textContent = error.message || '登录失败';
  } finally {
    button.disabled = false;
  }
});

adminLogoutButton.addEventListener('click', async () => {
  try {
    await api('/api/admin/logout', { method: 'POST' });
  } catch (error) {
    // local logout should still happen even if the session has expired
  }
  closeManagementMenu();
  setAdminSession(null);
});

changeAdminPasswordButton.addEventListener('click', () => {
  closeManagementMenu();
  adminPasswordModal.hidden = false;
  adminPasswordMessage.textContent = '';
  adminPasswordForm.reset();
});

adminPasswordClose.addEventListener('click', () => {
  adminPasswordModal.hidden = true;
});

adminPasswordModal.addEventListener('click', (event) => {
  if (event.target === adminPasswordModal) {
    adminPasswordModal.hidden = true;
  }
});

adminPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(adminPasswordForm);
  const newPassword = String(data.get('newPassword') || '');
  const confirmPassword = String(data.get('confirmPassword') || '');
  if (newPassword !== confirmPassword) {
    adminPasswordMessage.textContent = '两次输入的新密码不一致';
    return;
  }
  const button = adminPasswordForm.querySelector('button[type="submit"]');
  button.disabled = true;
  adminPasswordMessage.textContent = '';
  try {
    await api('/api/admin/password', {
      method: 'PATCH',
      body: JSON.stringify({
        currentPassword: String(data.get('currentPassword') || ''),
        newPassword,
        confirmPassword
      })
    });
    adminPasswordForm.reset();
    adminPasswordModal.hidden = true;
    showToast('管理员密码已更新');
  } catch (error) {
    adminPasswordMessage.textContent = error.message || '密码修改失败';
  } finally {
    button.disabled = false;
  }
});

const initialHash = window.location.hash.replace('#', '');
if (initialHash === 'members') {
  activeAdminView = 'users';
} else if (validAdminViews.has(initialHash)) {
  activeAdminView = initialHash;
}
setAdminView(activeAdminView);

checkAdminSession().then((loggedIn) => {
  if (loggedIn) {
    loadDashboard();
  }
});
