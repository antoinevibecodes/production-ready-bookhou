import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const LOCATIONS = [
  { name: 'Tiny Towne Norcross', address: '2055 Beaver Ruin Road, Norcross, GA 30071' },
  { name: 'HelenFun Factory', address: 'Helen, GA' },
];

export default function EventWaiversPage() {
  const [tab, setTab] = useState('bookings'); // bookings, walkins, waivers
  const [stats, setStats] = useState({ totalSigned: 0, signedToday: 0, pendingVerification: 0, walkinCount: 0, bookingCount: 0, expiredCount: 0 });
  const [waivers, setWaivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [venues, setVenues] = useState([]);
  const [venueFilter, setVenueFilter] = useState('');

  // Stat card filter
  const [activeStatCard, setActiveStatCard] = useState(null); // 'total', 'today', 'walkins', 'bookings'
  const [typeFilter, setTypeFilter] = useState(''); // '', 'walkin', 'booking'
  const [datePreset, setDatePreset] = useState('all'); // 'all', 'today', 'week', 'month', 'custom'

  // Bookings tab state
  const [bookings, setBookings] = useState([]);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [guestData, setGuestData] = useState(null);

  // Marketing modal
  const [showMarketing, setShowMarketing] = useState(false);
  const [mktMethod, setMktMethod] = useState('email');
  const [mktSubject, setMktSubject] = useState('');
  const [mktBody, setMktBody] = useState('');
  const [mktSending, setMktSending] = useState(false);
  const [mktMsg, setMktMsg] = useState('');

  // Walk-in QR
  const [showQR, setShowQR] = useState(false);
  const [qrLocation, setQrLocation] = useState('');

  // Resend modal (bookings tab)
  const [resendModal, setResendModal] = useState(null);
  const [resendMethod, setResendMethod] = useState('email');
  const [resendTarget, setResendTarget] = useState('');

  // Manual waiver modal
  const [showManualWaiver, setShowManualWaiver] = useState(false);
  const [manualForm, setManualForm] = useState({ firstName: '', lastName: '', phone: '', email: '', venueId: '', bookingId: '' });

  // Success/error message
  const [msg, setMsg] = useState('');

  // Date helpers
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const getWeekStart = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getMonthStart = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  // Stat card click handlers
  const handleStatClick = (card) => {
    if (activeStatCard === card) {
      // Clicking again deselects
      setActiveStatCard(null);
      setTypeFilter('');
      setTab('bookings');
      setDatePreset('all');
      setDateFrom('');
      setDateTo('');
      return;
    }
    setActiveStatCard(card);
    setSearch('');
    setVenueFilter('');
    if (card === 'total') {
      setTab('waivers');
      setTypeFilter('');
      setDatePreset('all');
      setDateFrom('');
      setDateTo('');
    } else if (card === 'today') {
      setTab('waivers');
      setTypeFilter('');
      setDatePreset('today');
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (card === 'walkins') {
      setTab('walkins');
      setTypeFilter('walkin');
      setDatePreset('all');
      setDateFrom('');
      setDateTo('');
    } else if (card === 'bookings') {
      setTab('bookings');
      setActiveStatCard('bookings');
      setDatePreset('all');
      setDateFrom('');
      setDateTo('');
    }
  };

  // Date preset handler
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'week') {
      setDateFrom(getWeekStart());
      setDateTo(todayStr);
    } else if (preset === 'month') {
      setDateFrom(getMonthStart());
      setDateTo(todayStr);
    }
    // 'custom' — user picks dates manually
  };

  // Fetch venues
  useEffect(() => {
    fetch('/api/venues', { credentials: 'include' })
      .then(r => r.json())
      .then(setVenues)
      .catch(() => {});
  }, []);

  // Fetch stats
  const fetchStats = useCallback(() => {
    fetch('/api/waivers/dashboard-stats', { credentials: 'include' })
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Fetch waivers (walk-ins tab or all waivers tab)
  const fetchWaivers = useCallback(() => {
    if (tab !== 'walkins' && tab !== 'waivers') return;
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    // Walk-ins tab always filters to walkin type; waivers tab uses typeFilter
    if (tab === 'walkins') {
      params.set('type', 'walkin');
    } else if (typeFilter) {
      params.set('type', typeFilter);
    }
    if (search) params.set('search', search);
    if (dateFrom) params.set('startDate', dateFrom);
    if (dateTo) params.set('endDate', dateTo);
    if (venueFilter) params.set('venueId', venueFilter);

    fetch(`/api/waivers?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setWaivers(data.waivers || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab, typeFilter, search, dateFrom, dateTo, venueFilter]);

  useEffect(() => { fetchWaivers(); }, [fetchWaivers]);

  // Fetch bookings (bookings tab) — with client-side date filtering
  const fetchBookings = useCallback(() => {
    if (tab !== 'bookings') return;
    setLoading(true);
    fetch('/api/bookings', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        let active = data.filter(b => b.status !== 'DELETED' && b.status !== 'CANCELLED');
        // Apply date filter on booking event date
        if (dateFrom) {
          active = active.filter(b => {
            const bDate = (b.date || '').split('T')[0];
            return bDate >= dateFrom;
          });
        }
        if (dateTo) {
          active = active.filter(b => {
            const bDate = (b.date || '').split('T')[0];
            return bDate <= dateTo;
          });
        }
        setBookings(active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab, dateFrom, dateTo]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Fetch guest details for a booking
  const viewBookingDetail = async (bookingId) => {
    try {
      const res = await fetch(`/api/waivers/booking/${bookingId}/guests`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load guest data');
      const data = await res.json();
      setGuestData(data);
      setBookingDetail(bookings.find(b => b.id === bookingId));
    } catch (err) {
      setMsg(err.message || 'Failed to load waiver details');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  // Export CSV
  const handleExport = () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (search) params.set('search', search);
    if (dateFrom) params.set('startDate', dateFrom);
    if (dateTo) params.set('endDate', dateTo);
    window.open(`/api/waivers/export?${params}`, '_blank');
  };

  // Send marketing campaign to all opted-in customers
  const handleSendMarketing = async () => {
    if (!mktBody.trim()) return;
    setMktSending(true);
    try {
      const res = await fetch('/api/waivers/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          method: mktMethod,
          subject: mktSubject,
          body: mktBody,
          type: typeFilter || undefined,
          venueId: venueFilter || undefined,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMktMsg(`Campaign sent to ${data.sentCount} opted-in customers`);
        setTimeout(() => setMktMsg(''), 5000);
      } else {
        setMktMsg(data.error || 'Failed to send');
        setTimeout(() => setMktMsg(''), 3000);
      }
    } catch {
      setMktMsg('Failed to send');
      setTimeout(() => setMktMsg(''), 3000);
    }
    setMktSending(false);
    setShowMarketing(false);
    setMktBody('');
    setMktSubject('');
  };

  // Resend waiver to guest
  const handleResendGuest = async () => {
    if (!resendTarget) return;
    try {
      await fetch('/api/waivers/resend-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: bookingDetail.id,
          guestId: resendModal.id,
          method: resendMethod,
          target: resendTarget,
        }),
      });
      setMsg('Waiver link sent!');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Failed to send');
    }
    setResendModal(null);
  };

  // Resend all unsigned
  const handleResendAllUnsigned = async () => {
    try {
      const res = await fetch('/api/waivers/resend-all-unsigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookingId: bookingDetail.id }),
      });
      const data = await res.json();
      setMsg(`Sent to ${data.sentCount} unsigned guests`);
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Failed to send');
    }
  };

  // Create manual waiver
  const handleCreateManualWaiver = async () => {
    if (!manualForm.firstName || !manualForm.lastName || !manualForm.phone) {
      setMsg('First name, last name, and phone are required');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    try {
      const venueId = manualForm.venueId ? parseInt(manualForm.venueId) : (venues[0]?.id || null);
      const res = await fetch('/api/waivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          guestName: `${manualForm.firstName} ${manualForm.lastName}`.trim(),
          venueId,
          bookingId: manualForm.bookingId ? parseInt(manualForm.bookingId) : undefined,
          type: manualForm.bookingId ? 'booking' : 'walkin',
        }),
      });
      if (!res.ok) throw new Error('Failed to create waiver');
      const data = await res.json();
      setMsg(`Waiver created! Link: ${data.link}`);
      setTimeout(() => setMsg(''), 5000);
      setShowManualWaiver(false);
      setManualForm({ firstName: '', lastName: '', phone: '', email: '', venueId: '', bookingId: '' });
      fetchStats();
      fetchWaivers();
    } catch {
      setMsg('Failed to create waiver');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  // View PDF
  const viewPDF = async (waiverId) => {
    try {
      const res = await fetch(`/api/waivers/guest/${waiverId}/pdf`, { credentials: 'include' });
      if (!res.ok) { setMsg('Failed to load PDF'); setTimeout(() => setMsg(''), 3000); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setMsg('Failed to load PDF');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === waivers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(waivers.map(w => w.id)));
    }
  };

  // Find a venue ID for the selected location (use first room at that address)
  const selectedLoc = LOCATIONS.find(l => l.name === qrLocation);
  const locVenue = selectedLoc ? venues.find(v => v.address === selectedLoc.address) : null;
  const walkinLink = locVenue ? `${window.location.origin}/waiver/walkin/${locVenue.id}` : '';

  const s = {
    card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px' },
    statCard: (active) => ({
      background: active ? '#f5f3ff' : '#fff', borderRadius: 12,
      boxShadow: active ? '0 0 0 2px #7c3aed' : '0 1px 4px rgba(0,0,0,0.07)',
      padding: '18px 22px', textAlign: 'center', cursor: 'pointer',
      transition: 'all 0.15s ease',
    }),
    statNum: { fontSize: 28, fontWeight: 800, color: '#1e293b' },
    statLabel: { fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 },
    tab: (active) => ({
      padding: '10px 24px', border: 'none', borderRadius: '8px 8px 0 0',
      fontSize: 14, fontWeight: 700, cursor: 'pointer',
      background: active ? '#7c3aed' : '#f1f5f9',
      color: active ? '#fff' : '#64748b',
    }),
    btn: { padding: '8px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    btnGreen: { padding: '8px 18px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    btnOutline: { padding: '8px 18px', background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    input: { padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b', background: '#fafbfc' },
    th: { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' },
    td: { padding: '10px 12px', fontSize: 13, color: '#334155', borderBottom: '1px solid #f1f5f9' },
    badge: (color) => ({
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: color === 'green' ? '#dcfce7' : color === 'blue' ? '#dbeafe' : color === 'amber' ? '#fef3c7' : '#f1f5f9',
      color: color === 'green' ? '#166534' : color === 'blue' ? '#1e40af' : color === 'amber' ? '#92400e' : '#475569',
    }),
    dateBtn: (active) => ({
      padding: '5px 14px', border: active ? '1.5px solid #7c3aed' : '1.5px solid #e2e8f0',
      borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      background: active ? '#f5f3ff' : '#fff', color: active ? '#7c3aed' : '#64748b',
    }),
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#fff', borderRadius: 14, padding: '28px 32px', maxWidth: 500, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  };

  // ─── Booking Detail View (drill-down) ───
  if (bookingDetail && guestData) {
    const progress = guestData.totalGuests > 0 ? Math.round((guestData.signedCount / guestData.totalGuests) * 100) : 0;

    return (
      <div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setBookingDetail(null); setGuestData(null); }} style={{ ...s.btnOutline, padding: '6px 14px' }}>Back</button>
          <h1>Waivers - {bookingDetail.hostName}'s Event</h1>
        </div>

        {msg && <div style={{ padding: '10px 16px', background: '#dcfce7', color: '#166534', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}

        {/* Party Info + Progress */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={s.card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Party Info</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 2 }}>
              <div><strong>Host:</strong> {bookingDetail.hostName}</div>
              <div><strong>Child:</strong> {bookingDetail.childName || 'N/A'}</div>
              <div><strong>Date:</strong> {bookingDetail.displayDate || bookingDetail.date}</div>
              <div><strong>Room:</strong> {bookingDetail.venue?.name || 'N/A'}</div>
              <div><strong>Guests:</strong> {guestData.totalGuests}</div>
            </div>
          </div>
          <div style={s.card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Waiver Progress</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: progress === 100 ? '#22c55e' : '#f59e0b', marginBottom: 4 }}>{guestData.signedCount} / {guestData.totalGuests}</div>
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 10, marginBottom: 12 }}>
              <div style={{ width: `${progress}%`, background: progress === 100 ? '#22c55e' : '#f59e0b', height: '100%', borderRadius: 8 }} />
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Waiver Link:</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input readOnly value={guestData.waiverLink} style={{ ...s.input, flex: 1, fontSize: 11 }} />
              <button onClick={() => { navigator.clipboard.writeText(guestData.waiverLink); setMsg('Link copied!'); setTimeout(() => setMsg(''), 2000); }} style={s.btn}>Copy</button>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={handleResendAllUnsigned} style={s.btn}>Resend All Unsigned</button>
        </div>

        {/* Guest table */}
        <div style={s.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>Guest</th>
                <th style={s.th}>Email / Phone</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Signed At</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guestData.guests.length === 0 ? (
                <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: 30 }}>No guests yet</td></tr>
              ) : guestData.guests.map((g, i) => (
                <tr key={i}>
                  <td style={s.td}>{g.name}</td>
                  <td style={s.td}>{g.email || g.phone || '-'}</td>
                  <td style={s.td}>
                    <span style={s.badge(g.signed ? 'green' : 'amber')}>{g.signed ? 'Signed' : 'Not Signed'}</span>
                  </td>
                  <td style={s.td}>{g.signedAt ? new Date(g.signedAt).toLocaleDateString('en-US', { timeZone: 'America/New_York' }) : '-'}</td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {g.signed && g.waiverId && (
                        <button onClick={() => viewPDF(g.waiverId)} style={{ ...s.btnOutline, padding: '4px 10px', fontSize: 11 }}>View PDF</button>
                      )}
                      {!g.signed && (
                        <button onClick={() => { setResendModal(g); setResendTarget(g.email || g.phone || ''); setResendMethod(g.email ? 'email' : 'sms'); }} style={{ ...s.btn, padding: '4px 10px', fontSize: 11 }}>Resend</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resend Modal */}
        {resendModal && (
          <div style={s.overlay} onClick={() => setResendModal(null)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <h3 style={{ marginBottom: 16, color: '#1e293b' }}>Resend Waiver to {resendModal.name}</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button onClick={() => setResendMethod('email')} style={resendMethod === 'email' ? s.btn : s.btnOutline}>Email</button>
                <button onClick={() => setResendMethod('sms')} style={resendMethod === 'sms' ? s.btn : s.btnOutline}>SMS</button>
              </div>
              <input
                type={resendMethod === 'email' ? 'email' : 'tel'}
                value={resendTarget}
                onChange={e => setResendTarget(e.target.value)}
                placeholder={resendMethod === 'email' ? 'Email address' : 'Phone number'}
                style={{ ...s.input, width: '100%', marginBottom: 16 }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setResendModal(null)} style={s.btnOutline}>Cancel</button>
                <button onClick={handleResendGuest} style={s.btnGreen}>Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Main Dashboard View ───
  return (
    <div>
      <div className="page-header">
        <h1>Waiver Dashboard</h1>
      </div>

      {msg && <div style={{ padding: '10px 16px', background: '#dcfce7', color: '#166534', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      {mktMsg && <div style={{ padding: '10px 16px', background: '#dbeafe', color: '#1e40af', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{mktMsg}</div>}

      {/* Stats Bar — Clickable Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={s.statCard(activeStatCard === 'total')} onClick={() => handleStatClick('total')}>
          <div style={s.statNum}>{stats.totalSigned}</div>
          <div style={s.statLabel}>Total Signed</div>
        </div>
        <div style={s.statCard(activeStatCard === 'today')} onClick={() => handleStatClick('today')}>
          <div style={s.statNum}>{stats.signedToday}</div>
          <div style={s.statLabel}>Signed Today</div>
        </div>
        <div style={s.statCard(activeStatCard === 'walkins')} onClick={() => handleStatClick('walkins')}>
          <div style={s.statNum}>{stats.walkinCount}</div>
          <div style={s.statLabel}>Walk-ins</div>
        </div>
        <div style={s.statCard(activeStatCard === 'bookings')} onClick={() => handleStatClick('bookings')}>
          <div style={s.statNum}>{stats.bookingCount}</div>
          <div style={s.statLabel}>Event Bookings</div>
        </div>
        <div style={{ ...s.statCard(false), background: stats.expiredCount > 0 ? '#fef3c7' : '#fff' }}>
          <div style={{ ...s.statNum, color: stats.expiredCount > 0 ? '#92400e' : '#1e293b' }}>{stats.expiredCount}</div>
          <div style={s.statLabel}>Expired</div>
        </div>
      </div>

      {/* Tabs + Date Filter (same row) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 0 }}>
        <button style={s.tab(tab === 'bookings')} onClick={() => { setTab('bookings'); setActiveStatCard(null); setTypeFilter(''); setDatePreset('all'); setDateFrom(''); setDateTo(''); }}>Bookings</button>
        <button style={s.tab(tab === 'walkins')} onClick={() => { setTab('walkins'); setTypeFilter('walkin'); setActiveStatCard(null); setDatePreset('all'); setDateFrom(''); setDateTo(''); }}>Walk-ins</button>
        <button style={s.tab(tab === 'waivers')} onClick={() => { setTab('waivers'); setTypeFilter(''); setActiveStatCard(null); setDatePreset('all'); setDateFrom(''); setDateTo(''); }}>All Waivers</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', paddingBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginRight: 2 }}>{tab === 'bookings' ? 'DATE:' : 'SIGNED:'}</span>
          <button style={s.dateBtn(datePreset === 'all')} onClick={() => handleDatePreset('all')}>All Time</button>
          <button style={s.dateBtn(datePreset === 'today')} onClick={() => handleDatePreset('today')}>Today</button>
          <button style={s.dateBtn(datePreset === 'week')} onClick={() => handleDatePreset('week')}>This Week</button>
          <button style={s.dateBtn(datePreset === 'month')} onClick={() => handleDatePreset('month')}>This Month</button>
          <button style={s.dateBtn(datePreset === 'custom')} onClick={() => handleDatePreset('custom')}>Custom</button>
          {datePreset === 'custom' && (
            <>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...s.input, padding: '4px 8px', fontSize: 11 }} />
              <span style={{ color: '#94a3b8', fontSize: 11 }}>to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...s.input, padding: '4px 8px', fontSize: 11 }} />
            </>
          )}
        </div>
      </div>

      {/* ═══ WALK-INS TAB ═══ */}
      {tab === 'walkins' && (
        <div style={{ ...s.card, borderTopLeftRadius: 0 }}>
          {/* Walk-in QR Code Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 18px', background: '#f5f3ff', borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Walk-in Waiver QR Code</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Print this QR code and display it at the venue entrance. Customers scan it to fill out the waiver on their phone.</div>
            </div>
            <select value={qrLocation} onChange={e => { setQrLocation(e.target.value); setShowQR(false); }} style={{ ...s.input, width: 200 }}>
              <option value="">Select Location</option>
              {LOCATIONS.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
            </select>
            <button onClick={() => { if (qrLocation) setShowQR(!showQR); }} disabled={!qrLocation} style={{ ...s.btn, opacity: qrLocation ? 1 : 0.5 }}>
              {showQR ? 'Hide QR' : 'Show QR'}
            </button>
          </div>

          {showQR && walkinLink && (
            <div style={{ textAlign: 'center', padding: 24, background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, marginBottom: 20 }}>
              <QRCodeSVG value={walkinLink} size={200} level="M" />
              <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
                <input readOnly value={walkinLink} style={{ ...s.input, width: 320, textAlign: 'center', fontSize: 11 }} />
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => { navigator.clipboard.writeText(walkinLink); setMsg('Link copied!'); setTimeout(() => setMsg(''), 2000); }} style={s.btnOutline}>Copy Link</button>
                <button onClick={() => window.print()} style={s.btnOutline}>Print QR</button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...s.input, width: 240 }}
            />
            <select value={venueFilter} onChange={e => setVenueFilter(e.target.value)} style={s.input}>
              <option value="">All Locations</option>
              {LOCATIONS.map(l => {
                const v = venues.find(v => v.address === l.address);
                return v ? <option key={l.name} value={v.id}>{l.name}</option> : null;
              })}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowManualWaiver(true)} style={s.btnGreen}>+ Add Waiver</button>
              <button onClick={handleExport} style={s.btnOutline}>Export CSV</button>
              <button onClick={() => setShowMarketing(true)} style={s.btn}>
                Send Campaign
              </button>
            </div>
          </div>

          {/* Walk-in Waivers Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>Customer Name</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Phone</th>
                <th style={s.th}>Venue</th>
                <th style={s.th}>Date Signed</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading...</td></tr>
              ) : waivers.length === 0 ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: 30, color: '#94a3b8' }}>No walk-in waivers found</td></tr>
              ) : waivers.map(w => (
                <tr key={w.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{w.guestName}</td>
                  <td style={s.td}>{w.email || '-'}</td>
                  <td style={s.td}>{w.phone || '-'}</td>
                  <td style={s.td}>{w.venueName || '-'}</td>
                  <td style={s.td}>{w.signedAt ? new Date(w.signedAt).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                  <td style={s.td}>
                    {w.expired ? (
                      <span style={s.badge('amber')}>Expired</span>
                    ) : (
                      <span style={s.badge(w.status === 'verified' ? 'blue' : 'green')}>
                        {w.status === 'verified' ? 'Verified' : 'Signed'}
                      </span>
                    )}
                    {w.marketingOptIn && <span style={{ ...s.badge('amber'), marginLeft: 4 }}>Opted In</span>}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => viewPDF(w.id)} style={{ ...s.btnOutline, padding: '4px 10px', fontSize: 11 }}>View PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 0 && <div style={{ textAlign: 'right', padding: '10px 0', fontSize: 12, color: '#64748b' }}>Showing {waivers.length} of {total}</div>}
        </div>
      )}

      {/* ═══ ALL WAIVERS TAB ═══ */}
      {tab === 'waivers' && (
        <div style={{ ...s.card, borderTopLeftRadius: 0 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...s.input, width: 240 }}
            />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={s.input}>
              <option value="">All Types</option>
              <option value="walkin">Walk-in</option>
              <option value="booking">Booking</option>
            </select>
            <select value={venueFilter} onChange={e => setVenueFilter(e.target.value)} style={s.input}>
              <option value="">All Locations</option>
              {LOCATIONS.map(l => {
                const v = venues.find(v => v.address === l.address);
                return v ? <option key={l.name} value={v.id}>{l.name}</option> : null;
              })}
            </select>
            {activeStatCard && (
              <button onClick={() => { setActiveStatCard(null); setTypeFilter(''); setDatePreset('all'); setDateFrom(''); setDateTo(''); setSearch(''); setVenueFilter(''); }} style={{ ...s.btnOutline, padding: '6px 14px', fontSize: 12, color: '#ef4444', borderColor: '#fecaca' }}>
                Clear Filters
              </button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowManualWaiver(true)} style={s.btnGreen}>+ Add Waiver</button>
              <button onClick={handleExport} style={s.btnOutline}>Export CSV</button>
              <button onClick={() => setShowMarketing(true)} style={s.btn}>
                Send Campaign
              </button>
            </div>
          </div>

          {/* Active filter indicator */}
          {activeStatCard && (
            <div style={{ padding: '8px 14px', background: '#f5f3ff', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>
              Showing: {activeStatCard === 'total' ? 'All Signed Waivers' : activeStatCard === 'today' ? 'Waivers Signed Today' : 'All Waivers'}
            </div>
          )}

          {/* All Waivers Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>Customer Name</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Phone</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Venue</th>
                <th style={s.th}>Date Signed</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading...</td></tr>
              ) : waivers.length === 0 ? (
                <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', padding: 30, color: '#94a3b8' }}>No waivers found</td></tr>
              ) : waivers.map(w => (
                <tr key={w.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{w.guestName}</td>
                  <td style={s.td}>{w.email || '-'}</td>
                  <td style={s.td}>{w.phone || '-'}</td>
                  <td style={s.td}>
                    <span style={s.badge(w.type === 'walkin' ? 'amber' : 'blue')}>
                      {w.type === 'walkin' ? 'Walk-in' : 'Booking'}
                    </span>
                  </td>
                  <td style={s.td}>{w.venueName || '-'}</td>
                  <td style={s.td}>{w.signedAt ? new Date(w.signedAt).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                  <td style={s.td}>
                    {w.expired ? (
                      <span style={s.badge('amber')}>Expired</span>
                    ) : (
                      <span style={s.badge(w.status === 'verified' ? 'blue' : 'green')}>
                        {w.status === 'verified' ? 'Verified' : 'Signed'}
                      </span>
                    )}
                    {w.marketingOptIn && <span style={{ ...s.badge('amber'), marginLeft: 4 }}>Opted In</span>}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => viewPDF(w.id)} style={{ ...s.btnOutline, padding: '4px 10px', fontSize: 11 }}>View PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 0 && <div style={{ textAlign: 'right', padding: '10px 0', fontSize: 12, color: '#64748b' }}>Showing {waivers.length} of {total}</div>}
        </div>
      )}

      {/* ═══ BOOKINGS TAB ═══ */}
      {tab === 'bookings' && (
        <div style={{ ...s.card, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          {/* Active filter indicator */}
          {(datePreset !== 'all' || activeStatCard) && (
            <div style={{ padding: '8px 14px', background: '#f5f3ff', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                {activeStatCard === 'bookings' ? 'Showing: Event Bookings' :
                 datePreset === 'today' ? 'Showing: Events Today' :
                 datePreset === 'week' ? 'Showing: Events This Week' :
                 datePreset === 'month' ? 'Showing: Events This Month' :
                 datePreset === 'custom' && (dateFrom || dateTo) ? `Showing: Events ${dateFrom || '...'} to ${dateTo || '...'}` : ''}
              </span>
              {(datePreset !== 'all' || activeStatCard) && (
                <button onClick={() => { setActiveStatCard(null); setDatePreset('all'); setDateFrom(''); setDateTo(''); }} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>Clear</button>
              )}
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>Event</th>
                <th style={s.th}>Host</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Room</th>
                <th style={s.th}>Guests</th>
                <th style={s.th}>Waivers</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: 30, color: '#94a3b8' }}>No bookings found</td></tr>
              ) : bookings.map(b => {
                const signed = b.waiverSignedCount || 0;
                const totalG = b.guestCount || 0;
                const pct = totalG > 0 ? Math.round((signed / totalG) * 100) : 0;
                return (
                  <tr key={b.id}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{b.childName ? `${b.childName}'s ${b.type === 'FIELD_TRIP' ? 'Field Trip' : 'Birthday'}` : b.hostName}</td>
                    <td style={s.td}>{b.hostName}</td>
                    <td style={s.td}>{b.displayDate || b.date}</td>
                    <td style={s.td}>{b.venue?.name || '-'}</td>
                    <td style={s.td}>{totalG}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, width: 80 }}>
                          <div style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#f59e0b', height: '100%', borderRadius: 6 }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{signed}/{totalG}</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <button onClick={() => viewBookingDetail(b.id)} style={{ ...s.btn, padding: '4px 12px', fontSize: 11 }}>View Details</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Marketing Campaign Modal */}
      {showMarketing && (
        <div style={s.overlay} onClick={() => setShowMarketing(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4, color: '#1e293b' }}>Send Marketing Campaign</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              This will send to <strong>all opted-in customers</strong> who signed a waiver
              {typeFilter === 'walkin' ? ' (walk-ins only)' : typeFilter === 'booking' ? ' (bookings only)' : ''}
              {venueFilter ? ' at the selected location' : ''}
              {dateFrom || dateTo ? ` within the selected date range` : ''}.
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button onClick={() => setMktMethod('email')} style={mktMethod === 'email' ? s.btn : s.btnOutline}>Email</button>
              <button onClick={() => setMktMethod('sms')} style={mktMethod === 'sms' ? s.btn : s.btnOutline}>SMS</button>
            </div>
            {mktMethod === 'email' && (
              <input
                type="text"
                placeholder="Email subject line"
                value={mktSubject}
                onChange={e => setMktSubject(e.target.value)}
                style={{ ...s.input, width: '100%', marginBottom: 12 }}
              />
            )}
            <textarea
              placeholder={mktMethod === 'email' ? 'Email body...' : 'SMS message (160 chars)...'}
              value={mktBody}
              onChange={e => setMktBody(e.target.value)}
              maxLength={mktMethod === 'sms' ? 160 : undefined}
              style={{ ...s.input, width: '100%', height: 120, resize: 'vertical', marginBottom: 8 }}
            />
            {mktMethod === 'sms' && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>{mktBody.length}/160</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMarketing(false)} style={s.btnOutline}>Cancel</button>
              <button onClick={handleSendMarketing} disabled={mktSending} style={{ ...s.btn, background: '#22c55e' }}>
                {mktSending ? 'Sending...' : 'Send Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Waiver Modal */}
      {showManualWaiver && (
        <div style={s.overlay} onClick={() => setShowManualWaiver(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, color: '#1e293b' }}>Add Manual Waiver</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Create a waiver entry and generate a signing link for the customer.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>First Name *</label>
                <input value={manualForm.firstName} onChange={e => setManualForm(f => ({ ...f, firstName: e.target.value }))} style={{ ...s.input, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Last Name *</label>
                <input value={manualForm.lastName} onChange={e => setManualForm(f => ({ ...f, lastName: e.target.value }))} style={{ ...s.input, width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Phone *</label>
                <input type="tel" value={manualForm.phone} onChange={e => setManualForm(f => ({ ...f, phone: e.target.value }))} style={{ ...s.input, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Email</label>
                <input type="email" value={manualForm.email} onChange={e => setManualForm(f => ({ ...f, email: e.target.value }))} style={{ ...s.input, width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Location</label>
                <select value={manualForm.venueId} onChange={e => setManualForm(f => ({ ...f, venueId: e.target.value }))} style={{ ...s.input, width: '100%' }}>
                  <option value="">Select Location</option>
                  {LOCATIONS.map(l => {
                    const v = venues.find(v => v.address === l.address);
                    return v ? <option key={v.id} value={v.id}>{l.name}</option> : null;
                  })}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Attach to Booking</label>
                <select value={manualForm.bookingId} onChange={e => setManualForm(f => ({ ...f, bookingId: e.target.value }))} style={{ ...s.input, width: '100%' }}>
                  <option value="">None (Walk-in)</option>
                  {bookings.map(b => <option key={b.id} value={b.id}>{b.hostName} — {b.displayDate || b.date}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowManualWaiver(false)} style={s.btnOutline}>Cancel</button>
              <button onClick={handleCreateManualWaiver} style={s.btnGreen}>Create Waiver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
