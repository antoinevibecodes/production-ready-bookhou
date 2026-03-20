import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function BookingsPage() {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [recoverConflict, setRecoverConflict] = useState(null); // { booking, conflicts }
  const [recoverMsg, setRecoverMsg] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await api.get('/bookings');
      setAllBookings(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDelete = async (booking) => {
    const name = booking.childName || booking.hostName;
    if (!window.confirm(`Are you sure you want to delete "${name}"'s event? This will move it to the Deleted tab.`)) return;
    try {
      await api.put(`/bookings/${booking.id}`, { status: 'DELETED' });
      fetchBookings();
    } catch (err) {
      console.error(err);
      alert('Failed to delete event');
    }
  };

  const handleRecover = async (booking) => {
    if (!window.confirm(`Are you sure you want to recover "${booking.childName || booking.hostName}"'s event?`)) return;
    try {
      await api.post(`/bookings/${booking.id}/recover`);
      setRecoverMsg(`"${booking.childName || booking.hostName}" has been recovered successfully`);
      setTimeout(() => setRecoverMsg(''), 4000);
      fetchBookings();
    } catch (err) {
      if (err.conflicts?.length > 0) {
        setRecoverConflict({ booking, conflicts: err.conflicts, message: err.data?.message || err.message });
      } else {
        alert(err.message || 'Failed to recover event');
      }
    }
  };

  // Count from ALL bookings (not filtered)
  const counts = {
    ALL: allBookings.filter(b => b.status !== 'DELETED').length,
    REQUESTED: allBookings.filter(b => b.status === 'REQUESTED').length,
    CONFIRMED: allBookings.filter(b => b.status === 'CONFIRMED').length,
    COMPLETED: allBookings.filter(b => b.status === 'COMPLETED').length,
    CANCELLED: allBookings.filter(b => b.status === 'CANCELLED').length,
    DELETED: allBookings.filter(b => b.status === 'DELETED').length,
  };

  // Filter by status tab — "All" excludes deleted, "DELETED" shows only deleted
  const bookings = statusFilter === 'DELETED'
    ? allBookings.filter(b => b.status === 'DELETED')
    : statusFilter
      ? allBookings.filter(b => b.status === statusFilter)
      : allBookings.filter(b => b.status !== 'DELETED');

  // Date filter
  const getDateRange = () => {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (datePreset === 'today') return { start: fmt(today), end: fmt(today) };
    if (datePreset === 'week') {
      const dayOfWeek = today.getDay();
      const sun = new Date(today); sun.setDate(today.getDate() - dayOfWeek);
      const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
      return { start: fmt(sun), end: fmt(sat) };
    }
    if (datePreset === 'next-week') {
      const dayOfWeek = today.getDay();
      const nextSun = new Date(today); nextSun.setDate(today.getDate() - dayOfWeek + 7);
      const nextSat = new Date(nextSun); nextSat.setDate(nextSun.getDate() + 6);
      return { start: fmt(nextSun), end: fmt(nextSat) };
    }
    if (datePreset === 'month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: fmt(first), end: fmt(last) };
    }
    if (datePreset === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd };
    return null;
  };

  const dateRange = getDateRange();
  const dateFiltered = dateRange
    ? bookings.filter(b => b.date >= dateRange.start && b.date <= dateRange.end)
    : bookings;

  // Search filter
  const filtered = dateFiltered.filter(b => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.hostName?.toLowerCase().includes(term) ||
      b.childName?.toLowerCase().includes(term) ||
      b.hostEmail?.toLowerCase().includes(term) ||
      b.venue?.name?.toLowerCase().includes(term)
    );
  });

  if (loading) return <div>Loading events...</div>;

  return (
    <div>
      <div className="page-header">
        <Link to="/bookings/new" className="btn btn-event-new">+ ADD NEW PARTY</Link>
      </div>

      {/* Filter bar */}
      <div className="event-filter-bar">
        <div className="filter-group" style={{ position: 'relative' }}>
          <label>Select By Dates</label>
          <select
            className="filter-select"
            value={datePreset}
            onChange={e => setDatePreset(e.target.value)}
          >
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="next-week">Next Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Dates</option>
          </select>
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="filter-select" style={{ fontSize: 12, padding: '4px 8px' }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="filter-select" style={{ fontSize: 12, padding: '4px 8px' }} />
            </div>
          )}
        </div>
        <div className="filter-group">
          <label>Team Member(Assign To)</label>
          <select className="filter-select">
            <option>Select a Assign member</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search</label>
          <div className="search-input-wrap">
            <input
              type="text"
              placeholder="Search Event"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="filter-search"
            />
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="event-status-tabs">
        <button
          className={`status-tab ${statusFilter === '' ? 'active-tab active-green' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          All <span className="tab-count">{counts.ALL}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'REQUESTED' ? 'active-tab active-yellow' : ''}`}
          onClick={() => setStatusFilter('REQUESTED')}
        >
          Requested <span className="tab-count">{counts.REQUESTED}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'CONFIRMED' ? 'active-tab active-green' : ''}`}
          onClick={() => setStatusFilter('CONFIRMED')}
        >
          Active <span className="tab-count red">{counts.CONFIRMED}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'COMPLETED' ? 'active-tab active-purple' : ''}`}
          onClick={() => setStatusFilter('COMPLETED')}
        >
          Completed <span className="tab-count green">{counts.COMPLETED}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'CANCELLED' ? 'active-tab active-red' : ''}`}
          onClick={() => setStatusFilter('CANCELLED')}
        >
          Cancelled <span className="tab-count">{counts.CANCELLED}</span>
        </button>
        <button className="status-tab">
          Rejected <span className="tab-count">{0}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'DELETED' ? 'active-tab active-red' : ''}`}
          onClick={() => setStatusFilter('DELETED')}
        >
          Deleted <span className="tab-count">{counts.DELETED}</span>
        </button>
      </div>

      {/* Show entries + total */}
      <div className="event-list-controls">
        <span>Show <select className="entries-select"><option>25</option></select> Events</span>
        <span>Total filter records: {filtered.length}</span>
      </div>

      {/* Event list header */}
      <div className="event-list-header">
        <div className="el-check"></div>
        <div className="el-col el-event-info">Event Info</div>
        <div className="el-col el-host-info">Host Info</div>
        <div className="el-col el-price-detail">Price Detail</div>
        <div className="el-col el-notes">Notes</div>
        <div className="el-col el-action">Action</div>
      </div>

      {/* Event rows */}
      {filtered.length === 0 ? (
        <div className="no-data-msg">No events found</div>
      ) : (
        filtered.map(b => {
          const packagePrice = b.package?.price || 0;
          const addOnsTotal = (b.addOns || []).reduce((s, a) => s + a.price * a.quantity, 0);
          const extraCost = b.type === 'FIELD_TRIP' ? (b.extraPersons || 0) * (b.extraPersonPrice || 0) : 0;
          const subtotal = packagePrice + addOnsTotal + extraCost;
          const tax = Math.round(subtotal * 0.06);
          const totalDue = subtotal + tax;
          const totalPaid = (b.transactions || []).filter(t => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);
          const totalRefunded = (b.transactions || []).filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
          const netPaid = totalPaid - totalRefunded;
          const balance = totalDue - netPaid;
          const waiverSigned = b.waivers?.some(w => w.signedAt);

          return (
            <div className="event-row" key={b.id}>
              <div className="el-check">
                <input type="checkbox" />
              </div>
              <div className="el-col el-event-info">
                <div><strong>Event :</strong> {b.childName ? `${b.childName}'s ${b.type === 'BIRTHDAY' ? 'Birthday Party' : 'Field Trip'}` : b.hostName}</div>
                <div><strong>Date :</strong> {new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}, {b.startTime} - {b.endTime}</div>
                <div><strong>Room :</strong> {b.venue?.name || 'N/A'}</div>
                <div><strong>Booking Type :</strong> {b.type === 'BIRTHDAY' ? 'Business Side' : 'Client Site'}</div>
                <div><strong>Status :</strong>{' '}
                  <span className={`waiver-badge ${b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'waiver-yes' : b.status === 'REQUESTED' ? 'waiver-pending' : 'waiver-no'}`}>
                    {b.status}
                  </span>
                </div>
              </div>
              <div className="el-col el-host-info">
                <div><strong>Name :</strong> {b.hostName}</div>
                <div><strong>Email Id :</strong> {b.hostEmail}</div>
                <div><strong>Phone No :</strong> {b.hostPhone || 'N/A'}</div>
                <div>
                  <strong>Waiver Signed :</strong>{' '}
                  <span className={`waiver-badge ${waiverSigned ? 'waiver-yes' : 'waiver-no'}`}>
                    {waiverSigned ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div className="el-col el-price-detail">
                <div><strong>Paid :</strong> ${(netPaid / 100).toFixed(2)}</div>
                <div><strong>Package :</strong> ${(packagePrice / 100).toFixed(2)}</div>
                <div><strong>Addons :</strong> ${(addOnsTotal / 100).toFixed(2)}</div>
                <div><strong>Total :</strong> ${(totalDue / 100).toFixed(2)}</div>
                <div className={`balance-inline ${balance <= 0 ? 'balance-zero' : 'balance-owed'}`}>
                  <strong>Balance :</strong> ${(balance / 100).toFixed(2)}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span className={`waiver-badge ${balance <= 0 ? 'waiver-yes' : 'waiver-no'}`}>
                    {balance <= 0 ? 'Paid' : netPaid > 0 ? 'Partial' : 'Unpaid'}
                  </span>
                </div>
              </div>
              <div className="el-col el-notes">
                {b.notes || 'N/A'}
              </div>
              <div className="el-col el-action">
                <Link to={`/bookings/${b.id}`} className="action-icon action-view" title="View">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
                </Link>
                <Link to={`/bookings/${b.id}`} className="action-icon action-edit" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </Link>
                {b.status === 'DELETED' && (
                  <button className="action-icon" title="Recover" onClick={() => handleRecover(b)} style={{ color: '#22c55e' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  </button>
                )}
                <button className="action-icon action-delete" title="Delete" onClick={() => handleDelete(b)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Recover success message */}
      {recoverMsg && (
        <div style={{ padding: '12px 20px', background: '#dcfce7', color: '#166534', borderRadius: 8, marginTop: 16, fontWeight: 500, fontSize: 14 }}>
          {recoverMsg}
        </div>
      )}

      {/* Recover conflict modal */}
      {recoverConflict && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setRecoverConflict(null)}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', background: '#ef4444', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Cannot Recover Event</div>
                <button onClick={() => setRecoverConflict(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>
                {recoverConflict.message || 'There is a scheduling conflict that prevents recovering this event.'}
              </p>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                Event you want to recover:
              </div>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#475569' }}>
                {recoverConflict.booking.childName || recoverConflict.booking.hostName} — {recoverConflict.booking.venue?.name || 'N/A'} — {recoverConflict.booking.date} ({recoverConflict.booking.startTime} - {recoverConflict.booking.endTime})
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>
                Conflicting event(s):
              </div>
              {recoverConflict.conflicts.map((c, i) => (
                <div key={i} style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, marginBottom: 8, border: '1px solid #fecaca', fontSize: 13 }}>
                  {c.type === 'BLOCKED' ? (
                    <div>
                      <strong style={{ color: '#dc2626' }}>Blocked Time</strong> — {c.room} on {c.date} ({c.startTime} - {c.endTime})
                      {c.reason && <span style={{ color: '#94a3b8' }}> — {c.reason}</span>}
                    </div>
                  ) : (
                    <div>
                      <strong style={{ color: '#dc2626' }}>{c.type === 'BIRTHDAY' ? 'Birthday Party' : 'Field Trip'}</strong> — {c.hostName} in {c.room} ({c.startTime} - {c.endTime})
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setRecoverConflict(null)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Got it</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="table-footer" style={{ marginTop: 16 }}>
        <span>Showing 1 to {filtered.length} of {filtered.length} events</span>
        <div className="pagination">
          <button className="btn btn-sm">&#8249; Previous</button>
          <span className="page-num active">1</span>
          <button className="btn btn-sm">Next &#8250;</button>
        </div>
      </div>
    </div>
  );
}
