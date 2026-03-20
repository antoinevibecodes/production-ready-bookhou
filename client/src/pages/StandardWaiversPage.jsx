import React from 'react';

export default function StandardWaiversPage() {
  const st = {
    card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '24px 28px', marginBottom: 24 },
  };

  return (
    <div>
      <div className="page-header">
        <h1>Waiver Settings</h1>
      </div>

      {/* Waiver Configuration */}
      <div style={st.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Waiver System</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Built-in digital waiver system — no third-party integrations needed
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
              Active
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Waiver Validity</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>1 Year</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>From date of signing</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Notifications</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>SMS + Email</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Confirmation on sign</div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 4 }}>System Features</div>
          <ul style={{ fontSize: 13, color: '#374151', margin: 0, paddingLeft: 18, lineHeight: 2 }}>
            <li>Walk-in waivers via QR code at each location</li>
            <li>Booking waivers linked to event reservations</li>
            <li>Customer profile system (phone as unique ID, auto-fetch returning customers)</li>
            <li>Front desk verification via QR scan</li>
            <li>1-year expiration with auto-detection of expired waivers</li>
            <li>IP address and timestamp logging for compliance</li>
            <li>Auto-save draft if customer leaves mid-form</li>
            <li>Marketing opt-in with SMS/email campaign tools</li>
            <li>CSV export of all waiver data</li>
          </ul>
        </div>
      </div>

      {/* How It Works */}
      <div style={st.card}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>How Waivers Work</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
          {[
            { num: 1, title: 'Customer Arrives', desc: 'Walk-in scans QR code, or booking guest receives waiver link via SMS/email' },
            { num: 2, title: 'Signs Waiver', desc: 'Mobile-first form: personal info, emergency contact, children, digital signature' },
            { num: 3, title: 'Gets Confirmed', desc: 'Receives confirmation via SMS + email with QR code for front desk verification' },
            { num: 4, title: 'Admin Tracks', desc: 'Dashboard shows all waivers, customer profiles, expiration status, and marketing tools' },
          ].map(s => (
            <div key={s.num} style={{ textAlign: 'center', padding: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>{s.num}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Waiver Status Logic */}
      <div style={st.card}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Waiver Status Logic</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>&#10003;</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>Valid / Signed</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Within 1-year expiration period</div>
          </div>
          <div style={{ padding: 16, background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>&#9203;</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Expired</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Past 1-year validity, requires re-sign</div>
          </div>
          <div style={{ padding: 16, background: '#fee2e2', borderRadius: 8, border: '1px solid #fecaca', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>&#10007;</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>Missing</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Not yet completed by the customer</div>
          </div>
        </div>
      </div>
    </div>
  );
}
