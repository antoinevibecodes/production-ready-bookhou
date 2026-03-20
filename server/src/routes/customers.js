const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// ─── Lookup customer by phone (for auto-fetch on waiver form) ───
router.get('/lookup', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // Normalize phone: strip non-digits
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length < 7) return res.json({ found: false });

    const customer = await req.prisma.customer.findFirst({
      where: {
        phone: { contains: normalized.slice(-10) }, // match last 10 digits
      },
      include: {
        children: true,
        waivers: {
          where: { signedAt: { not: null } },
          orderBy: { signedAt: 'desc' },
          take: 5,
          include: { venue: true, booking: { include: { venue: true } } },
        },
      },
    });

    if (!customer) return res.json({ found: false });

    res.json({
      found: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        dob: customer.dob,
        emergencyContact: customer.emergencyContact,
        marketingOptIn: customer.marketingOptIn,
        children: customer.children,
        recentWaivers: customer.waivers.map(w => ({
          id: w.id,
          signedAt: w.signedAt,
          expiresAt: w.expiresAt,
          venueName: w.venue?.name || w.booking?.venue?.name || 'N/A',
          type: w.type,
          status: w.expiresAt && new Date(w.expiresAt) < new Date() ? 'expired' : w.status,
        })),
      },
    });
  } catch (error) {
    console.error('Error looking up customer:', error);
    res.status(500).json({ error: 'Failed to look up customer' });
  }
});

// ─── Export customers CSV ───
router.get('/export', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const customers = await req.prisma.customer.findMany({
      where,
      include: {
        children: true,
        _count: { select: { waivers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvHeader = 'First Name,Last Name,Phone,Email,Address,DOB,Emergency Contact,Marketing Opt-In,Children,Total Waivers,Created\n';
    const csvRows = customers.map(c => {
      const childNames = c.children.map(ch => ch.name).join('; ');
      const escape = (v) => `"${(v || '').toString().replace(/"/g, '""')}"`;
      return [
        escape(c.firstName),
        escape(c.lastName),
        escape(c.phone),
        escape(c.email),
        escape(c.address),
        escape(c.dob),
        escape(c.emergencyContact),
        c.marketingOptIn ? 'Yes' : 'No',
        escape(childNames),
        c._count.waivers,
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US') : '',
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers_export.csv"');
    res.send(csvHeader + csvRows);
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
});

// ─── List customers (admin) ───
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (parsedPage - 1) * parsedLimit;

    const [customers, total] = await Promise.all([
      req.prisma.customer.findMany({
        where,
        include: {
          children: true,
          _count: { select: { waivers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parsedLimit,
      }),
      req.prisma.customer.count({ where }),
    ]);

    res.json({ customers, total, page: parsedPage, limit: parsedLimit });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ─── Get customer profile with full history ───
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const customer = await req.prisma.customer.findUnique({
      where: { id },
      include: {
        children: true,
        waivers: {
          where: { signedAt: { not: null } },
          orderBy: { signedAt: 'desc' },
          include: {
            venue: true,
            booking: { include: { venue: true } },
          },
        },
      },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Compute waiver statuses
    const now = new Date();
    const waivers = customer.waivers.map(w => ({
      ...w,
      venueName: w.venue?.name || w.booking?.venue?.name || 'N/A',
      expired: w.expiresAt ? new Date(w.expiresAt) < now : false,
    }));

    res.json({ ...customer, waivers });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// ─── Create customer ───
router.post('/', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, phone, email, address, dob, emergencyContact, marketingOptIn, children } = req.body;

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ error: 'First name, last name, and phone are required' });
    }

    const customer = await req.prisma.customer.create({
      data: {
        firstName,
        lastName,
        phone: phone.replace(/\D/g, ''),
        email: email || null,
        address: address || null,
        dob: dob || null,
        emergencyContact: emergencyContact || null,
        marketingOptIn: marketingOptIn || false,
        children: children?.length ? {
          create: children.map(c => ({ name: c.name, dob: c.dob || null })),
        } : undefined,
      },
      include: { children: true },
    });

    res.status(201).json(customer);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A customer with this phone number already exists' });
    }
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// ─── Update customer ───
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const { firstName, lastName, phone, email, address, dob, emergencyContact, marketingOptIn, children } = req.body;

    const customer = await req.prisma.customer.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone: phone ? phone.replace(/\D/g, '') : undefined,
        email: email || null,
        address: address || null,
        dob: dob || null,
        emergencyContact: emergencyContact || null,
        marketingOptIn: marketingOptIn ?? undefined,
      },
    });

    // Update children: delete existing and recreate
    if (children) {
      await req.prisma.child.deleteMany({ where: { customerId: id } });
      if (children.length > 0) {
        await req.prisma.child.createMany({
          data: children.map(c => ({ customerId: id, name: c.name, dob: c.dob || null })),
        });
      }
    }

    const updated = await req.prisma.customer.findUnique({
      where: { id },
      include: { children: true },
    });

    res.json(updated);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A customer with this phone number already exists' });
    }
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

module.exports = router;
