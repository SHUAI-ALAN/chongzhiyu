const metricsNode = document.querySelector('#metrics');
const bookingListNode = document.querySelector('#bookingList');
const userListNode = document.querySelector('#userList');
const userOrderPanel = document.querySelector('#userOrderPanel');
const userOrderTitle = document.querySelector('#userOrderTitle');
const userOrderListNode = document.querySelector('#userOrderList');
const userOrderPrev = document.querySelector('#userOrderPrev');
const userOrderNext = document.querySelector('#userOrderNext');
const userOrderPageInfo = document.querySelector('#userOrderPageInfo');
const memberListNode = document.querySelector('#memberList');
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

const statusActions = [
  { status: 'confirmed', label: '确认', primary: true },
  { status: 'completed', label: '完成' },
  { status: 'canceled', label: '取消' }
];

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
    ['总预约', summary.totalBookings],
    ['待确认', summary.pending],
    ['已确认', summary.confirmed],
    ['今日预约', summary.todayBookings],
    ['未来待服务', summary.upcoming],
    ['会员数', summary.members],
    ['会员余额', `¥${Number(summary.memberBalance || 0).toFixed(2)}`],
    ['公众号线索', summary.subscribers]
  ];
  metricsNode.innerHTML = items.map(([label, value]) => (
    `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`
  )).join('');
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

function renderBookings(bookings) {
  if (!bookings.length) {
    bookingListNode.innerHTML = '<div class="empty">暂无预约记录</div>';
    return;
  }

  bookingListNode.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>服务</th>
          <th>宠物</th>
          <th>客户</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${bookings.map((booking) => `
          <tr>
            <td>
              <div class="cell-main">${escapeHtml(booking.date)} ${escapeHtml(booking.time)}</div>
              <div class="cell-sub">${escapeHtml(booking.createdAt || '')}</div>
            </td>
            <td>
              <div class="cell-main">${escapeHtml(booking.serviceName)}</div>
              <div class="cell-sub">${escapeHtml(booking.remark || '无备注')}</div>
            </td>
            <td>
              <div class="cell-main">${escapeHtml(booking.petName)}</div>
              <div class="cell-sub">${escapeHtml(booking.petType || '未填写')}</div>
            </td>
            <td>
              <div class="cell-main">${escapeHtml(booking.customerName)}</div>
              <div class="cell-sub">${escapeHtml(booking.phone)}</div>
              <div class="user-badge ${escapeHtml(booking.userType)}">
                ${escapeHtml(booking.userTypeLabel)}${booking.memberLevelLabel ? ` · ${escapeHtml(booking.memberLevelLabel)}` : ''}
              </div>
            </td>
            <td><span class="status ${escapeHtml(booking.status)}">${escapeHtml(booking.statusLabel)}</span></td>
            <td>
              <div class="booking-actions">
                ${statusActions.map((action) => `
                  <button
                    class="${action.primary ? 'primary' : ''}"
                    data-booking-id="${escapeHtml(booking.id)}"
                    data-status="${action.status}"
                    ${booking.status === action.status ? 'disabled' : ''}
                  >${action.label}</button>
                `).join('')}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
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
            <td><span class="user-badge ${escapeHtml(user.userType)}">${escapeHtml(user.userTypeLabel)}</span></td>
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

function renderMembers(members) {
  if (!members.length) {
    memberListNode.innerHTML = '<div class="empty">暂无会员</div>';
    renderMemberOptions([]);
    return;
  }

  renderMemberOptions(members);
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
          <option value="basic" ${member.level === 'basic' ? 'selected' : ''}>初级</option>
          <option value="middle" ${member.level === 'middle' ? 'selected' : ''}>中级</option>
          <option value="senior" ${member.level === 'senior' ? 'selected' : ''}>高级</option>
        </select>
        <input data-member-id="${escapeHtml(member.id)}" data-field="balance" type="number" min="0" step="0.01" value="${Number(member.balance || 0)}">
        <button data-member-id="${escapeHtml(member.id)}" data-action="delete-member" class="danger">删除</button>
      </div>
    </article>
  `).join('');
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
      api(`/api/admin/bookings?status=${encodeURIComponent(status)}&date=${encodeURIComponent(date)}`),
      api(`/api/admin/users?type=${encodeURIComponent(userType)}&keyword=${encodeURIComponent(keyword)}`),
      api(`/api/admin/members?orderPage=${encodeURIComponent(memberOrderState.page)}&orderPageSize=10`),
      api('/api/admin/notices'),
      api('/api/admin/subscribers')
    ]);
    renderMetrics(summaryData.summary);
    renderStoreForm(summaryData.store);
    renderBookings(bookingData.bookings);
    renderUsers(userData.users);
    renderMembers(memberData.members);
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
    await api(`/api/admin/bookings/${encodeURIComponent(button.dataset.bookingId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: button.dataset.status })
    });
    showToast('预约状态已更新');
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

refreshButton.addEventListener('click', loadDashboard);
statusFilter.addEventListener('change', loadDashboard);
dateFilter.addEventListener('change', loadDashboard);
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
  setAdminSession(null);
});

changeAdminPasswordButton.addEventListener('click', () => {
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

checkAdminSession().then((loggedIn) => {
  if (loggedIn) {
    loadDashboard();
  }
});
