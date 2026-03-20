import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('host-info');
  const [showPayment, setShowPayment] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddOn, setShowAddOn] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [cancelRefundAmount, setCancelRefundAmount] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [cancelProcessing, setCancelProcessing] = useState(false);

  useEffect(() => { fetchBooking(); }, [id]);

  const fetchBooking = async () => {
    try {
      const data = await api.get(`/bookings/${id}`);
      setBooking(data);
      setEditData({
        guestCount: data.guestCount,
        extraPersons: data.extraPersons,
        notes: data.notes || '',
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/bookings/${id}`, editData);
      setEditMode(false);
      const updated = await api.get(`/bookings/${id}`);
      setBooking(updated);
      setEditData({
        guestCount: updated.guestCount,
        extraPersons: updated.extraPersons,
        notes: updated.notes || '',
      });
      setMessage('Booking updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setCancelRefundAmount('');
    setCancelNote('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    setCancelProcessing(true);
    setError('');
    try {
      const refundCents = Math.round(parseFloat(cancelRefundAmount || '0') * 100);

      // Process refund if amount > 0 and there are payments to refund
      if (refundCents > 0) {
        await api.post('/refunds', {
          bookingId: parseInt(id),
          amount: refundCents,
          reason: cancelNote || 'Event cancelled - refund',
        });
      }

      // Cancel the booking
      await api.post(`/bookings/${id}/cancel`);
      setShowCancelModal(false);
      setMessage('Event cancelled' + (refundCents > 0 ? ` — $${(refundCents / 100).toFixed(2)} refunded` : ''));
      fetchBooking();
    } catch (err) {
      setError(err.message);
    }
    setCancelProcessing(false);
  };

  const handleSaveEvent = async () => {
    try {
      await api.put(`/bookings/${id}`, editData);
      setMessage('Booking saved');
      navigate('/bookings');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this event as completed?')) return;
    try {
      await api.put(`/bookings/${id}`, { status: 'COMPLETED' });
      setMessage('Event marked as completed');
      fetchBooking();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      // Generate invoice first
      await api.post('/invoices/generate', { bookingId: parseInt(id) });
      // Fetch the PDF as blob and open print dialog
      const res = await fetch(`/api/invoices/view/${parseInt(id)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load invoice PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.addEventListener('load', () => {
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmailInvoice = async () => {
    try {
      const result = await api.post('/invoices/email', { bookingId: parseInt(id) });
      setMessage(`Invoice emailed to ${result.sentTo}`);
      fetchBooking();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading booking...</div>;
  if (!booking) return <div className="error-msg">Booking not found</div>;

  const totalPaid = (booking.transactions || [])
    .filter(t => t.type === 'PAYMENT')
    .reduce((s, t) => s + t.amount, 0);

  const totalRefunded = (booking.transactions || [])
    .filter(t => t.type === 'REFUND')
    .reduce((s, t) => s + t.amount, 0);

  const netPaid = totalPaid - totalRefunded;

  const packagePrice = booking.package?.price || 0;
  const addOnsTotal = (booking.addOns || []).reduce((s, a) => s + a.price * a.quantity, 0);
  const extraPersonsCost = booking.type === 'FIELD_TRIP' ? (booking.extraPersons || 0) * (booking.extraPersonPrice || 0) : 0;
  const subtotal = packagePrice + addOnsTotal + extraPersonsCost;
  const detailDiscountAmount = appliedDiscount
    ? (appliedDiscount.discountType === 'percent'
      ? Math.round(subtotal * appliedDiscount.discount / 100)
      : appliedDiscount.discount)
    : 0;
  const afterDiscount = Math.max(0, subtotal - detailDiscountAmount);
  const tax = Math.round(afterDiscount * 0.06);
  const totalDue = afterDiscount + tax;

  const handleApplyDiscount = async () => {
    setDiscountError('');
    if (!discountCode.trim()) return;
    try {
      const result = await api.post('/discounts/validate', { code: discountCode });
      setAppliedDiscount(result);
    } catch (err) {
      setDiscountError(err.message || 'Invalid code');
      setAppliedDiscount(null);
    }
  };
  const balance = totalDue - netPaid;

  const cashPaid = (booking.transactions || []).filter(t => t.type === 'PAYMENT' && t.paymentMethod === 'cash').reduce((s, t) => s + t.amount, 0);
  const cardPaid = (booking.transactions || []).filter(t => t.type === 'PAYMENT' && t.paymentMethod !== 'cash').reduce((s, t) => s + t.amount, 0);

  const tabs = [
    { id: 'host-info', label: 'Host Info' },
    { id: 'event', label: 'Event' },
    { id: 'notes', label: 'Notes' },
    { id: 'invitations', label: 'Invitations' },
    { id: 'waiver', label: 'Waiver' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'email', label: 'Email' },
  ];

  return (
    <div className="event-info-page">
      {/* Top bar: Event Information badge + status */}
      <div className="event-info-topbar">
        <span className="event-info-badge">Event Information</span>
        <span className={`event-status-badge ${booking.status.toLowerCase()}`}>
          {booking.status === 'CONFIRMED' ? 'Accepted' : booking.status}
        </span>
      </div>

      {message && <div className="success-msg">{message}</div>}
      {error && <div className="error-msg">{error}</div>}

      <div className="event-info-layout">
        {/* Left: Tabs + Content */}
        <div className="event-info-main">
          {/* Tab bar */}
          <div className="event-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`event-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="event-tab-content">
            {activeTab === 'host-info' && (
              <HostInfoTab booking={booking} />
            )}

            {activeTab === 'event' && (
              <EventTab
                booking={booking}
                editMode={editMode}
                editData={editData}
                setEditData={setEditData}
                setEditMode={setEditMode}
                handleSaveEdit={handleSaveEdit}
                setShowAddOn={setShowAddOn}
              />
            )}

            {activeTab === 'notes' && (
              <NotesTab booking={booking} editData={editData} setEditData={setEditData} handleSaveEdit={handleSaveEdit} fetchBooking={fetchBooking} />
            )}

            {activeTab === 'invitations' && (
              <InvitationsTab booking={booking} setShowInvite={setShowInvite} />
            )}

            {activeTab === 'waiver' && (
              <WaiverTab booking={booking} fetchBooking={fetchBooking} />
            )}

            {activeTab === 'transactions' && (
              <TransactionsTab booking={booking} setShowRefund={setShowRefund} />
            )}

            {activeTab === 'email' && (
              <EmailTab booking={booking} />
            )}
          </div>
        </div>

        {/* Right: Price Details sidebar */}
        <div className="price-details-sidebar">
          <h3>Price Details</h3>

          <div className="price-section">
            <div className="price-label">Package</div>
            <div className="price-row">
              <span>{booking.package?.name || 'N/A'} ${(packagePrice / 100).toFixed(2)} x 1</span>
              <span>${(packagePrice / 100).toFixed(2)}</span>
            </div>
          </div>

          {booking.addOns?.length > 0 && (
            <div className="price-section">
              {booking.addOns.map(a => (
                <div className="price-row" key={a.id}>
                  <span>{a.name} ${(a.price / 100).toFixed(2)} x {a.quantity}</span>
                  <span>${((a.price * a.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {extraPersonsCost > 0 && (
            <div className="price-section">
              <div className="price-row">
                <span>Extra Persons ({booking.extraPersons})</span>
                <span>${(extraPersonsCost / 100).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="price-section">
            <div className="price-label">DISCOUNT CODE</div>
            <div className="discount-input-row">
              <input type="text" className="discount-input" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} placeholder="Enter code" />
              <button className="discount-apply-btn" onClick={handleApplyDiscount}>&#10003;</button>
            </div>
            {discountError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{discountError}</div>}
            {appliedDiscount && <div style={{ color: '#16a34a', fontSize: 12, marginTop: 4 }}>Discount: {appliedDiscount.discountType === 'percent' ? `${appliedDiscount.discount}%` : `$${(appliedDiscount.discount / 100).toFixed(2)}`} off</div>}
          </div>

          <div className="price-totals">
            <div className="price-row">
              <span>Subtotal</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            {detailDiscountAmount > 0 && (
              <div className="price-row" style={{ color: '#16a34a' }}>
                <span>Discount</span>
                <span>-${(detailDiscountAmount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="price-row">
              <span>Tax (6.00 %)</span>
              <span>${(tax / 100).toFixed(2)}</span>
            </div>
            <div className="price-row total-row">
              <span>Total</span>
              <span>${(totalDue / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="price-payments">
            <div className="price-row">
              <span>Cash</span>
              <span className="bold">${(cashPaid / 100).toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Card</span>
              <span className="bold">${(cardPaid / 100).toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span className="green-text">Paid</span>
              <span className="bold green-text">${(netPaid / 100).toFixed(2)}</span>
            </div>
            {totalRefunded > 0 && (
              <div className="price-row">
                <span className="red-text">Refunded</span>
                <span className="bold red-text">-${(totalRefunded / 100).toFixed(2)}</span>
              </div>
            )}
            <div className={`balance-badge ${balance <= 0 ? 'paid' : 'unpaid'}`}>
              <span>Balance :</span>
              <span>${(balance / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="price-actions">
            <button className="btn-action btn-complete" onClick={handleSaveEvent}>Save Event</button>
            <button className="btn-action btn-save" onClick={handleSaveEdit}>Save Changes</button>
            <button className="btn-action btn-save-pay" onClick={() => setShowPayment(true)}>Save And Make Payment</button>
          </div>

          <div className="price-actions" style={{ marginTop: 8 }}>
            <button className="btn-action btn-email-invoice" onClick={handleEmailInvoice}>Email Invoice</button>
            <button className="btn-action btn-print-invoice" onClick={handleGenerateInvoice}>Print Invoice</button>
          </div>

          {booking.status !== 'CANCELLED' && (
            <div className="price-actions" style={{ marginTop: 8 }}>
              <button className="btn-action btn-complete" onClick={handleComplete}>Complete Event</button>
              <button className="btn-action btn-cancel-event" onClick={handleCancel}>Cancel Event</button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showPayment && (
        <PaymentModal
          bookingId={booking.id}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); fetchBooking(); setMessage('Payment recorded'); }}
        />
      )}
      {showRefund && (
        <RefundModal
          bookingId={booking.id}
          onClose={() => setShowRefund(false)}
          onSuccess={() => { setShowRefund(false); fetchBooking(); setMessage('Refund processed'); }}
        />
      )}
      {showInvite && (
        <InviteModal
          bookingId={booking.id}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); fetchBooking(); setMessage('Invitation sent'); }}
        />
      )}
      {showAddOn && (
        <AddOnModal
          bookingId={booking.id}
          onClose={() => setShowAddOn(false)}
          onSuccess={() => { setShowAddOn(false); fetchBooking(); setMessage('Add-on added'); }}
        />
      )}

      {/* Cancel Event Modal */}
      {showCancelModal && (() => {
        const refundDollars = parseFloat(cancelRefundAmount) || 0;
        const refundCents = Math.round(refundDollars * 100);
        const pctOfTotal = totalDue > 0 ? ((refundCents / totalDue) * 100).toFixed(1) : '0.0';
        const pctOfPaid = netPaid > 0 ? ((refundCents / netPaid) * 100).toFixed(1) : '0.0';

        return (
          <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626)', color: 'white', padding: '14px 20px', borderRadius: '12px 12px 0 0', margin: '-24px -24px 20px -24px', fontWeight: 700, fontSize: 17, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Cancel Event</span>
                <button onClick={() => setShowCancelModal(false)} style={{ background: 'white', color: '#ef4444', border: 'none', width: 28, height: 28, borderRadius: 6, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>&times;</button>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>Total Event Price:</span>
                  <span style={{ fontWeight: 700 }}>${(totalDue / 100).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>Total Paid:</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>${(netPaid / 100).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>Balance:</span>
                  <span style={{ fontWeight: 700, color: balance > 0 ? '#ef4444' : '#22c55e' }}>${(balance / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="pay-form-field">
                <label style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Refund Amount</label>
                <div className="pay-amount-input">
                  <span className="pay-dollar-sign">$</span>
                  <input type="number" step="0.01" min="0" max={(netPaid / 100).toFixed(2)} value={cancelRefundAmount} onChange={e => setCancelRefundAmount(e.target.value)} placeholder="0.00" />
                </div>
              </div>

              {refundDollars > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span><strong>Refund:</strong></span>
                    <span style={{ fontWeight: 700, color: '#7c3aed' }}>${refundDollars.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>% of total price:</span>
                    <span style={{ fontWeight: 700 }}>{pctOfTotal}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>% of amount paid:</span>
                    <span style={{ fontWeight: 700 }}>{pctOfPaid}%</span>
                  </div>
                </div>
              )}

              <div className="pay-form-field">
                <label style={{ fontWeight: 700, fontSize: 14 }}>Note</label>
                <textarea value={cancelNote} onChange={e => setCancelNote(e.target.value)} rows={3} placeholder="Reason for cancellation..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: 12, border: '1px solid #d1d5db', borderRadius: 8, background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Keep Event
                </button>
                <button onClick={handleConfirmCancel} disabled={cancelProcessing} style={{ flex: 1, padding: 12, border: 'none', borderRadius: 8, background: '#ef4444', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: cancelProcessing ? 0.6 : 1 }}>
                  {cancelProcessing ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Tab Components ──

function HostInfoTab({ booking }) {
  return (
    <div className="tab-form-grid">
      <div className="form-row">
        <div className="form-field">
          <label>Host First Name</label>
          <input type="text" value={booking.hostName?.split(' ')[0] || ''} readOnly />
        </div>
        <div className="form-field">
          <label>Host Last Name</label>
          <input type="text" value={booking.hostName?.split(' ').slice(1).join(' ') || ''} readOnly />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label>Host Phone number</label>
          <input type="text" value={booking.hostPhone || ''} readOnly />
        </div>
        <div className="form-field">
          <label>Host Email</label>
          <input type="text" value={booking.hostEmail || ''} readOnly />
        </div>
      </div>
      {booking.childName && (
        <div className="form-row">
          <div className="form-field">
            <label>Celebrant's Name</label>
            <input type="text" value={booking.childName || ''} readOnly />
          </div>
          <div className="form-field">
            <label>Celebrant's Birthday</label>
            <input type="text" value={booking.childAge ? `${booking.childAge}` : ''} readOnly />
          </div>
        </div>
      )}
    </div>
  );
}

function EventTab({ booking, editMode, editData, setEditData, setEditMode, handleSaveEdit, setShowAddOn }) {
  return (
    <div>
      <div className="tab-form-grid">
        <div className="form-row">
          <div className="form-field">
            <label>Event Name</label>
            <input type="text" value={booking.childName ? `${booking.childName}'s ${booking.type === 'BIRTHDAY' ? 'Birthday Party' : 'Field Trip'}` : booking.hostName} readOnly />
          </div>
          <div className="form-field">
            <label>Event Date</label>
            <input type="text" value={booking.date} readOnly />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field full-width">
            <label>Assign To</label>
            <input type="text" value="Select a Assign member" readOnly style={{ color: '#999' }} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field full-width">
            <label>Location</label>
            <input type="text" value={booking.venue ? `${booking.venue.name}, ${booking.venue.address || ''}` : ''} readOnly />
          </div>
        </div>
      </div>

      {/* Package card */}
      <div className="package-card">
        <div className="package-card-left">
          <div className="package-image-placeholder"></div>
        </div>
        <div className="package-card-info">
          <h4>{booking.package?.name || 'N/A'}</h4>
          <div className="package-detail-grid">
            <div className="form-row">
              <div className="form-field">
                <label>Invited guests</label>
                {editMode ? (
                  <input type="number" value={editData.guestCount} onChange={e => setEditData(d => ({ ...d, guestCount: parseInt(e.target.value) }))} />
                ) : (
                  <input type="text" value={booking.guestCount} readOnly />
                )}
              </div>
              <div className="form-field">
                <label>Total Guests Included</label>
                <input type="text" value={booking.guestCount} readOnly />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Max Room Capacity</label>
                <input type="text" value={booking.venue?.capacity || 'N/A'} readOnly />
              </div>
              <div className="form-field">
                <label>Extra guests Charge</label>
                <input type="text" value={booking.extraPersonPrice ? `$${(booking.extraPersonPrice / 100).toFixed(2)}` : '$0.00'} readOnly />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Room Name</label>
                <input type="text" value={booking.venue?.name || 'N/A'} readOnly />
              </div>
              <div className="form-field">
                <label>Selected Time</label>
                <input type="text" value={`${booking.startTime || ''} to ${booking.endTime || ''}`} readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add-ons */}
      <div className="addons-section">
        <div className="addons-header">
          <h4>Add-ons</h4>
          <button className="addon-add-btn" onClick={() => setShowAddOn(true)}>+</button>
        </div>
        {booking.addOns?.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Items</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Sub Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {booking.addOns.map((a, i) => (
                <tr key={a.id}>
                  <td>{i + 1}</td>
                  <td>{a.name}</td>
                  <td>{a.quantity}</td>
                  <td>${(a.price / 100).toFixed(2)}</td>
                  <td>${((a.price * a.quantity) / 100).toFixed(2)}</td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data-msg">No Addons Added</div>
        )}
      </div>

      {!editMode && (
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>Edit</button>
        </div>
      )}
      {editMode && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn btn-success btn-sm" onClick={handleSaveEdit}>Save</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function NotesTab({ booking, editData, setEditData, handleSaveEdit, fetchBooking }) {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');

  const handleAddNote = async () => {
    if (!noteDesc.trim()) return;
    try {
      const newNotes = booking.notes
        ? `${booking.notes}\n[${noteTitle || 'Note'}] ${noteDesc}`
        : `[${noteTitle || 'Note'}] ${noteDesc}`;
      await api.put(`/bookings/${booking.id}`, { notes: newNotes });
      setNoteTitle('');
      setNoteDesc('');
      fetchBooking();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="table-controls">
        <span>Show <select><option>10</option></select> Entries</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>Search:</span>
          <button className="btn btn-primary btn-sm" onClick={handleAddNote}>+ Add Notes</button>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Who Added</th>
            <th>Added By</th>
            <th>Title</th>
            <th>Description</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {booking.notes ? (
            <tr>
              <td>ADMIN</td>
              <td>{booking.hostName}</td>
              <td>Note</td>
              <td>{booking.notes}</td>
              <td>{new Date(booking.updatedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })}</td>
            </tr>
          ) : (
            <tr><td colSpan="5" className="no-data-msg">No data available in table</td></tr>
          )}
        </tbody>
      </table>
      <div className="table-footer">
        <span>Showing {booking.notes ? '1 to 1 of 1' : '0 to 0 of 0'} entries</span>
        <div className="pagination">
          <button className="btn btn-sm">&#8249; Previous</button>
          <span className="page-num active">1</span>
          <button className="btn btn-sm">Next &#8250;</button>
        </div>
      </div>
    </div>
  );
}

function InvitationsTab({ booking, setShowInvite }) {
  return (
    <div>
      <div className="table-controls">
        <span>Show <select><option>10</option></select> Entries</span>
        <span>Search:</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Sn No.</th>
            <th>Status</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone Number</th>
          </tr>
        </thead>
        <tbody>
          {booking.invitations?.length > 0 ? (
            booking.invitations.map((inv, i) => (
              <tr key={inv.id}>
                <td>{i + 1}</td>
                <td>
                  <span className={`badge ${inv.rsvpStatus.toLowerCase()}`}>{inv.rsvpStatus}</span>
                </td>
                <td>{inv.guestName}</td>
                <td>{inv.guestEmail || '—'}</td>
                <td>{inv.guestPhone || '—'}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="5" className="no-data-msg">No data available in table</td></tr>
          )}
        </tbody>
      </table>
      <div className="table-footer">
        <span>Showing {booking.invitations?.length > 0 ? `1 to ${booking.invitations.length} of ${booking.invitations.length}` : '0 to 0 of 0'} entries</span>
        <div className="pagination">
          <button className="btn btn-sm">&#8249; Previous</button>
          <span className="page-num active">1</span>
          <button className="btn btn-sm">Next &#8250;</button>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>Send Invite</button>
      </div>
    </div>
  );
}

function WaiverTab({ booking, fetchBooking }) {
  const hasWaivers = booking.waivers?.length > 0;
  const signed = booking.waivers?.some(w => w.signedAt);
  const [waiverMsg, setWaiverMsg] = React.useState('');
  const [showEmailPopup, setShowEmailPopup] = React.useState(false);
  const [emailTo, setEmailTo] = React.useState(booking.hostEmail || '');
  const [sending, setSending] = React.useState(false);

  // Auto-refresh waiver data when tab is active — catches external signatures
  React.useEffect(() => {
    if (fetchBooking) fetchBooking();
    const interval = setInterval(() => {
      if (fetchBooking) fetchBooking();
    }, 10000); // refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleResendWaiver = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTo || !emailRegex.test(emailTo)) {
      setWaiverMsg('INVALID EMAIL');
      return;
    }
    setSending(true);
    setWaiverMsg('');
    try {
      const result = await api.post('/waivers/resend', { bookingId: booking.id, email: emailTo });
      setWaiverMsg(`Waiver sent to ${result.sentTo}`);
      setShowEmailPopup(false);
      if (fetchBooking) fetchBooking();
    } catch (err) {
      setWaiverMsg(`Error: ${err.message}`);
    }
    setSending(false);
  };

  const handleOpenWaiver = async (e) => {
    e.preventDefault();
    // Get or create waiver token, then open in new tab
    if (hasWaivers && booking.waivers[0]?.token) {
      window.open(`/waiver/${booking.waivers[0].token}`, '_blank');
    } else {
      try {
        const result = await api.post('/waivers/resend', { bookingId: booking.id });
        if (fetchBooking) fetchBooking();
        // After creating, re-fetch to get the token
        const resp = await api.get(`/waivers?bookingId=${booking.id}`);
        const waiverList = resp.waivers || resp;
        if (waiverList.length > 0) {
          window.open(`/waiver/${waiverList[0].token}`, '_blank');
        }
      } catch (err) {
        setWaiverMsg(`Error: ${err.message}`);
      }
    }
  };

  return (
    <div>
      {waiverMsg && <div style={{ padding: '8px 12px', marginBottom: 12, background: '#dcfce7', color: '#166534', borderRadius: 6, fontSize: 13 }}>{waiverMsg}</div>}
      {signed ? (
        /* Waiver is SIGNED — show details + View Waiver PDF button */
        <div>
          {(booking.waivers || []).filter(w => w.signedAt).map(w => {
            const signedDate = new Date(w.signedAt);
            const isExpired = w.expiresAt ? new Date(w.expiresAt) < new Date() : false;
            const isVerified = w.status === 'verified';
            return (
              <div key={w.id} style={{ background: '#f8fafc', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
                {/* Status Badge */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{
                    display: 'inline-block',
                    background: isExpired ? '#fef3c7' : isVerified ? '#dbeafe' : '#dcfce7',
                    color: isExpired ? '#92400e' : isVerified ? '#1e40af' : '#166534',
                    padding: '8px 24px', borderRadius: 20, fontWeight: 700, fontSize: 14,
                  }}>
                    {isExpired ? 'Waiver Expired' : isVerified ? 'Waiver Verified' : 'Waiver Signed'}
                  </div>
                </div>

                {/* Waiver Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Guest Name</div>
                    <div style={{ fontSize: 15, color: '#1e293b', fontWeight: 600 }}>{w.guestName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Guardian</div>
                    <div style={{ fontSize: 15, color: '#1e293b' }}>{w.guardianName || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Signed On</div>
                    <div style={{ fontSize: 15, color: '#1e293b', fontWeight: 600 }}>
                      {signedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {signedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}
                    </div>
                  </div>
                  {w.expiresAt && (
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Expires</div>
                      <div style={{ fontSize: 15, color: isExpired ? '#ef4444' : '#1e293b', fontWeight: isExpired ? 700 : 400 }}>
                        {new Date(w.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}
                        {isExpired && ' (EXPIRED)'}
                      </div>
                    </div>
                  )}
                  {isVerified && w.verifiedAt && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Verified On</div>
                      <div style={{ fontSize: 15, color: '#1e40af', fontWeight: 600 }}>
                        {new Date(w.verifiedAt).toLocaleString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expired Warning */}
                {isExpired && (
                  <div style={{ padding: '10px 16px', background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    This waiver has expired. The customer needs to sign a new waiver.
                  </div>
                )}

                {/* View Waiver Button */}
                <button className="btn-resend" style={{ width: '100%' }} onClick={async () => {
                  try {
                    const res = await fetch(`/api/waivers/pdf/${booking.id}`, { credentials: 'include' });
                    if (!res.ok) throw new Error('Failed to load waiver PDF');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                  } catch (err) {
                    setWaiverMsg(`Error: ${err.message}`);
                  }
                }}>
                  View Waiver PDF
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Waiver NOT signed — resend option */
        <div className="waiver-message">
          <p className="red-text">The waiver has not been signed. To resend <a href="#" className="link-green" onClick={(e) => { e.preventDefault(); setShowEmailPopup(true); }}>CLICK HERE</a></p>
        </div>
      )}

      {/* Email Waiver Popup */}
      {showEmailPopup && (
        <div className="modal-overlay" onClick={() => setShowEmailPopup(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Enter Email</h3>
              <button onClick={() => setShowEmailPopup(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>&times;</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>Email Waiver</span>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Email</div>
            </div>
            <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleResendWaiver} disabled={sending} style={{ padding: '8px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
                {sending ? 'Sending...' : 'Send'}
              </button>
              <button onClick={() => setShowEmailPopup(false)} style={{ padding: '8px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionsTab({ booking, setShowRefund }) {
  const [entries, setEntries] = useState(5);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const allTxns = booking.transactions || [];
  const filtered = allTxns.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (t.type || '').toLowerCase().includes(s)
      || (t.paymentMethod || '').toLowerCase().includes(s)
      || (t.notes || '').toLowerCase().includes(s)
      || (t.cardholderName || '').toLowerCase().includes(s)
      || (t.cardLast4 || '').includes(s);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / entries));
  const paged = filtered.slice((page - 1) * entries, page * entries);

  const getMethodLabel = (method) => {
    if (method === 'card' || method === 'credit_card') return 'Card';
    if (method === 'cash') return 'Cash';
    if (method === 'apple_pay') return 'Apple Pay';
    if (method === 'cash_app') return 'Cash App';
    if (method === 'refund') return 'Refund';
    return method || '—';
  };

  const getMethodBadgeClass = (method) => {
    if (method === 'card' || method === 'credit_card') return 'badge-info';
    if (method === 'cash') return 'badge-warning';
    if (method === 'apple_pay') return 'badge-info';
    if (method === 'cash_app') return 'badge-info';
    return 'badge-secondary';
  };

  // Detect card type from last4 or default to Visa
  const getCardType = (t) => {
    if (t.paymentMethod !== 'card' && t.paymentMethod !== 'credit_card') return '—';
    if (!t.cardLast4) return '—';
    // In a real app this comes from Stripe, for demo default to Visa
    return 'Visa';
  };

  return (
    <div>
      <div className="table-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          Show
          <select className="form-input" style={{ width: 60, padding: '4px 8px' }} value={entries} onChange={e => { setEntries(Number(e.target.value)); setPage(1); }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
          Entries
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>Search:</span>
          <input className="form-input" style={{ width: 150, padding: '4px 8px' }} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <button className="btn btn-refund" onClick={() => setShowRefund(true)}>Refund</button>
        </div>
      </div>
      <div className="txn-scroll-wrapper">
        <table className="data-table" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Method</th>
              <th>Price</th>
              <th>Cardholder</th>
              <th>Card</th>
              <th>Note</th>
              <th>Date/Time</th>
              <th>Action</th>
              <th>Taken by</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? (
              paged.map(t => (
                <tr key={t.id}>
                  <td>
                    <span className={`badge-pill ${t.type === 'PAYMENT' ? 'badge-success' : 'badge-danger'}`}>
                      {t.type === 'PAYMENT' ? 'PAID' : 'REFUND'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-pill ${getMethodBadgeClass(t.paymentMethod)}`}>
                      {getMethodLabel(t.paymentMethod)}
                    </span>
                  </td>
                  <td className={t.type === 'REFUND' ? 'red-text' : ''} style={{ whiteSpace: 'nowrap' }}>
                    {t.type === 'REFUND' ? '-' : ''}${(t.amount / 100).toFixed(2)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{t.cardholderName || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {t.cardLast4 ? (
                      <span>{getCardType(t)} ****{t.cardLast4}</span>
                    ) : '—'}
                  </td>
                  <td>{t.notes || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.createdAt).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                  <td>—</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{booking.hostName}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="9" className="no-data-msg">No data available in table</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Showing {filtered.length === 0 ? '0 to 0 of 0' : `${(page - 1) * entries + 1} to ${Math.min(page * entries, filtered.length)} of ${filtered.length}`} entries</span>
        <div className="pagination">
          <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>&#8249; Previous</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <span key={i} className={`page-num ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)} style={{ cursor: 'pointer' }}>{i + 1}</span>
          ))}
          <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next &#8250;</button>
        </div>
      </div>
    </div>
  );
}

function EmailTab({ booking }) {
  return (
    <div>
      <div className="table-controls">
        <span>Show <select><option>5</option></select> Entries</span>
        <span>Search:</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>email</th>
            <th>Date and Time</th>
            <th>message</th>
            <th>Resend</th>
          </tr>
        </thead>
        <tbody>
          {booking.emailLogs?.length > 0 ? (
            booking.emailLogs.map((log, idx) => (
              <tr key={log.id || idx}>
                <td>{log.to}</td>
                <td>{new Date(log.sentAt || log.createdAt).toLocaleString('en-US', { timeZone: 'America/New_York' })}</td>
                <td>{log.subject || 'Email sent'}</td>
                <td>
                  <button className="btn btn-resend">Resend</button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="4" className="no-data-msg">No data available in table</td></tr>
          )}
        </tbody>
      </table>
      <div className="table-footer">
        <span>Showing {booking.emailLogs?.length > 0 ? `1 to ${booking.emailLogs.length} of ${booking.emailLogs.length}` : '0 to 0 of 0'} entries</span>
        <div className="pagination">
          <button className="btn btn-sm">&#8249; Previous</button>
          <span className="page-num active">1</span>
          <button className="btn btn-sm">Next &#8250;</button>
        </div>
      </div>
    </div>
  );
}


// --- Modals ---

function PaymentModal({ bookingId, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('card');
  const [notes, setNotes] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transactions', {
        bookingId,
        amount: Math.round(parseFloat(amount) * 100),
        paymentMethod: method,
        notes,
        cardNumber,
        cardholderName,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Record Payment</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount ($)</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="apple_pay">Apple Pay</option>
              <option value="cash_app">Cash App</option>
            </select>
          </div>
          {method === 'card' && (
            <>
              <div className="form-group">
                <label>Card Number</label>
                <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4242424242424242" />
              </div>
              <div className="form-group">
                <label>Cardholder Name</label>
                <input type="text" value={cardholderName} onChange={e => setCardholderName(e.target.value)} placeholder="John Doe" />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment notes..." />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RefundModal({ bookingId, onClose, onSuccess }) {
  const [refundMode, setRefundMode] = useState('percentage');
  const [percentage, setPercentage] = useState('');
  const [exactAmount, setExactAmount] = useState('');
  const [reason, setReason] = useState('');
  const [cancellationFee, setCancellationFee] = useState('0');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        bookingId,
        reason,
        cancellationFee: Math.round(parseFloat(cancellationFee) * 100),
      };
      if (refundMode === 'percentage') {
        payload.percentage = parseFloat(percentage);
      } else {
        payload.amount = Math.round(parseFloat(exactAmount) * 100);
      }
      await api.post('/refunds', payload);
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Process Refund</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Refund Type</label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="radio" name="refundMode" value="percentage" checked={refundMode === 'percentage'} onChange={() => setRefundMode('percentage')} />
                Percentage
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="radio" name="refundMode" value="exact" checked={refundMode === 'exact'} onChange={() => setRefundMode('exact')} />
                Exact Amount
              </label>
            </div>
          </div>
          {refundMode === 'percentage' ? (
            <div className="form-group">
              <label>Refund Percentage (%)</label>
              <input type="number" min="1" max="100" value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="e.g. 50 for 50%" required />
            </div>
          ) : (
            <div className="form-group">
              <label>Refund Amount ($)</label>
              <input type="number" step="0.01" min="0.01" value={exactAmount} onChange={e => setExactAmount(e.target.value)} placeholder="e.g. 25.00" required />
            </div>
          )}
          <div className="form-group">
            <label>Cancellation Fee ($)</label>
            <input type="number" step="0.01" value={cancellationFee} onChange={e => setCancellationFee(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for refund..." />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger">Process Refund</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteModal({ bookingId, onClose, onSuccess }) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/invitations', { bookingId, guestName, guestEmail, guestPhone });
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Send Invitation</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Guest Name</label>
            <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Guest Email</label>
            <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Guest Phone (for SMS)</label>
            <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Send Invite</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddOnModal({ bookingId, onClose, onSuccess }) {
  const [mode, setMode] = useState('predefined');
  const [name, setName] = useState('Extra Pizza');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const PREDEFINED = [
    { name: 'Extra Pizza', price: 1500 },
    { name: 'Balloon Bundle', price: 2000 },
    { name: 'Face Painting', price: 3500 },
    { name: 'Photo Package', price: 4500 },
    { name: 'Goodie Bags (10)', price: 2500 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { bookingId, quantity };
      if (mode === 'custom') {
        payload.name = customName;
        payload.price = Math.round(parseFloat(customPrice) * 100);
      } else {
        const selected = PREDEFINED.find(p => p.name === name);
        payload.name = name;
        payload.price = selected ? selected.price : 1500;
      }
      await api.post('/addons', payload);
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Add Add-On</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type</label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="radio" name="addonMode" value="predefined" checked={mode === 'predefined'} onChange={() => setMode('predefined')} />
                Predefined
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="radio" name="addonMode" value="custom" checked={mode === 'custom'} onChange={() => setMode('custom')} />
                Custom
              </label>
            </div>
          </div>
          {mode === 'predefined' ? (
            <div className="form-group">
              <label>Add-On</label>
              <select value={name} onChange={e => setName(e.target.value)}>
                {PREDEFINED.map(p => (
                  <option key={p.name} value={p.name}>{p.name} — ${(p.price / 100).toFixed(2)}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Add-On Name</label>
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Custom Decoration" required />
              </div>
              <div className="form-group">
                <label>Price ($)</label>
                <input type="number" step="0.01" min="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="e.g. 25.00" required />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Quantity</label>
            <input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
