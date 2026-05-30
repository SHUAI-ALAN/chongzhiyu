const {
  storeConfig,
  serviceCategories,
  services,
  petSizeOptions,
  servicePriceRules,
  calculateServicePrice,
  inferPetSizeByWeight,
  productCategories,
  products,
  coupons,
  buildSlots
} = require('./data/store');
const {
  getStoreProfile,
  updateStoreProfile,
  listBookings,
  getBooking,
  addBooking,
  updateBookingStatus,
  updateBookingPayment,
  listMembers,
  getPrimaryMember,
  getMemberByPhone,
  addMember,
  registerUser,
  verifyPassword,
  updateMember,
  listMemberBalanceLogs,
  setMemberBalance,
  payBookingWithMemberBalance,
  addMemberPet,
  updateMemberPet,
  deleteMemberPet,
  deleteMember,
  listMemberOrders,
  addMemberOrder,
  updateMemberOrder,
  deleteMemberOrder,
  listSubscribers,
  addSubscriber,
  listNotices,
  addNotice,
  updateNotice,
  deleteNotice,
  getAdminByUsername,
  getAdmin,
  updateAdminPassword,
  addAdminSession,
  getAdminSession,
  updateAdminSession,
  deleteAdminSession,
  deleteExpiredAdminSessions
} = require('./data/runtime');
const { ok, fail, readJson, notFound } = require('./utils/http');
const { verifySignature, buildTextReply, readXmlText } = require('./wechat');
const { serveOfficialAsset, serveAdminAsset } = require('./static');
const crypto = require('crypto');

const bookingStatuses = new Set(['pending', 'confirmed', 'completed', 'canceled']);
const bookingPaymentStatuses = new Set(['unpaid', 'paid']);
const memberLevels = new Set(['normal', 'basic', 'middle', 'senior']);
const adminSessionTtl = 1000 * 60 * 60 * 24 * 7;

function canChangeBookingStatus(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return false;
  if (['completed', 'canceled'].includes(currentStatus)) return false;
  if (nextStatus === 'confirmed') return currentStatus === 'pending';
  if (nextStatus === 'completed') return currentStatus === 'confirmed';
  if (nextStatus === 'canceled') return ['pending', 'confirmed'].includes(currentStatus);
  return false;
}

function filterByCategory(items, category) {
  if (!category || category === 'all') {
    return items;
  }
  return items.filter((item) => item.category === category);
}

function todayText() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function publicAdmin(admin) {
  return {
    id: admin.id,
    username: admin.username,
    updatedAt: admin.updatedAt
  };
}

function isStatelessAdminSessionEnabled() {
  return Boolean(process.env.VERCEL || process.env.ADMIN_SESSION_SECRET);
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function adminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'chongzhiyu-vercel-admin-session-v1';
}

function signAdminPayload(payload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', adminSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyAdminPayload(token) {
  const [encodedPayload, signature] = String(token || '').split('.');
  if (!encodedPayload || !signature) {
    return null;
  }
  const expected = crypto
    .createHmac('sha256', adminSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch (error) {
    return null;
  }
}

function createAdminSession(admin) {
  if (isStatelessAdminSessionEnabled()) {
    return signAdminPayload({
      username: admin.username,
      expiresAt: Date.now() + adminSessionTtl
    });
  }
  const token = crypto.randomBytes(32).toString('hex');
  addAdminSession(token, admin.id, Date.now() + adminSessionTtl);
  return token;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(/\s+/);
  return type === 'Bearer' ? token : '';
}

function getSessionAdmin(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }
  if (isStatelessAdminSessionEnabled()) {
    const payload = verifyAdminPayload(token);
    if (!payload || Number(payload.expiresAt || 0) < Date.now()) {
      return null;
    }
    const admin = getAdminByUsername(payload.username);
    return admin ? { admin, token } : null;
  }
  deleteExpiredAdminSessions();
  const session = getAdminSession(token);
  if (!session || session.expiresAt < Date.now()) {
    deleteAdminSession(token);
    return null;
  }
  const nextExpiresAt = Date.now() + adminSessionTtl;
  updateAdminSession(token, nextExpiresAt);
  const admin = getAdmin(session.adminId);
  if (!admin) {
    deleteAdminSession(token);
    return null;
  }
  return { admin, token };
}

function validateAdminPasswordPayload(payload) {
  if (!String(payload.currentPassword || '')) {
    return '请填写原密码';
  }
  if (String(payload.newPassword || '').length < 6) {
    return '新密码至少 6 位';
  }
  if (String(payload.newPassword || '') !== String(payload.confirmPassword || '')) {
    return '两次输入的新密码不一致';
  }
  return '';
}

function createBooking(payload) {
  const requiredFields = ['serviceId', 'customerName', 'phone', 'date', 'time'];
  const missing = requiredFields.find((field) => !payload[field]);
  if (missing) {
    return { error: `缺少字段：${missing}` };
  }

  if (!/^1\d{10}$/.test(payload.phone)) {
    return { error: '手机号格式不正确' };
  }

  const service = services.find((item) => item.id === payload.serviceId);
  if (!service) {
    return { error: '服务不存在' };
  }
  const petType = String(payload.petType || '').trim() || 'other';
  const petSize = String(payload.petSize || '').trim()
    || inferPetSizeByWeight(petType, payload.petWeight)
    || 'small';
  if (!petSizeOptions.some((item) => item.id === petSize)) {
    return { error: '请选择宠物体型' };
  }

  const slots = buildSlots(service.id);
  const selectedDay = slots.find((item) => item.date === payload.date);
  const selectedTime = selectedDay && selectedDay.times.find((item) => item.time === payload.time);
  if (!selectedTime || !selectedTime.available) {
    return { error: '该时段暂不可预约，请重新选择' };
  }

  const duplicated = listBookings().some((item) => (
    item.serviceId === service.id
    && item.date === payload.date
    && item.time === payload.time
    && ['pending', 'confirmed'].includes(item.status)
  ));
  if (duplicated) {
    return { error: '该时段刚被预约，请换一个时间' };
  }

  const booking = addBooking({
    id: `bk-${Date.now()}`,
    serviceId: service.id,
    serviceName: service.name,
    petName: String(payload.petName || '').trim(),
    petType,
    customerName: payload.customerName,
    phone: payload.phone,
    date: payload.date,
    time: payload.time,
    remark: payload.remark || '',
    status: 'pending',
    amount: calculateServicePrice(service, petType, petSize),
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString()
  });

  return { booking };
}

function bookingSummary() {
  const bookings = listBookings();
  const members = listMembers();
  const today = todayText();
  const pending = bookings.filter((item) => item.status === 'pending').length;
  const confirmed = bookings.filter((item) => item.status === 'confirmed').length;
  const todayBookings = bookings.filter((item) => item.date === today).length;
  const upcoming = bookings.filter((item) => (
    item.date >= today && ['pending', 'confirmed'].includes(item.status)
  )).length;

  return {
    totalBookings: bookings.length,
    pending,
    confirmed,
    todayBookings,
    upcoming,
    members: members.length,
    memberBalance: members.reduce((sum, item) => sum + Number(item.balance || 0), 0),
    subscribers: listSubscribers().length
  };
}

function bookingStatusLabel(status) {
  return {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    canceled: '已取消'
  }[status] || status;
}

function bookingPaymentStatusLabel(status) {
  return {
    unpaid: '待支付',
    paid: '已支付'
  }[status] || status;
}

function memberBalanceChangeTypeLabel(type) {
  return {
    opening_balance: '初始余额',
    admin_adjustment: '后台调整',
    member_payment: '余额支付',
    recharge: '余额充值',
    refund: '余额退款',
    correction: '余额修正'
  }[type] || '余额变动';
}

function toAdminMemberBalanceLog(log) {
  const member = listMembers().find((item) => item.id === log.memberId);
  return {
    ...log,
    memberName: member ? member.name : '',
    accountName: member ? member.accountName : '',
    changeTypeLabel: memberBalanceChangeTypeLabel(log.changeType)
  };
}

function toPublicMemberBalanceLog(log) {
  if (!log) {
    return null;
  }
  return {
    id: log.id,
    changeType: log.changeType,
    changeTypeLabel: memberBalanceChangeTypeLabel(log.changeType),
    deltaAmount: Number(log.deltaAmount || 0),
    balanceBefore: Number(log.balanceBefore || 0),
    balanceAfter: Number(log.balanceAfter || 0),
    sourceType: log.sourceType || '',
    sourceId: log.sourceId || '',
    operatorName: log.operatorType === 'admin' ? '门店后台' : log.operatorName || '',
    remark: log.remark || '',
    createdAt: log.createdAt
  };
}

function toAdminBooking(booking) {
  const bookingMember = listMembers().find((item) => item.phone === booking.phone);
  return {
    ...booking,
    statusLabel: bookingStatusLabel(booking.status),
    paymentStatusLabel: bookingPaymentStatusLabel(booking.paymentStatus),
    userType: bookingMember ? 'member' : 'normal',
    userTypeLabel: bookingMember ? '会员' : '普通用户',
    memberLevelLabel: bookingMember ? memberLevelLabel(bookingMember.level) : ''
  };
}

function memberLevelLabel(level) {
  return {
    normal: '普通用户',
    basic: '初级',
    middle: '中级',
    senior: '高级'
  }[level] || level;
}

function toPublicMember(member) {
  return {
    id: member.id,
    name: member.accountName || member.name,
    realName: member.name,
    phone: member.phone,
    level: memberLevelLabel(member.level),
    levelCode: member.level,
    balance: Number(member.balance || 0),
    points: Number(member.points || 0),
    pets: member.pets || []
  };
}

function toPublicPet(pet) {
  const lastGroomedAt = pet.lastGroomedAt || '';
  let groomingDays = null;
  let groomingDue = false;
  if (lastGroomedAt) {
    const last = new Date(`${lastGroomedAt}T00:00:00`);
    if (!Number.isNaN(last.getTime())) {
      groomingDays = Math.max(0, Math.floor((Date.now() - last.getTime()) / 86400000));
      groomingDue = groomingDays >= 30;
    }
  }
  return {
    id: pet.id,
    name: pet.name,
    type: pet.type,
    breed: pet.breed || '',
    age: pet.age || '',
    weight: pet.weight || '',
    lastGroomedAt,
    groomingDays,
    groomingDue,
    groomingTip: groomingDue ? '距上次洗护已超过 30 天，建议预约洗护' : '',
    photo: pet.photo || '',
    createdAt: pet.createdAt
  };
}

function toPublicUser(member) {
  return {
    id: member.id,
    accountName: member.accountName,
    name: member.name,
    phone: member.phone,
    userType: member.level === 'normal' ? 'normal' : 'member',
    userTypeLabel: member.level === 'normal' ? '普通用户' : '会员',
    level: memberLevelLabel(member.level),
    levelCode: member.level,
    balance: Number(member.balance || 0),
    points: Number(member.points || 0),
    pets: (member.pets || []).map(toPublicPet)
  };
}

function sanitizeUser(member) {
  const user = toPublicUser(member);
  delete user.passwordHash;
  return user;
}

function toPublicBooking(booking) {
  return {
    id: booking.id,
    serviceName: booking.serviceName,
    petType: booking.petType,
    date: booking.date,
    time: booking.time,
    status: booking.status,
    statusLabel: bookingStatusLabel(booking.status),
    amount: Number(booking.amount || 0),
    paymentStatus: booking.paymentStatus || 'unpaid',
    paymentStatusLabel: bookingPaymentStatusLabel(booking.paymentStatus || 'unpaid'),
    paymentMethod: booking.paymentMethod || '',
    paidAt: booking.paidAt,
    completedAt: booking.completedAt,
    canPay: booking.status === 'completed' && (booking.paymentStatus || 'unpaid') !== 'paid',
    remark: booking.remark,
    createdAt: booking.createdAt
  };
}

function toPublicOrder(order) {
  const booking = order.bookingId ? getBooking(order.bookingId) : null;
  return {
    ...order,
    bookingDate: booking ? booking.date : '',
    bookingTime: booking ? booking.time : '',
    bookingCreatedAt: booking ? booking.createdAt : '',
    bookingCompletedAt: booking ? booking.completedAt || '' : ''
  };
}

function toAdminMember(member) {
  return {
    ...member,
    levelLabel: memberLevelLabel(member.level)
  };
}

function toAdminMemberOrder(order) {
  const member = listMembers().find((item) => item.id === order.memberId);
  return {
    ...order,
    memberName: member ? member.name : '',
    accountName: member ? member.accountName : '',
    levelLabel: member ? memberLevelLabel(member.level) : ''
  };
}

function listAdminUsers() {
  const usersByPhone = new Map();

  function ensureUser(phone, defaults = {}) {
    if (!phone) {
      return null;
    }
    if (!usersByPhone.has(phone)) {
      usersByPhone.set(phone, {
        phone,
        userType: 'normal',
        userTypeLabel: '普通用户',
        accountName: '',
        name: '',
        level: '',
        levelLabel: '',
        balance: 0,
        sources: new Set(),
        bookingCount: 0,
        orderCount: 0,
        lastSeenAt: ''
      });
    }
    const user = usersByPhone.get(phone);
    Object.assign(user, defaults);
    return user;
  }

  for (const booking of listBookings()) {
    const user = ensureUser(booking.phone, {
      name: booking.customerName || ''
    });
    if (!user) continue;
    user.sources.add('预约');
    user.bookingCount += 1;
    user.lastSeenAt = [user.lastSeenAt, booking.createdAt, `${booking.date} ${booking.time}`]
      .filter(Boolean)
      .sort()
      .pop();
  }

  for (const subscriber of listSubscribers()) {
    const user = ensureUser(subscriber.phone);
    if (!user) continue;
    user.sources.add('公众号');
    user.lastSeenAt = [user.lastSeenAt, subscriber.updatedAt, subscriber.createdAt]
      .filter(Boolean)
      .sort()
      .pop();
  }

  for (const order of listMemberOrders()) {
    const user = ensureUser(order.phone);
    if (!user) continue;
    user.sources.add('订单');
    user.orderCount += 1;
    user.lastSeenAt = [user.lastSeenAt, order.updatedAt, order.createdAt, order.date]
      .filter(Boolean)
      .sort()
      .pop();
  }

  for (const member of listMembers()) {
    const user = ensureUser(member.phone, {
      userType: member.level === 'normal' ? 'normal' : 'member',
      userTypeLabel: member.level === 'normal' ? '普通用户' : `${memberLevelLabel(member.level)}会员`,
      accountName: member.accountName,
      name: member.name,
      level: member.level,
      levelLabel: memberLevelLabel(member.level),
      balance: Number(member.balance || 0)
    });
    if (!user) continue;
    user.sources.add('会员');
    user.lastSeenAt = [user.lastSeenAt, member.updatedAt, member.createdAt]
      .filter(Boolean)
      .sort()
      .pop();
  }

  return [...usersByPhone.values()]
    .map((user) => ({
      ...user,
      sources: [...user.sources].join(' / ')
    }))
    .sort((a, b) => {
      if (a.userType !== b.userType) {
        return a.userType === 'member' ? -1 : 1;
      }
      return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
    });
}

function publicStoreConfig() {
  return {
    ...storeConfig,
    ...getStoreProfile(),
    notices: listNotices({ enabledOnly: true })
  };
}

function validateMemberPayload(payload, partial = false) {
  const requiredFields = ['accountName', 'name', 'phone'];
  if (!partial) {
    const missing = requiredFields.find((field) => !String(payload[field] || '').trim());
    if (missing) {
      return '请填写会员账号、姓名和电话';
    }
  }
  if (payload.phone && !/^1\d{10}$/.test(payload.phone)) {
    return '手机号格式不正确';
  }
  if (payload.level && !memberLevels.has(payload.level)) {
    return '会员等级不正确';
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'balance') && Number(payload.balance) < 0) {
    return '会员余额不能小于 0';
  }
  return '';
}

function validateMemberBalancePayload(payload) {
  if (!Object.prototype.hasOwnProperty.call(payload, 'balance')) {
    return '请填写调整后的余额';
  }
  const balance = Number(payload.balance);
  if (!Number.isFinite(balance) || balance < 0) {
    return '调整后的余额不能小于 0';
  }
  if (!String(payload.remark || '').trim()) {
    return '请填写余额调整原因';
  }
  return '';
}

function validateRegisterPayload(payload) {
  if (!String(payload.accountName || '').trim()) {
    return '请填写用户名';
  }
  if (!/^1\d{10}$/.test(payload.phone || '')) {
    return '请填写正确手机号';
  }
  if (String(payload.password || '').length < 6) {
    return '密码至少 6 位';
  }
  return '';
}

function validatePhoneUpdatePayload(payload) {
  if (!payload.userId) {
    return '请先登录';
  }
  if (!/^1\d{10}$/.test(payload.phone || '')) {
    return '请填写正确手机号';
  }
  return '';
}

function validatePasswordUpdatePayload(payload) {
  if (!payload.userId) {
    return '请先登录';
  }
  if (!String(payload.currentPassword || '')) {
    return '请填写原密码';
  }
  if (String(payload.newPassword || '').length < 6) {
    return '新密码至少 6 位';
  }
  if (String(payload.newPassword || '') !== String(payload.confirmPassword || '')) {
    return '两次输入的新密码不一致';
  }
  return '';
}

function validatePetPayload(payload) {
  if (!payload.userId) {
    return '请先登录';
  }
  if (!String(payload.name || '').trim()) {
    return '请填写宠物名字';
  }
  if (!String(payload.type || '').trim()) {
    return '请选择宠物种类';
  }
  if (payload.photo && !String(payload.photo).startsWith('data:image/')) {
    return '宠物图片格式不正确';
  }
  if (payload.photo && String(payload.photo).length > 700000) {
    return '图片过大，请选择较小的图片';
  }
  if (payload.lastGroomedAt && !/^\d{4}-\d{2}-\d{2}$/.test(payload.lastGroomedAt)) {
    return '上次洗护日期格式不正确';
  }
  return '';
}

function validateMemberOrderPayload(payload) {
  if (!String(payload.memberId || '').trim()) {
    return '请选择会员';
  }
  if (!String(payload.title || '').trim()) {
    return '请填写订单内容';
  }
  if (Number(payload.amount || 0) < 0) {
    return '订单金额不能小于 0';
  }
  return '';
}

function validateStorePayload(payload) {
  const requiredFields = ['brandName', 'openingHours', 'phone', 'address', 'status'];
  const missing = requiredFields.find((field) => (
    Object.prototype.hasOwnProperty.call(payload, field)
    && !String(payload[field] || '').trim()
  ));
  if (missing) {
    return '门店基础信息不能为空';
  }
  return '';
}

function validateNoticePayload(payload) {
  if (!String(payload.title || '').trim()) {
    return '请填写公告标题';
  }
  if (!String(payload.content || '').trim()) {
    return '请填写公告内容';
  }
  return '';
}

async function route(req, res, url) {
  if (req.method === 'OPTIONS') {
    ok(res, {});
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    ok(res, { status: 'up', time: new Date().toISOString() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(302, { Location: '/official/' });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/official') {
    res.writeHead(302, { Location: '/official/' });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/official/')) {
    serveOfficialAsset(url, res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/admin') {
    res.writeHead(302, { Location: '/admin/' });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/admin/')) {
    serveAdminAsset(url, res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    ok(res, { store: publicStoreConfig() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/services') {
    const category = url.searchParams.get('category');
    ok(res, {
      categories: serviceCategories,
      services: filterByCategory(services, category),
      petSizeOptions,
      servicePriceRules
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    const category = url.searchParams.get('category');
    ok(res, {
      categories: productCategories,
      products: filterByCategory(products, category)
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/coupons') {
    ok(res, { coupons });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/member') {
    ok(res, { member: toPublicMember(getPrimaryMember()) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/orders') {
    const phone = url.searchParams.get('phone');
    ok(res, {
      orders: listMemberOrders({ phone })
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/slots') {
    const serviceId = url.searchParams.get('serviceId') || services[0].id;
    ok(res, { slots: buildSlots(serviceId) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/bookings') {
    try {
      const payload = await readJson(req);
      const result = createBooking(payload);
      if (result.error) {
        fail(res, 400, result.error);
        return;
      }
      ok(res, { booking: result.booking }, '预约已提交');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/subscribe') {
    try {
      const payload = await readJson(req);
      if (!/^1\d{10}$/.test(payload.phone || '')) {
        fail(res, 400, '请填写正确手机号');
        return;
      }
      const subscriber = addSubscriber({
        phone: payload.phone,
        source: payload.source || 'unknown'
      });
      ok(res, { subscribed: true, subscriber }, '订阅成功');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/register') {
    try {
      const payload = await readJson(req);
      const error = validateRegisterPayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      const accountName = String(payload.accountName || '').trim();
      const phone = String(payload.phone || '').trim();
      const existingByName = listMembers().find((item) => item.accountName === accountName && item.phone !== phone);
      if (existingByName) {
        fail(res, 400, '用户名已被使用，请换一个');
        return;
      }
      const existingByPhone = getMemberByPhone(phone);
      if (existingByPhone && existingByPhone.passwordHash) {
        fail(res, 400, '该手机号已注册，请直接登录');
        return;
      }
      const user = registerUser(payload);
      ok(res, { user: sanitizeUser(user) }, '注册成功');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    try {
      const payload = await readJson(req);
      if (!String(payload.accountName || '').trim()) {
        fail(res, 400, '请填写用户名');
        return;
      }
      const user = listMembers().find((item) => item.accountName === payload.accountName);
      if (!user) {
        fail(res, 404, '用户不存在，请先注册');
        return;
      }
      if (!verifyPassword(payload.password, user.passwordHash)) {
        fail(res, 401, '密码不正确');
        return;
      }
      ok(res, { user: sanitizeUser(user) }, '登录成功');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/user/phone') {
    try {
      const payload = await readJson(req);
      const error = validatePhoneUpdatePayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      const duplicated = getMemberByPhone(payload.phone);
      if (duplicated && duplicated.id !== payload.userId) {
        fail(res, 409, '该手机号已被使用');
        return;
      }
      const user = updateMember(payload.userId, { phone: payload.phone });
      if (!user) {
        fail(res, 404, '用户不存在');
        return;
      }
      ok(res, { user: sanitizeUser(user) }, '手机号已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/user/password') {
    try {
      const payload = await readJson(req);
      const error = validatePasswordUpdatePayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      const user = listMembers().find((item) => item.id === payload.userId);
      if (!user) {
        fail(res, 404, '用户不存在');
        return;
      }
      if (!verifyPassword(payload.currentPassword, user.passwordHash)) {
        fail(res, 401, '原密码不正确');
        return;
      }
      const updatedUser = updateMember(payload.userId, { password: payload.newPassword });
      ok(res, { user: sanitizeUser(updatedUser) }, '密码已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/user/profile') {
    const userId = url.searchParams.get('userId');
    const user = listMembers().find((item) => item.id === userId);
    if (!user) {
      fail(res, 404, '用户不存在');
      return;
    }
    ok(res, {
      user: sanitizeUser(user),
      bookings: listBookings()
        .filter((item) => item.phone === user.phone)
        .map(toPublicBooking),
      orders: listMemberOrders({ phone: user.phone }).map(toPublicOrder),
      balanceLogs: listMemberBalanceLogs({ memberId: user.id, limit: 50 }).map(toPublicMemberBalanceLog)
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/user/pets') {
    try {
      const payload = await readJson(req);
      const error = validatePetPayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      const updatedUser = addMemberPet(payload.userId, payload);
      if (!updatedUser) {
        fail(res, 404, '用户不存在');
        return;
      }
      ok(res, { user: sanitizeUser(updatedUser) }, '宠物档案已添加');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/user/pets/')) {
    try {
      const petId = decodeURIComponent(url.pathname.replace('/api/user/pets/', ''));
      const payload = await readJson(req);
      const error = validatePetPayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      const updatedUser = updateMemberPet(payload.userId, petId, payload);
      if (!updatedUser) {
        fail(res, 404, '用户不存在');
        return;
      }
      ok(res, { user: sanitizeUser(updatedUser) }, '宠物档案已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/user/pets/')) {
    try {
      const petId = decodeURIComponent(url.pathname.replace('/api/user/pets/', ''));
      const userId = url.searchParams.get('userId');
      if (!userId) {
        fail(res, 400, '请先登录');
        return;
      }
      const updatedUser = deleteMemberPet(userId, petId);
      if (!updatedUser) {
        fail(res, 404, '用户不存在');
        return;
      }
      ok(res, { user: sanitizeUser(updatedUser) }, '宠物档案已删除');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/user/bookings/') && url.pathname.endsWith('/pay')) {
    try {
      const id = decodeURIComponent(url.pathname.replace('/api/user/bookings/', '').replace('/pay', ''));
      const payload = await readJson(req);
      const user = listMembers().find((item) => item.id === payload.userId);
      if (!user) {
        fail(res, 404, '用户不存在');
        return;
      }
      const booking = getBooking(id);
      if (!booking || booking.phone !== user.phone) {
        fail(res, 404, '预约不存在');
        return;
      }
      if (booking.status !== 'completed') {
        fail(res, 400, '商家完成服务后才能支付');
        return;
      }
      if (booking.paymentStatus === 'paid') {
        ok(res, { booking: toPublicBooking(booking), user: sanitizeUser(user) }, '该订单已支付');
        return;
      }
      if (user.level === 'normal') {
        fail(res, 400, '普通用户请扫码支付');
        return;
      }
      const amount = Number(booking.amount || 0);
      if (Number(user.balance || 0) < amount) {
        fail(res, 400, '会员余额不足，请联系门店充值');
        return;
      }
      const payment = payBookingWithMemberBalance({
        memberId: user.id,
        bookingId: booking.id,
        amount,
        title: `${booking.serviceName || '预约服务'}支付`,
        date: todayText(),
        remark: `预约单 ${booking.id}，${booking.date} ${booking.time}`,
        operatorName: user.accountName || user.name || user.phone
      });
      if (!payment || !payment.booking) {
        fail(res, 400, '余额支付失败');
        return;
      }
      ok(res, {
        user: sanitizeUser(payment.member),
        booking: toPublicBooking(payment.booking),
        balanceLog: toPublicMemberBalanceLog(payment.balanceLog)
      }, '余额支付成功');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    try {
      const payload = await readJson(req);
      const username = String(payload.username || '').trim();
      if (!username || !String(payload.password || '')) {
        fail(res, 400, '请填写管理员账号和密码');
        return;
      }
      const admin = getAdminByUsername(username);
      if (!admin || !verifyPassword(payload.password, admin.passwordHash)) {
        fail(res, 401, '管理员账号或密码不正确');
        return;
      }
      const token = createAdminSession(admin);
      ok(res, { token, admin: publicAdmin(admin) }, '登录成功');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/session') {
    const session = getSessionAdmin(req);
    if (!session) {
      fail(res, 401, '请先登录后台');
      return;
    }
    ok(res, { admin: publicAdmin(session.admin) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    const token = getBearerToken(req);
    if (token && !isStatelessAdminSessionEnabled()) {
      deleteAdminSession(token);
    }
    ok(res, {});
    return;
  }

  if (url.pathname.startsWith('/api/admin/')) {
    const session = getSessionAdmin(req);
    if (!session) {
      fail(res, 401, '请先登录后台');
      return;
    }
    req.admin = session.admin;
    req.adminToken = session.token;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/admin/password') {
    try {
      const payload = await readJson(req);
      const error = validateAdminPasswordPayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      if (!verifyPassword(payload.currentPassword, req.admin.passwordHash)) {
        fail(res, 401, '原密码不正确');
        return;
      }
      const admin = updateAdminPassword(req.admin.id, payload.newPassword);
      ok(res, { admin: publicAdmin(admin) }, '管理员密码已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/summary') {
    ok(res, { summary: bookingSummary(), store: publicStoreConfig() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/store') {
    ok(res, { store: publicStoreConfig() });
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/admin/store') {
    try {
      const payload = await readJson(req);
      const error = validateStorePayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      ok(res, { store: updateStoreProfile(payload) }, '门店信息已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/notices') {
    ok(res, { notices: listNotices() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/notices') {
    try {
      const payload = await readJson(req);
      const error = validateNoticePayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      ok(res, { notice: addNotice(payload) }, '公告已新增');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/notices/')) {
    try {
      const id = decodeURIComponent(url.pathname.replace('/api/admin/notices/', ''));
      const payload = await readJson(req);
      if (
        Object.prototype.hasOwnProperty.call(payload, 'title')
        || Object.prototype.hasOwnProperty.call(payload, 'content')
      ) {
        const current = listNotices().find((item) => item.id === id);
        const error = validateNoticePayload({ ...current, ...payload });
        if (error) {
          fail(res, 400, error);
          return;
        }
      }
      const notice = updateNotice(id, payload);
      if (!notice) {
        fail(res, 404, '公告不存在');
        return;
      }
      ok(res, { notice }, '公告已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/notices/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/admin/notices/', ''));
    const notice = deleteNotice(id);
    if (!notice) {
      fail(res, 404, '公告不存在');
      return;
    }
    ok(res, { notice }, '公告已删除');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/bookings') {
    const status = url.searchParams.get('status') || 'all';
    const date = url.searchParams.get('date') || '';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(10, Math.max(1, Number(url.searchParams.get('pageSize') || 10)));
    const allBookings = listBookings({ status, date }).map(toAdminBooking);
    const total = allBookings.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    ok(res, {
      bookings: allBookings.slice(start, start + pageSize),
      page: safePage,
      pageSize,
      total,
      totalPages
    });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/bookings/')) {
    try {
      const id = decodeURIComponent(url.pathname.replace('/api/admin/bookings/', ''));
      const payload = await readJson(req);
      if (
        Object.prototype.hasOwnProperty.call(payload, 'status')
        && !bookingStatuses.has(payload.status)
      ) {
        fail(res, 400, '预约状态不正确');
        return;
      }
      if (
        Object.prototype.hasOwnProperty.call(payload, 'paymentStatus')
        && !bookingPaymentStatuses.has(payload.paymentStatus)
      ) {
        fail(res, 400, '支付状态不正确');
        return;
      }
      let booking = getBooking(id);
      if (!booking) {
        fail(res, 404, '预约不存在');
        return;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
        if (!canChangeBookingStatus(booking.status, payload.status)) {
          fail(res, 400, '该状态不能重复或回退操作');
          return;
        }
        booking = updateBookingStatus(id, payload.status);
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'paymentStatus')) {
        booking = updateBookingPayment(id, {
          paymentStatus: payload.paymentStatus,
          paymentMethod: payload.paymentMethod || 'offline'
        });
      }
      ok(res, { booking: toAdminBooking(booking) }, '预约已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/subscribers') {
    ok(res, { subscribers: listSubscribers() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/members') {
    const orderPage = Math.max(1, Number(url.searchParams.get('orderPage') || 1));
    const orderPageSize = Math.min(10, Math.max(1, Number(url.searchParams.get('orderPageSize') || 10)));
    const allOrders = listMemberOrders().map(toAdminMemberOrder);
    const totalOrders = allOrders.length;
    const totalOrderPages = Math.max(1, Math.ceil(totalOrders / orderPageSize));
    const safeOrderPage = Math.min(orderPage, totalOrderPages);
    const orderStart = (safeOrderPage - 1) * orderPageSize;
    ok(res, {
      members: listMembers().map(toAdminMember),
      balanceLogs: listMemberBalanceLogs({ limit: 80 }).map(toAdminMemberBalanceLog),
      orders: allOrders.slice(orderStart, orderStart + orderPageSize),
      orderPage: safeOrderPage,
      orderPageSize,
      totalOrders,
      totalOrderPages
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/users') {
    const type = url.searchParams.get('type') || 'all';
    const keyword = (url.searchParams.get('keyword') || '').trim();
    let users = listAdminUsers();
    if (type !== 'all') {
      users = users.filter((item) => (
        memberLevels.has(type)
          ? item.level === type
          : item.userType === type
      ));
    }
    if (keyword) {
      users = users.filter((item) => (
        item.phone.includes(keyword)
        || item.name.includes(keyword)
        || item.accountName.includes(keyword)
      ));
    }
    ok(res, { users });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/user-orders') {
    const phone = (url.searchParams.get('phone') || '').trim();
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(10, Math.max(1, Number(url.searchParams.get('pageSize') || 10)));
    if (!phone) {
      fail(res, 400, '请选择用户');
      return;
    }
    const ordersForUser = listMemberOrders({ phone }).map(toAdminMemberOrder);
    const total = ordersForUser.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    ok(res, {
      orders: ordersForUser.slice(start, start + pageSize),
      page: safePage,
      pageSize,
      total,
      totalPages
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/members') {
    try {
      const payload = await readJson(req);
      const error = validateMemberPayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      ok(res, { member: toAdminMember(addMember(payload)) }, '会员已新增');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/member-balance-logs') {
    const memberId = url.searchParams.get('memberId') || '';
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 80)));
    ok(res, {
      balanceLogs: listMemberBalanceLogs({ memberId, limit }).map(toAdminMemberBalanceLog)
    });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/members/') && url.pathname.endsWith('/balance')) {
    try {
      const id = decodeURIComponent(url.pathname.replace('/api/admin/members/', '').replace('/balance', ''));
      const payload = await readJson(req);
      const error = validateMemberBalancePayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      const result = setMemberBalance(id, payload.balance, {
        changeType: payload.changeType || 'admin_adjustment',
        operatorType: 'admin',
        operatorId: req.admin.id,
        operatorName: req.admin.username,
        remark: payload.remark
      });
      if (!result) {
        fail(res, 404, '会员不存在');
        return;
      }
      if (result.noChange) {
        fail(res, 400, '余额没有变化');
        return;
      }
      ok(res, {
        member: toAdminMember(result.member),
        balanceLog: toAdminMemberBalanceLog(result.log)
      }, '会员余额已调整');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/members/')) {
    try {
      const id = decodeURIComponent(url.pathname.replace('/api/admin/members/', ''));
      const payload = await readJson(req);
      if (Object.prototype.hasOwnProperty.call(payload, 'balance')) {
        fail(res, 400, '请通过余额调整入口修改会员余额');
        return;
      }
      const error = validateMemberPayload(payload, true);
      if (error) {
        fail(res, 400, error);
        return;
      }
      const updatedMember = updateMember(id, payload);
      if (!updatedMember) {
        fail(res, 404, '会员不存在');
        return;
      }
      ok(res, { member: toAdminMember(updatedMember) }, '会员已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/members/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/admin/members/', ''));
    const deletedMember = deleteMember(id);
    if (!deletedMember) {
      fail(res, 404, '会员不存在');
      return;
    }
    ok(res, { member: deletedMember }, '会员已删除');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/member-orders') {
    try {
      const payload = await readJson(req);
      const error = validateMemberOrderPayload(payload);
      if (error) {
        fail(res, 400, error);
        return;
      }
      const order = addMemberOrder(payload);
      if (!order) {
        fail(res, 404, '会员不存在');
        return;
      }
      ok(res, { order: toAdminMemberOrder(order) }, '会员订单已新增');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/member-orders/')) {
    try {
      const id = decodeURIComponent(url.pathname.replace('/api/admin/member-orders/', ''));
      const payload = await readJson(req);
      const order = updateMemberOrder(id, payload);
      if (!order) {
        fail(res, 404, '会员订单不存在');
        return;
      }
      ok(res, { order: toAdminMemberOrder(order) }, '会员订单已更新');
    } catch (error) {
      fail(res, 400, error.message);
    }
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/member-orders/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/admin/member-orders/', ''));
    const order = deleteMemberOrder(id);
    if (!order) {
      fail(res, 404, '会员订单不存在');
      return;
    }
    ok(res, { order }, '会员订单已删除');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/wechat/verify') {
    const token = process.env.WECHAT_TOKEN || '';
    const signature = url.searchParams.get('signature');
    const timestamp = url.searchParams.get('timestamp');
    const nonce = url.searchParams.get('nonce');
    const echostr = url.searchParams.get('echostr') || '';

    if (!token || verifySignature({ token, signature, timestamp, nonce })) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(echostr);
      return;
    }

    fail(res, 403, '公众号签名校验失败');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/wechat/events') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const fromUser = readXmlText(body, 'FromUserName') || 'user';
      const toUser = readXmlText(body, 'ToUserName') || 'pet-home';
      const event = readXmlText(body, 'Event');
      const content = event === 'subscribe'
        ? '欢迎关注宠之寓，回复“预约”即可获取洗护和寄养入口。'
        : '欢迎来到宠之寓，回复“预约”即可获取小程序预约入口。';
      const reply = buildTextReply({
        toUser: fromUser,
        fromUser: toUser,
        content
      });
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      res.end(reply);
    });
    return;
  }

  notFound(res);
}

module.exports = {
  route
};
