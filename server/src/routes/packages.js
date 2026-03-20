const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');

// Ensure package-images directory exists
const uploadDir = path.join(__dirname, '../../uploads/package-images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// List packages
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type, activeOnly } = req.query;
    const where = {};
    if (type) where.type = type;
    if (activeOnly === 'true') where.status = 'active';

    const packages = await req.prisma.package.findMany({ where, orderBy: { position: 'asc' } });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get single package
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const pkg = await req.prisma.package.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

// Create package
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, contents, price, cost, extraPerson, guestIncluded, type, eventType, days, rooms, priceTiers } = req.body;
    const maxPos = await req.prisma.package.aggregate({ _max: { position: true } });
    const pkg = await req.prisma.package.create({
      data: {
        name,
        description: description || '',
        contents: contents || '[]',
        price: parseInt(price) || 0,
        cost: parseInt(cost) || 0,
        extraPerson: parseInt(extraPerson) || 0,
        guestIncluded: parseInt(guestIncluded) || 8,
        type: type || 'BIRTHDAY',
        eventType: eventType || 'onsite',
        days: days || '',
        rooms: rooms || '[]',
        priceTiers: priceTiers || '[]',
        images: '[]',
        status: 'active',
        position: (maxPos._max.position || 0) + 1,
      },
    });
    res.status(201).json(pkg);
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// Update package
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, contents, price, cost, extraPerson, guestIncluded, type, eventType, status, position, days, rooms, priceTiers, images } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (contents !== undefined) updateData.contents = contents;
    if (price !== undefined) updateData.price = parseInt(price);
    if (cost !== undefined) updateData.cost = parseInt(cost);
    if (extraPerson !== undefined) updateData.extraPerson = parseInt(extraPerson);
    if (guestIncluded !== undefined) updateData.guestIncluded = parseInt(guestIncluded);
    if (type !== undefined) updateData.type = type;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (status !== undefined) updateData.status = status;
    if (position !== undefined) updateData.position = parseInt(position);
    if (days !== undefined) updateData.days = days;
    if (rooms !== undefined) updateData.rooms = rooms;
    if (priceTiers !== undefined) updateData.priceTiers = priceTiers;
    if (images !== undefined) updateData.images = images;

    const pkg = await req.prisma.package.update({ where: { id }, data: updateData });
    res.json(pkg);
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// Upload package images
router.post('/:id/images', requireAuth, upload.array('images', 5), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pkg = await req.prisma.package.findUnique({ where: { id } });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const existing = JSON.parse(pkg.images || '[]');
    const newImages = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
    }));

    if (existing.length + newImages.length > 5) {
      // Remove uploaded files
      req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ error: 'Maximum of 5 images allowed' });
    }

    const allImages = [...existing, ...newImages];
    const updated = await req.prisma.package.update({
      where: { id },
      data: { images: JSON.stringify(allImages) },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Delete a package image
router.delete('/:id/images/:filename', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const pkg = await req.prisma.package.findUnique({ where: { id } });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const images = JSON.parse(pkg.images || '[]').filter(img => img.filename !== filename);
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const updated = await req.prisma.package.update({
      where: { id },
      data: { images: JSON.stringify(images) },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Toggle status
router.put('/:id/toggle', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pkg = await req.prisma.package.findUnique({ where: { id } });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    const updated = await req.prisma.package.update({
      where: { id },
      data: { status: pkg.status === 'active' ? 'disabled' : 'active' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle package status' });
  }
});

// Duplicate package
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const original = await req.prisma.package.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!original) return res.status(404).json({ error: 'Package not found' });
    const maxPos = await req.prisma.package.aggregate({ _max: { position: true } });
    const pkg = await req.prisma.package.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        contents: original.contents,
        price: original.price,
        cost: original.cost,
        extraPerson: original.extraPerson,
        guestIncluded: original.guestIncluded,
        type: original.type,
        eventType: original.eventType,
        days: original.days,
        rooms: original.rooms,
        priceTiers: original.priceTiers,
        images: original.images,
        status: 'active',
        position: (maxPos._max.position || 0) + 1,
      },
    });
    res.status(201).json(pkg);
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate package' });
  }
});

// Delete package
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const hasBookings = await req.prisma.booking.count({ where: { packageId: id } });
    if (hasBookings > 0) {
      return res.status(400).json({ error: 'Cannot delete package with existing bookings. Disable it instead.' });
    }
    // Delete associated images
    const pkg = await req.prisma.package.findUnique({ where: { id } });
    if (pkg) {
      const images = JSON.parse(pkg.images || '[]');
      images.forEach(img => {
        const fp = path.join(uploadDir, img.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      });
    }
    await req.prisma.package.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

module.exports = router;
