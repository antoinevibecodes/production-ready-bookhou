const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// List all categories
router.get('/', requireAuth, async (req, res) => {
  try {
    let categories = await req.prisma.category.findMany({ orderBy: { id: 'asc' } });

    // Seed defaults if empty
    if (categories.length === 0) {
      const defaults = [
        { name: 'Birthday Party', description: 'Standard birthday party packages' },
        { name: 'Field Trip', description: 'School and group field trips' },
        { name: 'Corporate Event', description: 'Corporate team building events' },
      ];
      for (const d of defaults) {
        await req.prisma.category.create({ data: d });
      }
      categories = await req.prisma.category.findMany({ orderBy: { id: 'asc' } });
    }

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const category = await req.prisma.category.create({
      data: { name, description: description || '' },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, status } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const category = await req.prisma.category.update({ where: { id }, data: updateData });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await req.prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
