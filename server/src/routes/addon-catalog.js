const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../../uploads/addons');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `addon-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// List all catalog add-ons
router.get('/', requireAuth, async (req, res) => {
  try {
    const addons = await req.prisma.addOnCatalog.findMany({ orderBy: { position: 'asc' } });
    res.json(addons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch add-on catalog' });
  }
});

// Create add-on
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, cost, days } = req.body;
    const maxPos = await req.prisma.addOnCatalog.aggregate({ _max: { position: true } });
    const addon = await req.prisma.addOnCatalog.create({
      data: {
        name,
        description: description || '',
        price: parseInt(price) || 0,
        cost: parseInt(cost) || 0,
        days: days || '',
        image: req.file ? req.file.filename : null,
        position: (maxPos._max.position || 0) + 1,
      },
    });
    res.status(201).json(addon);
  } catch (error) {
    console.error('Error creating add-on:', error);
    res.status(500).json({ error: 'Failed to create add-on' });
  }
});

// Update add-on
router.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, price, cost, days, position } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseInt(price) || 0;
    if (cost !== undefined) updateData.cost = parseInt(cost) || 0;
    if (days !== undefined) updateData.days = days;
    if (position !== undefined) updateData.position = parseInt(position);
    if (req.file) updateData.image = req.file.filename;

    const addon = await req.prisma.addOnCatalog.update({ where: { id }, data: updateData });
    res.json(addon);
  } catch (error) {
    console.error('Error updating add-on:', error);
    res.status(500).json({ error: 'Failed to update add-on' });
  }
});

// Upload image for existing add-on
router.post('/:id/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const id = parseInt(req.params.id);
    const addon = await req.prisma.addOnCatalog.update({
      where: { id },
      data: { image: req.file.filename },
    });
    res.json(addon);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Duplicate add-on
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const original = await req.prisma.addOnCatalog.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!original) return res.status(404).json({ error: 'Add-on not found' });
    const maxPos = await req.prisma.addOnCatalog.aggregate({ _max: { position: true } });
    const addon = await req.prisma.addOnCatalog.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        price: original.price,
        cost: original.cost,
        days: original.days,
        image: original.image,
        position: (maxPos._max.position || 0) + 1,
      },
    });
    res.status(201).json(addon);
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate add-on' });
  }
});

// Delete add-on
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const addon = await req.prisma.addOnCatalog.findUnique({ where: { id } });
    if (addon && addon.image) {
      const imgPath = path.join(uploadDir, addon.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await req.prisma.addOnCatalog.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete add-on' });
  }
});

module.exports = router;
