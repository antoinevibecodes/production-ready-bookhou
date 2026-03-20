const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// List add-ons for a booking
router.get('/', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.query;
    const where = {};
    if (bookingId) where.bookingId = parseInt(bookingId);

    const addOns = await req.prisma.addOn.findMany({ where });
    res.json(addOns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch add-ons' });
  }
});

// Add an add-on to a booking
// BUG #12: No custom amount or description - only predefined add-ons
router.post('/', requireAuth, async (req, res) => {
  try {
    const { bookingId, name, price, quantity } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }

    const addOn = await req.prisma.addOn.create({
      data: {
        bookingId,
        name,
        price: parseInt(price),
        quantity: quantity || 1,
      },
    });

    res.status(201).json(addOn);
  } catch (error) {
    console.error('Error adding add-on:', error);
    res.status(500).json({ error: 'Failed to add add-on' });
  }
});

// Delete add-on
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await req.prisma.addOn.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete add-on' });
  }
});

module.exports = router;
