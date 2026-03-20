const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const INVOICES_DIR = path.join(__dirname, '../../invoices');
const LOGO_PATH = path.join(__dirname, 'tiny-towne-logo.png');

// Ensure invoices directory exists
if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

function generateInvoicePDF(booking, transactions, invoice) {
  return new Promise((resolve, reject) => {
    const filename = `invoice_${booking.id}_${Date.now()}.pdf`;
    const filepath = path.join(INVOICES_DIR, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // ── Header: Logo + Business Info + "Invoice" title ──
    const headerTop = 40;

    // Logo (left side)
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, 50, headerTop, { width: 100 });
    }

    // Business info (center-left)
    doc.fontSize(9).fillColor('#333');
    doc.text('2055 Beaver Ruin Road, Norcross, GA 30071', 160, headerTop + 10);
    doc.text('Phone: (470) 265-6665', 160, headerTop + 22);
    doc.text('Email: ttbirthday@gmail.com', 160, headerTop + 34);

    // "Invoice" title (right side)
    doc.fontSize(22).fillColor('#000').text('Invoice', 400, headerTop + 10, { align: 'right' });

    doc.moveDown(4);
    const sectionY = 130;

    // ── Divider line ──
    doc.moveTo(50, sectionY).lineTo(560, sectionY).strokeColor('#ccc').stroke();

    // ── Host Details (left) + Invoice Details (right) ──
    const detailsY = sectionY + 15;

    // Left column: Host Details
    doc.fontSize(11).fillColor('#000').font('Helvetica-Bold').text('Host Details', 50, detailsY);
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(`Name: ${booking.hostName}`, 50, detailsY + 18);
    doc.text(`Email: ${booking.hostEmail}`, 50, detailsY + 32);
    doc.text(`Phone: ${booking.hostPhone || 'N/A'}`, 50, detailsY + 46);
    if (booking.childName) {
      doc.text(`Child: ${booking.childName}, Age: ${booking.childAge || 'N/A'}`, 50, detailsY + 60);
    }

    // Right column: Invoice Details
    doc.fontSize(10).fillColor('#333');
    doc.text(`Invoice No: #${String(invoice.id).padStart(8, '0')}`, 350, detailsY, { align: 'right' });
    doc.text(`Name: ${booking.type === 'FIELD_TRIP' ? 'Field Trip' : 'Birthday Party'}`, 350, detailsY + 18, { align: 'right' });
    if (booking.venue?.name) {
      doc.text(`${booking.venue.name}`, 350, detailsY + 32, { align: 'right' });
    }
    doc.text(`Date: ${booking.date}`, 350, detailsY + 46, { align: 'right' });
    doc.text(`Time: ${booking.startTime || 'TBD'} to ${booking.endTime || 'TBD'}`, 350, detailsY + 60, { align: 'right' });
    doc.text(`Guests: ${booking.guestCount}`, 350, detailsY + 74, { align: 'right' });

    // ── Items Table ──
    const tableTop = detailsY + 100;

    // Table header
    doc.moveTo(50, tableTop).lineTo(560, tableTop).strokeColor('#ccc').stroke();
    doc.fontSize(10).fillColor('#000').font('Helvetica-Bold');
    doc.text('Item Description', 55, tableTop + 6);
    doc.text('Qty', 370, tableTop + 6, { width: 60, align: 'center' });
    doc.text('Amount', 450, tableTop + 6, { width: 100, align: 'right' });
    doc.moveTo(50, tableTop + 22).lineTo(560, tableTop + 22).strokeColor('#ccc').stroke();

    doc.font('Helvetica').fontSize(10).fillColor('#333');
    let rowY = tableTop + 30;

    // Package line item
    const packagePrice = booking.package?.price || 0;
    doc.text(booking.package?.name || 'Package', 55, rowY);
    doc.text(String(booking.guestCount || 1), 370, rowY, { width: 60, align: 'center' });
    doc.text(`$${(packagePrice / 100).toFixed(2)}`, 450, rowY, { width: 100, align: 'right' });
    rowY += 18;

    // Add-ons
    if (booking.addOns && booking.addOns.length > 0) {
      booking.addOns.forEach(addon => {
        const addonTotal = (addon.price * addon.quantity) / 100;
        doc.text(addon.name, 55, rowY);
        doc.text(String(addon.quantity), 370, rowY, { width: 60, align: 'center' });
        doc.text(`$${addonTotal.toFixed(2)}`, 450, rowY, { width: 100, align: 'right' });
        rowY += 18;
      });
    }

    // Extra persons (field trips)
    if (booking.type === 'FIELD_TRIP' && booking.extraPersons > 0) {
      const extraCost = (booking.extraPersons * (booking.extraPersonPrice || 0)) / 100;
      doc.text(`Extra Persons ($${((booking.extraPersonPrice || 0) / 100).toFixed(2)} each)`, 55, rowY);
      doc.text(String(booking.extraPersons), 370, rowY, { width: 60, align: 'center' });
      doc.text(`$${extraCost.toFixed(2)}`, 450, rowY, { width: 100, align: 'right' });
      rowY += 18;
    }

    // ── Totals Section ──
    rowY += 8;
    doc.moveTo(350, rowY).lineTo(560, rowY).strokeColor('#ccc').stroke();
    rowY += 10;

    // Subtotal
    const addOnsTotal = (booking.addOns || []).reduce((s, a) => s + a.price * a.quantity, 0);
    const extraCost = booking.type === 'FIELD_TRIP' ? (booking.extraPersons || 0) * (booking.extraPersonPrice || 0) : 0;
    const subtotal = packagePrice + addOnsTotal + extraCost;

    doc.text('Sub Total', 370, rowY, { width: 80, align: 'left' });
    doc.text(`$${(subtotal / 100).toFixed(2)}`, 450, rowY, { width: 100, align: 'right' });
    rowY += 18;

    // Discount
    doc.text('Discount', 370, rowY, { width: 80, align: 'left' });
    doc.text('$0.00', 450, rowY, { width: 100, align: 'right' });
    rowY += 18;

    // Tax
    const taxAmount = invoice.taxAmount || Math.round(subtotal * 0.06);
    doc.text('Tax (6.00%)', 370, rowY, { width: 80, align: 'left' });
    doc.text(`$${(taxAmount / 100).toFixed(2)}`, 450, rowY, { width: 100, align: 'right' });
    rowY += 18;

    // Total
    const total = subtotal + taxAmount;
    doc.moveTo(350, rowY).lineTo(560, rowY).strokeColor('#ccc').stroke();
    rowY += 8;
    doc.font('Helvetica-Bold').fillColor('#000');
    doc.text('Total', 370, rowY, { width: 80, align: 'left' });
    doc.text(`$${(total / 100).toFixed(2)}`, 450, rowY, { width: 100, align: 'right' });
    rowY += 22;

    // ── Payment History ──
    const payments = transactions.filter(t => t.type === 'PAYMENT');
    if (payments.length > 0) {
      doc.moveTo(350, rowY).lineTo(560, rowY).strokeColor('#ccc').stroke();
      rowY += 8;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
      doc.text('Payment History', 350, rowY);
      rowY += 14;

      doc.font('Helvetica').fontSize(9).fillColor('#333');
      payments.forEach(t => {
        const dateStr = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        // Format payment method label
        let methodLabel = '';
        if (t.paymentMethod === 'card' || t.paymentMethod === 'credit_card') {
          methodLabel = t.cardLast4 ? `Visa ending in ${t.cardLast4}` : 'Credit Card';
          if (t.cardholderName) methodLabel += ` (${t.cardholderName})`;
        } else if (t.paymentMethod === 'cash') {
          methodLabel = 'Cash';
        } else if (t.paymentMethod === 'apple_pay') {
          methodLabel = 'Apple Pay';
        } else if (t.paymentMethod === 'cash_app') {
          methodLabel = 'Cash App';
        } else {
          methodLabel = t.paymentMethod || 'Other';
        }

        doc.text(dateStr, 350, rowY, { width: 80, align: 'left' });
        doc.text(methodLabel, 350, rowY + 11, { width: 155, align: 'left' });
        doc.font('Helvetica-Bold').fillColor('#16a34a');
        doc.text(`$${(t.amount / 100).toFixed(2)}`, 500, rowY + 4, { width: 55, align: 'right' });
        doc.font('Helvetica').fillColor('#333');
        rowY += 28;
      });
    }

    // Refunds
    const refunds = transactions.filter(t => t.type === 'REFUND');
    if (refunds.length > 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#333');
      refunds.forEach(t => {
        const dateStr = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        doc.text(`${dateStr}`, 350, rowY, { width: 80, align: 'left' });
        doc.text('Refund', 350, rowY + 11, { width: 155, align: 'left' });
        doc.font('Helvetica-Bold').fillColor('#dc2626');
        doc.text(`-$${(t.amount / 100).toFixed(2)}`, 500, rowY + 4, { width: 55, align: 'right' });
        doc.font('Helvetica').fillColor('#333');
        rowY += 28;
      });
    }

    // Balance
    const totalPaid = payments.reduce((s, t) => s + t.amount, 0);
    const totalRefunded = refunds.reduce((s, t) => s + t.amount, 0);
    const balance = total - totalPaid + totalRefunded;
    rowY += 6;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
    doc.text('Balance', 370, rowY, { width: 100, align: 'left' });
    doc.text(`$${(balance / 100).toFixed(2)}`, 500, rowY, { width: 55, align: 'right' });
    rowY += 22;

    // Grand Total
    doc.text('Grand Total', 370, rowY, { width: 100, align: 'left' });
    doc.text(`$${(total / 100).toFixed(2)}`, 500, rowY, { width: 55, align: 'right' });

    // ── Footer ──
    rowY += 40;
    doc.font('Helvetica').fontSize(9).fillColor('#666');
    doc.text('Refund Policy: Cancellations made 7+ days before the event receive a full refund.', 50, rowY);
    doc.text('Cancellations within 7 days receive a 50% refund. No refunds for same-day cancellations.', 50, rowY + 12);

    rowY += 35;
    doc.fontSize(11).fillColor('#000').font('Helvetica-Bold');
    doc.text('TT Drive Safely', 50, rowY);

    doc.end();

    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

const WAIVERS_DIR = path.join(__dirname, '../../waivers-pdf');
if (!fs.existsSync(WAIVERS_DIR)) {
  fs.mkdirSync(WAIVERS_DIR, { recursive: true });
}

const FULL_WAIVER_TEXT = `1) I, the undersigned, wish to play stated activity, and I recognize and understand that playing such activity (hereinafter called the "Game"), involves certain risks. Those risks include, but are not limited to, the risk of injury resulting from the use of equipment provided at the Game. I acknowledge that I have voluntarily chosen to participate notwithstanding the risks and I agree to accept any and all risks of injury, illness or death. In addition, I recognize that the exercise of playing the Game could increase my injury or illness.

2) I accept these and other risks, and fully understanding such risks. I can to play at the Game and to follow all the rules of the Game and hereby firmly and irrevocably hold the Tiny Towne LLC d/b/a Tiny Towne, its owners, managers, operators, officers, directors, shareholders, agents, employees, representatives, successors, assigns, and any and all third parties acting in any capacity on behalf of the Game, harmless from liability for any and all claims, demands, causes of actions, damages, loss, costs and expenses, lawsuits, judgments, obligations, liens, debts, and compensation whatsoever, or any other thing whatsoever, asserted, essentially, or unasserted, which may result from personal injury to me from said activity, or property damage, claimed by me or on my behalf.

3) I agree to hold harmless and indemnify the Releases from any and all liability for any damage to property or for any injury, illness or death to any person, including myself.

4) This agreement shall be effective and binding upon my heirs, next of kin, executors, personal representatives, administrators, successors and assigns.

5) I further declare that this document has been drawn up in the English language.

6) I further agree to return all of the equipment in good condition and if any of the equipment rented by me is damaged that is beyond normal wear and tear I agree that I am fully responsible for the cost of repair.

7) I understand that I am financially responsible and will be charged for any and all damages that I may cause while participating in this event, activity, or facility usage. This includes, but is not limited to, damage to property, equipment, or the venue itself.

8) I expressly agree that the foregoing Release Of Liability is intended to be as broad and inclusive as is permitted by the law of the State of Georgia and that if any portion thereof is held invalid, it is agreed that the balance shall nevertheless, continue in full legal force and effect so far as binding upon me.

9) I shall further assign to the SPONSORS all rights to use any photo or video of the taken relative to the Game I played in and allow the SPONSORS to use them in advertising.

I HAVE READ AND UNDERSTOOD THIS AGREEMENT. I AM AWARE THAT BY SIGNING THIS AGREEMENT I AM WAIVING CERTAIN LEGAL RIGHTS WHICH I OR MY HEIRS, NEXT OF KIN, EXECUTORS, PERSONAL REPRESENTATIVES, ADMINISTRATORS, SUCCESSORS AND ASSIGNS MAY HAVE AGAINST THE SPONSORS AND THEIR AGENTS AND EMPLOYEES.`;

function generateWaiverPDF(waiver, booking) {
  return new Promise((resolve, reject) => {
    const bookingId = booking?.id || 'walkin';
    const filename = `waiver_${bookingId}_${waiver.id}.pdf`;
    const filepath = path.join(WAIVERS_DIR, filename);
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const waiverData = typeof waiver.data === 'string' ? JSON.parse(waiver.data) : (waiver.data || {});

    // Title first
    doc.fontSize(20).fillColor('#1e293b').text('EVENT WAIVER', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#6b7280').text(`Signed on ${waiver.signedAt ? new Date(waiver.signedAt).toLocaleDateString() : 'N/A'}`, { align: 'center' });
    doc.moveDown(0.8);

    // Logo below title
    if (fs.existsSync(LOGO_PATH)) {
      const logoX = (doc.page.width - 160) / 2;
      doc.image(LOGO_PATH, logoX, doc.y, { width: 160 });
      doc.y += 100;
    }
    doc.moveDown(0.8);

    // ── Adult Information ──
    doc.fontSize(14).fillColor('#1e293b').text('ADULT INFORMATION', { align: 'center', underline: true });
    doc.moveDown(0.6);
    doc.fontSize(11).fillColor('#374151');

    const infoRows = [
      ['Name', waiver.guestName || 'N/A'],
      ['Email', waiverData.email || waiver.email || booking?.hostEmail || 'N/A'],
      ['Phone', waiverData.phone || waiver.phone || booking?.hostPhone || 'N/A'],
      ['Birth Date', waiverData.birthDate || 'N/A'],
      ['Address', waiverData.address || 'N/A'],
    ];

    infoRows.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value);
      doc.moveDown(0.2);
    });

    // ── Minor Information ──
    doc.moveDown(0.6);
    doc.fontSize(14).fillColor('#1e293b').text('MINOR INFORMATION', { align: 'center', underline: true });
    doc.moveDown(0.6);
    doc.fontSize(11).fillColor('#374151');

    const minors = waiverData.minors || [];
    if (minors.length === 0) {
      doc.text('No minors listed.');
    } else {
      minors.forEach((m, i) => {
        doc.text(`${i + 1}. ${m.name || 'N/A'}${m.age ? ` (Age: ${m.age})` : ''}`);
      });
    }

    // ── Liability Waiver (FULL TEXT) ──
    doc.moveDown(0.8);
    doc.fontSize(14).fillColor('#1e293b').text('LIABILITY WAIVER', { align: 'center', underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#6b7280').text('Assumption of Risk', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(8.5).fillColor('#374151').font('Helvetica');
    doc.text(FULL_WAIVER_TEXT, {
      align: 'justify',
      lineGap: 1.5,
      paragraphGap: 4,
    });

    // ── Signature Section ──
    doc.moveDown(1);
    doc.fontSize(14).fillColor('#1e293b').text('SIGNATURE', { align: 'center', underline: true });
    doc.moveDown(0.6);
    doc.fontSize(11).fillColor('#374151');
    doc.font('Helvetica-Bold').text('Guardian: ', { continued: true });
    doc.font('Helvetica').text(waiver.guardianName || waiver.guestName || 'N/A');
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('Date Signed: ', { continued: true });
    doc.font('Helvetica').text(waiver.signedAt ? new Date(waiver.signedAt).toLocaleString() : 'N/A');
    doc.moveDown(0.5);

    // Embed signature image
    if (waiver.signature && waiver.signature.startsWith('data:image')) {
      try {
        const base64Data = waiver.signature.replace(/^data:image\/\w+;base64,/, '');
        const sigBuffer = Buffer.from(base64Data, 'base64');
        // Check if we need a new page for the signature
        if (doc.y > 620) doc.addPage();
        doc.image(sigBuffer, doc.x, doc.y, { width: 250, height: 80 });
        doc.y += 90;
      } catch (e) {
        doc.text('[Signature on file]');
      }
    } else if (waiver.signature) {
      doc.fontSize(16).font('Helvetica-Oblique').text(waiver.signature);
    }

    // ── Footer — always at the bottom after signature ──
    doc.moveDown(1.5);
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica').text(
      'Tiny Towne - 2055 Beaver Ruin Road, Norcross, GA 30071 | (470) 265-6665',
      { align: 'center' }
    );

    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

module.exports = { generateInvoicePDF, generateWaiverPDF };
