const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');

// Ensure room-images directory exists
const uploadDir = path.join(__dirname, '../../uploads/room-images');
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

// List all rooms ordered by position
router.get('/', requireAuth, async (req, res) => {
  try {
    const venues = await req.prisma.venue.findMany({ orderBy: { position: 'asc' } });
    res.json(venues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// Get single room
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const venue = await req.prisma.venue.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

// Create new room
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, capacity, firstSlot, lastSlot, durationMins, bufferMins, color, days, timeSlots } = req.body;
    const maxPos = await req.prisma.venue.aggregate({ _max: { position: true } });
    const venue = await req.prisma.venue.create({
      data: {
        name,
        description: description || '',
        address: '2055 Beaver Ruin Road, Norcross, GA 30071',
        timezone: 'America/New_York',
        capacity: capacity || 20,
        firstSlot: firstSlot || '12:00 PM',
        lastSlot: lastSlot || '06:00 PM',
        durationMins: durationMins || 90,
        bufferMins: bufferMins || 30,
        position: (maxPos._max.position || 0) + 1,
        color: color || '#ef4444',
        days: days || '',
        timeSlots: timeSlots || '[]',
      },
    });
    res.status(201).json(venue);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Update room
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, capacity, firstSlot, lastSlot, durationMins, bufferMins, position, color, days, timeSlots } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (firstSlot !== undefined) updateData.firstSlot = firstSlot;
    if (lastSlot !== undefined) updateData.lastSlot = lastSlot;
    if (durationMins !== undefined) updateData.durationMins = durationMins;
    if (bufferMins !== undefined) updateData.bufferMins = bufferMins;
    if (position !== undefined) updateData.position = position;
    if (color !== undefined) updateData.color = color;
    if (days !== undefined) updateData.days = days;
    if (timeSlots !== undefined) updateData.timeSlots = timeSlots;

    const venue = await req.prisma.venue.update({ where: { id }, data: updateData });
    res.json(venue);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Duplicate room
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const original = await req.prisma.venue.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!original) return res.status(404).json({ error: 'Room not found' });

    const maxPos = await req.prisma.venue.aggregate({ _max: { position: true } });
    const venue = await req.prisma.venue.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        address: original.address,
        timezone: original.timezone,
        capacity: original.capacity,
        firstSlot: original.firstSlot,
        lastSlot: original.lastSlot,
        durationMins: original.durationMins,
        bufferMins: original.bufferMins,
        position: (maxPos._max.position || 0) + 1,
        color: original.color,
        days: original.days,
        timeSlots: original.timeSlots,
        images: original.images,
      },
    });
    res.status(201).json(venue);
  } catch (error) {
    console.error('Error duplicating room:', error);
    res.status(500).json({ error: 'Failed to duplicate room' });
  }
});

// Upload room images
router.post('/:id/images', requireAuth, upload.array('images', 5), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const venue = await req.prisma.venue.findUnique({ where: { id } });
    if (!venue) return res.status(404).json({ error: 'Room not found' });

    const existing = JSON.parse(venue.images || '[]');
    const newImages = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
    }));

    if (existing.length + newImages.length > 5) {
      req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ error: 'Maximum of 5 images allowed' });
    }

    const allImages = [...existing, ...newImages];
    const updated = await req.prisma.venue.update({
      where: { id },
      data: { images: JSON.stringify(allImages) },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error uploading room images:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Delete a room image
router.delete('/:id/images/:filename', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const venue = await req.prisma.venue.findUnique({ where: { id } });
    if (!venue) return res.status(404).json({ error: 'Room not found' });

    const images = JSON.parse(venue.images || '[]').filter(img => img.filename !== filename);
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const updated = await req.prisma.venue.update({
      where: { id },
      data: { images: JSON.stringify(images) },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Delete room
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const hasBookings = await req.prisma.booking.count({ where: { venueId: id } });
    if (hasBookings > 0) {
      return res.status(400).json({ error: 'Cannot delete room with existing bookings. Reassign bookings first.' });
    }
    const venue = await req.prisma.venue.findUnique({ where: { id } });
    if (venue) {
      const images = JSON.parse(venue.images || '[]');
      images.forEach(img => {
        const fp = path.join(uploadDir, img.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      });
    }
    await req.prisma.venue.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

module.exports = router;
