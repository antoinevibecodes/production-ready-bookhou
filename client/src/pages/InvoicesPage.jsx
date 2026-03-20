import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/invoices')
      .then(data => { setInvoices(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Booking</th>
              <th>Date</th>
              <th>Total</th>
              <th>Tax (6%)</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>No invoices found</td></tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id}>
                  <td>#{inv.id}</td>
                  <td>
                    <Link to={`/bookings/${inv.bookingId}`}>Booking #{inv.bookingId}</Link>
                  </td>
                  <td>{new Date(inv.createdAt).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</td>
                  <td className="money">${(inv.totalAmount / 100).toFixed(2)}</td>
                  <td>${(inv.taxAmount / 100).toFixed(2)}</td>
                  <td>
                    {inv.pdfPath ? (
                      <a href={`/api/invoices/${inv.id}/download`} className="btn btn-sm btn-secondary">
                        Download PDF
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Not generated</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
