import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const LOCATIONS = [
  { name: 'Tiny Towne Norcross', address: '2055 Beaver Ruin Road, Norcross, GA 30071' },
  { name: 'HelenFun Factory', address: 'Helen, GA' },
];

// Duration options
const DURATIONS = [];
for (let h = 0; h <= 4; h++) {
  for (let m = 0; m <= 45; m += 15) {
    if (h === 0 && m === 0) continue;
    DURATIONS.push({ label: `${h} hour(s) and ${m} minute(s)`, value: h * 60 + m });
  }
}

export default function PackagesPage() {
  const [view, setView] = useState('list');
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  // Form state
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', price: 0, cost: 0, extraPerson: 0, guestIncluded: 8,
    type: 'BIRTHDAY', eventType: 'onsite', days: '', rooms: [], priceTiers: [], images: [],
  });
  const [venues, setVenues] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [addTimeOpen, setAddTimeOpen] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPackages();
    api.get('/venues').then(setVenues).catch(() => {});
  }, []);

  const fetchPackages = async () => {
    try {
      const data = await api.get('/packages');
      setPackages(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const filtered = packages.filter(p => {
    if (!searchTerm) return true;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const startNum = (page - 1) * perPage + 1;
  const endNum = Math.min(page * perPage, filtered.length);

  const openCreate = () => {
    setEditId(null);
    setForm({
      name: '', description: '', price: 0, cost: 0, extraPerson: 0, guestIncluded: 8,
      type: 'BIRTHDAY', eventType: 'onsite', days: '', rooms: [], priceTiers: [], images: [],
    });
    setSelectedLocation('');
    setView('create');
  };

  const openEdit = (pkg) => {
    setEditId(pkg.id);
    let rooms = [];
    try { rooms = JSON.parse(pkg.rooms || '[]'); } catch { rooms = []; }
    let priceTiers = [];
    try { priceTiers = JSON.parse(pkg.priceTiers || '[]'); } catch { priceTiers = []; }
    let images = [];
    try { images = JSON.parse(pkg.images || '[]'); } catch { images = []; }

    setForm({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price || 0,
      cost: pkg.cost || 0,
      extraPerson: pkg.extraPerson || 0,
      guestIncluded: pkg.guestIncluded || 8,
      type: pkg.type || 'BIRTHDAY',
      eventType: pkg.eventType || 'onsite',
      days: pkg.days || '',
      rooms,
      priceTiers,
      images,
    });

    // Try to find location from rooms
    if (rooms.length > 0) {
      const firstRoom = venues.find(v => v.id === rooms[0]);
      if (firstRoom) {
        const loc = LOCATIONS.find(l => l.address === firstRoom.address);
        if (loc) setSelectedLocation(loc.name);
      }
    }
    setView('create');
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: form.price,
        cost: form.cost,
        extraPerson: form.extraPerson,
        guestIncluded: form.guestIncluded,
        type: form.type,
        eventType: form.eventType,
        days: form.days,
        rooms: JSON.stringify(form.rooms),
        priceTiers: JSON.stringify(form.priceTiers),
        contents: '[]',
      };
      if (editId) {
        await api.put(`/packages/${editId}`, payload);
      } else {
        await api.post('/packages', payload);
      }
      setView('list');
      fetchPackages();
    } catch (err) {
      alert(err.message || 'Failed to save package');
    }
  };

  const handleToggle = async (pkg) => {
    try {
      await api.put(`/packages/${pkg.id}/toggle`);
      fetchPackages();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDuplicate = async (pkg) => {
    if (!window.confirm(`Duplicate "${pkg.name}"?`)) return;
    try {
      await api.post(`/packages/${pkg.id}/duplicate`);
      fetchPackages();
    } catch (err) {
      alert(err.message || 'Failed to duplicate');
    }
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Delete "${pkg.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/packages/${pkg.id}`);
      fetchPackages();
    } catch (err) {
      alert(err.message || 'Failed to delete package');
    }
  };

  // Room selection
  const toggleRoom = (roomId) => {
    setForm(f => ({
      ...f,
      rooms: f.rooms.includes(roomId)
        ? f.rooms.filter(id => id !== roomId)
        : [...f.rooms, roomId],
    }));
  };

  const locationVenues = venues.filter(v => {
    const loc = LOCATIONS.find(l => l.name === selectedLocation);
    if (!loc) return false;
    return v.address === loc.address;
  });

  // Price tier management
  const addPriceTier = () => {
    setForm(f => ({
      ...f,
      priceTiers: [...f.priceTiers, { price: 27500, cost: 6000, extraPerson: 2500, guestIncluded: 8, days: [] }],
    }));
  };

  const updateTier = (idx, field, value) => {
    setForm(f => {
      const tiers = [...f.priceTiers];
      tiers[idx] = { ...tiers[idx], [field]: value };
      return { ...f, priceTiers: tiers };
    });
  };

  const toggleTierDay = (idx, day) => {
    setForm(f => {
      const tiers = [...f.priceTiers];
      const days = tiers[idx].days || [];
      tiers[idx] = {
        ...tiers[idx],
        days: days.includes(day) ? days.filter(d => d !== day) : [...days, day],
      };
      return { ...f, priceTiers: tiers };
    });
  };

  const selectAllTierDays = (idx, checked) => {
    setForm(f => {
      const tiers = [...f.priceTiers];
      tiers[idx] = { ...tiers[idx], days: checked ? [...DAYS] : [] };
      return { ...f, priceTiers: tiers };
    });
  };

  const cloneTier = (idx) => {
    setForm(f => {
      const tiers = [...f.priceTiers];
      tiers.splice(idx + 1, 0, { ...tiers[idx], days: [...(tiers[idx].days || [])] });
      return { ...f, priceTiers: tiers };
    });
  };

  const deleteTier = (idx) => {
    setForm(f => ({
      ...f,
      priceTiers: f.priceTiers.filter((_, i) => i !== idx),
    }));
  };

  // Image management
  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!editId) { alert('Please save the package first before adding images.'); return; }
    if (form.images.length + files.length > 5) { alert('Maximum of 5 images allowed'); return; }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    try {
      const res = await fetch(`/api/packages/${editId}/images`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const updated = await res.json();
      if (res.ok) {
        setForm(f => ({ ...f, images: JSON.parse(updated.images || '[]') }));
      } else {
        alert(updated.error || 'Failed to upload');
      }
    } catch (err) {
      alert('Failed to upload images');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageDelete = async (filename) => {
    if (!editId) return;
    try {
      const res = await fetch(`/api/packages/${editId}/images/${filename}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const updated = await res.json();
      if (res.ok) {
        setForm(f => ({ ...f, images: JSON.parse(updated.images || '[]') }));
      }
    } catch (err) {
      alert('Failed to delete image');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) return <div>Loading packages...</div>;

  // ─── CREATE / EDIT VIEW ──────────────────────────────────
  if (view === 'create') {
    return (
      <div>
        <div className="page-header">
          <h2>{editId ? 'Edit Package' : 'Add Packages'}</h2>
          <button className="btn btn-secondary" onClick={() => setView('list')}>&larr; Back</button>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* Package Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Package Name</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Package Name" />
          </div>

          {/* Packages available for booking on */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Packages available for booking on</label>
            <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="ALL">All</option>
              <option value="BIRTHDAY">Birthday</option>
              <option value="FIELD_TRIP">Field Trip</option>
            </select>
          </div>

          {/* Package Description — rich-text style textarea */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Package Description</label>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
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
                rows={8}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Package description..."
                style={{ width: '100%', padding: 14, border: 'none', fontSize: 14, resize: 'vertical', minHeight: 120, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* On Site / Mobile Event toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 0, margin: '24px 0' }}>
            <button
              style={{
                padding: '10px 30px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, borderRadius: '6px 0 0 6px',
                background: form.eventType === 'onsite' ? '#7c3aed' : '#f1f5f9', color: form.eventType === 'onsite' ? '#fff' : '#64748b',
              }}
              onClick={() => setForm({ ...form, eventType: 'onsite' })}
            >On Site</button>
            <button
              style={{
                padding: '10px 30px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, borderRadius: '0 6px 6px 0',
                background: form.eventType === 'mobile' ? '#14b8a6' : '#f1f5f9', color: form.eventType === 'mobile' ? '#fff' : '#64748b',
              }}
              onClick={() => setForm({ ...form, eventType: 'mobile' })}
            >Mobile Event</button>
          </div>

          {/* Location */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Location</label>
            <select style={inputStyle} value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
              <option value="">Select Location</option>
              {LOCATIONS.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
            </select>
          </div>

          {/* Rooms Grid */}
          {selectedLocation && (
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Rooms</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginTop: 8 }}>
                {locationVenues.map(v => {
                  const isSelected = form.rooms.includes(v.id);
                  return (
                    <div
                      key={v.id}
                      onClick={() => toggleRoom(v.id)}
                      style={{
                        border: `2px solid ${isSelected ? '#34d399' : '#e2e8f0'}`,
                        borderRadius: 10,
                        padding: 14,
                        cursor: 'pointer',
                        position: 'relative',
                        background: isSelected ? '#f0fdf4' : '#fff',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
                          background: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1e293b' }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                        Capacity : {v.capacity || 20}<br />
                        Day Start : {v.firstSlot || '12:00'}<br />
                        Day End : {v.lastSlot || '20:00'}<br />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Available Day :</div>
                      <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                        {DAY_SHORT.map((d, i) => (
                          <span key={d} style={{
                            width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 600,
                            background: '#34d399', color: '#fff',
                          }}>{d}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Duration</div>
                      <select
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: '100%', padding: '6px 8px', borderRadius: 6, border: 'none',
                          background: '#34d399', color: '#fff', fontSize: 11, fontWeight: 600,
                          marginTop: 4, cursor: 'pointer',
                        }}
                        defaultValue={v.durationMins || 90}
                      >
                        {DURATIONS.map(dur => (
                          <option key={dur.value} value={dur.value}>{dur.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Add Time Section ──────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <div
              onClick={() => setAddTimeOpen(!addTimeOpen)}
              style={{
                background: '#34d399', color: '#fff', padding: '12px 20px', borderRadius: 8,
                fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>Add Time</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
                style={{ transform: addTimeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {addTimeOpen && (
              <div style={{ marginTop: 16 }}>
                {/* + Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button
                    onClick={addPriceTier}
                    style={{
                      width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: '#7c3aed', color: '#fff', fontSize: 24, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >+</button>
                </div>

                {/* Price Tiers */}
                {form.priceTiers.map((tier, idx) => (
                  <div key={idx} style={{
                    border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, marginBottom: 20, background: '#fff',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                      <div>
                        <label style={{ ...labelStyle, fontWeight: 700, color: '#1e293b' }}>Package Price</label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={dollarStyle}>$</span>
                          <input
                            type="number" step="0.01"
                            value={(tier.price / 100).toFixed(2)}
                            onChange={e => updateTier(idx, 'price', Math.round(parseFloat(e.target.value || 0) * 100))}
                            style={{ ...inputStyle, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontWeight: 400 }}>Package Cost <span style={{ color: '#94a3b8' }}>(Internal Only)</span></label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={dollarStyle}>$</span>
                          <input
                            type="number" step="0.01"
                            value={(tier.cost / 100).toFixed(2)}
                            onChange={e => updateTier(idx, 'cost', Math.round(parseFloat(e.target.value || 0) * 100))}
                            style={{ ...inputStyle, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                      <div>
                        <label style={{ ...labelStyle, fontWeight: 700, color: '#1e293b' }}>Extra Person</label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={dollarStyle}>$</span>
                          <input
                            type="number" step="0.01"
                            value={(tier.extraPerson / 100).toFixed(2)}
                            onChange={e => updateTier(idx, 'extraPerson', Math.round(parseFloat(e.target.value || 0) * 100))}
                            style={{ ...inputStyle, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Total Guest Included</label>
                        <input
                          type="number"
                          value={tier.guestIncluded || 8}
                          onChange={e => updateTier(idx, 'guestIncluded', parseInt(e.target.value) || 0)}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* Days */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700 }}>Days</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={(tier.days || []).length === 7}
                            onChange={e => selectAllTierDays(idx, e.target.checked)}
                          />
                          Select All
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {DAYS.map(day => {
                          const sel = (tier.days || []).includes(day);
                          return (
                            <span
                              key={day}
                              onClick={() => toggleTierDay(idx, day)}
                              style={{
                                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                background: sel ? '#7c3aed' : '#f1f5f9',
                                color: sel ? '#fff' : '#64748b',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}
                            >
                              {day}
                              {sel && <span style={{ fontSize: 14, lineHeight: 1 }}>&times;</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clone / Delete */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button onClick={() => cloneTier(idx)} style={greenBtnStyle}>Clone</button>
                      <button onClick={() => deleteTier(idx)} style={{ ...greenBtnStyle, background: '#fbbf24', color: '#92400e' }}>Delete</button>
                    </div>
                  </div>
                ))}

                {form.priceTiers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
                    No pricing tiers added. Click the + button to add one.
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
                  if (!editId) { alert('Please save the package first before adding images.'); return; }
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
                        src={`/uploads/package-images/${img.filename}`}
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
        <button className="btn btn-event-new" onClick={openCreate}>+ ADD NEW PACKAGE</button>
      </div>

      <div className="card">
        <div className="rooms-info-bar">
          You can rearrange packages by holding on a particular package section and moving it up or down. Top package shows first in the booking section.
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
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th style={{ width: 70 }}>S.No.</th>
              <th>Name</th>
              <th>Type</th>
              <th style={{ width: 120 }}>Status</th>
              <th style={{ width: 150 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p, idx) => (
              <tr key={p.id}>
                <td><input type="checkbox" /></td>
                <td>{startNum + idx}</td>
                <td>{p.name}</td>
                <td>{p.eventType === 'mobile' ? 'Mobile' : 'On Site'}</td>
                <td>
                  <div
                    className={`pkg-toggle ${p.status === 'active' ? 'pkg-toggle-on' : 'pkg-toggle-off'}`}
                    onClick={() => handleToggle(p)}
                    title={p.status === 'active' ? 'Click to disable' : 'Click to enable'}
                  >
                    <span className="pkg-toggle-label">{p.status === 'active' ? 'Active' : 'Disabled'}</span>
                    <span className="pkg-toggle-knob"></span>
                  </div>
                </td>
                <td className="rooms-actions">
                  <button className="room-action-btn room-duplicate" title="Duplicate" onClick={() => handleDuplicate(p)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  <button className="room-action-btn room-edit" title="Edit" onClick={() => openEdit(p)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="room-action-btn room-delete" title="Delete" onClick={() => handleDelete(p)}>
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

// ─── Inline styles ──────────────────────────────────────
const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#475569' };
const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, color: '#1e293b', background: '#fff' };
const dollarStyle = {
  padding: '10px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRight: 'none',
  borderRadius: '6px 0 0 6px', fontSize: 14, color: '#64748b', fontWeight: 600,
};
const thStyle = { textAlign: 'left', padding: '10px 10px', fontSize: 13, fontWeight: 600, color: '#475569' };
const greenBtnStyle = {
  padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer',
  background: '#34d399', color: '#fff', fontWeight: 600, fontSize: 13,
};
