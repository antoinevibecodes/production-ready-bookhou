import React from 'react';

export default function MediaFilesPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Media Files</h1>
        <button className="btn btn-primary">+ Add Image</button>
      </div>

      <div className="card">
        <div style={{
          border: '2px dashed #d1d5db',
          borderRadius: 8,
          padding: 40,
          textAlign: 'center',
          color: '#94a3b8',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>+</div>
          <p>Select a File or Drag Here</p>
        </div>

        <div style={{ marginTop: 20 }}>
          <p style={{ color: '#64748b', fontSize: 13 }}>No media files uploaded yet.</p>
        </div>
      </div>
    </div>
  );
}
