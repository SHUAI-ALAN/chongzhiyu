const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

process.env.PET_DB_FILE = path.join(os.tmpdir(), `pet-home-smoke-${process.pid}.sqlite`);

const { route } = require('../server/src/routes');

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    route(req, res, url).catch((error) => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 500, message: error.message || '服务器错误' }));
    });
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function getJson(base, apiPath, token = '') {
  const response = await fetch(`${base}${apiPath}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const payload = await response.json();
  if (payload.code !== 0) {
    throw new Error(`${apiPath} failed: ${payload.message}`);
  }
  return payload.data;
}

async function main() {
  const server = createServer();
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;

  try {
    await getJson(base, '/health');
    await getJson(base, '/api/config');
    const serviceData = await getJson(base, '/api/services');
    await getJson(base, '/api/products');
    const service = serviceData.services[0];
    const slotData = await getJson(base, `/api/slots?serviceId=${service.id}`);
    const day = slotData.slots.find((item) => item.times.some((time) => time.available));
    const time = day.times.find((item) => item.available).time;

    const bookingResponse = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: service.id,
        petType: 'dog',
        customerName: '李女士',
        phone: '13800138000',
        date: day.date,
        time
      })
    });
    const booking = await bookingResponse.json();
    if (booking.code !== 0) {
      throw new Error(`booking failed: ${booking.message}`);
    }

    const duplicateResponse = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: service.id,
        customerName: '李女士',
        phone: '13800138000',
        date: day.date,
        time
      })
    });
    const duplicate = await duplicateResponse.json();
    if (duplicate.code === 0) {
      throw new Error('duplicate booking should fail');
    }

    const subscribeResponse = await fetch(`${base}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800138000', source: 'official-account' })
    });
    const subscribe = await subscribeResponse.json();
    if (subscribe.code !== 0) {
      throw new Error(`subscribe failed: ${subscribe.message}`);
    }

    const officialResponse = await fetch(`${base}/official/`);
    const officialHtml = await officialResponse.text();
    if (!officialHtml.includes('宠之寓')) {
      throw new Error('/official/ did not render expected brand text');
    }

    const accountResponse = await fetch(`${base}/official/account.html`);
    const accountHtml = await accountResponse.text();
    if (!accountHtml.includes('account.js')) {
      throw new Error('/official/account.html did not render account page');
    }

    const adminResponse = await fetch(`${base}/admin/`);
    const adminHtml = await adminResponse.text();
    if (!adminHtml.includes('门店后台')) {
      throw new Error('/admin/ did not render expected admin text');
    }

    const redirectResponse = await fetch(`${base}/official`, { redirect: 'manual' });
    if (redirectResponse.status !== 302) {
      throw new Error('/official should redirect to /official/');
    }

    const rootRedirectResponse = await fetch(`${base}/`, { redirect: 'manual' });
    if (rootRedirectResponse.status !== 302) {
      throw new Error('/ should redirect to /official/');
    }

    const adminLoginResponse = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' })
    });
    const adminLogin = await adminLoginResponse.json();
    if (adminLogin.code !== 0 || !adminLogin.data.token) {
      throw new Error(`admin login failed: ${adminLogin.message}`);
    }
    const adminToken = adminLogin.data.token;
    const sessionData = await getJson(base, '/api/admin/session', adminToken);
    if (!sessionData.admin || sessionData.admin.username !== 'admin') {
      throw new Error('admin session check failed');
    }

    const adminBookings = await getJson(base, '/api/admin/bookings', adminToken);
    const createdBooking = adminBookings.bookings.find((item) => item.id === booking.data.booking.id);
    if (!createdBooking) {
      throw new Error('created booking missing from admin list');
    }

    const patchResponse = await fetch(`${base}/api/admin/bookings/${createdBooking.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'confirmed' })
    });
    const patched = await patchResponse.json();
    if (patched.code !== 0 || patched.data.booking.status !== 'confirmed') {
      throw new Error('booking status update failed');
    }

    const completeResponse = await fetch(`${base}/api/admin/bookings/${createdBooking.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'completed' })
    });
    const completed = await completeResponse.json();
    if (completed.code !== 0 || completed.data.booking.status !== 'completed') {
      throw new Error('booking completion failed');
    }

    const memberData = await getJson(base, '/api/admin/members', adminToken);
    const payingMember = memberData.members.find((item) => item.phone === '13800138000');
    if (!payingMember) {
      throw new Error('seed member missing for payment smoke');
    }
    const balanceBeforeAdjustment = Number(payingMember.balance || 0);
    const balanceResponse = await fetch(`${base}/api/admin/members/${payingMember.id}/balance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        balance: balanceBeforeAdjustment + 50,
        remark: 'smoke test balance adjustment'
      })
    });
    const balancePatch = await balanceResponse.json();
    if (
      balancePatch.code !== 0
      || Number(balancePatch.data.member.balance || 0) !== balanceBeforeAdjustment + 50
      || balancePatch.data.balanceLog.changeType !== 'admin_adjustment'
    ) {
      throw new Error(`balance adjustment failed: ${balancePatch.message}`);
    }
    const balanceLogsData = await getJson(base, '/api/admin/member-balance-logs?limit=10', adminToken);
    if (!balanceLogsData.balanceLogs.some((item) => item.id === balancePatch.data.balanceLog.id)) {
      throw new Error('balance log missing after adjustment');
    }
    const payResponse = await fetch(`${base}/api/user/bookings/${createdBooking.id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: payingMember.id })
    });
    const paid = await payResponse.json();
    if (paid.code !== 0 || paid.data.booking.paymentStatus !== 'paid') {
      throw new Error(`member payment failed: ${paid.message}`);
    }

    const petResponse = await fetch(`${base}/api/user/pets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: payingMember.id,
        name: '奶糖',
        type: 'cat',
        breed: '布偶',
        age: '1 岁',
        weight: '4.2',
        lastGroomedAt: '2026-01-01'
      })
    });
    const pet = await petResponse.json();
    if (pet.code !== 0 || !pet.data.user.pets.some((item) => item.name === '奶糖')) {
      throw new Error(`pet add failed: ${pet.message}`);
    }

    const profileData = await getJson(base, `/api/user/profile?userId=${payingMember.id}`);
    if (!profileData.user.pets.some((item) => item.name === '奶糖')) {
      throw new Error('pet missing from user profile');
    }
    if (!profileData.balanceLogs.some((item) => item.changeType === 'member_payment')) {
      throw new Error('member payment balance log missing from user profile');
    }
    if (!profileData.user.pets.some((item) => item.name === '奶糖' && item.groomingDue)) {
      throw new Error('pet grooming reminder missing from user profile');
    }

    await getJson(base, '/api/admin/summary', adminToken);
    await getJson(base, '/api/admin/subscribers', adminToken);

    const logoutResponse = await fetch(`${base}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const logout = await logoutResponse.json();
    if (logout.code !== 0) {
      throw new Error(`admin logout failed: ${logout.message}`);
    }
    const expiredSessionResponse = await fetch(`${base}/api/admin/session`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (expiredSessionResponse.status !== 401) {
      throw new Error('admin session should expire after logout');
    }

    console.log('API smoke ok');
  } finally {
    server.close();
    try {
      if (fs.existsSync(process.env.PET_DB_FILE)) {
        fs.unlinkSync(process.env.PET_DB_FILE);
      }
    } catch (error) {
      // Windows may keep the SQLite file handle briefly after the server closes.
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
