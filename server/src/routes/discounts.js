const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// List all discounts
router.get('/', requireAuth, async (req, res) => {
  try {
    const discounts = await req.prisma.discount.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(discounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});

// Validate a discount code (used by booking pages)
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const discount = await req.prisma.discount.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount) {
      return res.status(404).json({ error: 'Invalid discount code' });
    }

    if (discount.status !== 'active') {
      return res.status(400).json({ error: 'This discount code is no longer active' });
    }

    // Check limit
    if (discount.limit > 0 && discount.used >= discount.limit) {
      return res.status(400).json({ error: 'This discount code has reached its usage limit' });
    }

    // Check dates
    const today = new Date().toISOString().split('T')[0];
    if (discount.startDate && today < discount.startDate) {
      return res.status(400).json({ error: 'This discount code is not yet active' });
    }
    if (discount.endDate && today > discount.endDate) {
      return res.status(400).json({ error: 'This discount code has expired' });
    }

    res.json(discount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate discount' });
  }
});

// Apply discount (increment usage count)
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const discount = await req.prisma.discount.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount) return res.status(404).json({ error: 'Invalid code' });

    await req.prisma.discount.update({
      where: { id: discount.id },
      data: { used: discount.used + 1 },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply discount' });
  }
});

// Create discount
router.post('/', requireAuth, async (req, res) => {
  try {
    const { couponName, code, discount: discountVal, discountType, limit, startDate, endDate, eventType, type, location, paidInFull, description } = req.body;

    if (!couponName || !code) {
      return res.status(400).json({ error: 'Coupon name and code are required' });
    }

    // Check code uniqueness
    const existing = await req.prisma.discount.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(400).json({ error: 'A discount with this code already exists' });
    }

    const created = await req.prisma.discount.create({
      data: {
        couponName,
        code: code.toUpperCase(),
        discount: parseInt(discountVal) || 0,
        discountType: discountType || 'percent',
        limit: parseInt(limit) || 0,
        startDate: startDate || null,
        endDate: endDate || null,
        eventType: eventType || 'onsite',
        type: type || 'storewide',
        location: location || '',
        paidInFull: !!paidInFull,
        description: description || '',
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({ error: 'Failed to create discount' });
  }
});

// Update discount
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = {};
    const fields = ['couponName', 'code', 'discount', 'discountType', 'limit', 'startDate', 'endDate', 'eventType', 'type', 'location', 'paidInFull', 'description', 'status'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    });
    if (data.code) data.code = data.code.toUpperCase();
    if (data.discount) data.discount = parseInt(data.discount);
    if (data.limit !== undefined) data.limit = parseInt(data.limit);

    const updated = await req.prisma.discount.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating discount:', error);
    res.status(500).json({ error: 'Failed to update discount' });
  }
});

// Delete discount
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await req.prisma.discount.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete discount' });
  }
});

module.exports = router;
