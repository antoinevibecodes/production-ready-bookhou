import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function WaiverVerifyPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch(`/api/waivers/verify/${token}`)
      .then(async res => {
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Invalid waiver');
          setLoading(false);
          return;
        }
        setData(await res.json());
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to verify waiver');
        setLoading(false);
      });
  }, [token]);

  const [verifyError, setVerifyError] = useState('');

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await fetch(`/api/waivers/verify/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const result = await res.json();
        setData(d => ({ ...d, status: 'verified', verifiedAt: result.verifiedAt || new Date().toISOString() }));
      } else {
        const err = await res.json().catch(() => ({}));
        setVerifyError(err.error || 'Verification failed. Please log in to the admin dashboard first.');
      }
    } catch (e) {
      setVerifyError('Network error. Please try again.');
    }
    setVerifying(false);
  };

  const st = {
    page: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center' },
    check: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  };

  if (loading) return <div style={st.page}><div style={st.card}><p>Verifying waiver...</p></div></div>;

  if (error) {
    return (
      <div style={st.page}>
        <div style={st.card}>
          <div style={{ ...st.check, background: '#fee2e2' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <h2 style={{ color: '#ef4444', fontSize: 24, marginBottom: 8 }}>Invalid Waiver</h2>
          <p style={{ color: '#64748b', fontSize: 15 }}>{error}</p>
        </div>
      </div>
    );
  }

  const isVerified = data.status === 'verified';
  const isExpired = data.expired;

  return (
    <div style={st.page}>
      <div style={st.card}>
        {isExpired ? (
          <>
            <div style={{ ...st.check, background: '#fef3c7' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 style={{ color: '#92400e', fontSize: 24, marginBottom: 4 }}>Waiver Expired</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              This waiver has expired and needs to be re-signed.
            </p>
          </>
        ) : (
          <>
            <div style={{ ...st.check, background: isVerified ? '#dbeafe' : '#dcfce7' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={isVerified ? '#2563eb' : '#22c55e'} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ color: '#1e293b', fontSize: 24, marginBottom: 4 }}>
              {isVerified ? 'Waiver Verified' : 'Waiver Signed'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              {isVerified ? 'This waiver has been checked in at the front desk.' : 'This waiver is valid and ready for check-in.'}
            </p>
          </>
        )}

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '20px 24px', textAlign: 'left', marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Guest Name</div>
            <div style={{ fontSize: 17, color: '#1e293b', fontWeight: 700 }}>{data.guestName}</div>
          </div>
          {data.email && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Email</div>
              <div style={{ fontSize: 15, color: '#334155' }}>{data.email}</div>
            </div>
          )}
          {data.phone && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Phone</div>
              <div style={{ fontSize: 15, color: '#334155' }}>{data.phone}</div>
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Venue</div>
            <div style={{ fontSize: 15, color: '#334155' }}>{data.venueName}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Signed On</div>
            <div style={{ fontSize: 15, color: '#334155' }}>
              {new Date(data.signedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Type</div>
            <div style={{ fontSize: 15, color: '#334155' }}>{data.type === 'walkin' ? 'Walk-in' : 'Event Booking'}</div>
          </div>
          {data.expiresAt && (
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Expires</div>
              <div style={{ fontSize: 15, color: isExpired ? '#ef4444' : '#334155', fontWeight: isExpired ? 700 : 400 }}>
                {new Date(data.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}
                {isExpired && ' (EXPIRED)'}
              </div>
            </div>
          )}
        </div>

        {verifyError && (
          <div style={{ padding: '10px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            {verifyError}
          </div>
        )}

        {!isVerified && !isExpired && (
          <button
            onClick={handleVerify}
            disabled={verifying}
            style={{
              width: '100%', padding: '14px 24px',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {verifying ? 'Verifying...' : 'Mark as Verified (Front Desk)'}
          </button>
        )}

        {isExpired && (
          <div style={{ padding: '10px 16px', background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            This waiver has expired. The customer needs to sign a new waiver.
          </div>
        )}

        {isVerified && data.verifiedAt && (
          <div style={{ padding: '10px 16px', background: '#dbeafe', color: '#1e40af', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            Verified on {new Date(data.verifiedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })}
          </div>
        )}
      </div>
    </div>
  );
}
