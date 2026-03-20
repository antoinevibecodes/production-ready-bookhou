import React from 'react';

const sampleUsers = [
  { id: 1, username: 'antoinechabtini', role: 'Business Admin', email: 'antoine.chab.stl@gmail.com', status: 'Active', accepted: true },
];

export default function UsersPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Users</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="Email address" />
          </div>
          <div className="form-group">
            <label>Locations</label>
            <select><option>Select an address</option></select>
          </div>
        </div>
        <button className="btn btn-primary">Send</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Filters</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Role</label>
            <select>
              <option>Employee</option>
              <option>Business Admin</option>
              <option>Manager</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select>
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Users</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13 }}>Show <select style={{ padding: '2px 6px' }}><option>10</option></select> Entries</div>
          <div><input placeholder="Search:" style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }} /></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Username</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sampleUsers.map(u => (
              <tr key={u.id}>
                <td><span className="badge confirmed">Accepted</span></td>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.email}</td>
                <td><span className="badge confirmed">Active</span></td>
                <td>
                  <button className="btn btn-sm btn-secondary" style={{ marginRight: 4 }}>Edit</button>
                  <button className="btn btn-sm btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>Showing 1 to 1 of 1 entries</div>
      </div>
    </div>
  );
}
