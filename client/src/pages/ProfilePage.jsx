import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#7c3aed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 32, fontWeight: 700,
          }}>
            {user?.name?.[0] || 'A'}
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{user?.name || 'Admin'}</h2>
            <span className="badge confirmed">{user?.role || 'ADMIN'}</span>
          </div>
        </div>

        <div className="form-group">
          <label>Full Name</label>
          <input type="text" defaultValue={user?.name || 'Admin User'} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" defaultValue={user?.email || 'admin@bookhou.com'} />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input type="text" defaultValue="" placeholder="Phone number" />
        </div>
        <div className="form-group">
          <label>Current Password</label>
          <input type="password" placeholder="Enter current password" />
        </div>
        <div className="form-group">
          <label>New Password</label>
          <input type="password" placeholder="Enter new password" />
        </div>
        <button className="btn btn-primary" style={{ marginTop: 8 }}>Update Profile</button>
      </div>
    </div>
  );
}
