import React from 'react';

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Business Address</h3>
        <div className="form-group">
          <label>Address</label>
          <input type="text" defaultValue="116 Elbowne Drive, Helen, GA, 30545, USA" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Country</label>
            <input type="text" defaultValue="United States" />
          </div>
          <div className="form-group">
            <label>State</label>
            <input type="text" defaultValue="Georgia" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>City</label>
            <input type="text" defaultValue="Helen" />
          </div>
          <div className="form-group">
            <label>Zip Code</label>
            <input type="text" defaultValue="30545" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Location Name</label>
            <input type="text" defaultValue="HelenFunFactory" />
          </div>
          <div className="form-group">
            <label>Business Email</label>
            <input type="email" defaultValue="helenfunfactory@gmail.com" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Business Phone Number</label>
            <input type="text" defaultValue="404-944-4489" />
          </div>
          <div className="form-group">
            <label>Currency</label>
            <select>
              <option>($) United States Dollar</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Timezone</label>
          <select>
            <option>(GMT-05:00) Eastern Time (US &amp; Canada)</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3>Social Media</h3>
        <div className="form-group">
          <label>Twitter</label>
          <input type="text" defaultValue="https://www.twitter.com/example" />
        </div>
        <div className="form-group">
          <label>Facebook</label>
          <input type="text" defaultValue="https://www.facebook.com/example" />
        </div>
        <div className="form-group">
          <label>Instagram</label>
          <input type="text" defaultValue="https://www.instagram.com/example" />
        </div>
        <div className="form-group">
          <label>Website</label>
          <input type="text" defaultValue="www.helenfunfactory.com" />
        </div>
        <button className="btn btn-primary" style={{ marginTop: 8 }}>Save Changes</button>
      </div>
    </div>
  );
}
