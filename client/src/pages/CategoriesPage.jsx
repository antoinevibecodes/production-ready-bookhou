import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null); // category being edited
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const data = await api.get('/categories');
      setCategories(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleEdit = (cat) => {
    setEditModal({ ...cat });
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    try {
      await api.put(`/categories/${editModal.id}`, {
        name: editModal.name,
        description: editModal.description,
        status: editModal.status,
      });
      setEditModal(null);
      showMsg('Category updated successfully');
      await fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to update');
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    try {
      await api.post('/categories', addForm);
      setAddModal(false);
      setAddForm({ name: '', description: '' });
      showMsg('Category added successfully');
      await fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to add');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      showMsg('Category deleted');
      await fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const showMsg = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const modalOverlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000,
  };
  const modalBox = {
    background: '#fff', borderRadius: 12, padding: '28px', maxWidth: 460,
    width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  };
  const label = { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#475569' };
  const input = { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fafbfc' };

  if (loading) return <div>Loading categories...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Add Category</button>
      </div>

      {message && (
        <div style={{ padding: '12px 20px', background: '#dcfce7', color: '#166534', borderRadius: 8, marginBottom: 16, fontWeight: 500, fontSize: 14 }}>
          {message}
        </div>
      )}

      <div className="card">
        <table className="rooms-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No categories found</td></tr>
            ) : categories.map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td style={{ color: '#64748b' }}>{c.description || '—'}</td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: c.status === 'active' ? '#dcfce7' : '#f1f5f9',
                    color: c.status === 'active' ? '#166534' : '#94a3b8',
                  }}>
                    {c.status === 'active' ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleEdit(c)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ddd6fe', background: '#fff', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(c.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div style={modalOverlay} onClick={() => setEditModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Edit Category</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Name</label>
              <input style={input} value={editModal.name} onChange={e => setEditModal(m => ({ ...m, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Description</label>
              <textarea style={{ ...input, resize: 'vertical', minHeight: 80 }} value={editModal.description} onChange={e => setEditModal(m => ({ ...m, description: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={label}>Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setEditModal(m => ({ ...m, status: m.status === 'active' ? 'disabled' : 'active' }))}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
                    background: editModal.status === 'active' ? '#22c55e' : '#d1d5db', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: editModal.status === 'active' ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 500, color: editModal.status === 'active' ? '#166534' : '#94a3b8' }}>
                  {editModal.status === 'active' ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditModal(null)} style={{ padding: '10px 24px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditSave} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addModal && (
        <div style={modalOverlay} onClick={() => setAddModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Add Category</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Name</label>
              <input style={input} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Birthday Party" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={label}>Description</label>
              <textarea style={{ ...input, resize: 'vertical', minHeight: 80 }} value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="Category description..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setAddModal(false)} style={{ padding: '10px 24px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Add Category</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
