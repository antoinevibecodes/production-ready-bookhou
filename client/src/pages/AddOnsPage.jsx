import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddOnsPage() {
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Form state
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: 0, cost: 0, days: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // View modal
  const [viewAddon, setViewAddon] = useState(null);

  useEffect(() => { fetchAddons(); }, []);

  const fetchAddons = async () => {
    try {
      const data = await api.get('/addon-catalog');
      setAddons(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const filtered = addons.filter(a => {
    if (!searchTerm) return true;
    return a.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const startNum = (page - 1) * perPage + 1;
  const endNum = Math.min(page * perPage, filtered.length);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', description: '', price: 0, cost: 0, days: '' });
    setImageFile(null);
    setImagePreview(null);
    setView('create');
  };

  const openEdit = (addon) => {
    setEditId(addon.id);
    setForm({
      name: addon.name,
      description: addon.description || '',
      price: addon.price || 0,
      cost: addon.cost || 0,
      days: addon.days || '',
    });
    setImageFile(null);
    setImagePreview(addon.image ? `/uploads/addons/${addon.image}` : null);
    setView('create');
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('cost', form.cost);
      formData.append('days', form.days);
      if (imageFile) formData.append('image', imageFile);

      const url = editId ? `/addon-catalog/${editId}` : '/addon-catalog';
      const method = editId ? 'PUT' : 'POST';

      const response = await fetch(`/api${url}`, {
        method,
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to save');

      setView('list');
      fetchAddons();
    } catch (err) {
      alert(err.message || 'Failed to save add-on');
    }
  };

  const handleDuplicate = async (addon) => {
    if (!window.confirm(`Duplicate "${addon.name}"?`)) return;
    try {
      await api.post(`/addon-catalog/${addon.id}/duplicate`);
      fetchAddons();
    } catch (err) {
      alert(err.message || 'Failed to duplicate');
    }
  };

  const handleDelete = async (addon) => {
    if (!window.confirm(`Delete "${addon.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/addon-catalog/${addon.id}`);
      fetchAddons();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  // Image drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const toggleDay = (day) => {
    const current = form.days ? form.days.split(',') : [];
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    setForm({ ...form, days: updated.join(',') });
  };

  const selectAllDays = () => {
    const current = form.days ? form.days.split(',') : [];
    if (current.length === 7) {
      setForm({ ...form, days: '' });
    } else {
      setForm({ ...form, days: DAYS.join(',') });
    }
  };

  if (loading) return <div>Loading add-ons...</div>;

  // CREATE / EDIT VIEW
  if (view === 'create') {
    const selectedDays = form.days ? form.days.split(',') : [];

    return (
      <div>
        <div className="page-header">
          <button className="btn btn-secondary" onClick={() => setView('list')}>&larr; Back to Add-Ons</button>
        </div>

        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
          These are optional items that customers can add to any package to upsell!
        </p>

        <div className="card">
          {/* Image drop zone */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div
              className={`addon-dropzone ${dragOver ? 'addon-dropzone-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }} />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="36" height="36"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Select a File or Drag Here</span>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
            </div>
          </div>

          {/* Name */}
          <div className="pay-form-row">
            <div className="pay-form-field" style={{ flex: 1 }}>
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Add-on name" />
            </div>
          </div>

          {/* Price and Cost */}
          <div className="pay-form-row">
            <div className="pay-form-field">
              <label>Price</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="pay-dollar-sign">$</span>
                <input type="number" step="0.01" value={(form.price / 100).toFixed(2)} onChange={e => setForm({ ...form, price: Math.round(parseFloat(e.target.value || 0) * 100) })} />
              </div>
            </div>
            <div className="pay-form-field">
              <label>Cost <span style={{ fontSize: 11, color: '#94a3b8' }}>(Internal Only)</span></label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="pay-dollar-sign">$</span>
                <input type="number" step="0.01" value={(form.cost / 100).toFixed(2)} onChange={e => setForm({ ...form, cost: Math.round(parseFloat(e.target.value || 0) * 100) })} />
              </div>
            </div>
          </div>

          {/* Days */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>Days</label>
              <label style={{ fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedDays.length === 7} onChange={selectAllDays} style={{ marginRight: 4 }} />
                Select All
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  className={`addon-day-btn ${selectedDays.includes(day) ? 'addon-day-active' : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="pay-form-row">
            <div className="pay-form-field" style={{ flex: 1 }}>
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-event-new" onClick={handleSave} disabled={!form.name.trim()}>
              {editId ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div>
      <div className="page-header">
        <button className="btn btn-event-new" onClick={openCreate}>+ Add New Add-On</button>
      </div>

      <div className="card">
        <div className="rooms-info-bar">
          You can rearrange add-ons by holding on a particular add-on section and moving it up or down. Top addon shows first in the booking section.
        </div>

        <div className="rooms-controls">
          <span>Show <select className="entries-select" value={perPage} onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
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
              <th style={{ width: 150 }}>Image</th>
              <th>Name</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a, idx) => (
              <tr key={a.id}>
                <td><input type="checkbox" /></td>
                <td>{startNum + idx}</td>
                <td>
                  {a.image ? (
                    <img src={`/uploads/addons/${a.image}`} alt={a.name} style={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }} />
                  ) : (
                    <div style={{ width: 60, height: 45, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                </td>
                <td>{a.name}</td>
                <td className="rooms-actions">
                  <button className="room-action-btn room-duplicate" title="Duplicate" onClick={() => handleDuplicate(a)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  <button className="room-action-btn room-edit" title="View" onClick={() => setViewAddon(a)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
                  </button>
                  <button className="room-action-btn room-edit" title="Edit" onClick={() => openEdit(a)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="room-action-btn room-delete" title="Delete" onClick={() => handleDelete(a)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rooms-footer">
          <span>Showing {startNum} to {endNum} of {filtered.length} entries</span>
          <div className="pagination">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>&lsaquo; Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <span
                key={p}
                className={`page-num ${page === p ? 'active' : ''}`}
                onClick={() => setPage(p)}
                style={{ cursor: 'pointer' }}
              >
                {p}
              </span>
            ))}
            <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next &rsaquo;</button>
          </div>
        </div>
      </div>

      {/* View Add-On Modal */}
      {viewAddon && (
        <div className="modal-overlay" onClick={() => setViewAddon(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3 style={{ marginBottom: 16 }}>{viewAddon.name}</h3>
            {viewAddon.image && (
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <img src={`/uploads/addons/${viewAddon.image}`} alt={viewAddon.name} style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 6 }} />
              </div>
            )}
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div><strong>Price:</strong> ${((viewAddon.price || 0) / 100).toFixed(2)}</div>
              <div><strong>Cost (Internal):</strong> ${((viewAddon.cost || 0) / 100).toFixed(2)}</div>
              <div><strong>Days:</strong> {viewAddon.days || 'All days'}</div>
              <div><strong>Description:</strong> {viewAddon.description || 'N/A'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setViewAddon(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
