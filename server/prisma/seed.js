const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.emailLog.deleteMany();
  await prisma.waiver.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.addOn.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.package.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  const adminPassword = await bcrypt.hash('admin123', 10);
  const empPassword = await bcrypt.hash('employee123', 10);

  const admin = await prisma.user.create({
    data: { email: 'admin@bookingengine.com', password: adminPassword, name: 'Sarah Admin', role: 'ADMIN' },
  });
  const employee1 = await prisma.user.create({
    data: { email: 'mike@bookingengine.com', password: empPassword, name: 'Mike Employee', role: 'EMPLOYEE' },
  });
  const employee2 = await prisma.user.create({
    data: { email: 'jessica@bookingengine.com', password: empPassword, name: 'Jessica Staff', role: 'EMPLOYEE' },
  });

  // --- Venues / Rooms (8 rooms matching Bookhou) ---
  const addr = '2055 Beaver Ruin Road, Norcross, GA 30071';
  const tz = 'America/New_York';
  const venueNY = await prisma.venue.create({
    data: { name: 'Brake Room', address: addr, timezone: tz, capacity: 20, firstSlot: '11:00 AM', lastSlot: '08:00 PM', durationMins: 90, bufferMins: 30, position: 1 },
  });
  const venueCHI = await prisma.venue.create({
    data: { name: 'Caution Corner', address: addr, timezone: tz, capacity: 20, firstSlot: '11:30 AM', lastSlot: '08:00 PM', durationMins: 90, bufferMins: 30, position: 2 },
  });
  await prisma.venue.create({
    data: { name: 'Safety Suite', address: addr, timezone: tz, capacity: 20, firstSlot: '12:00 PM', lastSlot: '08:00 PM', durationMins: 90, bufferMins: 30, position: 3 },
  });
  await prisma.venue.create({
    data: { name: 'VID Hall', address: addr, timezone: tz, capacity: 40, firstSlot: '11:00 AM', lastSlot: '09:00 PM', durationMins: 150, bufferMins: 30, position: 4 },
  });
  await prisma.venue.create({
    data: { name: 'VID Deck', address: addr, timezone: tz, capacity: 60, firstSlot: '11:00 AM', lastSlot: '08:00 PM', durationMins: 150, bufferMins: 45, position: 5 },
  });
  await prisma.venue.create({
    data: { name: 'Outdoor Covered Patio', address: addr, timezone: tz, capacity: 30, firstSlot: '12:30 PM', lastSlot: '08:00 PM', durationMins: 90, bufferMins: 30, position: 6 },
  });
  await prisma.venue.create({
    data: { name: 'Private Events', address: addr, timezone: tz, capacity: 100, firstSlot: '09:00 AM', lastSlot: '09:00 PM', durationMins: 30, bufferMins: 15, position: 7 },
  });
  await prisma.venue.create({
    data: { name: 'Field Trips Only', address: addr, timezone: tz, capacity: 100, firstSlot: '10:00 AM', lastSlot: '12:00 PM', durationMins: 15, bufferMins: 0, position: 8 },
  });

  // --- Packages ---
  const pkgBasicBday = await prisma.package.create({
    data: {
      name: 'Basic Birthday',
      description: 'Simple birthday party package',
      contents: JSON.stringify(['2 hours venue rental', '10 pizza slices', 'Paper plates & cups', 'Basic decorations']),
      price: 25000, // $250
      type: 'BIRTHDAY',
    },
  });
  const pkgDeluxeBday = await prisma.package.create({
    data: {
      name: 'Deluxe Birthday',
      description: 'Premium birthday experience',
      contents: JSON.stringify(['3 hours venue rental', '20 pizza slices', 'Premium decorations', 'Party host', 'Photo booth', 'Goodie bags for 15']),
      price: 45000, // $450
      type: 'BIRTHDAY',
    },
  });
  const pkgUltimateBday = await prisma.package.create({
    data: {
      name: 'Ultimate Birthday',
      description: 'All-inclusive birthday bash',
      contents: JSON.stringify(['4 hours venue rental', 'Unlimited pizza & drinks', 'Premium decorations', 'Dedicated party host', 'Photo booth', 'Goodie bags for 25', 'Custom cake', 'DJ']),
      price: 75000, // $750
      type: 'BIRTHDAY',
    },
  });
  const pkgFieldTrip = await prisma.package.create({
    data: {
      name: 'School Field Trip',
      description: 'Educational and fun field trip package',
      contents: JSON.stringify(['3 hours facility access', 'Group activities', 'Snack pack per student', 'Educational materials']),
      price: 50000, // $500 base for 20 students
      type: 'FIELD_TRIP',
    },
  });
  const pkgFieldTripPremium = await prisma.package.create({
    data: {
      name: 'Premium Field Trip',
      description: 'Enhanced field trip with extras',
      contents: JSON.stringify(['4 hours facility access', 'Group activities', 'Lunch per student', 'Educational materials', 'Souvenir', 'Group photo']),
      price: 80000, // $800 base for 20 students
      type: 'FIELD_TRIP',
    },
  });

  // --- Helper to create dates ---
  const today = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  function dateStr(daysOffset) {
    const d = new Date(today.getTime() + daysOffset * dayMs);
    return d.toISOString().split('T')[0];
  }

  // --- Bookings (20+ with edge cases) ---
  const bookingsData = [
    // 1. Basic birthday, NYC, today
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'John Smith', hostEmail: 'john@example.com',
      hostPhone: '212-555-0101', childName: 'Emma', childAge: 7, guestCount: 12,
      date: dateStr(0), startTime: '14:00', endTime: '16:00',
      venueId: venueNY.id, packageId: pkgBasicBday.id, userId: admin.id,
    },
    // 2. Deluxe birthday, Chicago, yesterday
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Maria Garcia', hostEmail: 'maria@example.com',
      hostPhone: '312-555-0202', childName: 'Carlos', childAge: 10, guestCount: 20,
      date: dateStr(-1), startTime: '11:00', endTime: '14:00',
      venueId: venueCHI.id, packageId: pkgDeluxeBday.id, userId: employee1.id,
    },
    // 3. Ultimate birthday, NYC, 3 days ago
    {
      type: 'BIRTHDAY', status: 'COMPLETED', hostName: 'David Lee', hostEmail: 'david@example.com',
      hostPhone: '212-555-0303', childName: 'Sophie', childAge: 5, guestCount: 25,
      date: dateStr(-3), startTime: '10:00', endTime: '14:00',
      venueId: venueNY.id, packageId: pkgUltimateBday.id, userId: admin.id,
    },
    // 4. Basic birthday, Chicago, tomorrow
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Amy Wilson', hostEmail: 'amy@example.com',
      hostPhone: '312-555-0404', childName: 'Jake', childAge: 8, guestCount: 10,
      date: dateStr(1), startTime: '15:00', endTime: '17:00',
      venueId: venueCHI.id, packageId: pkgBasicBday.id, userId: employee2.id,
    },
    // 5. Field trip, NYC, next week
    {
      type: 'FIELD_TRIP', status: 'CONFIRMED', hostName: 'Lincoln Elementary', hostEmail: 'principal@lincoln.edu',
      hostPhone: '212-555-0505', childName: null, childAge: null, guestCount: 30,
      extraPersons: 10, extraPersonPrice: 1500,
      date: dateStr(7), startTime: '09:00', endTime: '12:00',
      venueId: venueNY.id, packageId: pkgFieldTrip.id, userId: admin.id,
    },
    // 6. CANCELLED birthday, NYC, 5 days ago (has refund)
    {
      type: 'BIRTHDAY', status: 'CANCELLED', hostName: 'Karen Brown', hostEmail: 'karen@example.com',
      hostPhone: '212-555-0606', childName: 'Lily', childAge: 6, guestCount: 15,
      date: dateStr(-5), startTime: '13:00', endTime: '15:00',
      venueId: venueNY.id, packageId: pkgBasicBday.id, userId: employee1.id,
    },
    // 7. Deluxe birthday, NYC, 2 days ago
    {
      type: 'BIRTHDAY', status: 'COMPLETED', hostName: 'Robert Johnson', hostEmail: 'robert@example.com',
      hostPhone: '212-555-0707', childName: 'Tyler', childAge: 9, guestCount: 18,
      date: dateStr(-2), startTime: '10:00', endTime: '13:00',
      venueId: venueNY.id, packageId: pkgDeluxeBday.id, userId: admin.id,
    },
    // 8. Field trip, Chicago, 4 days ago
    {
      type: 'FIELD_TRIP', status: 'COMPLETED', hostName: 'Washington Middle School', hostEmail: 'admin@washington.edu',
      hostPhone: '312-555-0808', childName: null, childAge: null, guestCount: 25,
      extraPersons: 5, extraPersonPrice: 1500,
      date: dateStr(-4), startTime: '08:30', endTime: '11:30',
      venueId: venueCHI.id, packageId: pkgFieldTrip.id, userId: employee2.id,
    },
    // 9. Premium field trip, NYC, next month
    {
      type: 'FIELD_TRIP', status: 'CONFIRMED', hostName: 'Roosevelt Academy', hostEmail: 'trips@roosevelt.edu',
      hostPhone: '212-555-0909', childName: null, childAge: null, guestCount: 35,
      extraPersons: 15, extraPersonPrice: 1500,
      date: dateStr(30), startTime: '09:00', endTime: '13:00',
      venueId: venueNY.id, packageId: pkgFieldTripPremium.id, userId: admin.id,
    },
    // 10. Basic birthday, Chicago, today (paid with Apple Pay - BUG #6)
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Lisa Martinez', hostEmail: 'lisa@example.com',
      hostPhone: '312-555-1010', childName: 'Mia', childAge: 6, guestCount: 8,
      date: dateStr(0), startTime: '16:00', endTime: '18:00',
      venueId: venueCHI.id, packageId: pkgBasicBday.id, userId: employee1.id,
    },
    // 11. Deluxe birthday, NYC, 6 days ago (partial refund case)
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Thomas White', hostEmail: 'thomas@example.com',
      hostPhone: '212-555-1111', childName: 'Olivia', childAge: 11, guestCount: 22,
      date: dateStr(-6), startTime: '12:00', endTime: '15:00',
      venueId: venueNY.id, packageId: pkgDeluxeBday.id, userId: admin.id,
    },
    // 12. Ultimate birthday, Chicago, 10 days away
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Jennifer Davis', hostEmail: 'jennifer@example.com',
      hostPhone: '312-555-1212', childName: 'Ethan', childAge: 12, guestCount: 30,
      date: dateStr(10), startTime: '11:00', endTime: '15:00',
      venueId: venueCHI.id, packageId: pkgUltimateBday.id, userId: employee2.id,
    },
    // 13. BUG #13: This field trip has guestCount=15, which the buggy filter excludes
    {
      type: 'FIELD_TRIP', status: 'CONFIRMED', hostName: 'Oakwood Elementary', hostEmail: 'office@oakwood.edu',
      hostPhone: '212-555-1313', childName: null, childAge: null, guestCount: 15,
      extraPersons: 0, extraPersonPrice: 1500,
      date: dateStr(14), startTime: '10:00', endTime: '13:00',
      venueId: venueNY.id, packageId: pkgFieldTrip.id, userId: admin.id,
      notes: 'Small class field trip',
    },
    // 14. Basic birthday, NYC, yesterday (cash payment)
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Michael Turner', hostEmail: 'michael@example.com',
      hostPhone: '212-555-1414', childName: 'Aiden', childAge: 7, guestCount: 10,
      date: dateStr(-1), startTime: '14:00', endTime: '16:00',
      venueId: venueNY.id, packageId: pkgBasicBday.id, userId: employee1.id,
    },
    // 15. Deluxe birthday, Chicago, last week
    {
      type: 'BIRTHDAY', status: 'COMPLETED', hostName: 'Sarah Anderson', hostEmail: 'sarah.a@example.com',
      hostPhone: '312-555-1515', childName: 'Zoe', childAge: 8, guestCount: 16,
      date: dateStr(-7), startTime: '13:00', endTime: '16:00',
      venueId: venueCHI.id, packageId: pkgDeluxeBday.id, userId: admin.id,
    },
    // 16. Basic birthday, NYC, 2 weeks away
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Chris Evans', hostEmail: 'chris@example.com',
      hostPhone: '212-555-1616', childName: 'Ava', childAge: 5, guestCount: 10,
      date: dateStr(14), startTime: '10:00', endTime: '12:00',
      venueId: venueNY.id, packageId: pkgBasicBday.id, userId: employee2.id,
    },
    // 17. CANCELLED field trip, Chicago (with cancellation fee)
    {
      type: 'FIELD_TRIP', status: 'CANCELLED', hostName: 'Maple Grove School', hostEmail: 'admin@maplegrove.edu',
      hostPhone: '312-555-1717', childName: null, childAge: null, guestCount: 20,
      date: dateStr(-8), startTime: '09:00', endTime: '12:00',
      venueId: venueCHI.id, packageId: pkgFieldTrip.id, userId: admin.id,
    },
    // 18. Ultimate birthday, NYC, 3 weeks away
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Patricia Clark', hostEmail: 'patricia@example.com',
      hostPhone: '212-555-1818', childName: 'Noah', childAge: 10, guestCount: 28,
      date: dateStr(21), startTime: '11:00', endTime: '15:00',
      venueId: venueNY.id, packageId: pkgUltimateBday.id, userId: employee1.id,
    },
    // 19. Basic birthday, Chicago, today (Cash App payment - BUG #6)
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Daniel Kim', hostEmail: 'daniel@example.com',
      hostPhone: '312-555-1919', childName: 'Sophia', childAge: 9, guestCount: 12,
      date: dateStr(0), startTime: '10:00', endTime: '12:00',
      venueId: venueCHI.id, packageId: pkgBasicBday.id, userId: employee2.id,
    },
    // 20. Deluxe birthday, NYC, 5 days away (deposit only)
    {
      type: 'BIRTHDAY', status: 'CONFIRMED', hostName: 'Amanda Taylor', hostEmail: 'amanda@example.com',
      hostPhone: '212-555-2020', childName: 'Mason', childAge: 7, guestCount: 14,
      date: dateStr(5), startTime: '14:00', endTime: '17:00',
      venueId: venueNY.id, packageId: pkgDeluxeBday.id, userId: admin.id,
    },
    // 21. Premium field trip, Chicago, 2 weeks away
    {
      type: 'FIELD_TRIP', status: 'CONFIRMED', hostName: 'Sunrise Elementary', hostEmail: 'field@sunrise.edu',
      hostPhone: '312-555-2121', childName: null, childAge: null, guestCount: 40,
      extraPersons: 20, extraPersonPrice: 1500,
      date: dateStr(14), startTime: '08:00', endTime: '12:00',
      venueId: venueCHI.id, packageId: pkgFieldTripPremium.id, userId: employee1.id,
    },
    // 22. Basic birthday, NYC, 8 days ago (fully refunded)
    {
      type: 'BIRTHDAY', status: 'CANCELLED', hostName: 'Rachel Green', hostEmail: 'rachel@example.com',
      hostPhone: '212-555-2222', childName: 'Ben', childAge: 4, guestCount: 8,
      date: dateStr(-8), startTime: '15:00', endTime: '17:00',
      venueId: venueNY.id, packageId: pkgBasicBday.id, userId: admin.id,
    },
  ];

  const createdBookings = [];
  for (const data of bookingsData) {
    const booking = await prisma.booking.create({ data });
    createdBookings.push(booking);
  }

  // --- Add-Ons ---
  // Booking 1: basic add-ons
  await prisma.addOn.create({ data: { bookingId: createdBookings[0].id, name: 'Extra Pizza', price: 1500, quantity: 2 } });
  await prisma.addOn.create({ data: { bookingId: createdBookings[0].id, name: 'Balloon Bundle', price: 2000, quantity: 1 } });

  // Booking 3: ultimate with extras
  await prisma.addOn.create({ data: { bookingId: createdBookings[2].id, name: 'Face Painting', price: 3500, quantity: 1 } });
  await prisma.addOn.create({ data: { bookingId: createdBookings[2].id, name: 'Photo Package', price: 4500, quantity: 1 } });

  // Booking 7
  await prisma.addOn.create({ data: { bookingId: createdBookings[6].id, name: 'Goodie Bags (10)', price: 2500, quantity: 2 } });

  // Booking 12
  await prisma.addOn.create({ data: { bookingId: createdBookings[11].id, name: 'Face Painting', price: 3500, quantity: 1 } });
  await prisma.addOn.create({ data: { bookingId: createdBookings[11].id, name: 'Extra Pizza', price: 1500, quantity: 3 } });
  await prisma.addOn.create({ data: { bookingId: createdBookings[11].id, name: 'Photo Package', price: 4500, quantity: 1 } });

  // --- Transactions ---
  const txnData = [
    // Booking 1: full card payment
    { bookingId: createdBookings[0].id, amount: 30600, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '4242', cardholderName: 'John Smith', notes: 'Full payment with Visa ending 4242', daysAgo: 2, hoursOffset: 9 },
    // Booking 2: full cash payment
    { bookingId: createdBookings[1].id, amount: 45600, type: 'PAYMENT', paymentMethod: 'cash', notes: 'Paid in full with cash', daysAgo: 3, hoursOffset: 14 },
    // Booking 3: card payment
    { bookingId: createdBookings[2].id, amount: 83600, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '1234', cardholderName: 'David Lee', notes: 'Premium package - Amex ending 1234', daysAgo: 5, hoursOffset: 10 },
    // Booking 4: deposit only
    { bookingId: createdBookings[3].id, amount: 12500, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '5678', cardholderName: 'Amy Wilson', notes: 'Deposit - 50%', daysAgo: 4, hoursOffset: 16 },
    // Booking 5: field trip deposit
    { bookingId: createdBookings[4].id, amount: 32500, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '9012', cardholderName: 'Lincoln Elementary', notes: 'Field trip deposit', daysAgo: 10, hoursOffset: 11 },
    // Booking 6: was paid, then cancelled/refunded
    { bookingId: createdBookings[5].id, amount: 25600, type: 'PAYMENT', paymentMethod: 'cash', notes: 'Paid before cancellation', daysAgo: 7, hoursOffset: 13 },
    { bookingId: createdBookings[5].id, amount: 20000, type: 'REFUND', paymentMethod: 'refund', notes: 'Cancellation refund - 80% minus fee', daysAgo: 5, hoursOffset: 15 },
    // Booking 7: full card
    { bookingId: createdBookings[6].id, amount: 50600, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '3456', cardholderName: 'Robert Johnson', notes: 'Full payment Mastercard ending 3456', daysAgo: 3, hoursOffset: 10 },
    // Booking 8: field trip cash
    { bookingId: createdBookings[7].id, amount: 57500, type: 'PAYMENT', paymentMethod: 'cash', notes: 'School check', daysAgo: 6, hoursOffset: 8 },
    // Booking 9: premium field trip deposit
    { bookingId: createdBookings[8].id, amount: 40000, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '7890', cardholderName: 'Roosevelt Academy', notes: 'Deposit for premium field trip', daysAgo: 15, hoursOffset: 9 },
    // Booking 10: Apple Pay
    { bookingId: createdBookings[9].id, amount: 25600, type: 'PAYMENT', paymentMethod: 'apple_pay', notes: 'Apple Pay payment', daysAgo: 1, hoursOffset: 17 },
    // Booking 11: partial refund case
    { bookingId: createdBookings[10].id, amount: 45600, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '2345', cardholderName: 'Thomas White', notes: 'Full payment for deluxe', daysAgo: 8, hoursOffset: 12 },
    { bookingId: createdBookings[10].id, amount: 11400, type: 'REFUND', paymentMethod: 'refund', notes: 'Partial refund 25% - reduced guest count', daysAgo: 6, hoursOffset: 14 },
    // Booking 12: ultimate deposit
    { bookingId: createdBookings[11].id, amount: 37500, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '6789', cardholderName: 'Jennifer Davis', notes: 'Deposit for ultimate birthday', daysAgo: 12, hoursOffset: 11 },
    // Booking 13: payment exists in transactions
    { bookingId: createdBookings[12].id, amount: 50600, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '0123', cardholderName: 'Oakwood Elementary', notes: 'Oakwood field trip payment', daysAgo: 7, hoursOffset: 10 },
    // Booking 14: cash
    { bookingId: createdBookings[13].id, amount: 25600, type: 'PAYMENT', paymentMethod: 'cash', notes: 'Cash at counter', daysAgo: 1, hoursOffset: 15 },
    // Booking 15: card
    { bookingId: createdBookings[14].id, amount: 45600, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '4567', cardholderName: 'Sarah Anderson', notes: 'Visa payment ending 4567', daysAgo: 8, hoursOffset: 13 },
    // Booking 17: cancelled field trip with fee
    { bookingId: createdBookings[16].id, amount: 50600, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '8901', cardholderName: 'Maple Grove School', notes: 'School credit card ending 8901', daysAgo: 12, hoursOffset: 9 },
    { bookingId: createdBookings[16].id, amount: 40000, type: 'REFUND', paymentMethod: 'refund', notes: 'Cancellation refund minus $106 fee', daysAgo: 8, hoursOffset: 11 },
    // Booking 19: Cash App
    { bookingId: createdBookings[18].id, amount: 25600, type: 'PAYMENT', paymentMethod: 'cash_app', notes: 'Cash App $cashtag payment', daysAgo: 0, hoursOffset: 16 },
    // Booking 20: deposit only
    { bookingId: createdBookings[19].id, amount: 22500, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '3210', cardholderName: 'Amanda Taylor', notes: 'Half deposit', daysAgo: 3, hoursOffset: 14 },
    // Booking 22: full refund
    { bookingId: createdBookings[21].id, amount: 25600, type: 'PAYMENT', paymentMethod: 'card', cardLast4: '6543', cardholderName: 'Rachel Green', notes: 'Initial payment', daysAgo: 10, hoursOffset: 10 },
    { bookingId: createdBookings[21].id, amount: 25600, type: 'REFUND', paymentMethod: 'refund', notes: 'Full refund - cancellation', daysAgo: 8, hoursOffset: 16 },
  ];

  const createdTxns = [];
  for (const data of txnData) {
    const { daysAgo, hoursOffset, ...txnFields } = data;
    const createdAt = new Date(today.getTime() - daysAgo * dayMs);
    createdAt.setHours(hoursOffset || 10, Math.floor(Math.random() * 50) + 5, Math.floor(Math.random() * 50) + 5);
    const txn = await prisma.transaction.create({
      data: { ...txnFields, createdAt },
    });
    createdTxns.push(txn);
  }

  // --- Refunds ---
  // Booking 6 refund (txn index 6)
  await prisma.refund.create({
    data: {
      bookingId: createdBookings[5].id,
      transactionId: createdTxns[6].id,
      amount: 20000,
      reason: 'Event cancelled by host',
      cancellationFee: 5600,
    },
  });
  // Booking 11 partial refund (txn index 12)
  await prisma.refund.create({
    data: {
      bookingId: createdBookings[10].id,
      transactionId: createdTxns[12].id,
      amount: 11400,
      reason: 'Reduced guest count',
      cancellationFee: 0,
    },
  });
  // Booking 17 cancellation refund (txn index 18)
  await prisma.refund.create({
    data: {
      bookingId: createdBookings[16].id,
      transactionId: createdTxns[18].id,
      amount: 40000,
      reason: 'School cancelled trip',
      cancellationFee: 10600,
    },
  });
  // Booking 22 full refund (txn index 22)
  await prisma.refund.create({
    data: {
      bookingId: createdBookings[21].id,
      transactionId: createdTxns[22].id,
      amount: 25600,
      reason: 'Full cancellation',
      cancellationFee: 0,
    },
  });

  // --- Invoices ---
  for (const idx of [0, 2, 6, 10, 14]) {
    const b = createdBookings[idx];
    const pkg = await prisma.package.findUnique({ where: { id: b.packageId } });
    const addOns = await prisma.addOn.findMany({ where: { bookingId: b.id } });
    const addOnsTotal = addOns.reduce((s, a) => s + a.price * a.quantity, 0);
    const subtotal = (pkg?.price || 0) + addOnsTotal;
    const taxAmount = Math.round(subtotal * 0.06); // 6% tax
    const totalAmount = subtotal + taxAmount;

    await prisma.invoice.create({
      data: { bookingId: b.id, totalAmount, taxAmount },
    });
  }

  // --- Invitations (for birthday bookings) ---
  const invitationsData = [
    // Booking 1 invitations
    { bookingId: createdBookings[0].id, guestName: 'Alice Cooper', guestEmail: 'alice@email.com', guestPhone: '212-555-3001' },
    { bookingId: createdBookings[0].id, guestName: 'Bobby Fischer', guestEmail: 'bobby@email.com', guestPhone: '212-555-3002' },
    { bookingId: createdBookings[0].id, guestName: 'Charlie Day', guestEmail: 'charlie@email.com', guestPhone: '212-555-3003' },
    // Booking 2 invitations
    { bookingId: createdBookings[1].id, guestName: 'Diana Prince', guestEmail: 'diana@email.com', guestPhone: '312-555-3004' },
    { bookingId: createdBookings[1].id, guestName: 'Eddie Murphy', guestEmail: 'eddie@email.com', guestPhone: '312-555-3005' },
    // Booking 4 invitations
    { bookingId: createdBookings[3].id, guestName: 'Fiona Apple', guestEmail: 'fiona@email.com', guestPhone: '312-555-3006' },
    { bookingId: createdBookings[3].id, guestName: 'George Costanza', guestEmail: 'george@email.com', guestPhone: '312-555-3007' },
    // Booking 12 invitations
    { bookingId: createdBookings[11].id, guestName: 'Hannah Montana', guestEmail: 'hannah@email.com', guestPhone: '312-555-3008' },
    { bookingId: createdBookings[11].id, guestName: 'Ivan Drago', guestEmail: 'ivan@email.com', guestPhone: '312-555-3009' },
  ];

  const createdInvitations = [];
  for (const data of invitationsData) {
    const token = uuidv4();
    const booking = createdBookings.find(b => b.id === data.bookingId);
    const childInfo = booking?.childName ? `${booking.childName}'s birthday party` : 'a party';
    const venueInfo = booking?.venueId === venueNY.id ? venueNY.name : venueCHI.name;
    const dateInfo = booking?.date || '';
    const message = `${booking?.hostName || 'Someone'} has invited you to ${childInfo} at ${venueInfo} on ${dateInfo}! RSVP here: http://localhost:5174/rsvp/${token}`;

    const inv = await prisma.invitation.create({
      data: {
        ...data,
        method: 'sms',
        message,
        token,
      },
    });
    createdInvitations.push(inv);
  }

  // Set some RSVP statuses
  await prisma.invitation.update({
    where: { id: createdInvitations[0].id },
    data: { rsvpStatus: 'YES', waiverSigned: false },
  });
  await prisma.invitation.update({
    where: { id: createdInvitations[1].id },
    data: { rsvpStatus: 'YES', waiverSigned: false },
  });
  await prisma.invitation.update({
    where: { id: createdInvitations[3].id },
    data: { rsvpStatus: 'NO' },
  });

  // --- Waivers ---
  // Booking 1: host waiver + guest waiver (BUG #25 scenario)
  const hostWaiverToken = uuidv4();
  await prisma.waiver.create({
    data: {
      bookingId: createdBookings[0].id,
      guestName: 'John Smith (Host)',
      guardianName: 'John Smith',
      signature: 'John Smith',
      data: JSON.stringify({ emergencyContact: '212-555-9999', allergies: 'None' }),
      token: hostWaiverToken,
      signedAt: new Date(today.getTime() - 2 * dayMs),
    },
  });

  // BUG #25: Same token scenario - this waiver exists for the link
  // but if another guest signs it, it would overwrite
  const guestWaiverToken = uuidv4();
  await prisma.waiver.create({
    data: {
      bookingId: createdBookings[0].id,
      invitationId: createdInvitations[0].id,
      guestName: 'Alice Cooper',
      token: guestWaiverToken,
      // Not signed yet
    },
  });

  const guestWaiver2Token = uuidv4();
  await prisma.waiver.create({
    data: {
      bookingId: createdBookings[0].id,
      invitationId: createdInvitations[1].id,
      guestName: 'Bobby Fischer',
      guardianName: 'Bob Fischer Sr.',
      signature: 'Bob Fischer Sr.',
      data: JSON.stringify({ emergencyContact: '212-555-8888', allergies: 'Peanuts' }),
      token: guestWaiver2Token,
      signedAt: new Date(today.getTime() - 1 * dayMs),
    },
  });

  // --- Email Logs ---
  // BUG #16: Wrong base URL in confirmation emails
  for (const b of createdBookings.slice(0, 5)) {
    await prisma.emailLog.create({
      data: {
        bookingId: b.id,
        to: b.hostEmail,
        subject: `Booking Confirmation - ${b.childName || b.hostName}'s Event`,
        body: `Your booking has been confirmed!\n\nDate: ${b.date}\n\nView your booking: http://localhost:5174/bookings/${b.id}`,
        sentAt: new Date(today.getTime() - 10 * dayMs),
      },
    });
  }

  // Invitation emails
  for (const inv of createdInvitations) {
    await prisma.emailLog.create({
      data: {
        bookingId: inv.bookingId,
        to: inv.guestEmail,
        subject: 'Party Invitation',
        body: inv.message,
        sentAt: new Date(today.getTime() - 5 * dayMs),
      },
    });
  }

  console.log('Seed complete!');
  console.log(`  Users: 3 (1 admin, 2 employees)`);
  console.log(`  Venues: 2 (NYC=America/New_York, Chicago=America/Chicago)`);
  console.log(`  Packages: 5`);
  console.log(`  Bookings: ${createdBookings.length}`);
  console.log(`  Transactions: ${createdTxns.length}`);
  console.log(`  Refunds: 4`);
  console.log(`  Invoices: 5`);
  console.log(`  Invitations: ${createdInvitations.length}`);
  console.log(`  Waivers: 3`);
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin: admin@bookingengine.com / admin123');
  console.log('  Employee: mike@bookingengine.com / employee123');
  console.log('  Employee: jessica@bookingengine.com / employee123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
