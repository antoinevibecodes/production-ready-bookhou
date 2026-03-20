import React from 'react';

export default function BookingPageSettingsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Booking Page Settings</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Booking Link</h3>
        <div className="form-group">
          <label>Your Booking Page URL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value="https://bookhou.com/book/helenfunfactory" readOnly style={{ flex: 1, background: '#f8fafc' }} />
            <button className="btn btn-primary">Copy</button>
            <button className="btn btn-secondary">Test Link</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Embedded Code</h3>
        <p style={{ color: '#64748b', marginBottom: 12, fontSize: 13 }}>
          Copy and paste this code into your website to embed the booking widget.
        </p>
        <div className="form-group">
          <label>Embed Code</label>
          <textarea
            rows={4}
            readOnly
            value={'<iframe src="https://bookhou.com/embed/helenfunfactory" width="100%" height="600" frameborder="0"></iframe>'}
            style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8fafc' }}
          />
        </div>
        <button className="btn btn-primary">Copy Code</button>
      </div>
    </div>
  );
}
