import React from 'react';

export default function NotificationsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Notifications Bar</h1>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Notification Message</label>
          <textarea rows={3} placeholder="Enter a message to display on the booking page notification bar..."></textarea>
        </div>
        <div className="form-group">
          <label>Background Color</label>
          <input type="color" defaultValue="#7c3aed" style={{ width: 60, height: 36 }} />
        </div>
        <div className="form-group">
          <label>Text Color</label>
          <input type="color" defaultValue="#ffffff" style={{ width: 60, height: 36 }} />
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" defaultChecked />
            Enable Notification Bar
          </label>
        </div>
        <button className="btn btn-primary">Save</button>
      </div>
    </div>
  );
}
