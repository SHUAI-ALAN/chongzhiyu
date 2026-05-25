const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const {
  bookings: seedBookings,
  member: seedMember,
  orders: seedOrders,
  storeConfig
} = require('./store');

const dataFile = process.env.PET_DB_FILE
  ? path.resolve(process.env.PET_DB_FILE)
  : path.resolve(__dirname, '../../runtime/pet.sqlite');

const defaultState = {
  store: {
    brandName: storeConfig.brandName,
    slogan: storeConfig.slogan,
    openingHours: storeConfig.openingHours,
    phone: storeConfig.phone,
    address: storeConfig.address,
    status: storeConfig.status,
    promoTitle: storeConfig.promoTitle,
    promoText: storeConfig.promoText,
    bookingTipTitle: storeConfig.bookingTipTitle,
    bookingTipText: storeConfig.bookingTipText
  },
  bookings: seedBookings,
  members: [
    {
      id: seedMember.id,
      accountName: seedMember.name,
      name: '李女士',
      phone: '13800138000',
      level: 'basic',
      balance: 300,
      points: seedMember.points,
      pets: seedMember.pets,
      remark: '演示会员',
      createdAt: '2026-05-17T10:00:00.000Z'
    }
  ],
  memberOrders: seedOrders.map((order) => ({
    ...order,
    memberId: seedMember.id,
    createdAt: '2026-05-17T10:00:00.000Z'
  })),
  subscribers: [],
  notices: storeConfig.notices || []
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDir() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeLevel(level) {
  return ['normal', 'basic', 'middle', 'senior'].includes(level) ? level : 'normal';
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .createHash('sha256')
    .update(`${salt}:${password}`)
    .digest('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  if (!password || !passwordHash || !passwordHash.includes(':')) {
    return false;
  }
  const [salt, expectedHash] = passwordHash.split(':');
  return hashPassword(password, salt) === `${salt}:${expectedHash}`;
}

ensureDir();
const db = new DatabaseSync(dataFile);
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS store_profile (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    pet_name TEXT NOT NULL,
    pet_type TEXT NOT NULL DEFAULT '',
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    remark TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    level TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT,
    pets_json TEXT NOT NULL DEFAULT '[]',
    remark TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS member_orders (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    date TEXT NOT NULL,
    remark TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    UNIQUE(phone, source)
  );

  CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    level TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
`);

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

ensureColumn('members', 'password_hash', 'TEXT');

function ensureDefaultAdmin() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM admins').get();
  if (row.count > 0) {
    return;
  }
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO admins (id, username, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(createId('admin'), 'admin', hashPassword('123456'), now, now);
}

function countRows(tableName) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
}

function seedDatabase() {
  if (
    countRows('store_profile')
    || countRows('bookings')
    || countRows('members')
    || countRows('member_orders')
    || countRows('subscribers')
    || countRows('notices')
  ) {
    return;
  }

  const state = clone(defaultState);
  const insertStore = db.prepare('INSERT INTO store_profile (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(state.store)) {
    insertStore.run(key, String(value || ''));
  }

  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      id, service_id, service_name, pet_name, pet_type, customer_name, phone,
      date, time, remark, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const booking of state.bookings) {
    insertBooking.run(
      booking.id,
      booking.serviceId,
      booking.serviceName,
      booking.petName,
      booking.petType || '',
      booking.customerName,
      booking.phone,
      booking.date,
      booking.time,
      booking.remark || '',
      booking.status,
      booking.createdAt || new Date().toISOString(),
      booking.updatedAt || null
    );
  }

  const insertMember = db.prepare(`
    INSERT INTO members (
      id, account_name, name, phone, level, balance, points,
      password_hash, pets_json, remark, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const member of state.members) {
    insertMember.run(
      member.id,
      member.accountName || '',
      member.name || '',
      member.phone || '',
      normalizeLevel(member.level),
      Number(member.balance || 0),
      Number(member.points || 0),
      member.passwordHash || null,
      JSON.stringify(member.pets || []),
      member.remark || '',
      member.createdAt || new Date().toISOString(),
      member.updatedAt || null
    );
  }

  const insertOrder = db.prepare(`
    INSERT INTO member_orders (
      id, member_id, phone, title, amount, status, date, remark, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const order of state.memberOrders) {
    insertOrder.run(
      order.id,
      order.memberId,
      order.phone,
      order.title,
      Number(order.amount || 0),
      order.status || '已完成',
      order.date || new Date().toISOString().slice(0, 10),
      order.remark || '',
      order.createdAt || new Date().toISOString(),
      order.updatedAt || null
    );
  }

  const insertSubscriber = db.prepare(`
    INSERT INTO subscribers (id, phone, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const subscriber of state.subscribers) {
    insertSubscriber.run(
      subscriber.id,
      subscriber.phone,
      subscriber.source || 'unknown',
      subscriber.createdAt || new Date().toISOString(),
      subscriber.updatedAt || null
    );
  }

  const insertNotice = db.prepare(`
    INSERT INTO notices (id, title, content, level, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const notice of state.notices) {
    insertNotice.run(
      notice.id,
      notice.title,
      notice.content,
      notice.level === 'important' ? 'important' : 'normal',
      notice.enabled === false ? 0 : 1,
      notice.createdAt || new Date().toISOString(),
      notice.updatedAt || null
    );
  }
}

seedDatabase();
ensureDefaultAdmin();

function toBooking(row) {
  return {
    id: row.id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    petName: row.pet_name,
    petType: row.pet_type,
    customerName: row.customer_name,
    phone: row.phone,
    date: row.date,
    time: row.time,
    remark: row.remark,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined
  };
}

function toMember(row) {
  return {
    id: row.id,
    accountName: row.account_name,
    name: row.name,
    phone: row.phone,
    level: row.level,
    balance: Number(row.balance || 0),
    points: Number(row.points || 0),
    passwordHash: row.password_hash || '',
    pets: JSON.parse(row.pets_json || '[]'),
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined
  };
}

function toMemberOrder(row) {
  return {
    id: row.id,
    memberId: row.member_id,
    phone: row.phone,
    title: row.title,
    amount: Number(row.amount || 0),
    status: row.status,
    date: row.date,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined
  };
}

function toSubscriber(row) {
  return {
    id: row.id,
    phone: row.phone,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined
  };
}

function toNotice(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    level: row.level,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined
  };
}

function getStoreProfile() {
  const store = clone(defaultState.store);
  const rows = db.prepare('SELECT key, value FROM store_profile').all();
  for (const row of rows) {
    store[row.key] = row.value;
  }
  return store;
}

function updateStoreProfile(payload) {
  const editableFields = [
    'brandName',
    'slogan',
    'openingHours',
    'phone',
    'address',
    'status',
    'promoTitle',
    'promoText',
    'bookingTipTitle',
    'bookingTipText'
  ];
  const stmt = db.prepare(`
    INSERT INTO store_profile (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      stmt.run(field, String(payload[field] || '').trim());
    }
  }
  return getStoreProfile();
}

function listBookings(filters = {}) {
  let sql = 'SELECT * FROM bookings';
  const params = [];
  const where = [];
  if (filters.status && filters.status !== 'all') {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.date) {
    where.push('date = ?');
    params.push(filters.date);
  }
  if (where.length) {
    sql += ` WHERE ${where.join(' AND ')}`;
  }
  sql += ' ORDER BY date DESC, time DESC';
  return db.prepare(sql).all(...params).map(toBooking);
}

function addBooking(booking) {
  db.prepare(`
    INSERT INTO bookings (
      id, service_id, service_name, pet_name, pet_type, customer_name, phone,
      date, time, remark, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    booking.id,
    booking.serviceId,
    booking.serviceName,
    booking.petName,
    booking.petType || '',
    booking.customerName,
    booking.phone,
    booking.date,
    booking.time,
    booking.remark || '',
    booking.status,
    booking.createdAt || new Date().toISOString(),
    booking.updatedAt || null
  );
  return booking;
}

function updateBookingStatus(id, status) {
  const now = new Date().toISOString();
  db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  return row ? toBooking(row) : null;
}

function listMembers() {
  return db.prepare(`
    SELECT * FROM members
    ORDER BY COALESCE(updated_at, created_at) DESC
  `).all().map(toMember);
}

function getMember(id) {
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  return row ? toMember(row) : null;
}

function getMemberByPhone(phone) {
  const row = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone);
  return row ? toMember(row) : null;
}

function getPrimaryMember() {
  const row = db.prepare('SELECT * FROM members ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1').get();
  return row ? toMember(row) : clone(defaultState.members[0]);
}

function addMember(payload) {
  const now = new Date().toISOString();
  const member = {
    id: createId('mem'),
    accountName: String(payload.accountName || '').trim(),
    name: String(payload.name || '').trim(),
    phone: String(payload.phone || '').trim(),
    level: normalizeLevel(payload.level || 'normal'),
    balance: Number(payload.balance || 0),
    points: Number(payload.points || 0),
    passwordHash: payload.password ? hashPassword(String(payload.password)) : payload.passwordHash || null,
    pets: [],
    remark: String(payload.remark || '').trim(),
    createdAt: now,
    updatedAt: now
  };
  db.prepare(`
    INSERT INTO members (
      id, account_name, name, phone, level, balance, points,
      password_hash, pets_json, remark, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    member.id,
    member.accountName,
    member.name,
    member.phone,
    member.level,
    member.balance,
    member.points,
    member.passwordHash,
    JSON.stringify(member.pets),
    member.remark,
    member.createdAt,
    member.updatedAt
  );
  return member;
}

function registerUser(payload) {
  const existing = getMemberByPhone(String(payload.phone || '').trim());
  if (existing) {
    if (!existing.passwordHash && payload.password) {
      return updateMember(existing.id, { password: payload.password });
    }
    return existing;
  }
  return addMember({
    accountName: payload.accountName,
    name: payload.accountName,
    phone: payload.phone,
    password: payload.password,
    level: 'normal',
    balance: 0,
    points: 0,
    remark: '官网注册用户'
  });
}

function updateMember(id, payload) {
  const member = getMember(id);
  if (!member) {
    return null;
  }
  const nextMember = { ...member };
  for (const field of ['accountName', 'name', 'phone', 'remark']) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      nextMember[field] = String(payload[field] || '').trim();
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'level')) {
    nextMember.level = normalizeLevel(payload.level);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'balance')) {
    nextMember.balance = Number(payload.balance || 0);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'points')) {
    nextMember.points = Number(payload.points || 0);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'password')) {
    nextMember.passwordHash = hashPassword(String(payload.password || ''));
  }
  nextMember.updatedAt = new Date().toISOString();
  db.prepare(`
    UPDATE members SET
      account_name = ?, name = ?, phone = ?, level = ?, balance = ?,
      points = ?, password_hash = ?, remark = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nextMember.accountName,
    nextMember.name,
    nextMember.phone,
    nextMember.level,
    nextMember.balance,
    nextMember.points,
    nextMember.passwordHash || null,
    nextMember.remark,
    nextMember.updatedAt,
    id
  );
  return getMember(id);
}

function deleteMember(id) {
  const member = getMember(id);
  if (!member) {
    return null;
  }
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
  return member;
}

function clearUsers() {
  db.exec('DELETE FROM member_orders; DELETE FROM members;');
}

function listMemberOrders(filters = {}) {
  let sql = 'SELECT * FROM member_orders';
  const params = [];
  const where = [];
  if (filters.memberId && filters.memberId !== 'all') {
    where.push('member_id = ?');
    params.push(filters.memberId);
  }
  if (filters.phone) {
    where.push('phone = ?');
    params.push(filters.phone);
  }
  if (where.length) {
    sql += ` WHERE ${where.join(' AND ')}`;
  }
  sql += ' ORDER BY date DESC, created_at DESC';
  return db.prepare(sql).all(...params).map(toMemberOrder);
}

function addMemberOrder(payload) {
  const member = getMember(payload.memberId);
  if (!member) {
    return null;
  }
  const now = new Date().toISOString();
  const order = {
    id: createId('ord'),
    memberId: member.id,
    phone: member.phone,
    title: String(payload.title || '').trim(),
    amount: Number(payload.amount || 0),
    status: String(payload.status || '已完成').trim(),
    date: String(payload.date || '').trim() || now.slice(0, 10),
    remark: String(payload.remark || '').trim(),
    createdAt: now,
    updatedAt: now
  };
  db.prepare(`
    INSERT INTO member_orders (
      id, member_id, phone, title, amount, status, date, remark, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id,
    order.memberId,
    order.phone,
    order.title,
    order.amount,
    order.status,
    order.date,
    order.remark,
    order.createdAt,
    order.updatedAt
  );
  return order;
}

function updateMemberOrder(id, payload) {
  const order = db.prepare('SELECT * FROM member_orders WHERE id = ?').get(id);
  if (!order) {
    return null;
  }
  const nextOrder = toMemberOrder(order);
  for (const field of ['title', 'status', 'date', 'remark']) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      nextOrder[field] = String(payload[field] || '').trim();
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'amount')) {
    nextOrder.amount = Number(payload.amount || 0);
  }
  nextOrder.updatedAt = new Date().toISOString();
  db.prepare(`
    UPDATE member_orders
    SET title = ?, amount = ?, status = ?, date = ?, remark = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nextOrder.title,
    nextOrder.amount,
    nextOrder.status,
    nextOrder.date,
    nextOrder.remark,
    nextOrder.updatedAt,
    id
  );
  return toMemberOrder(db.prepare('SELECT * FROM member_orders WHERE id = ?').get(id));
}

function deleteMemberOrder(id) {
  const row = db.prepare('SELECT * FROM member_orders WHERE id = ?').get(id);
  if (!row) {
    return null;
  }
  db.prepare('DELETE FROM member_orders WHERE id = ?').run(id);
  return toMemberOrder(row);
}

function listSubscribers() {
  return db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all().map(toSubscriber);
}

function addSubscriber(payload) {
  const existing = db.prepare('SELECT * FROM subscribers WHERE phone = ? AND source = ?')
    .get(payload.phone, payload.source || 'unknown');
  if (existing) {
    const now = new Date().toISOString();
    db.prepare('UPDATE subscribers SET updated_at = ? WHERE id = ?').run(now, existing.id);
    return toSubscriber(db.prepare('SELECT * FROM subscribers WHERE id = ?').get(existing.id));
  }

  const subscriber = {
    id: createId('sub'),
    phone: payload.phone,
    source: payload.source || 'unknown',
    createdAt: new Date().toISOString()
  };
  db.prepare('INSERT INTO subscribers (id, phone, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(subscriber.id, subscriber.phone, subscriber.source, subscriber.createdAt, null);
  return subscriber;
}

function listNotices(options = {}) {
  let sql = 'SELECT * FROM notices';
  if (options.enabledOnly) {
    sql += ' WHERE enabled = 1';
  }
  sql += ' ORDER BY COALESCE(updated_at, created_at) DESC';
  return db.prepare(sql).all().map(toNotice);
}

function addNotice(payload) {
  const now = new Date().toISOString();
  const notice = {
    id: createId('notice'),
    title: String(payload.title || '').trim(),
    content: String(payload.content || '').trim(),
    level: payload.level === 'important' ? 'important' : 'normal',
    enabled: payload.enabled !== false,
    createdAt: now,
    updatedAt: now
  };
  db.prepare(`
    INSERT INTO notices (id, title, content, level, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    notice.id,
    notice.title,
    notice.content,
    notice.level,
    notice.enabled ? 1 : 0,
    notice.createdAt,
    notice.updatedAt
  );
  return notice;
}

function updateNotice(id, payload) {
  const notice = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!notice) {
    return null;
  }
  const nextNotice = toNotice(notice);
  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    nextNotice.title = String(payload.title || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'content')) {
    nextNotice.content = String(payload.content || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'level')) {
    nextNotice.level = payload.level === 'important' ? 'important' : 'normal';
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'enabled')) {
    nextNotice.enabled = payload.enabled !== false;
  }
  nextNotice.updatedAt = new Date().toISOString();
  db.prepare(`
    UPDATE notices
    SET title = ?, content = ?, level = ?, enabled = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nextNotice.title,
    nextNotice.content,
    nextNotice.level,
    nextNotice.enabled ? 1 : 0,
    nextNotice.updatedAt,
    id
  );
  return toNotice(db.prepare('SELECT * FROM notices WHERE id = ?').get(id));
}

function deleteNotice(id) {
  const row = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!row) {
    return null;
  }
  db.prepare('DELETE FROM notices WHERE id = ?').run(id);
  return toNotice(row);
}

function toAdmin(row) {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined
  };
}

function getAdminByUsername(username) {
  const row = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  return row ? toAdmin(row) : null;
}

function getAdmin(id) {
  const row = db.prepare('SELECT * FROM admins WHERE id = ?').get(id);
  return row ? toAdmin(row) : null;
}

function updateAdminPassword(id, password) {
  const admin = getAdmin(id);
  if (!admin) {
    return null;
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(hashPassword(String(password || '')), now, id);
  return getAdmin(id);
}

function resetRuntimeState(nextState = defaultState) {
  db.exec('DELETE FROM member_orders; DELETE FROM bookings; DELETE FROM members; DELETE FROM subscribers; DELETE FROM notices; DELETE FROM store_profile;');
  const insertStore = db.prepare('INSERT INTO store_profile (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(nextState.store || defaultState.store)) {
    insertStore.run(key, String(value || ''));
  }
  for (const booking of nextState.bookings || []) addBooking(booking);
  for (const member of nextState.members || []) {
    db.prepare(`
      INSERT INTO members (
        id, account_name, name, phone, level, balance, points,
        password_hash, pets_json, remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      member.id,
      member.accountName || '',
      member.name || '',
      member.phone || '',
      normalizeLevel(member.level),
      Number(member.balance || 0),
      Number(member.points || 0),
      member.passwordHash || null,
      JSON.stringify(member.pets || []),
      member.remark || '',
      member.createdAt || new Date().toISOString(),
      member.updatedAt || null
    );
  }
  for (const order of nextState.memberOrders || []) addMemberOrder(order);
  for (const subscriber of nextState.subscribers || []) addSubscriber(subscriber);
  for (const notice of nextState.notices || []) addNotice(notice);
}

module.exports = {
  dataFile,
  getStoreProfile,
  updateStoreProfile,
  listBookings,
  addBooking,
  updateBookingStatus,
  listMembers,
  getPrimaryMember,
  getMemberByPhone,
  addMember,
  registerUser,
  verifyPassword,
  updateMember,
  deleteMember,
  clearUsers,
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
  resetRuntimeState
};
