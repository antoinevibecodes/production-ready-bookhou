import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function RsvpPage() {
  const { token } = useParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [invitation, setInvitation] = useState(null);

  useEffect(() => {
    fetch(`/api/invitations/token/${token}`)
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setInvitation(data);
        }
      })
      .catch(() => {});
  }, [token]);

  const handleRsvp = async (rsvpStatus) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/invitations/rsvp/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: rsvpStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to RSVP');
        setLoading(false);
        return;
      }

      setStatus(rsvpStatus);
      setDone(true);
      setLoading(false);
    } catch (err) {
      setError('Failed to submit RSVP');
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>{status === 'YES' ? 'See you there!' : 'Maybe next time!'}</h2>
          <p style={{ fontSize: 18, marginTop: 12 }}>
            {status === 'YES'
              ? 'Your RSVP has been recorded. We look forward to seeing you!'
              : 'Thank you for letting us know.'}
          </p>
          {/* BUG #23: RSVP YES does not trigger waiver link or update waiver status */}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>You&apos;re Invited!</h2>
        <p style={{ fontSize: 16, color: '#64748b', margin: '12px 0 24px' }}>
          {invitation?.message
            ? invitation.message
            : 'You have been invited to a party! Please let us know if you can make it.'}
        </p>
        {error && <div className="error-msg">{error}</div>}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button
            className="btn btn-success"
            style={{ fontSize: 18, padding: '12px 32px' }}
            onClick={() => handleRsvp('YES')}
            disabled={loading}
          >
            Yes, I&apos;ll Be There!
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 18, padding: '12px 32px' }}
            onClick={() => handleRsvp('NO')}
            disabled={loading}
          >
            Can&apos;t Make It
          </button>
        </div>
      </div>
    </div>
  );
}
