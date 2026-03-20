import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} hour(s) and ${m} minute(s)`;
}

export default function RoomsPage() {
  const [view, setView] = useState('list');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editRoom, setEditRoom] = useState(null);
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  // Edit/Create form
  const [form, setForm] = useState({
    name: '', description: '', color: '#ef4444',
    capacity: 20, firstSlot: '11:00 AM', lastSlot: '8:00 PM',
    durationMins: 90, bufferMins: 30, days: '',
    timeSlots: [],
  });
  const [addTimeOpen, setAddTimeOpen] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    try {
      const data = await api.get('/venues');
      setRooms(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const filtered = rooms.filter(r => {
    if (!searchTerm) return true;
    return r.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const startNum = (page - 1) * perPage + 1;
  const endNum = Math.min(page * perPage, filtered.length);

  const openAdd = () => {
    setEditRoom(null);
    setForm({
      name: '', description: '', color: '#ef4444',
      capacity: 20, firstSlot: '11:00 AM', lastSlot: '8:00 PM',
      durationMins: 90, bufferMins: 30, days: '',
      timeSlots: [], images: [],
    });
    setView('edit');
  };

  const openEdit = (room) => {
    setEditRoom(room);
    let timeSlots = [];
    try { timeSlots = JSON.parse(room.timeSlots || '[]'); } catch { timeSlots = []; }
    setForm({
      name: room.name,
      description: room.description || '',
      color: room.color || '#ef4444',
      capacity: room.capacity,
      firstSlot: room.firstSlot,
      lastSlot: room.lastSlot,
      durationMins: room.durationMins,
      bufferMins: room.bufferMins,
      days: room.days || '',
      timeSlots,
      images: (() => { try { return JSON.parse(room.images || '[]'); } catch { return []; } })(),
    });
    setView('edit');
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        color: form.color,
        capacity: form.capacity,
        firstSlot: form.firstSlot,
        lastSlot: form.lastSlot,
        durationMins: form.durationMins,
        bufferMins: form.bufferMins,
        days: form.days,
        timeSlots: JSON.stringify(form.timeSlots),
      };
      if (editRoom) {
        await api.put(`/venues/${editRoom.id}`, payload);
      } else {
        await api.post('/venues', payload);
      }
      setView('list');
      fetchRooms();
    } catch (err) {
      alert(err.message || 'Failed to save room');
    }
  };

  const handleDuplicate = async (room) => {
    if (!window.confirm(`Duplicate "${room.name}"?`)) return;
    try {
      await api.post(`/venues/${room.id}/duplicate`);
      fetchRooms();
    } catch (err) {
      alert(err.message || 'Failed to duplicate room');
    }
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/venues/${room.id}`);
      fetchRooms();
    } catch (err) {
      alert(err.message || 'Failed to delete room');
    }
  };

  // Time slot management
  const addTimeSlot = () => {
    setForm(f => ({
      ...f,
      timeSlots: [...f.timeSlots, {
        firstSlot: '11:00 AM', lastSlot: '8:00 PM', capacity: 20,
        durationHours: 1, durationMins: 30, bufferMins: 30, days: [],
      }],
    }));
  };

  const updateSlot = (idx, field, value) => {
    setForm(f => {
      const slots = [...f.timeSlots];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...f, timeSlots: slots };
    });
  };

  const toggleSlotDay = (idx, day) => {
    setForm(f => {
      const slots = [...f.timeSlots];
      const days = slots[idx].days || [];
      slots[idx] = {
        ...slots[idx],
        days: days.includes(day) ? days.filter(d => d !== day) : [...days, day],
      };
      return { ...f, timeSlots: slots };
    });
  };

  const selectAllSlotDays = (idx, checked) => {
    setForm(f => {
      const slots = [...f.timeSlots];
      slots[idx] = { ...slots[idx], days: checked ? [...DAYS] : [] };
      return { ...f, timeSlots: slots };
    });
  };

  const cloneSlot = (idx) => {
    setForm(f => {
      const slots = [...f.timeSlots];
      slots.splice(idx + 1, 0, { ...slots[idx], days: [...(slots[idx].days || [])] });
      return { ...f, timeSlots: slots };
    });
  };

  const deleteSlot = (idx) => {
    setForm(f => ({ ...f, timeSlots: f.timeSlots.filter((_, i) => i !== idx) }));
  };

  // Image management
  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!editRoom) { alert('Please save the room first before adding images.'); return; }
    if (form.images.length + files.length > 5) { alert('Maximum of 5 images allowed'); return; }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('images', files[i]);

    try {
      const res = await fetch(`/api/venues/${editRoom.id}/images`, {
        method: 'POST', body: formData, credentials: 'include',
      });
      const updated = await res.json();
      if (res.ok) {
        setForm(f => ({ ...f, images: JSON.parse(updated.images || '[]') }));
      } else {
        alert(updated.error || 'Failed to upload');
      }
    } catch { alert('Failed to upload images'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageDelete = async (filename) => {
    if (!editRoom) return;
    try {
      const res = await fetch(`/api/venues/${editRoom.id}/images/${filename}`, {
        method: 'DELETE', credentials: 'include',
      });
      const updated = await res.json();
      if (res.ok) setForm(f => ({ ...f, images: JSON.parse(updated.images || '[]') }));
    } catch { alert('Failed to delete image'); }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) return <div>Loading rooms...</div>;

  // ─── EDIT / CREATE VIEW ──────────────────────────────────
  if (view === 'edit') {
    return (
      <div>
        <div className="page-header">
          <h2>{editRoom ? 'Edit Room' : 'Add New Room'}</h2>
          <button className="btn btn-secondary" onClick={() => setView('list')}>&larr; Back</button>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Brake Room"
            />
          </div>

          {/* Description — rich text style editor */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Description</label>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b',
              }}>
                <span style={{ marginRight: 8 }}>File</span>
                <span style={{ marginRight: 8 }}>Edit</span>
                <span style={{ marginRight: 8 }}>View</span>
                <span style={{ marginRight: 16 }}>Format</span>
                <span style={{ cursor: 'pointer', padding: '2px 4px' }}>&#8630;</span>
                <span style={{ cursor: 'pointer', padding: '2px 4px' }}>&#8631;</span>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                <select style={{ border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, padding: '2px 6px', color: '#475569' }}>
                  <option>Paragraph</option>
                  <option>Heading 1</option>
                  <option>Heading 2</option>
                </select>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                <b style={{ cursor: 'pointer', padding: '2px 6px', fontSize: 14 }}>B</b>
                <i style={{ cursor: 'pointer', padding: '2px 6px', fontSize: 14 }}>I</i>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                <span style={{ cursor: 'pointer', padding: '2px 4px' }}>&#8801;</span>
                <span style={{ cursor: 'pointer', padding: '2px 4px' }}>&#8801;</span>
                <span style={{ cursor: 'pointer', padding: '2px 4px' }}>&#8801;</span>
                <span style={{ cursor: 'pointer', padding: '2px 4px' }}>&#8801;</span>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                <span style={{ cursor: 'pointer', padding: '2px 4px' }}>&#8676;</span>
                <span style={{ cursor: 'pointer', padding: '2px 4px' }}>&#8677;</span>
              </div>
              <textarea
                rows={6}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Room description..."
                style={{
                  width: '100%', padding: 14, border: 'none', fontSize: 14,
                  resize: 'vertical', minHeight: 100, outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Select color for Package */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Select color for Package</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <input
                type="color"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                style={{ width: 44, height: 44, border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
              />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{form.color}</span>
            </div>
          </div>

          {/* ─── Add Room Time Section ──────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <div
              onClick={() => setAddTimeOpen(!addTimeOpen)}
              style={{
                background: 'linear-gradient(135deg, #34d399, #6ee7b7)', color: '#fff',
                padding: '12px 20px', borderRadius: 8, fontWeight: 700, fontSize: 15,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>Add Room Time</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
                style={{ transform: addTimeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {addTimeOpen && (
              <div style={{ marginTop: 16, background: '#f0fdf4', borderRadius: 10, padding: 20 }}>
                {/* + Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button
                    onClick={addTimeSlot}
                    style={{
                      width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: '#7c3aed', color: '#fff', fontSize: 24, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >+</button>
                </div>

                {/* Time Slot Configs */}
                {form.timeSlots.map((slot, idx) => (
                  <div key={idx} style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                    padding: 28, marginBottom: 20,
                  }}>
                    {/* Row 1: First slot, Last slot, Capacity */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                      <div>
                        <label style={{ ...labelStyle, fontWeight: 700 }}>Start of first time slot</label>
                        <input
                          style={inputStyle}
                          value={slot.firstSlot}
                          onChange={e => updateSlot(idx, 'firstSlot', e.target.value)}
                          placeholder="11:00 AM"
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontWeight: 700 }}>Start of last time slot</label>
                        <input
                          style={inputStyle}
                          value={slot.lastSlot}
                          onChange={e => updateSlot(idx, 'lastSlot', e.target.value)}
                          placeholder="8:00 PM"
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontWeight: 700 }}>Room Capacity</label>
                        <input
                          type="number"
                          style={inputStyle}
                          value={slot.capacity}
                          onChange={e => updateSlot(idx, 'capacity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {/* Row 2: Event Duration + Buffer Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                      <div>
                        <label style={{ ...labelStyle, fontWeight: 700 }}>Event Duration</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select
                            style={{ ...inputStyle, flex: 1 }}
                            value={slot.durationHours ?? 1}
                            onChange={e => updateSlot(idx, 'durationHours', parseInt(e.target.value))}
                          >
                            {[0,1,2,3,4].map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span style={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>hours</span>
                          <select
                            style={{ ...inputStyle, flex: 1 }}
                            value={slot.durationMins ?? 30}
                            onChange={e => updateSlot(idx, 'durationMins', parseInt(e.target.value))}
                          >
                            {[0,15,30,45].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <span style={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>minutes</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontWeight: 700 }}>Buffer Time</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select
                            style={{ ...inputStyle, flex: 1 }}
                            value={slot.bufferMins ?? 30}
                            onChange={e => updateSlot(idx, 'bufferMins', parseInt(e.target.value))}
                          >
                            {[0,15,30,45,60].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <span style={{ fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>minutes</span>
                        </div>
                      </div>
                    </div>

                    {/* + Add More Timeslots button */}
                    <div style={{ marginBottom: 20 }}>
                      <button
                        onClick={addTimeSlot}
                        style={{
                          padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 13,
                        }}
                      >+ Add More Timeslots</button>
                    </div>

                    {/* Days */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8,
                      }}>
                        <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700 }}>Days</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={(slot.days || []).length === 7}
                            onChange={e => selectAllSlotDays(idx, e.target.checked)}
                          />
                          Select All
                        </label>
                      </div>
                      <div style={{
                        display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 0',
                        border: '1px solid #e2e8f0', borderRadius: 8, paddingLeft: 10, paddingRight: 10,
                        minHeight: 44, alignItems: 'center',
                      }}>
                        {(slot.days || []).map(day => (
                          <span
                            key={day}
                            style={{
                              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                              background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
                              cursor: 'pointer',
                            }}
                            onClick={() => toggleSlotDay(idx, day)}
                          >
                            {day}
                            <span style={{ fontSize: 14, lineHeight: 1 }}>&times;</span>
                          </span>
                        ))}
                        {(slot.days || []).length === 0 && (
                          <span style={{ color: '#94a3b8', fontSize: 13 }}>Click days below to add...</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {DAYS.map(day => {
                          const sel = (slot.days || []).includes(day);
                          return (
                            <span
                              key={day}
                              onClick={() => toggleSlotDay(idx, day)}
                              style={{
                                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                background: sel ? '#7c3aed' : '#f1f5f9',
                                color: sel ? '#fff' : '#64748b',
                              }}
                            >
                              {day}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clone / Delete */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button onClick={() => cloneSlot(idx)} style={cloneBtnStyle}>Clone</button>
                      <button onClick={() => deleteSlot(idx)} style={deleteBtnStyle}>Delete</button>
                    </div>
                  </div>
                ))}

                {form.timeSlots.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
                    No time configurations added. Click the + button to add one.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Images Section ──────────────────────────── */}
          <div style={{ marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept=".jpg,.jpeg,.png" multiple style={{ display: 'none' }} />
              <button
                onClick={() => {
                  if (!editRoom) { alert('Please save the room first before adding images.'); return; }
                  fileInputRef.current?.click();
                }}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#34d399', color: '#fff', fontWeight: 600, fontSize: 14,
                }}
              >+ Add images</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Images</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Size</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {form.images.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>No images uploaded</td></tr>
                ) : form.images.map((img, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 10 }}>
                      <img
                        src={`/uploads/room-images/${img.filename}`}
                        alt=""
                        style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                      />
                    </td>
                    <td style={{ padding: 10, fontSize: 13, color: '#475569' }}>{img.originalName || img.filename}</td>
                    <td style={{ padding: 10, fontSize: 13, color: '#475569' }}>{formatSize(img.size || 0)}</td>
                    <td style={{ padding: 10 }}>
                      <button
                        onClick={() => handleImageDelete(img.filename)}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                          background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 16, fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
              <div>&#10045; Only image files (JPG, PNG) are allowed.</div>
              <div>&#10045; Maximum of 5 images allowed - select multiple to upload together</div>
              <div>&#10045; Maximum image size is 10 MB</div>
              <div>&#10045; You can resize images after uploading them by clicking on the uploaded image.</div>
              <div>&#10045; You can rearrange images by holding on a particular image section and moving it up or down.</div>
              <div>&#10045; Top image shows first in the section profile.</div>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              style={{
                padding: '12px 36px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#34d399', color: '#fff', fontWeight: 700, fontSize: 15,
                opacity: form.name.trim() ? 1 : 0.5,
              }}
            >Save</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ──────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <button className="btn btn-event-new" onClick={openAdd}>+ Add New Room</button>
      </div>

      <div className="card">
        <div className="rooms-info-bar">
          You can rearrange rooms by holding on a particular room section and moving it up or down. Top room shows first in the booking section.
        </div>

        <div className="rooms-controls">
          <span>Show <select className="entries-select" value={perPage} onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select> Entries</span>
          <div>
            <label style={{ marginRight: 6, fontSize: 13 }}>Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="filter-search"
              style={{ width: 180 }}
            />
          </div>
        </div>

        <table className="rooms-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>Name</th>
              <th>Capacity</th>
              <th>Start of first time slot</th>
              <th>Start of last time slot</th>
              <th>Duration</th>
              <th>Buffer time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r, idx) => (
              <tr key={r.id}>
                <td>{r.position || startNum + idx}</td>
                <td>{r.name}</td>
                <td>{r.capacity}</td>
                <td>{r.firstSlot}</td>
                <td>{r.lastSlot}</td>
                <td>{formatDuration(r.durationMins)}</td>
                <td>{formatDuration(r.bufferMins)}</td>
                <td className="rooms-actions">
                  <button className="room-action-btn room-duplicate" title="Duplicate Room" onClick={() => handleDuplicate(r)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  <button className="room-action-btn room-edit" title="Edit Room" onClick={() => openEdit(r)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="room-action-btn room-delete" title="Delete Room" onClick={() => handleDelete(r)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rooms-footer">
          <span>Showing {filtered.length > 0 ? startNum : 0} to {endNum} of {filtered.length} entries</span>
          <div className="pagination">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>&lsaquo; Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <span key={p} className={`page-num ${page === p ? 'active' : ''}`} onClick={() => setPage(p)} style={{ cursor: 'pointer' }}>{p}</span>
            ))}
            <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next &rsaquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline styles ──────────────────────────────────
const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#475569' };
const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
  borderRadius: 6, fontSize: 14, color: '#1e293b', background: '#fff',
};
const cloneBtnStyle = {
  padding: '10px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#34d399', color: '#fff', fontWeight: 600, fontSize: 14,
};
const deleteBtnStyle = {
  padding: '10px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#fbbf24', color: '#92400e', fontWeight: 600, fontSize: 14,
};
const thStyle = { textAlign: 'left', padding: '10px 10px', fontSize: 13, fontWeight: 600, color: '#475569' };
