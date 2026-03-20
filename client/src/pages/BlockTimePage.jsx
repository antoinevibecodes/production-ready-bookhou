import React, { useState, useEffect } from 'react';
import api from '../api/client';

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

const getDayName = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return DAYS_OF_WEEK[d.getDay()];
};

const isRoomAvailableOnDay = (venue, dayName) => {
  if (!dayName) return true;
  let timeSlots = [];
  try { timeSlots = JSON.parse(venue.timeSlots || '[]'); } catch { timeSlots = []; }
  if (timeSlots.length > 0) {
    return timeSlots.some(ts => (ts.days || []).includes(dayName));
  }
  if (venue.days && venue.days.trim()) {
    return venue.days.split(',').map(d => d.trim()).includes(dayName);
  }
  return true;
};

const generateSlots = (venue, dayName) => {
  let firstSlot = venue.firstSlot;
  let lastSlot = venue.lastSlot;
  let durationMins = venue.durationMins;
  let bufferMins = venue.bufferMins;

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

export default function BlockTimePage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]); // [{room, start, end}]
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [allBlocked, setAllBlocked] = useState([]);
  const [venues, setVenues] = useState([]);
  const [reason, setReason] = useState('');
  const [conflictModal, setConflictModal] = useState(null); // { conflicts: [...] }
  const [editModal, setEditModal] = useState(null); // blocked time being edited
  const [message, setMessage] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    api.get('/venues').then(data => setVenues(data)).catch(console.error);
    fetchAllBlocked();
  }, []);

  const fetchAllBlocked = async () => {
    try {
      const data = await api.get('/blocked-times');
      setAllBlocked(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchBlocked();
      setSelectedSlots([]);
    }
  }, [selectedDate]);

  const fetchBlocked = async () => {
    try {
      const data = await api.get(`/blocked-times?date=${selectedDate}`);
      setBlockedTimes(data);
      await fetchAllBlocked();
    } catch (err) {
      console.error(err);
    }
  };

  const isBlocked = (room, start) => {
    return blockedTimes.some(b => b.room === room && b.startTime === start);
  };

  const isSelected = (room, start) => {
    return selectedSlots.some(s => s.room === room && s.start === start);
  };

  const toggleSlot = (room, start, end) => {
    if (isBlocked(room, start)) return; // can't select already blocked
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.room === room && s.start === start);
      if (exists) return prev.filter(s => !(s.room === room && s.start === start));
      return [...prev, { room, start, end }];
    });
  };

  const handleSave = async () => {
    if (!selectedSlots.length) return;

    // Check for conflicts first
    try {
      const slots = selectedSlots.map(s => ({ room: s.room, startTime: s.start, endTime: s.end }));
      const result = await api.post('/blocked-times/check-conflicts', { date: selectedDate, slots });

      if (result.conflicts?.length > 0) {
        setConflictModal(result);
        return;
      }

      await saveBlocked();
    } catch (err) {
      alert(err.message || 'Failed to check conflicts');
    }
  };

  const saveBlocked = async () => {
    try {
      const slots = selectedSlots.map(s => ({ room: s.room, startTime: s.start, endTime: s.end }));
      await api.post('/blocked-times', { date: selectedDate, slots, reason });
      setSelectedSlots([]);
      setReason('');
      setConflictModal(null);
      setMessage(`${slots.length} time slot(s) blocked successfully`);
      setTimeout(() => setMessage(''), 3000);
      await fetchBlocked();
    } catch (err) {
      alert(err.message || 'Failed to block times');
    }
  };

  const handleUnblock = async (id) => {
    if (!confirm('Unblock this time slot?')) return;
    try {
      await api.delete(`/blocked-times/${id}`);
      if (selectedDate) await fetchBlocked();
      else await fetchAllBlocked();
    } catch (err) {
      alert('Failed to unblock');
    }
  };

  const handleDeleteFromAll = async (id) => {
    if (!confirm('Delete this blocked time?')) return;
    try {
      await api.delete(`/blocked-times/${id}`);
      await fetchAllBlocked();
      if (selectedDate) await fetchBlocked();
      setMessage('Blocked time deleted');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    try {
      await api.put(`/blocked-times/${editModal.id}`, {
        date: editModal.date,
        startTime: editModal.startTime,
        endTime: editModal.endTime,
        room: editModal.room,
        reason: editModal.reason,
      });
      setEditModal(null);
      await fetchAllBlocked();
      if (selectedDate) await fetchBlocked();
      setMessage('Blocked time updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update');
    }
  };

  // Filter all blocked times
  const filteredAll = allBlocked.filter(b => {
    if (filterRoom && b.room !== filterRoom) return false;
    if (filterDate && b.date !== filterDate) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      if (!b.room.toLowerCase().includes(s) && !(b.reason || '').toLowerCase().includes(s) && !b.date.includes(s)) return false;
    }
    return true;
  });

  // Get unique room names from all blocked times
  const allRooms = [...new Set(allBlocked.map(b => b.room))].sort();

  const st = {
    card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '24px 28px', marginBottom: 24 },
    label: { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#475569' },
    input: { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fafbfc' },
    roomTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #f1f5f9' },
    slot: (selected, blocked) => ({
      padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: blocked ? 'not-allowed' : 'pointer',
      border: selected ? '2px solid #7c3aed' : blocked ? '2px solid #fca5a5' : '1.5px solid #e2e8f0',
      background: selected ? '#f5f3ff' : blocked ? '#fef2f2' : '#fff',
      color: selected ? '#7c3aed' : blocked ? '#ef4444' : '#475569',
      textAlign: 'center', transition: 'all 0.15s', textDecoration: blocked ? 'line-through' : 'none',
      opacity: blocked ? 0.7 : 1,
    }),
    saveBtn: {
      padding: '12px 32px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff',
      border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
    },
    badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#dc2626' },
    modalOverlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modal: {
      background: '#fff', borderRadius: 12, padding: '28px', maxWidth: 500, width: '90%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    },
  };

  return (
    <div>
      <div className="page-header">
        <h1>Block Time</h1>
      </div>

      {message && (
        <div style={{ padding: '12px 20px', background: '#dcfce7', color: '#166534', borderRadius: 8, marginBottom: 16, fontWeight: 500, fontSize: 14 }}>
          {message}
        </div>
      )}

      <div style={st.card}>
        <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
          Select a date, then click on time slots to block them. You can select multiple slots across different rooms.
        </p>

        <div style={{ marginBottom: 20, maxWidth: 300 }}>
          <label style={st.label}>Select Date</label>
          <input type="date" style={st.input} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>

        {selectedDate && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
              Time Slots for {selectedDate}
            </h3>

            {venues.filter(v => isRoomAvailableOnDay(v, getDayName(selectedDate))).length === 0 && (
              <div style={{ padding: '20px 24px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 14, fontWeight: 500, textAlign: 'center' }}>
                No rooms are available on {getDayName(selectedDate) || 'this day'}. Please select a different date.
              </div>
            )}

            {venues.filter(v => isRoomAvailableOnDay(v, getDayName(selectedDate))).map(venue => {
              const slots = generateSlots(venue, getDayName(selectedDate));
              if (slots.length === 0) return null;
              return (
                <div key={venue.id} style={{ marginBottom: 24 }}>
                  <div style={st.roomTitle}>{venue.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                    {slots.map((slot, i) => {
                      const blocked = isBlocked(venue.name, slot.start);
                      const selected = isSelected(venue.name, slot.start);
                      return (
                        <div
                          key={i}
                          style={st.slot(selected, blocked)}
                          onClick={() => toggleSlot(venue.name, slot.start, slot.end)}
                        >
                          {slot.start} - {slot.end}
                          {blocked && <div style={{ fontSize: 10, marginTop: 2 }}>BLOCKED</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {selectedSlots.length > 0 && (
              <div style={{ marginTop: 16, padding: '16px 20px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                  {selectedSlots.length} slot(s) selected
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {selectedSlots.map((s, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: '#f5f3ff', color: '#7c3aed', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
                      {s.room}: {s.start} - {s.end}
                    </span>
                  ))}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={st.label}>Reason (optional)</label>
                  <input style={{ ...st.input, width: '100%' }} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Maintenance, Private event..." />
                </div>
                <button style={st.saveBtn} onClick={handleSave}>Block Selected Times</button>
              </div>
            )}

            {/* Currently blocked times for this date */}
            {blockedTimes.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Currently Blocked on {selectedDate}</h3>
                <table className="rooms-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Time</th>
                      <th>Reason</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedTimes.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 500 }}>{b.room}</td>
                        <td>{b.startTime} - {b.endTime}</td>
                        <td style={{ color: '#64748b' }}>{b.reason || '—'}</td>
                        <td>
                          <button
                            onClick={() => handleUnblock(b.id)}
                            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >Unblock</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* All Blocked Times Section */}
      <div style={st.card}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>All Blocked Times</h3>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ ...st.label, marginBottom: 4 }}>Filter by Room</label>
            <select style={{ ...st.input, minWidth: 160 }} value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
              <option value="">All Rooms</option>
              {allRooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ ...st.label, marginBottom: 4 }}>Filter by Date</label>
            <input type="date" style={st.input} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div>
            <label style={{ ...st.label, marginBottom: 4 }}>Search</label>
            <input style={{ ...st.input, minWidth: 180 }} value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search room, reason, date..." />
          </div>
          {(filterRoom || filterDate || searchText) && (
            <button onClick={() => { setFilterRoom(''); setFilterDate(''); setSearchText(''); }} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-end' }}>Clear Filters</button>
          )}
        </div>

        {filteredAll.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            {allBlocked.length === 0 ? 'No blocked times yet' : 'No blocked times match your filters'}
          </div>
        ) : (
          <table className="rooms-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Room</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAll.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500 }}>{b.date}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                      {b.room}
                    </span>
                  </td>
                  <td>{b.startTime} - {b.endTime}</td>
                  <td style={{ color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.reason || '—'}</td>
                  <td style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(b.createdAt).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setEditModal({ ...b })}
                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ddd6fe', background: '#fff', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >Edit</button>
                      <button
                        onClick={() => handleDeleteFromAll(b.id)}
                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 8, fontSize: 13, color: '#94a3b8' }}>
          Showing {filteredAll.length} of {allBlocked.length} blocked time(s)
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div style={st.modalOverlay} onClick={() => setEditModal(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Edit Blocked Time</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={st.label}>Date</label>
                <input type="date" style={{ ...st.input, width: '100%' }} value={editModal.date} onChange={e => setEditModal(m => ({ ...m, date: e.target.value }))} />
              </div>
              <div>
                <label style={st.label}>Room</label>
                <select style={{ ...st.input, width: '100%' }} value={editModal.room} onChange={e => setEditModal(m => ({ ...m, room: e.target.value }))}>
                  {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label style={st.label}>Start Time</label>
                <input style={{ ...st.input, width: '100%' }} value={editModal.startTime} onChange={e => setEditModal(m => ({ ...m, startTime: e.target.value }))} placeholder="e.g. 11:30 AM" />
              </div>
              <div>
                <label style={st.label}>End Time</label>
                <input style={{ ...st.input, width: '100%' }} value={editModal.endTime} onChange={e => setEditModal(m => ({ ...m, endTime: e.target.value }))} placeholder="e.g. 01:00 PM" />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={st.label}>Reason</label>
              <input style={{ ...st.input, width: '100%' }} value={editModal.reason || ''} onChange={e => setEditModal(m => ({ ...m, reason: e.target.value }))} placeholder="e.g. Maintenance, Private event..." />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditModal(null)} style={{ padding: '10px 24px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditSave} style={st.saveBtn}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {conflictModal && (
        <div style={st.modalOverlay} onClick={() => setConflictModal(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginBottom: 16 }}>Event Conflict Detected</h3>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>
              The following time slots have events scheduled:
            </p>
            {conflictModal.conflicts.map((c, i) => (
              <div key={i} style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: 8, marginBottom: 8, border: '1px solid #fecaca' }}>
                <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 14 }}>
                  {c.room}: {c.slotStart} - {c.slotEnd}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Event: {c.eventType} by {c.hostName} ({c.eventStart} - {c.eventEnd})
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConflictModal(null)}
                style={{ padding: '10px 24px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >Change Selection</button>
              <button
                onClick={saveBlocked}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >Block Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
