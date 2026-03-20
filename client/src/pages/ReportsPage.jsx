import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function ReportsPage() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [datePreset, setDatePreset] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetchReport();
    fetchSummary();
  }, [startDate, endDate, paymentMethod]);

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
    }
  };

  const fetchReport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);
      const data = await api.get(`/reports/cash?${params.toString()}`);
      setReport(data);
      setLoading(false);
    } catch (err) {
      if (err.message?.includes('403') || err.status === 403) {
        setAccessDenied(true);
      }
      console.error(err);
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const data = await api.get(`/reports/summary?${params.toString()}`);
      setSummary(data);
    } catch (err) {
      if (err.message?.includes('403') || err.status === 403) {
        setAccessDenied(true);
      }
      console.error(err);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (paymentMethod) params.set('paymentMethod', paymentMethod);
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  };

  if (loading) return <div>Loading reports...</div>;

  if (accessDenied || user?.role === 'EMPLOYEE') {
    return (
      <div>
        <div className="page-header">
          <h1>Reports</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h3 style={{ color: '#ef4444' }}>Access Denied</h3>
          <p style={{ color: '#94a3b8' }}>Reports and analytics are restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-success" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Total Sales</div>
            <div className="value money positive">${((summary.totalSales || 0) / 100).toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Cash Sales</div>
            <div className="value money">${((summary.cashSales || 0) / 100).toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Card Sales</div>
            <div className="value money">${((summary.cardSales || 0) / 100).toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Apple Pay</div>
            <div className="value money">${((summary.applePaySales || 0) / 100).toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Cash App</div>
            <div className="value money">${((summary.cashAppSales || 0) / 100).toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Transactions</div>
            <div className="value">{summary.transactionCount || 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Tax</div>
            <div className="value money">${((summary.totalTax || 0) / 100).toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${datePreset === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPreset('today')}
          >Today</button>
          <button
            className={`btn btn-sm ${datePreset === 'yesterday' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPreset('yesterday')}
          >Yesterday</button>
          <button
            className={`btn btn-sm ${datePreset === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPreset('week')}
          >This Week</button>
          <button
            className={`btn btn-sm ${datePreset === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPreset('month')}
          >This Month</button>
        </div>
        <div>
          <label>From: </label>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setDatePreset(''); }} />
        </div>
        <div>
          <label>To: </label>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setDatePreset(''); }} />
        </div>
        <div>
          <label>Method: </label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="all">All</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="apple_pay">Apple Pay</option>
            <option value="cash_app">Cash App</option>
          </select>
        </div>
      </div>

      {/* Report Table */}
      <div className="card">
        <h3>Charge by {paymentMethod === 'all' ? 'All Methods' : paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Card' : paymentMethod === 'apple_pay' ? 'Apple Pay' : 'Cash App'} Report</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Booking</th>
              <th>Host</th>
              <th>Event Type</th>
              <th>Package</th>
              <th>Venue</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {report?.rows?.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8' }}>No transactions found</td></tr>
            ) : (
              report?.rows?.map(r => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{r.date}</td>
                  <td>#{r.bookingId}</td>
                  <td>{r.hostName}</td>
                  <td>{r.eventType}</td>
                  <td>{r.packageName}</td>
                  <td>{r.venueName}</td>
                  <td className="money positive">${(r.amount / 100).toFixed(2)}</td>
                  <td>{r.notes || '—'}</td>
                </tr>
              ))
            )}
            {report?.rows?.length > 0 && (
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #334155' }}>
                <td colSpan={7} style={{ textAlign: 'right' }}>Total:</td>
                <td className="money positive">${((report?.totalAmount || 0) / 100).toFixed(2)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 14, color: '#94a3b8' }}>
          Showing {report?.count || 0} transactions — Total: ${((report?.totalAmount || 0) / 100).toFixed(2)}
        </div>
      </div>

      <div className="card">
        <h3>Business Metrics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Birthdays Booked</div>
            <div className="value">{summary?.totalBirthdaysBooked || 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Field Trips</div>
            <div className="value">{summary?.totalFieldTrips || 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Packages</div>
            <div className="value">{summary?.totalPackages || 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Add-Ons</div>
            <div className="value">{summary?.totalAddOns || 0}</div>
          </div>
        </div>
      </div>

      {summary && (
        <div className="card">
          <h3>Tax Report</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Total Tax Collected</div>
              <div className="value money">${((summary.totalTax || 0) / 100).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
