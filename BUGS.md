# Bug List — Booking Engine

This document lists all 26 intentional bugs in the booking engine. Each bug mimics a real production issue. Use this as a debugging practice ticket list.

---

## BUG #1: Timezone Display Bug

**Severity**: Medium
**Files**: `server/src/routes/bookings.js`, `server/src/routes/transactions.js`, `server/src/routes/reports.js`

**Description**: Timestamps are stored in UTC but displayed using the server's local timezone instead of the venue's timezone. Two venues exist with different timezones (America/New_York and America/Chicago), but all dates render the same.

**How to reproduce**:
1. Login and go to the Events page
2. Look at the "Date" column — all dates are formatted using server timezone
3. Compare a NYC booking vs Chicago booking — both show the same timezone offset

**Expected behavior**: Dates should be converted and displayed in the venue's timezone (e.g., "2:00 PM EST" for NYC, "1:00 PM CST" for Chicago).

---

## BUG #2: Transaction Filters Missing

**Severity**: Medium
**Files**: `server/src/routes/transactions.js`, `client/src/pages/TransactionsPage.jsx`

**Description**: The Reports page has Today/Yesterday quick filters and an All/Cash/Card payment method filter, but the Transactions page is missing both. Only basic date range is available.

**How to reproduce**:
1. Go to Reports — note the Today/Yesterday buttons and Cash/Card/All dropdown
2. Go to Transactions — these filters are missing

**Expected behavior**: Transactions page should have the same Today/Yesterday quick filters and payment method filter as Reports.

---

## BUG #3: Cash Report Totals Missing

**Severity**: High
**Files**: `server/src/routes/reports.js`, `client/src/pages/ReportsPage.jsx`

**Description**: The "Charge by Cash" report shows individual rows but no total amount. Export/print also omit the totals row.

**How to reproduce**:
1. Go to Reports page
2. Observe the report table — no total row at the bottom
3. Click Export CSV — no total row in the CSV either
4. Click Print — same issue

**Expected behavior**: Report should show a totals row at the bottom (e.g., "Total: $X,XXX.XX"). Export and print should include the total.

---

## BUG #4: Date/Time Display Inconsistencies

**Severity**: Low
**Files**: `client/src/pages/BookingDetailPage.jsx`, `client/src/pages/TransactionsPage.jsx`

**Description**: Different views use inconsistent date/time formatting. The booking detail page shows `M/D/YYYY` for dates but `MM/DD/YY, HH:MM` for transaction timestamps. Some dates show as raw ISO strings.

**How to reproduce**:
1. Open any booking detail page
2. Compare the "Date" field format with the transaction date format
3. Note the inconsistency

**Expected behavior**: All dates should use a consistent format throughout the application.

---

## BUG #5: Transaction Notes Not Displayed

**Severity**: Medium
**Files**: `server/src/routes/transactions.js`, `client/src/pages/TransactionsPage.jsx`, `client/src/pages/BookingDetailPage.jsx`

**Description**: Transaction notes exist in the database but are intentionally stripped from the API response. Notes are not shown anywhere in the UI.

**How to reproduce**:
1. Go to Transactions page — no notes column
2. Open a booking detail — transaction table has no notes
3. Check the database — notes exist (e.g., "Full payment with Visa ending 4242")

**Expected behavior**: Notes should appear next to each payment in both the transaction list and booking detail.

---

## BUG #6: Limited Payment Methods

**Severity**: High
**Files**: `server/src/utils/payment.js`, `server/src/routes/reports.js`, `client/src/pages/BookingDetailPage.jsx`

**Description**: Only "cash" and "card" are properly supported. Apple Pay and Cash App options exist in the UI dropdown but cause issues: they don't appear in Cash or Card reports, their labels show raw values (apple_pay, cash_app), and they break report grouping.

**How to reproduce**:
1. Open a booking → Add Payment → select "Apple Pay" → submit
2. Go to Reports → filter by Cash — the Apple Pay payment is missing
3. Go to Reports → filter by Card — also missing
4. Go to Transactions — the method shows as "apple_pay" (raw value)
5. Check seed data: Booking #10 (Lisa Martinez) paid with apple_pay, Booking #19 (Daniel Kim) paid with cash_app

**Expected behavior**: Support Apple Pay and Cash App as proper payment methods with clean labels and correct report categorization.

---

## BUG #7: Missing Business Metrics

**Severity**: Medium
**Files**: `server/src/routes/reports.js`, `client/src/pages/DashboardPage.jsx`, `client/src/pages/ReportsPage.jsx`

**Description**: Dashboard and Reports pages show stub sections for "Business Metrics" (total birthdays booked in range, filter by package, total add-ons, total packages) but these features are not implemented.

**How to reproduce**:
1. Go to Dashboard — see "Coming Soon" stub under Business Metrics
2. Go to Reports — see "Not Yet Implemented" stub

**Expected behavior**: Reports should show total birthdays booked in date range, total field trips, filter by package, total add-on revenue, total packages sold.

---

## BUG #8: Employee Permissions Broken

**Severity**: Critical
**Files**: `server/src/routes/reports.js`, `server/src/routes/admin.js`, `client/src/pages/DashboardPage.jsx`, `client/src/pages/ReportsPage.jsx`

**Description**: Employee role can see total sales figures, access the admin dashboard, use export/print buttons, and access the export API endpoint. All should be admin-only.

**How to reproduce**:
1. Login as employee (mike@bookingengine.com / employee123)
2. Dashboard shows Total Income and Today's Income (should be hidden)
3. Export Data and Print buttons are visible (should be hidden)
4. Go to Reports — all sales figures visible
5. Hit /api/reports/export directly — returns 200 (should be 403)

**Expected behavior**: Employees should only see bookings, check-in info, and basic transaction lists. Total sales, export, and print should be admin-only.

---

## BUG #9: Refund Amounts Not in Totals/Invoice/Transactions

**Severity**: Critical
**Files**: `server/src/routes/transactions.js`, `server/src/routes/admin.js`, `server/src/utils/pdf.js`, `client/src/pages/BookingDetailPage.jsx`

**Description**: Three related issues: (a) Refund transactions are filtered out of the transaction list (type='REFUND' excluded). (b) Refund amounts are not subtracted from dashboard totals. (c) Refunds don't appear on generated invoices.

**How to reproduce**:
1. Go to Transactions — no refund entries visible (seed has 4 refunds)
2. Check booking #6 (Karen Brown, cancelled) — the $200 refund transaction should appear but doesn't
3. Dashboard Total Income doesn't subtract refunds
4. Generate an invoice for a refunded booking — refund section missing from PDF

**Expected behavior**: Refund transactions should be visible, totals should be net of refunds, invoices should list refunds.

---

## BUG #10: Refund Input Percentage-Only

**Severity**: Medium
**Files**: `server/src/routes/refunds.js`, `client/src/pages/BookingDetailPage.jsx` (RefundModal)

**Description**: The refund form only accepts a percentage (1–100%). There is no option to enter an exact dollar amount. The API also only accepts `percentage`.

**How to reproduce**:
1. Open any booking → click Refund
2. The form only has "Refund Percentage (%)" — no dollar amount field
3. Try to POST to /api/refunds with `{ amount: 5000 }` instead of `{ percentage: 50 }` — rejected

**Expected behavior**: Support both percentage and exact dollar amount for refunds.

---

## BUG #11: Total Income Visible in Business Admin Dashboard

**Severity**: Medium
**Files**: `server/src/routes/admin.js`, `client/src/pages/DashboardPage.jsx`

**Description**: The dashboard incorrectly displays "Total Income" and "Today's Income" stats. These should be hidden or removed from the business admin view.

**How to reproduce**:
1. Login as admin or employee
2. Go to Dashboard — "Total Income" and "Today's Income" cards are visible

**Expected behavior**: Total income should not be displayed on the dashboard.

---

## BUG #12: Add-Ons Missing Custom Amount/Description

**Severity**: Medium
**Files**: `server/src/routes/addons.js`, `client/src/pages/BookingDetailPage.jsx` (AddOnModal)

**Description**: Add-ons can only be selected from a predefined list (Extra Pizza, Balloon Bundle, etc.) with fixed prices. There's no way to add a custom add-on with a custom amount and description per event.

**How to reproduce**:
1. Open a booking → click Add (add-on)
2. Only a dropdown of 5 predefined options appears
3. No text field for custom name or price

**Expected behavior**: Allow adding custom add-ons with user-specified name, description, and amount.

---

## BUG #13: Event List Missing a Booked Party

**Severity**: High
**Files**: `server/src/routes/bookings.js`

**Description**: Booking #13 (Oakwood Elementary field trip, guestCount=15) appears in Transactions but NOT in the Events list. A buggy query filter excludes bookings where `guestCount = 15`.

**How to reproduce**:
1. Go to Events page — search for "Oakwood Elementary" — not found
2. Go to Transactions — find a transaction for booking #13 (Oakwood field trip payment)
3. Click the booking link — it loads fine (the booking exists)
4. Inspect the server code: `where.NOT = { guestCount: 15 }`

**Expected behavior**: All bookings should appear in the event list regardless of guest count.

---

## BUG #14: Invitations Sent via Email Instead of SMS

**Severity**: Medium
**Files**: `server/src/routes/invitations.js`, `server/src/utils/email.js`, `server/src/utils/sms.js`

**Description**: Invitations are sent via email even when a phone number is provided. The SMS module exists but is never called. The invitation `method` field is always set to 'email'.

**How to reproduce**:
1. Open a booking → Send Invite → enter a phone number → submit
2. Check server console — see `[EMAIL]` log, not `[SMS]`
3. Check the Invitations page — method column always shows "email"

**Expected behavior**: Invitations should be sent via SMS (phone-first) when a phone number is available.

---

## BUG #15: Card Last 4 and Cardholder Name Not Stored

**Severity**: Medium
**Files**: `server/src/utils/payment.js`, `server/src/routes/transactions.js`

**Description**: When a card payment is processed, the mock payment provider has access to the card last 4 digits and cardholder name, but these are intentionally not stored in the transaction record.

**How to reproduce**:
1. Open a booking → Add Payment → choose Card → enter card number and name → submit
2. Check the transaction — no card details shown
3. Check the database — `cardLast4` and `cardholderName` are NULL

**Expected behavior**: Card last 4 and cardholder name should be stored and displayed on transactions, invoices, and event details.

---

## BUG #16: Booking Confirmation Email Link Broken

**Severity**: High
**Files**: `server/src/utils/email.js`

**Description**: Booking confirmation emails use the wrong base URL (`http://localhost:3001/app/bookings/`) instead of the correct frontend URL (`http://localhost:5173/bookings/`).

**How to reproduce**:
1. Create a new booking
2. Check server console for `[EMAIL]` log
3. The "View booking" link points to `http://localhost:3001/app/bookings/{id}` — wrong host and path

**Expected behavior**: Link should be `http://localhost:5173/bookings/{id}`.

---

## BUG #17: Client Cannot See Copy of Sent Emails

**Severity**: Medium
**Files**: `server/src/routes/bookings.js`, `client/src/pages/BookingDetailPage.jsx`

**Description**: The admin UI does not show "sent email copies" for a booking. Email logs exist in the DB and there's even a `/api/admin/emails` endpoint, but the booking detail page never loads or displays them.

**How to reproduce**:
1. Open any booking detail page
2. No "Email History" or "Sent Emails" section exists
3. The booking API response doesn't include `emailLogs`

**Expected behavior**: Booking detail should show a section listing all emails sent for that booking (confirmations, invitations, etc.).

---

## BUG #18: Balance Settled Email/Invoice Not Sent

**Severity**: High
**Files**: `server/src/routes/transactions.js`, `server/src/utils/email.js`

**Description**: When a booking's balance reaches zero (fully paid), the system logs a message but does NOT send a confirmation email and does NOT generate a detailed invoice.

**How to reproduce**:
1. Open a booking with a partial payment
2. Add a payment that covers the remaining balance
3. Check server console — see `[BUG #18] Balance settled but email/invoice NOT sent`
4. No new email in email logs, no new invoice generated

**Expected behavior**: When balance becomes zero, automatically send a "Balance Settled" confirmation email and generate a detailed invoice.

---

## BUG #19: Field Trip Extra Persons Pricing Not Updating

**Severity**: Medium
**Files**: `server/src/routes/bookings.js`, `client/src/pages/BookingDetailPage.jsx`

**Description**: For field trips, changing the "Extra Persons" count doesn't recalculate pricing on the first save. A second save is required. No popup or instruction tells the user about this.

**How to reproduce**:
1. Open a field trip booking → click Edit
2. Change "Extra Persons" from 10 to 20 → Save
3. Notice that `extraPersonPrice` is not recalculated
4. Click Edit and Save again (without changes) — still not recalculated

**Expected behavior**: Pricing should automatically update when extra persons count changes, in a single save.

---

## BUG #20: Invoice PDF Missing Content

**Severity**: Medium
**Files**: `server/src/utils/pdf.js`

**Description**: Generated invoice PDFs are missing three sections: (a) Package contents (what's included), (b) Refund policy text, (c) Company logo. The code has stubs/comments but doesn't render these sections.

**How to reproduce**:
1. Open a booking → Generate Invoice → Download PDF
2. The PDF shows package name and price but NOT what's included
3. No refund policy section
4. No logo at the top

**Expected behavior**: Invoice PDF should include package contents list, refund policy, and company logo.

---

## BUG #21: Tax Bug — Fixed $6 Instead of 6%

**Severity**: Critical
**Files**: `server/src/routes/transactions.js`, `server/src/routes/invoices.js`, `server/src/utils/pdf.js`, `client/src/pages/BookingDetailPage.jsx`

**Description**: Tax is calculated as a fixed $6.00 (600 cents) regardless of order total, instead of 6% of the subtotal. This affects invoices, the financial summary on booking detail, and reports (which don't show total collected tax at all).

**How to reproduce**:
1. Open a booking with a $750 package — tax shows as $6.00 instead of $45.00
2. Open a booking with a $250 package — tax shows as $6.00 instead of $15.00
3. Generate an invoice — tax is $6.00
4. Reports page — no total tax section

**Expected behavior**: Tax should be 6% of the subtotal (package + add-ons). Reports should show total collected tax.

---

## BUG #22: Invitation Email Text Generic

**Severity**: Low
**Files**: `server/src/routes/invitations.js`, `server/src/utils/email.js`

**Description**: Invitation messages use generic text ("You have been invited to a party!") instead of personalized text with the host name, child's name, and venue.

**How to reproduce**:
1. Open the Invitations page — see the "Message Preview" section at bottom
2. Message reads: "You have been invited to a party!"
3. Should read: "[Host name] has invited you to [Child's name]'s birthday party at [Venue]..."

**Expected behavior**: Message format: "[Host name] has invited you to [Child's name]'s birthday party at [Venue name] on [Date]. RSVP here: [link]"

---

## BUG #23: RSVP/Waiver Status Not Visible

**Severity**: Medium
**Files**: `server/src/routes/invitations.js`, `server/src/routes/waivers.js`

**Description**: When a guest RSVPs "YES", the invitation's `waiverSigned` field is never updated (stays false/Pending). When a guest actually signs the waiver, the invitation's `waiverSigned` is still not updated.

**How to reproduce**:
1. Open a booking with invitations — check the "Waiver" column
2. Alice Cooper has RSVP=YES and waiver exists, but shows "Pending"
3. Bobby Fischer has a signed waiver but invitation still shows "Pending"

**Expected behavior**: When a waiver is signed, update the invitation's `waiverSigned` to true so admins/employees can see the status.

---

## BUG #24: Waiver Link Redirects to Login

**Severity**: Critical
**Files**: `server/src/middleware/auth.js`, `server/src/routes/waivers.js`, `client/src/pages/WaiverPage.jsx`

**Description**: Waiver links (e.g., `/waiver/{token}`) are supposed to be public (tokenized access), but the API endpoints use `requireAuthOrToken` which actually requires authentication. Unauthenticated guests are blocked.

**How to reproduce**:
1. Open a waiver link from the booking detail page
2. If not logged in, you get: "Please log in to access this waiver"
3. Open in an incognito window — same error

**Expected behavior**: Waiver links should work without login. The token in the URL should be sufficient for access.

---

## BUG #25: Host/Guest Waiver Overwrite Bug

**Severity**: High
**Files**: `server/src/routes/waivers.js`

**Description**: When the host fills a waiver and then shares the same link with a guest, the guest's submission OVERWRITES the host's data instead of creating a separate guest waiver entry.

**How to reproduce**:
1. Open a waiver link and submit as the host
2. Share the same link with a guest
3. Guest fills and submits — host's waiver data is overwritten
4. Only one waiver record exists instead of two

**Expected behavior**: Each submission should create a new waiver record. The host waiver and guest waiver should be separate entries.

---

## BUG #26: Card Details Missing from Invoice/Receipt/Transaction

**Severity**: Medium
**Files**: `server/src/utils/pdf.js`, `client/src/pages/BookingDetailPage.jsx`

**Description**: Card last 4 digits and cardholder name do not appear on invoices, receipts, event details, or transaction notes. This is related to BUG #15 (data not stored) but also affects display in places where it could be pulled from notes.

**How to reproduce**:
1. Check any card transaction on a booking detail page — no card details
2. Generate and download an invoice PDF — no card info on payments
3. Check transaction notes — notes are stripped (BUG #5) so card info from notes is also hidden

**Expected behavior**: Card ending in XXXX and cardholder name should appear on invoices, transaction details, and event detail views.

---

## Bug Severity Summary

| Severity | Count | Bug IDs |
|----------|-------|---------|
| Critical | 4     | #8, #9, #21, #24 |
| High     | 5     | #3, #6, #13, #16, #18, #25 |
| Medium   | 13    | #1, #2, #5, #7, #10, #11, #12, #14, #15, #17, #19, #23, #26 |
| Low      | 2     | #4, #22 |

## Tips for Debugging

1. Search for `BUG #N` in the codebase to find the intentional bug location
2. Use the seed data to reproduce issues without manually creating bookings
3. Compare the Reports page filters with the Transactions page to see what's missing
4. Login as both admin and employee to see permission issues
5. Try the waiver link in an incognito window to see auth issues
6. Check the server console for `[EMAIL]`, `[SMS]`, `[PAYMENT]` logs
