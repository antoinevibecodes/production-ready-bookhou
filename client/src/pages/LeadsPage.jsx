import React, { useState } from 'react';

const sampleLeads = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0123', type: 'Customer', status: 'New', date: 'Oct 12, 2023' },
  { id: 2, name: 'Mike Chen', email: 'mike@school.edu', phone: '555-0456', type: 'Business', status: 'Contacted', date: 'Oct 10, 2023' },
];

export default function LeadsPage() {
  const [tab, setTab] = useState('customer');

  return (
    <div>
      <div className="page-header">
        <h1>Leads</h1>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 0 0 6px' }}
          onClick={() => setTab('customer')}
        >Customer Leads</button>
        <button
          className={`btn ${tab === 'business' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '0 6px 6px 0' }}
          onClick={() => setTab('business')}
        >Business Leads</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sampleLeads.filter(l => tab === 'customer' ? l.type === 'Customer' : l.type === 'Business').map(l => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.email}</td>
                <td>{l.phone}</td>
                <td><span className="badge birthday">{l.type}</span></td>
                <td><span className="badge confirmed">{l.status}</span></td>
                <td>{l.date}</td>
                <td>
                  <button className="btn btn-sm btn-secondary" style={{ marginRight: 4 }}>View</button>
                  <button className="btn btn-sm btn-secondary">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
