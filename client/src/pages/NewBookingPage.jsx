import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

// Business locations
const LOCATIONS = [
  { name: 'Tiny Towne Norcross', address: '2055 Beaver Ruin Road, Norcross, GA 30071' },
  { name: 'HelenFun Factory', address: 'Helen, GA' },
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMins = (timeStr) => {
  const [time, period] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};
const toTimeStr = (mins) => {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

// Get the day name for a date string (e.g. "2026-03-16" → "Monday")
const getDayName = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return DAYS_OF_WEEK[d.getDay()];
};

// Check if a room is available on a given day of the week
const isRoomAvailableOnDay = (venue, dayName) => {
  if (!dayName) return true; // no date selected, show all
  // Check timeSlots configs first
  let timeSlots = [];
  try { timeSlots = JSON.parse(venue.timeSlots || '[]'); } catch { timeSlots = []; }
  if (timeSlots.length > 0) {
    return timeSlots.some(ts => (ts.days || []).includes(dayName));
  }
  // Fall back to room-level days field
  if (venue.days && venue.days.trim()) {
    return venue.days.split(',').map(d => d.trim()).includes(dayName);
  }
  // No day restrictions configured — available every day
  return true;
};

// Generate time slots from venue configuration, using day-specific config if available
const generateSlots = (venue, dayName) => {
  let firstSlot = venue.firstSlot;
  let lastSlot = venue.lastSlot;
  let durationMins = venue.durationMins;
  let bufferMins = venue.bufferMins;

  // Check for day-specific time slot config
  if (dayName) {
    let timeSlots = [];
    try { timeSlots = JSON.parse(venue.timeSlots || '[]'); } catch { timeSlots = []; }
    const matchingConfig = timeSlots.find(ts => (ts.days || []).includes(dayName));
    if (matchingConfig) {
      firstSlot = matchingConfig.firstSlot || firstSlot;
      lastSlot = matchingConfig.lastSlot || lastSlot;
      const cfgDuration = (matchingConfig.durationHours || 0) * 60 + (matchingConfig.durationMins || 0);
      if (cfgDuration > 0) durationMins = cfgDuration;
      if (matchingConfig.bufferMins !== undefined) bufferMins = matchingConfig.bufferMins;
    }
  }

  const startMins = toMins(firstSlot);
  const endMins = toMins(lastSlot);
  const slots = [];
  let current = startMins;
  while (current + durationMins <= endMins) {
    slots.push({
      start: toTimeStr(current),
      end: toTimeStr(current + durationMins),
    });
    current += durationMins + bufferMins;
  }
  return slots;
};

export default function NewBookingPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState('');
  const [eventMode, setEventMode] = useState('onsite');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSlots, setShowSlots] = useState(false);
  const [step, setStep] = useState('slots'); // 'slots', 'package', or 'form'
  const [addonQtys, setAddonQtys] = useState({});
  const [showAddons, setShowAddons] = useState(false);
  const [notesList, setNotesList] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [paymentTab, setPaymentTab] = useState('card');
  const [payCard, setPayCard] = useState({ number: '', exp: '', name: '', cvv: '' });
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [catalogAddons, setCatalogAddons] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('Tiny Towne Norcross');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [form, setForm] = useState({
    type: 'BIRTHDAY',
    hostFirstName: '',
    hostLastName: '',
    hostEmail: '',
    hostPhone: '',
    childName: '',
    childAge: '1',
    guestCount: 0,
    extraPersons: 0,
    date: '',
    startTime: '',
    endTime: '',
    venueId: '',
    packageId: '',
    eventName: '',
    notes: '',
    customerLocation: '',
    zipCode: '',
    aptSuite: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/venues'),
      api.get('/packages?activeOnly=true'),
      api.get('/addon-catalog'),
    ]).then(([v, p, ac]) => {
      setVenues(v);
      setPackages(p);
      setCatalogAddons(ac);
    }).catch(console.error);
  }, []);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  useEffect(() => {
    if (form.date && form.guestCount > 0) {
      setShowSlots(true);
    } else {
      setShowSlots(false);
    }
  }, [form.date, form.guestCount]);

  // Fetch blocked times when date changes
  useEffect(() => {
    if (form.date) {
      api.get(`/blocked-times?date=${form.date}`).then(data => {
        setBlockedTimes(data);
      }).catch(() => setBlockedTimes([]));
    } else {
      setBlockedTimes([]);
    }
  }, [form.date]);

  const isSlotBlocked = (room, startTime) => {
    return blockedTimes.some(bt => bt.room === room && bt.startTime === startTime);
  };

  // Get rooms for selected location, filtered by day availability
  const locationObj = LOCATIONS.find(l => l.name === selectedLocation);
  const selectedDayName = getDayName(form.date);
  const locationRooms = venues.filter(v => {
    if (v.address !== locationObj?.address) return false;
    return isRoomAvailableOnDay(v, selectedDayName);
  });

  const to24 = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleSlotSelect = (room, slot) => {
    setSelectedSlot({ room, ...slot });
    const venue = venues.find(v => v.name === room);
    setForm(f => ({
      ...f,
      startTime: to24(slot.start),
      endTime: to24(slot.end),
      venueId: venue ? venue.id : f.venueId,
      packageId: '',
    }));
    setStep('package');
  };

  const handlePackageSelect = (pkgId) => {
    setForm(f => ({ ...f, packageId: pkgId }));
    setStep('form');
  };

  const updateAddonQty = (addonId, delta) => {
    setAddonQtys(prev => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [addonId]: next };
    });
  };

  const handleAddNote = () => {
    if (!noteTitle.trim() && !noteDesc.trim()) return;
    const newNote = {
      title: noteTitle.trim() || 'Note',
      description: noteDesc.trim(),
      time: new Date().toLocaleString(),
    };
    const updated = [...notesList, newNote];
    setNotesList(updated);
    // Build combined notes string for the booking
    const combined = updated.map(n => `[${n.title}] ${n.description}`).join('\n');
    setForm(f => ({ ...f, notes: combined }));
    setNoteTitle('');
    setNoteDesc('');
    setShowNoteModal(false);
  };

  const selectedAddons = catalogAddons.filter(a => (addonQtys[a.id] || 0) > 0);
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price * addonQtys[a.id], 0);

  const selectedPackage = packages.find(p => p.id === parseInt(form.packageId));
  const packagePrice = selectedPackage?.price || 0;
  const subtotal = packagePrice + addonsTotal;
  const discountAmount = appliedDiscount
    ? (appliedDiscount.discountType === 'percent'
      ? Math.round(subtotal * appliedDiscount.discount / 100)
      : appliedDiscount.discount)
    : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(afterDiscount * 0.06);
  const total = afterDiscount + tax;

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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    try {
      const data = {
        type: form.type,
        hostName: `${form.hostFirstName} ${form.hostLastName}`.trim(),
        hostEmail: form.hostEmail,
        hostPhone: form.hostPhone,
        childName: form.childName,
        childAge: form.childAge ? parseInt(form.childAge) : null,
        guestCount: parseInt(form.guestCount),
        extraPersons: parseInt(form.extraPersons),
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        venueId: parseInt(form.venueId),
        packageId: parseInt(form.packageId),
        notes: form.notes,
      };

      const booking = await api.post('/bookings', data);

      // Increment discount usage if applied
      if (appliedDiscount) {
        await api.post('/discounts/apply', { code: appliedDiscount.code });
      }

      // Save selected add-ons to the booking
      for (const addon of selectedAddons) {
        await api.post('/addons', {
          bookingId: booking.id,
          name: addon.name,
          price: addon.price,
          quantity: addonQtys[addon.id],
        });
      }

      setCreatedBookingId(booking.id);
      setPayAmount((total / 100).toFixed(2));
      setShowPaymentModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSkipPayment = () => {
    navigate(`/bookings/${createdBookingId}`);
  };

  const handleMakePayment = async () => {
    setPayProcessing(true);
    setError('');
    try {
      const amountCents = Math.round(parseFloat(payAmount) * 100);
      if (!amountCents || amountCents <= 0) {
        setError('Enter a valid amount');
        setPayProcessing(false);
        return;
      }

      const payload = {
        bookingId: createdBookingId,
        amount: amountCents,
        paymentMethod: paymentTab,
        notes: payNote || null,
      };

      if (paymentTab === 'card') {
        payload.cardNumber = payCard.number.replace(/\s/g, '');
        payload.cardholderName = payCard.name;
      }

      await api.post('/transactions', payload);
      navigate(`/bookings/${createdBookingId}`);
    } catch (err) {
      setError(err.message);
      setPayProcessing(false);
    }
  };

  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  // ── STEP 1: Slot Selection ──
  if (step === 'slots') {
    return (
      <div>
        {error && <div className="error-msg">{error}</div>}

        {/* On Site / Mobile Event toggle */}
        <div className="create-event-toggle">
          <button className={`toggle-btn ${eventMode === 'onsite' ? 'toggle-active-purple' : ''}`} onClick={() => setEventMode('onsite')}>On Site</button>
          <button className={`toggle-btn ${eventMode === 'mobile' ? 'toggle-active-teal' : ''}`} onClick={() => setEventMode('mobile')}>Mobile Event</button>
          <span className="info-icon">i</span>
        </div>

        {/* Top row */}
        <div className="create-event-toprow">
          <div className="ce-field">
            <label>Event Date</label>
            <input type="date" value={form.date} min={todayStr} onChange={e => handleChange('date', e.target.value)} placeholder="Click here to start" className="ce-input" />
          </div>
          <div className="ce-field">
            <label>Location</label>
            <select value={selectedLocation} onChange={e => { setSelectedLocation(e.target.value); setSelectedSlot(null); }} className="ce-input">
              {LOCATIONS.map(loc => (
                <option key={loc.name} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div className="ce-field">
            <label>Select number of guest</label>
            <select value={form.guestCount} onChange={e => handleChange('guestCount', parseInt(e.target.value))} className="ce-input">
              <option value={0}>0</option>
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (<option key={n} value={n}>{n}</option>))}
            </select>
          </div>
        </div>

        {eventMode === 'mobile' && (
          <div className="create-event-toprow" style={{ marginTop: 0 }}>
            <div className="ce-field" style={{ flex: 2 }}>
              <label>Customer Location</label>
              <input type="text" value={form.customerLocation} onChange={e => handleChange('customerLocation', e.target.value)} placeholder="Enter your address" className="ce-input" />
            </div>
            <div className="ce-field">
              <label>Zip/Postal Code</label>
              <input type="text" value={form.zipCode} onChange={e => handleChange('zipCode', e.target.value)} className="ce-input" />
            </div>
            <div className="ce-field">
              <label>Apt/Suite</label>
              <input type="text" value={form.aptSuite} onChange={e => handleChange('aptSuite', e.target.value)} className="ce-input" />
            </div>
          </div>
        )}

        {!showSlots && (
          <div className="ce-cta-bar">Select date and guest to show time slots</div>
        )}

        {showSlots && locationRooms.length === 0 && (
          <div style={{ padding: '20px 24px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 14, fontWeight: 500, textAlign: 'center' }}>
            No rooms are available on {selectedDayName || 'this day'}. Please select a different date.
          </div>
        )}

        {showSlots && locationRooms.length > 0 && (
          <div className="ce-slots-grid">
            {locationRooms.map(room => {
              const slots = generateSlots(room, selectedDayName);
              if (slots.length === 0) return null;
              return (
                <div className="ce-room-column" key={room.id}>
                  <h4 className="ce-room-name">{room.name}</h4>
                  {slots.map((slot, i) => {
                    const blocked = isSlotBlocked(room.name, slot.start);
                    const isSelected = selectedSlot?.room === room.name && selectedSlot?.start === slot.start;
                    return (
                      <div className="ce-slot-row" key={i}>
                        <button
                          className={`ce-slot-btn ${isSelected ? 'ce-slot-selected' : ''} ${blocked ? 'ce-slot-blocked' : ''}`}
                          onClick={() => !blocked && handleSlotSelect(room.name, slot)}
                          disabled={blocked}
                          title={blocked ? 'This time slot is blocked' : ''}
                        >
                          {slot.start}<br />{slot.end}
                        </button>
                        <span className={`ce-slot-avail ${blocked ? 'ce-slot-avail-blocked' : ''}`}>
                          {blocked ? 'Blocked' : 'Available'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── STEP 2: Package Selection ──
  if (step === 'package') {
    return (
      <div>
        <button className="back-link" onClick={() => setStep('slots')}>&larr; Back to time slots</button>

        <div className="pkg-select-header">
          <div className="pkg-select-info">
            <span><strong>Room:</strong> {selectedSlot?.room}</span>
            <span><strong>Time:</strong> {selectedSlot?.start} — {selectedSlot?.end}</span>
            <span><strong>Date:</strong> {form.date}</span>
          </div>
        </div>

        <h3 style={{ margin: '20px 0 16px', color: '#1e293b' }}>Choose a Package</h3>

        <div className="pkg-select-grid">
          {packages.map(pkg => (
            <div
              key={pkg.id}
              className={`pkg-select-card ${form.packageId === pkg.id ? 'pkg-select-active' : ''}`}
              onClick={() => handlePackageSelect(pkg.id)}
            >
              <div className="pkg-select-badge">${(pkg.price / 100).toFixed(2)}</div>
              <h4 className="pkg-select-name">{pkg.name}</h4>
              <p className="pkg-select-desc">{pkg.description || 'No description'}</p>
              <p className="pkg-select-type">{pkg.type === 'FIELD_TRIP' ? 'Field Trip' : 'Birthday'}</p>
              <button className="btn btn-event-new" style={{ marginTop: 12, width: '100%' }}>Select Package</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── STEP 3: Booking Form ──
  return (
    <div>
      <button className="back-link" onClick={() => setStep('package')}>&larr; Back to packages</button>

      {error && <div className="error-msg">{error}</div>}

      <div className="create-booking-layout">
        {/* Left: Form */}
        <div className="create-booking-form">
          {/* Host Info */}
          <div className="ce-form-card">
            <div className="form-row">
              <div className="form-field">
                <label>Host First Name</label>
                <input type="text" value={form.hostFirstName} onChange={e => handleChange('hostFirstName', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Host Last Name</label>
                <input type="text" value={form.hostLastName} onChange={e => handleChange('hostLastName', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Host Phone number</label>
                <input type="tel" value={form.hostPhone} onChange={e => handleChange('hostPhone', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Host Email</label>
                <input type="email" value={form.hostEmail} onChange={e => handleChange('hostEmail', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Celebrant's Name</label>
                <input type="text" value={form.childName} onChange={e => handleChange('childName', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Celebrant's Birthday</label>
                <select value={form.childAge} onChange={e => handleChange('childAge', e.target.value)}>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Event Name</label>
                <input type="text" value={form.eventName} onChange={e => handleChange('eventName', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Event Date</label>
                <input type="text" value={form.date} readOnly className="readonly-field" />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 16 }}>
              <label>Assign To</label>
              <input type="text" value="Select a Assign member" readOnly style={{ color: '#999' }} />
            </div>
            <div className="form-field" style={{ marginTop: 16 }}>
              <label>Location</label>
              <input type="text" value={venues.find(v => v.id === parseInt(form.venueId))?.address || '2055 Beaver Ruin Road, Norcross, GA, 30071 USA'} readOnly className="readonly-field" />
            </div>
          </div>

          {/* Selected Package */}
          <div className="ce-form-card">
            <h4 className="ce-section-title purple-text">
              <span className="ce-icon">&#127873;</span> Selected Package
            </h4>
            <div className="selected-package-card">
              <div className="sp-image">
                <span className="sp-price-badge">${(packagePrice / 100).toFixed(2)}</span>
              </div>
              <div className="sp-info">
                <h4 className="red-text">{selectedPackage?.name || 'Package'}</h4>
                <div className="sp-detail-row">
                  <span>Guests Allowed</span>
                  <select value={form.guestCount} onChange={e => handleChange('guestCount', parseInt(e.target.value))} className="sp-guests-select">
                    {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div className="sp-detail-row">
                  <span>Time: {selectedSlot?.start} to {selectedSlot?.end}</span>
                </div>
              </div>
            </div>

            {/* Package selector */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Change Package:</label>
              <select value={form.packageId} onChange={e => handleChange('packageId', e.target.value)} style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db' }}>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — ${(p.price / 100).toFixed(2)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add-ons Grid */}
          <div className="ce-form-card">
            <div className="ce-section-header">
              <h4 className="ce-section-title purple-text">
                <span className="ce-icon">&#128176;</span> Add-ons
              </h4>
              <button className="btn-add-purple" onClick={() => setShowAddons(v => !v)}>
                {showAddons ? '− Close' : '+ Add-ons'}
              </button>
            </div>
            {showAddons && <div className="addon-grid">
              {catalogAddons.map(addon => (
                <div className={`addon-card ${(addonQtys[addon.id] || 0) > 0 ? 'addon-selected' : ''}`} key={addon.id}>
                  <div className="addon-image">
                    {addon.image ? (
                      <img src={`/uploads/addons/${addon.image}`} alt={addon.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 6, color: '#94a3b8', fontSize: 11, gap: 4 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                        IMAGE NOT<br/>AVAILABLE
                      </div>
                    )}
                  </div>
                  <div className="addon-name">{addon.name}</div>
                  <div className="addon-qty-row">
                    <button className="addon-qty-btn" onClick={() => updateAddonQty(addon.id, -1)}>−</button>
                    <span className="addon-qty-val">{addonQtys[addon.id] || 0}</span>
                    <button className="addon-qty-btn" onClick={() => updateAddonQty(addon.id, 1)}>+</button>
                    <span className="addon-price">${(addon.price / 100).toFixed(2)}</span>
                  </div>
                  <div className="addon-desc">
                    {(addon.description || '').length > 60 ? (
                      <>{(addon.description || '').slice(0, 60)}<span style={{ color: '#7c3aed', cursor: 'pointer', fontSize: 11 }}>View More</span></>
                    ) : (addon.description || '')}
                  </div>
                </div>
              ))}
            </div>}

            {/* Selected add-ons table */}
            <div style={{ marginTop: 16 }}>
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
                  {selectedAddons.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 16, background: '#fee2e2', color: '#ef4444', fontWeight: 500, fontSize: 14 }}>No Addons Added</td></tr>
                  ) : selectedAddons.map((a, i) => (
                    <tr key={a.id}>
                      <td>{i + 1}</td>
                      <td>{a.name}</td>
                      <td>{addonQtys[a.id]}</td>
                      <td>${(a.price / 100).toFixed(2)}</td>
                      <td>${((a.price * addonQtys[a.id]) / 100).toFixed(2)}</td>
                      <td>
                        <button onClick={() => setAddonQtys(prev => ({ ...prev, [a.id]: 0 }))} style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="ce-form-card">
            <div className="ce-section-header">
              <h4 className="ce-section-title purple-text">
                <span className="ce-icon">&#128176;</span> Notes
              </h4>
              <button className="btn-add-purple" onClick={() => setShowNoteModal(true)}>+ Add Notes</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                Show
                <select className="form-input" style={{ width: 60, padding: '4px 8px' }} defaultValue={5}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                Entries
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                Search:
                <input className="form-input" style={{ width: 140, padding: '4px 8px' }} />
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
                {notesList.length === 0 ? (
                  <tr><td colSpan="5" className="no-data-msg" style={{ color: '#6b7280' }}>No data available in table</td></tr>
                ) : (
                  notesList.map((n, i) => (
                    <tr key={i}>
                      <td>Admin</td>
                      <td>Admin</td>
                      <td>{n.title}</td>
                      <td>{n.description}</td>
                      <td>{n.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="table-footer">
              <span>Showing {notesList.length > 0 ? `1 to ${notesList.length} of ${notesList.length}` : '0 to 0 of 0'} entries</span>
              <div className="pagination">
                <button className="btn btn-sm">&#8249; Previous</button>
                <button className="btn btn-sm">Next &#8250;</button>
              </div>
            </div>
          </div>

          {/* Note Modal */}
          {showNoteModal && (
            <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3 style={{ marginBottom: 16 }}>Add Note</h3>
                <div className="form-field" style={{ marginBottom: 12 }}>
                  <label>Title</label>
                  <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Note title" />
                </div>
                <div className="form-field" style={{ marginBottom: 16 }}>
                  <label>Description</label>
                  <textarea value={noteDesc} onChange={e => setNoteDesc(e.target.value)} placeholder="Write your note here..." rows={4} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm" style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer' }} onClick={() => setShowNoteModal(false)}>Cancel</button>
                  <button className="btn-add-purple" onClick={handleAddNote}>Save Note</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Price Details */}
        <div className="price-details-sidebar">
          <h3>Price Details</h3>

          <div className="price-section">
            <div className="price-label">Package</div>
            <div className="price-row">
              <span>{selectedPackage?.name || 'N/A'} ${(packagePrice / 100).toFixed(2)} x 1</span>
              <span>${(packagePrice / 100).toFixed(2)}</span>
            </div>
          </div>

          {selectedAddons.length > 0 && (
            <div className="price-section">
              <div className="price-label">Add-ons</div>
              {selectedAddons.map(a => (
                <div className="price-row" key={a.id}>
                  <span>{a.name} x {addonQtys[a.id]}</span>
                  <span>${((a.price * addonQtys[a.id]) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="price-section">
            <div className="price-label">DISCOUNT CODE</div>
            <div className="discount-input-row">
              <input type="text" className="discount-input" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} placeholder="Enter code" />
              <button className="discount-apply-btn" onClick={handleApplyDiscount}>&#10003;</button>
            </div>
            {discountError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{discountError}</div>}
            {appliedDiscount && <div style={{ color: '#16a34a', fontSize: 12, marginTop: 4 }}>Discount applied: {appliedDiscount.discountType === 'percent' ? `${appliedDiscount.discount}%` : `$${(appliedDiscount.discount / 100).toFixed(2)}`} off</div>}
          </div>

          <div className="price-totals">
            <div className="price-row">
              <span>Subtotal</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="price-row" style={{ color: '#16a34a' }}>
                <span>Discount ({appliedDiscount?.discountType === 'percent' ? `${appliedDiscount.discount}%` : 'Flat'})</span>
                <span>-${(discountAmount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="price-row">
              <span>Tax (6.00 %)</span>
              <span>${(tax / 100).toFixed(2)}</span>
            </div>
            <div className="price-row total-row">
              <span>Total</span>
              <span>${(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <button className="btn-book-event" onClick={handleSubmit}>Book Event</button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <div className="payment-modal-header">
              <span>Payment ${(total / 100).toFixed(2)}</span>
              <button className="payment-modal-close" onClick={handleSkipPayment}>&times;</button>
            </div>
            <div className="payment-modal-body">
              {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

              {/* Card / Cash toggle */}
              <div className="payment-tab-toggle">
                <button className={`payment-tab-btn ${paymentTab === 'card' ? 'payment-tab-active-green' : ''}`} onClick={() => setPaymentTab('card')}>Card</button>
                <button className={`payment-tab-btn ${paymentTab === 'cash' ? 'payment-tab-active-purple' : ''}`} onClick={() => setPaymentTab('cash')}>Cash</button>
              </div>

              {paymentTab === 'card' && (
                <>
                  <div className="pay-form-row">
                    <div className="pay-form-field">
                      <label>Card Number</label>
                      <input type="text" placeholder="1234 1234 1234 1234" value={payCard.number} onChange={e => setPayCard(c => ({ ...c, number: e.target.value }))} />
                    </div>
                    <div className="pay-form-field">
                      <label>Expiration Date</label>
                      <input type="text" placeholder="MM / AA" value={payCard.exp} onChange={e => setPayCard(c => ({ ...c, exp: e.target.value }))} />
                    </div>
                  </div>
                  <div className="pay-form-row">
                    <div className="pay-form-field">
                      <label>Card Holder Name</label>
                      <input type="text" placeholder="John Brike" value={payCard.name} onChange={e => setPayCard(c => ({ ...c, name: e.target.value }))} />
                    </div>
                    <div className="pay-form-field">
                      <label>Cvv Number</label>
                      <input type="text" placeholder="CVC" value={payCard.cvv} onChange={e => setPayCard(c => ({ ...c, cvv: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              <div className="pay-form-field" style={{ marginTop: paymentTab === 'cash' ? 0 : undefined }}>
                <label>{paymentTab === 'cash' ? 'Enter Amount' : 'Amount'}</label>
                <div className="pay-amount-input">
                  <span className="pay-dollar-sign">$</span>
                  <input type="number" step="0.01" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                </div>
              </div>

              <div className="pay-form-field">
                <label>Note</label>
                <textarea value={payNote} onChange={e => setPayNote(e.target.value)} rows={4} placeholder="Payment note..." />
              </div>

              <div className="payment-modal-actions">
                <button className="pay-btn-skip" onClick={handleSkipPayment} disabled={payProcessing}>Skip payment</button>
                <button className="pay-btn-confirm" onClick={handleMakePayment} disabled={payProcessing}>
                  {payProcessing ? 'Processing...' : 'Make a payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
