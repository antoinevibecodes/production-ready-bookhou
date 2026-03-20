import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null); // { type: 'booking' | 'blocked', data: ... }
  const [gcalStatus, setGcalStatus] = useState({ connected: false });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    api.get('/bookings').then(data => {
      setBookings(data.filter(b => b.status !== 'DELETED'));
      setLoading(false);
    }).catch(() => setLoading(false));
    api.get('/blocked-times').then(data => {
      setBlockedTimes(data);
    }).catch(() => {});
    api.get('/google-calendar/status').then(data => {
      setGcalStatus(data);
    }).catch(() => {});
  }, []);

  const year = currentDate.getFullYear();
  const monthIdx = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const firstDay = new Date(year, monthIdx, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => setCurrentDate(new Date(year, monthIdx - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, monthIdx + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Group bookings by day
  const bookingsByDay = {};
  bookings.forEach(b => {
    if (!b.date) return;
    const d = new Date(b.date + 'T12:00:00');
    if (d.getFullYear() === year && d.getMonth() === monthIdx) {
      const day = d.getDate();
      if (!bookingsByDay[day]) bookingsByDay[day] = [];
      bookingsByDay[day].push(b);
    }
  });

  // Group blocked times by day
  const blockedByDay = {};
  blockedTimes.forEach(bt => {
    if (!bt.date) return;
    const d = new Date(bt.date + 'T12:00:00');
    if (d.getFullYear() === year && d.getMonth() === monthIdx) {
      const day = d.getDate();
      if (!blockedByDay[day]) blockedByDay[day] = [];
      blockedByDay[day].push(bt);
    }
  });

  const today = new Date();
  const isToday = (day) => day && today.getFullYear() === year && today.getMonth() === monthIdx && today.getDate() === day;

  const statusColor = (status) => {
    if (status === 'CONFIRMED') return '#22c55e';
    if (status === 'COMPLETED') return '#7c3aed';
    if (status === 'CANCELLED') return '#ef4444';
    return '#64748b';
  };

  const statusLabel = (status) => {
    if (status === 'CONFIRMED') return 'Active';
    if (status === 'COMPLETED') return 'Completed';
    if (status === 'CANCELLED') return 'Cancelled';
    return status;
  };

  const handleConnectGoogle = async () => {
    try {
      const data = await api.get('/google-calendar/auth-url');
      window.location.href = data.url;
    } catch (err) {
      alert(err.message || 'Failed to connect to Google Calendar');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await api.delete('/google-calendar/disconnect');
      setGcalStatus({ connected: false });
    } catch (err) {
      alert('Failed to disconnect');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const result = await api.post('/google-calendar/sync');
      setSyncMsg(`Synced ${result.synced} events to Google Calendar`);
      setTimeout(() => setSyncMsg(''), 4000);
    } catch (err) {
      setSyncMsg(err.message || 'Sync failed');
    }
    setSyncing(false);
  };

  // Modal styles
  const modalOverlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000,
  };
  const modalBox = {
    background: '#fff', borderRadius: 12, padding: '0', maxWidth: 440,
    width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
  };

  if (loading) return <div>Loading calendar...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Calendar View</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {gcalStatus.connected ? (
            <>
              <button className="btn btn-sm" onClick={handleSync} disabled={syncing}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="2"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button className="btn btn-sm" onClick={handleDisconnectGoogle}
                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#ef4444' }}>
                Disconnect Google
              </button>
            </>
          ) : (
            <button onClick={handleConnectGoogle}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Connect to Google Calendar
            </button>
          )}
          <button className="btn btn-secondary" onClick={goToday}>Today</button>
          <Link to="/bookings/new" className="btn btn-event-new">+ Add Event</Link>
        </div>
      </div>

      {syncMsg && (
        <div style={{ padding: '10px 16px', background: syncMsg.includes('failed') || syncMsg.includes('Failed') ? '#fee2e2' : '#dcfce7', color: syncMsg.includes('failed') || syncMsg.includes('Failed') ? '#dc2626' : '#166534', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
          {syncMsg}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button className="btn btn-secondary" onClick={prevMonth}>&lt; Prev</button>
          <h3 style={{ margin: 0 }}>{monthLabel}</h3>
          <button className="btn btn-secondary" onClick={nextMonth}>Next &gt;</button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12 }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#22c55e', marginRight: 4 }}></span>Active</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#7c3aed', marginRight: 4 }}></span>Completed</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#ef4444', marginRight: 4 }}></span>Cancelled</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#94a3b8', marginRight: 4 }}></span>Blocked</span>
        </div>

        <div className="cal-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="cal-header">{d}</div>
          ))}
          {days.map((day, i) => (
            <div key={i} className={`cal-cell ${isToday(day) ? 'cal-today' : ''} ${!day ? 'cal-empty' : ''}`}>
              {day && (
                <>
                  <div className="cal-day-num">{day}</div>
                  {bookingsByDay[day] && bookingsByDay[day].map(b => (
                    <div
                      key={b.id}
                      className="cal-event"
                      style={{ background: statusColor(b.status), cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent({ type: 'booking', data: b }); }}
                    >
                      <span className="cal-event-time">{b.startTime || ''}</span>
                      <span className="cal-event-name">{b.childName || b.hostName}</span>
                    </div>
                  ))}
                  {blockedByDay[day] && blockedByDay[day].map(bt => (
                    <div
                      key={`blocked-${bt.id}`}
                      className="cal-event"
                      style={{ background: '#94a3b8', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent({ type: 'blocked', data: bt }); }}
                    >
                      <span className="cal-event-name">Blocked Time</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div style={modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            {selectedEvent.type === 'booking' ? (
              <>
                {/* Booking detail popup */}
                <div style={{ padding: '16px 20px', background: statusColor(selectedEvent.data.status), color: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {selectedEvent.data.type === 'BIRTHDAY' ? 'Birthday Party' : 'Field Trip'}
                    </div>
                    <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2, opacity: 0.9 }}>
                    {statusLabel(selectedEvent.data.status)}
                  </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Host</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{selectedEvent.data.hostName}</div>
                    </div>
                    {selectedEvent.data.childName && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Child</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{selectedEvent.data.childName}{selectedEvent.data.childAge ? ` (Age ${selectedEvent.data.childAge})` : ''}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Date</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Time</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.startTime} - {selectedEvent.data.endTime}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Room</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.venue?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Guests</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.guestCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Package</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.package?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Email</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.hostEmail || '—'}</div>
                    </div>
                  </div>
                  {selectedEvent.data.notes && (
                    <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#64748b' }}>
                      <strong>Notes:</strong> {selectedEvent.data.notes}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button onClick={() => setSelectedEvent(null)} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Close</button>
                    <Link to={`/bookings/${selectedEvent.data.id}`} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>View Full Details</Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Blocked time detail popup */}
                <div style={{ padding: '16px 20px', background: '#94a3b8', color: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Blocked Time</div>
                    <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
                  </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Room</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{selectedEvent.data.room}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Date</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>From</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.startTime}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>To</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.endTime}</div>
                    </div>
                  </div>
                  {selectedEvent.data.reason && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Reason</div>
                      <div style={{ fontSize: 14, color: '#1e293b' }}>{selectedEvent.data.reason}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button onClick={() => setSelectedEvent(null)} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Close</button>
                    <Link to="/block-time" style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#94a3b8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Manage Blocked Times</Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
