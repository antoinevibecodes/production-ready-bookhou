const request = require('supertest');
const app = require('../src/index');

let agent;

beforeAll(async () => {
  agent = request.agent(app);
  // Login as admin
  await agent
    .post('/api/auth/login')
    .send({ email: 'admin@bookingengine.com', password: 'admin123' });
});

describe('Auth', () => {
  it('should login as admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@bookingengine.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ADMIN');
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@bookingengine.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('Bookings', () => {
  it('should list bookings', async () => {
    const res = await agent.get('/api/bookings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a single booking', async () => {
    const list = await agent.get('/api/bookings');
    if (list.body.length > 0) {
      const res = await agent.get(`/api/bookings/${list.body[0].id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(list.body[0].id);
    }
  });
});

describe('Transactions', () => {
  it('should list transactions', async () => {
    const res = await agent.get('/api/transactions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('BUG #9: should NOT show refund transactions', async () => {
    const res = await agent.get('/api/transactions');
    const refunds = res.body.filter(t => t.type === 'REFUND');
    // This tests the BUG: refunds are hidden
    expect(refunds.length).toBe(0);
  });

  it('BUG #5: should NOT include notes in response', async () => {
    const res = await agent.get('/api/transactions');
    if (res.body.length > 0) {
      // This tests the BUG: notes are stripped
      expect(res.body[0].notes).toBeUndefined();
    }
  });
});

describe('Reports', () => {
  it('should return cash report rows', async () => {
    const res = await agent.get('/api/reports/cash');
    expect(res.status).toBe(200);
    expect(res.body.rows).toBeDefined();
    expect(Array.isArray(res.body.rows)).toBe(true);
  });

  it('BUG #3: should NOT include totalAmount in cash report', async () => {
    const res = await agent.get('/api/reports/cash');
    // This tests the BUG: no totals
    expect(res.body.totalAmount).toBeUndefined();
  });

  it('BUG #8: employee should be able to access export (broken permissions)', async () => {
    const empAgent = request.agent(app);
    await empAgent
      .post('/api/auth/login')
      .send({ email: 'mike@bookingengine.com', password: 'employee123' });
    const res = await empAgent.get('/api/reports/export');
    // BUG: employee CAN access this (should be 403)
    expect(res.status).toBe(200);
  });
});

describe('Admin Dashboard', () => {
  it('BUG #11: should show totalIncome (should be hidden)', async () => {
    const res = await agent.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
    // BUG: totalIncome is exposed
    expect(res.body.totalIncome).toBeDefined();
  });

  it('BUG #8: employee can access admin dashboard', async () => {
    const empAgent = request.agent(app);
    await empAgent
      .post('/api/auth/login')
      .send({ email: 'mike@bookingengine.com', password: 'employee123' });
    const res = await empAgent.get('/api/admin/dashboard');
    // BUG: employee CAN access this
    expect(res.status).toBe(200);
  });
});

describe('Refunds', () => {
  it('BUG #10: should reject refund without percentage', async () => {
    const res = await agent
      .post('/api/refunds')
      .send({ bookingId: 1, amount: 5000 });
    // BUG #10: only percentage accepted, not amount
    expect(res.status).toBe(400);
  });
});

describe('Health', () => {
  it('should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
