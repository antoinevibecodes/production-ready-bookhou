import React, { useState, useEffect, useCallback } from 'react';

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 50 });
    if (search) params.set('search', search);

    fetch(`/api/customers?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const viewProfile = async (id) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      setDetail(await res.json());
    } catch {
      setDetail(null);
    }
    setDetailLoading(false);
  };

  const s = {
    card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px' },
    input: { padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b', background: '#fafbfc' },
    btn: { padding: '8px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    btnOutline: { padding: '8px 18px', background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    th: { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' },
    td: { padding: '10px 12px', fontSize: 13, color: '#334155', borderBottom: '1px solid #f1f5f9' },
    badge: (color) => ({
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: color === 'green' ? '#dcfce7' : color === 'blue' ? '#dbeafe' : color === 'amber' ? '#fef3c7' : '#f1f5f9',
      color: color === 'green' ? '#166534' : color === 'blue' ? '#1e40af' : color === 'amber' ? '#92400e' : '#475569',
    }),
  };

  // ─── Customer Profile Detail View ───
  if (detail) {
    const now = new Date();
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setDetail(null)} style={{ ...s.btnOutline, padding: '6px 14px' }}>Back</button>
          <h1>{detail.firstName} {detail.lastName}</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Personal Info */}
          <div style={s.card}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Personal Information</h3>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 2.2 }}>
              <div><strong>Phone:</strong> {detail.phone}</div>
              <div><strong>Email:</strong> {detail.email || '—'}</div>
              <div><strong>Address:</strong> {detail.address || '—'}</div>
              <div><strong>Date of Birth:</strong> {detail.dob || '—'}</div>
              <div><strong>Emergency Contact:</strong> {detail.emergencyContact || '—'}</div>
              <div>
                <strong>Marketing:</strong>{' '}
                <span style={s.badge(detail.marketingOptIn ? 'green' : 'amber')}>
                  {detail.marketingOptIn ? 'Opted In' : 'Not Opted In'}
                </span>
              </div>
            </div>
          </div>

          {/* Children */}
          <div style={s.card}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
              Children ({detail.children?.length || 0})
            </h3>
            {detail.children?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.children.map(c => (
                  <div key={c.id} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                    <strong>{c.name}</strong>
                    {c.dob && <span style={{ color: '#64748b', marginLeft: 8 }}>DOB: {c.dob}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13 }}>No children on file</p>
            )}
          </div>
        </div>

        {/* Waiver History */}
        <div style={s.card}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
            Waiver History ({detail.waivers?.length || 0})
          </h3>
          {detail.waivers?.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={s.th}>Date Signed</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Venue</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Expires</th>
                </tr>
              </thead>
              <tbody>
                {detail.waivers.map(w => {
                  const expired = w.expiresAt ? new Date(w.expiresAt) < now : false;
                  return (
                    <tr key={w.id}>
                      <td style={s.td}>
                        {w.signedAt ? new Date(w.signedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }) : '—'}
                      </td>
                      <td style={s.td}>
                        <span style={s.badge(w.type === 'walkin' ? 'amber' : 'blue')}>
                          {w.type === 'walkin' ? 'Walk-in' : 'Booking'}
                        </span>
                      </td>
                      <td style={s.td}>{w.venueName || w.venue?.name || '—'}</td>
                      <td style={s.td}>
                        <span style={s.badge(expired ? 'amber' : w.status === 'verified' ? 'blue' : 'green')}>
                          {expired ? 'Expired' : w.status === 'verified' ? 'Verified' : 'Signed'}
                        </span>
                      </td>
                      <td style={{ ...s.td, color: expired ? '#ef4444' : '#334155', fontWeight: expired ? 700 : 400 }}>
                        {w.expiresAt ? new Date(w.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }) : '—'}
                        {expired && ' (EXPIRED)'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No waivers signed yet</p>
          )}
        </div>
      </div>
    );
  }

  // ─── Customer List View ───
  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="page-header">
        <h1>Customer List</h1>
      </div>

      <div style={s.card}>
        {/* Search + Actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...s.input, width: 300 }}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => window.open(`/api/customers/export${search ? `?search=${encodeURIComponent(search)}` : ''}`, '_blank')} style={s.btnOutline}>
              Export CSV
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Phone</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Children</th>
              <th style={s.th}>Waivers</th>
              <th style={s.th}>Marketing</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: 30, color: '#94a3b8' }}>No customers found</td></tr>
            ) : customers.map(c => (
              <tr key={c.id}>
                <td style={{ ...s.td, fontWeight: 600 }}>{c.firstName} {c.lastName}</td>
                <td style={s.td}>{c.phone}</td>
                <td style={s.td}>{c.email || '—'}</td>
                <td style={s.td}>{c.children?.length || 0}</td>
                <td style={s.td}>{c._count?.waivers || 0}</td>
                <td style={s.td}>
                  <span style={s.badge(c.marketingOptIn ? 'green' : '')}>
                    {c.marketingOptIn ? 'Opted In' : 'No'}
                  </span>
                </td>
                <td style={s.td}>
                  <button onClick={() => viewProfile(c.id)} style={{ ...s.btn, padding: '4px 12px', fontSize: 11 }}>View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...s.btnOutline, padding: '4px 12px', fontSize: 12, opacity: page <= 1 ? 0.4 : 1 }}>Prev</button>
            <span style={{ fontSize: 13, color: '#64748b' }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ ...s.btnOutline, padding: '4px 12px', fontSize: 12, opacity: page >= totalPages ? 0.4 : 1 }}>Next</button>
          </div>
        )}

        {total > 0 && <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>Total: {total} customers</div>}
      </div>
    </div>
  );
}
