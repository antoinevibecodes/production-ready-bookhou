const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { generateInvoicePDF } = require('../utils/pdf');
const { sendInvoiceEmail } = require('../utils/email');

// List invoices for a booking
router.get('/', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.query;
    const where = {};
    if (bookingId) where.bookingId = parseInt(bookingId);

    const invoices = await req.prisma.invoice.findMany({
      where,
      include: { booking: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const invoice = await req.prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        booking: {
          include: {
            venue: true,
            package: true,
            addOns: true,
            transactions: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Generate invoice PDF
// BUG #20: PDF missing package contents, refund policy, logo
// BUG #21: Tax shown as fixed $6
// BUG #9: Refund amounts not shown on invoice
// BUG #26: Card details missing from invoice
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: true,
        package: true,
        addOns: true,
        transactions: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const packagePrice = booking.package?.price || 0;
    const addOnsTotal = booking.addOns.reduce((s, a) => s + a.price * a.quantity, 0);
    const subtotal = packagePrice + addOnsTotal;
    const taxAmount = Math.round(subtotal * 0.06); // 6% tax

    // Include refund transactions in balance calculation
    const totalPaid = booking.transactions
      .filter(t => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalRefunded = booking.transactions
      .filter(t => t.type === 'REFUND')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalAmount = subtotal + taxAmount;

    const invoice = await req.prisma.invoice.create({
      data: {
        bookingId,
        totalAmount,
        taxAmount,
      },
    });

    // Generate PDF
    const pdfPath = await generateInvoicePDF(booking, booking.transactions, invoice);

    // Update invoice with PDF path
    const updated = await req.prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfPath },
      include: { booking: true },
    });

    res.status(201).json(updated);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Email invoice to host
router.post('/email', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: true,
        package: true,
        addOns: true,
        transactions: true,
        invoices: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Generate a fresh invoice if none exists or use the latest
    let pdfPath;
    if (booking.invoices.length > 0 && booking.invoices[0].pdfPath) {
      pdfPath = booking.invoices[0].pdfPath;
    } else {
      // Generate new invoice
      const packagePrice = booking.package?.price || 0;
      const addOnsTotal = booking.addOns.reduce((s, a) => s + a.price * a.quantity, 0);
      const subtotal = packagePrice + addOnsTotal;
      const taxAmount = Math.round(subtotal * 0.06);
      const totalAmount = subtotal + taxAmount;

      const invoice = await req.prisma.invoice.create({
        data: { bookingId, totalAmount, taxAmount },
      });

      pdfPath = await generateInvoicePDF(booking, booking.transactions, invoice);

      await req.prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfPath },
      });
    }

    await sendInvoiceEmail({
      to: booking.hostEmail,
      booking,
      pdfPath,
    });

    res.json({ success: true, sentTo: booking.hostEmail });
  } catch (error) {
    console.error('Error emailing invoice:', error);
    res.status(500).json({ error: 'Failed to email invoice' });
  }
});

// View invoice PDF inline in browser
router.get('/view/:bookingId', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);

    // Find latest invoice for this booking
    const invoice = await req.prisma.invoice.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });

    if (!invoice || !invoice.pdfPath) {
      // Generate one if none exists
      const booking = await req.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { venue: true, package: true, addOns: true, transactions: true },
      });

      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const packagePrice = booking.package?.price || 0;
      const addOnsTotal = booking.addOns.reduce((s, a) => s + a.price * a.quantity, 0);
      const subtotal = packagePrice + addOnsTotal;
      const taxAmount = Math.round(subtotal * 0.06);
      const totalAmount = subtotal + taxAmount;

      const newInvoice = await req.prisma.invoice.create({
        data: { bookingId, totalAmount, taxAmount },
      });

      const pdfPath = await generateInvoicePDF(booking, booking.transactions, newInvoice);

      await req.prisma.invoice.update({
        where: { id: newInvoice.id },
        data: { pdfPath },
      });

      const fs = require('fs');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="invoice_${bookingId}.pdf"`);
      fs.createReadStream(pdfPath).pipe(res);
      return;
    }

    const fs = require('fs');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice_${bookingId}.pdf"`);
    fs.createReadStream(invoice.pdfPath).pipe(res);
  } catch (error) {
    console.error('Error viewing invoice:', error);
    res.status(500).json({ error: 'Failed to view invoice' });
  }
});

// Download invoice PDF
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const invoice = await req.prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!invoice || !invoice.pdfPath) {
      return res.status(404).json({ error: 'Invoice PDF not found' });
    }

    res.download(invoice.pdfPath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

module.exports = router;
