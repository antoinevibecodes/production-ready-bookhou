const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// List all automations
router.get('/', requireAuth, async (req, res) => {
  try {
    const automations = await req.prisma.emailAutomation.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(automations);
  } catch (error) {
    console.error('Error fetching email automations:', error);
    res.status(500).json({ error: 'Failed to fetch email automations' });
  }
});

// Get single automation
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const automation = await req.prisma.emailAutomation.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!automation) return res.status(404).json({ error: 'Not found' });
    res.json(automation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation' });
  }
});

// Create custom automation
router.post('/', requireAuth, async (req, res) => {
  try {
    const { subject, trigger, triggerLabel, body, sendTo, action, timeMins } = req.body;
    const automation = await req.prisma.emailAutomation.create({
      data: {
        subject,
        trigger: trigger || 'CUSTOM',
        triggerLabel: triggerLabel || trigger || 'Custom',
        body: body || '',
        sendTo: sendTo || 'host',
        action: action || 'after',
        timeMins: timeMins || 0,
        isDefault: false,
        enabled: true,
      },
    });
    res.status(201).json(automation);
  } catch (error) {
    console.error('Error creating automation:', error);
    res.status(500).json({ error: 'Failed to create automation' });
  }
});

// Update automation (edit subject, body, etc.)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { subject, body, enabled, sendTo, action, timeMins, trigger, triggerLabel } = req.body;
    const data = {};
    if (subject !== undefined) data.subject = subject;
    if (body !== undefined) data.body = body;
    if (enabled !== undefined) data.enabled = enabled;
    if (sendTo !== undefined) data.sendTo = sendTo;
    if (action !== undefined) data.action = action;
    if (timeMins !== undefined) data.timeMins = timeMins;
    if (trigger !== undefined) data.trigger = trigger;
    if (triggerLabel !== undefined) data.triggerLabel = triggerLabel;

    const automation = await req.prisma.emailAutomation.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(automation);
  } catch (error) {
    console.error('Error updating automation:', error);
    res.status(500).json({ error: 'Failed to update automation' });
  }
});

// Toggle enable/disable
router.put('/:id/toggle', requireAuth, async (req, res) => {
  try {
    const automation = await req.prisma.emailAutomation.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!automation) return res.status(404).json({ error: 'Not found' });

    const updated = await req.prisma.emailAutomation.update({
      where: { id: automation.id },
      data: { enabled: !automation.enabled },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle automation' });
  }
});

// Delete custom automation
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const automation = await req.prisma.emailAutomation.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!automation) return res.status(404).json({ error: 'Not found' });
    if (automation.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default automations. You can disable them instead.' });
    }
    await req.prisma.emailAutomation.delete({ where: { id: automation.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete automation' });
  }
});

module.exports = router;
