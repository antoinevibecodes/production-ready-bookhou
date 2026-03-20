import React, { useState, useEffect } from 'react';
import api from '../api/client';

const TYPE_OPTIONS = [
  { value: 'storewide', label: 'Storewide - This can be applied to all packages' },
  { value: 'specific', label: 'Specific - Only applies to selected packages' },
];

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState(10);
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState('onsite');
  const LOCATIONS = [
    { id: 'norcross', name: 'Tiny Towne Norcross' },
    { id: 'helen', name: 'HelenFun Factory' },
  ];

  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    couponName: '',
    code: '',
    discount: '',
    discountType: 'percent',
    limit: '0',
    type: 'storewide',
    location: [],
    paidInFull: false,
    description: '',
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const data = await api.get('/discounts');
      setDiscounts(data);
    } catch (err) {
      console.error('Failed to fetch discounts:', err);
    }
  };

  const resetForm = () => {
    setForm({ startDate: '', endDate: '', couponName: '', code: '', discount: '', discountType: 'percent', limit: '0', type: 'storewide', location: [], paidInFull: false, description: '' });
    setEventType('onsite');
  };

  const handleAddPromotion = async () => {
    if (!form.couponName.trim() || !form.code.trim()) {
      alert('Coupon name and code are required');
      return;
    }
    try {
      await api.post('/discounts', {
        ...form,
        discount: parseInt(form.discount) || 0,
        limit: parseInt(form.limit) || 0,
        eventType,
        location: form.location.join(','),
      });
      await fetchDiscounts();
      resetForm();
    } catch (err) {
      alert(err.message || 'Failed to create discount');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this discount?')) return;
    try {
      await api.delete(`/discounts/${id}`);
      setDiscounts(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const toggleLocation = (venueId) => {
    setForm(prev => {
      const locs = [...prev.location];
      const idx = locs.indexOf(venueId);
      if (idx >= 0) locs.splice(idx, 1);
      else locs.push(venueId);
      return { ...prev, location: locs };
    });
  };

  const selectAllLocations = () => {
    setForm(prev => ({ ...prev, location: LOCATIONS.map(l => l.id) }));
  };

  // Filter & paginate
  const filtered = discounts.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.couponName.toLowerCase().includes(s) || d.code.toLowerCase().includes(s);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / entries));
  const paged = filtered.slice((page - 1) * entries, page * entries);

  // Styles
  const s = {
    toggle: {
      display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24, gap: 0,
    },
    toggleBtn: (active, color) => ({
      padding: '11px 36px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
      border: '2px solid transparent',
      background: active ? color : '#f1f5f9',
      color: active ? '#fff' : '#64748b',
      transition: 'all 0.2s ease',
      letterSpacing: '0.3px',
    }),
    toggleBtnLeft: { borderRadius: '8px 0 0 8px' },
    toggleBtnRight: { borderRadius: '0 8px 8px 0' },
    infoIcon: {
      marginLeft: 10, width: 22, height: 22, borderRadius: '50%', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', background: '#ede9fe', color: '#7c3aed',
      fontSize: 13, fontWeight: 700, cursor: 'pointer',
    },
    formCard: {
      marginBottom: 24, padding: '28px 28px 20px', borderRadius: 12,
      background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    },
    sectionTitle: {
      fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16,
      paddingBottom: 8, borderBottom: '2px solid #f1f5f9',
    },
    label: {
      display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#475569',
    },
    labelHint: {
      color: '#94a3b8', fontSize: 11, fontWeight: 400,
    },
    input: {
      width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8,
      fontSize: 14, color: '#1e293b', background: '#fafbfc', outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    select: {
      width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8,
      fontSize: 14, color: '#1e293b', background: '#fafbfc', cursor: 'pointer',
    },
    textarea: {
      width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8,
      fontSize: 14, color: '#1e293b', background: '#fafbfc', resize: 'vertical',
      fontFamily: 'inherit', lineHeight: 1.5,
    },
    row2: {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20,
    },
    row4: {
      display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.7fr', gap: 20, marginBottom: 20,
    },
    discountGroup: {
      display: 'flex', gap: 6,
    },
    discountSelect: {
      width: 58, padding: '10px 6px', border: '1.5px solid #e2e8f0', borderRadius: 8,
      fontSize: 14, color: '#1e293b', background: '#fafbfc', cursor: 'pointer', textAlign: 'center',
    },
    checkbox: {
      width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer',
    },
    checkLabel: {
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569',
      cursor: 'pointer', padding: '4px 0',
    },
    selectAll: {
      float: 'right', color: '#7c3aed', cursor: 'pointer', fontSize: 12,
      fontWeight: 600, letterSpacing: '0.2px',
    },
    paidInFull: {
      marginBottom: 20, padding: '12px 16px', background: '#f8fafc', borderRadius: 8,
      border: '1px solid #f1f5f9',
    },
    addBtn: {
      padding: '12px 32px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
      cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.3px',
      boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
    },
    tableCard: {
      borderRadius: 12, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      padding: '20px 24px',
    },
    tableHeader: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    showEntries: {
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b',
    },
    entriesSelect: {
      width: 68, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8,
      fontSize: 13, background: '#fafbfc', cursor: 'pointer',
    },
    searchInput: {
      width: 200, padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8,
      fontSize: 13, background: '#fafbfc', outline: 'none',
    },
    codeBadge: {
      fontWeight: 700, fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff',
      padding: '3px 10px', borderRadius: 6, fontSize: 13, letterSpacing: '0.5px',
    },
    footer: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16,
      paddingTop: 12, borderTop: '1px solid #f1f5f9',
    },
    footerText: {
      fontSize: 13, color: '#94a3b8',
    },
    pageBtn: (active) => ({
      padding: '5px 12px', fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
      border: active ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
      borderRadius: 6, background: active ? '#f5f3ff' : '#fff',
      color: active ? '#7c3aed' : '#64748b', transition: 'all 0.15s',
    }),
    navBtn: (disabled) => ({
      padding: '5px 14px', fontSize: 12, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
      border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff',
      color: disabled ? '#cbd5e1' : '#64748b', transition: 'all 0.15s',
    }),
    emptyRow: {
      textAlign: 'center', color: '#cbd5e1', padding: 40, fontSize: 14,
    },
    deleteBtn: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2',
      background: '#fff', cursor: 'pointer', color: '#ef4444', transition: 'all 0.15s',
    },
  };

  return (
    <div>
      {/* Event Type Toggle */}
      <div style={s.toggle}>
        <button
          onClick={() => setEventType('onsite')}
          style={{ ...s.toggleBtn(eventType === 'onsite', '#7c3aed'), ...s.toggleBtnLeft }}
        >On Site</button>
        <button
          onClick={() => setEventType('mobile')}
          style={{ ...s.toggleBtn(eventType === 'mobile', '#1e3a5f'), ...s.toggleBtnRight }}
        >Mobile Event</button>
        <span style={s.infoIcon} title="Toggle between On Site and Mobile event discounts">i</span>
      </div>

      {/* Form Card */}
      <div style={s.formCard}>
        <div style={s.sectionTitle}>Create New Promotion</div>

        {/* Row 1: Dates */}
        <div style={s.row2}>
          <div>
            <label style={s.label}>Start Date</label>
            <input type="date" style={s.input} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <label style={s.label}>End Date</label>
            <input type="date" style={s.input} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>

        {/* Row 2: Coupon / Code / Discount / Limit */}
        <div style={s.row4}>
          <div>
            <label style={s.label}>Coupon Name</label>
            <input style={s.input} value={form.couponName} onChange={e => setForm({ ...form, couponName: e.target.value })} placeholder="Enter coupon name" />
          </div>
          <div>
            <label style={s.label}>Code</label>
            <input style={s.input} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: SAVE20" />
          </div>
          <div>
            <label style={s.label}>Discount</label>
            <div style={s.discountGroup}>
              <select style={s.discountSelect} value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>
                <option value="percent">%</option>
                <option value="flat">$</option>
              </select>
              <input style={{ ...s.input, flex: 1 }} type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div>
            <label style={s.label}>Limit <span style={s.labelHint}>(0 = unlimited)</span></label>
            <input style={s.input} type="number" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} />
          </div>
        </div>

        {/* Row 3: Type / Location */}
        <div style={s.row2}>
          <div>
            <label style={s.label}>Type</label>
            <select style={s.select} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>
              Location
              <span onClick={selectAllLocations} style={s.selectAll}>Select All</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 4 }}>
              {LOCATIONS.map(l => (
                <label key={l.id} style={s.checkLabel}>
                  <input type="checkbox" style={s.checkbox} checked={form.location.includes(l.id)} onChange={() => toggleLocation(l.id)} />
                  {l.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Paid in full */}
        <div style={s.paidInFull}>
          <label style={s.checkLabel}>
            <input type="checkbox" style={s.checkbox} checked={form.paidInFull} onChange={e => setForm({ ...form, paidInFull: e.target.checked })} />
            Package must be paid-in-full to receive this discount
          </label>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>Description</label>
          <textarea style={s.textarea} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Optional notes about this promotion..." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            style={s.addBtn}
            onClick={handleAddPromotion}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 12px rgba(124,58,237,0.35)'; }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 2px 8px rgba(124,58,237,0.25)'; }}
          >Add Promotion</button>
        </div>
      </div>

      {/* Discounts Table */}
      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <div style={s.showEntries}>
            Show
            <select style={s.entriesSelect} value={entries} onChange={e => { setEntries(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
            Search:
            <input style={s.searchInput} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search coupons..." />
          </div>
        </div>

        <table className="rooms-table">
          <thead>
            <tr>
              <th>Coupon Name</th>
              <th>Code</th>
              <th>Discount</th>
              <th>Limit</th>
              <th>Start From</th>
              <th>End On</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8} style={s.emptyRow}>No promotions found</td>
              </tr>
            ) : paged.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 500, color: '#1e293b' }}>{d.couponName}</td>
                <td><span style={s.codeBadge}>{d.code}</span></td>
                <td style={{ fontWeight: 600 }}>{d.discountType === 'percent' ? `${d.discount}%` : `$${(d.discount / 100).toFixed(2)}`}</td>
                <td>{d.limit === 0 ? <span style={{ color: '#22c55e', fontWeight: 500 }}>Unlimited</span> : <span style={{ color: '#64748b' }}>{d.used}/{d.limit}</span>}</td>
                <td style={{ color: '#64748b' }}>{d.startDate || '—'}</td>
                <td style={{ color: '#64748b' }}>{d.endDate || '—'}</td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: d.status === 'active' ? '#dcfce7' : '#fee2e2',
                    color: d.status === 'active' ? '#166534' : '#991b1b',
                  }}>
                    {d.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button
                    style={s.deleteBtn}
                    title="Delete"
                    onClick={() => handleDelete(d.id)}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#fee2e2'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={s.footer}>
          <span style={s.footerText}>
            Showing {filtered.length === 0 ? '0 to 0' : `${(page - 1) * entries + 1} to ${Math.min(page * entries, filtered.length)}`} of {filtered.length} entries
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={s.navBtn(page === 1)} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} style={s.pageBtn(page === i + 1)} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button style={s.navBtn(page === totalPages)} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
