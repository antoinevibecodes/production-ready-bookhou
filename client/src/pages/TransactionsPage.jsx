import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Per-section controls
  const [paySearch, setPaySearch] = useState('');
  const [refSearch, setRefSearch] = useState('');
  const [payEntries, setPayEntries] = useState(5);
  const [refEntries, setRefEntries] = useState(5);
  const [payPage, setPayPage] = useState(1);
  const [refPage, setRefPage] = useState(1);

  const setPreset = (preset) => {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDatePreset(preset);
    if (preset === 'today') {
      setStartDate(fmt(today));
      setEndDate(fmt(today));
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      setStartDate(fmt(y));
      setEndDate(fmt(y));
    } else if (preset === 'week') {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      setStartDate(fmt(w));
      setEndDate(fmt(today));
    } else if (preset === 'month') {
      const m = new Date(today);
      m.setDate(m.getDate() - 30);
      setStartDate(fmt(m));
      setEndDate(fmt(today));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate, methodFilter]);

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (methodFilter) params.set('paymentMethod', methodFilter);
      const data = await api.get(`/transactions?${params.toString()}`);
      setTransactions(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const isEmployee = user?.role === 'EMPLOYEE';
  const payments = transactions.filter(t => t.type === 'PAYMENT');
  const refunds = transactions.filter(t => t.type === 'REFUND');

  const filterList = (list, search) => {
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(t =>
      (t.booking?.hostName || '').toLowerCase().includes(s) ||
      (t.paymentMethod || '').toLowerCase().includes(s) ||
      String((t.amount || 0) / 100).includes(s)
    );
  };

  const filteredPay = filterList(payments, paySearch);
  const filteredRef = filterList(refunds, refSearch);
  const payTotalPages = Math.max(1, Math.ceil(filteredPay.length / payEntries));
  const refTotalPages = Math.max(1, Math.ceil(filteredRef.length / refEntries));
  const pagedPay = filteredPay.slice((payPage - 1) * payEntries, payPage * payEntries);
  const pagedRef = filteredRef.slice((refPage - 1) * refEntries, refPage * refEntries);

  const methodLabel = (m) =>
    m === 'card' ? 'CARD' : m === 'cash' ? 'CASH' :
    m === 'apple_pay' ? 'APPLE PAY' : m === 'cash_app' ? 'CASH APP' : (m || '').toUpperCase();

  const Section = ({ title, data, filtered, search, setSearch, entries, setEntries, page, setPage, totalPages }) => (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{title}</h2>
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
            Show
            <select className="form-input" style={{ width: 60, padding: '4px 8px' }} value={entries} onChange={e => { setEntries(Number(e.target.value)); setPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            Entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
            Search:
            <input className="form-input" style={{ width: 160, padding: '4px 8px' }} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <table className="rooms-table">
          <thead>
            <tr>
              {!isEmployee && <th>Amount</th>}
              <th>Payment Type</th>
              <th>Details</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={isEmployee ? 3 : 4} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No data available in table</td></tr>
            ) : data.map(t => (
              <tr key={t.id}>
                {!isEmployee && (
                  <td style={{ fontWeight: 600 }}>
                    {title === 'Refunds' ? '-' : ''}${((t.amount || 0) / 100).toFixed(2)}
                  </td>
                )}
                <td>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
                    background: t.paymentMethod === 'card' ? '#dbeafe' : t.paymentMethod === 'cash' ? '#dcfce7' : '#fef3c7',
                    color: t.paymentMethod === 'card' ? '#1e40af' : t.paymentMethod === 'cash' ? '#166534' : '#92400e',
                  }}>
                    {methodLabel(t.paymentMethod)}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  <div>Party Name: {t.booking?.hostName || '—'}</div>
                  <div style={{ color: '#94a3b8' }}>Party Date : {t.booking?.date || '—'}</div>
                </td>
                <td style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{t.displayDate}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rooms-footer" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Showing {filtered.length === 0 ? '0 to 0' : `${(page - 1) * entries + 1} to ${Math.min(page * entries, filtered.length)}`} of {filtered.length} entries
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={`page-num ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) return <div>Loading transactions...</div>;

  return (
    <div>
      {/* Filters */}
      <div className="filters" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${datePreset === 'today' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreset('today')}>Today</button>
          <button className={`btn btn-sm ${datePreset === 'yesterday' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreset('yesterday')}>Yesterday</button>
          <button className={`btn btn-sm ${datePreset === 'week' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreset('week')}>This Week</button>
          <button className={`btn btn-sm ${datePreset === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreset('month')}>This Month</button>
          <button className={`btn btn-sm ${datePreset === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreset('all')}>All</button>
        </div>
        <div>
          <label style={{ fontSize: 13, color: '#64748b' }}>From: </label>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setDatePreset(''); }} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: '#64748b' }}>To: </label>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setDatePreset(''); }} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: '#64748b' }}>Method: </label>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
            <option value="">All</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="apple_pay">Apple Pay</option>
            <option value="cash_app">Cash App</option>
          </select>
        </div>
      </div>

      <Section
        title="Payments" data={pagedPay} filtered={filteredPay}
        search={paySearch} setSearch={setPaySearch}
        entries={payEntries} setEntries={setPayEntries}
        page={payPage} setPage={setPayPage} totalPages={payTotalPages}
      />
      <Section
        title="Refunds" data={pagedRef} filtered={filteredRef}
        search={refSearch} setSearch={setRefSearch}
        entries={refEntries} setEntries={setRefEntries}
        page={refPage} setPage={setRefPage} totalPages={refTotalPages}
      />
    </div>
  );
}
