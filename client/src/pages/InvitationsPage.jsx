import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/invitations')
      .then(data => { setInvitations(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div>Loading invitations...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Invitations</h1>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Booking</th>
              <th>Guest</th>
              <th>Email</th>
              <th>Phone</th>
              {/* BUG #14: Method shows 'email' but should be 'sms' */}
              <th>Method</th>
              <th>RSVP</th>
              {/* BUG #23: Waiver status never updates */}
              <th>Waiver</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8' }}>No invitations found</td></tr>
            ) : (
              invitations.map(inv => (
                <tr key={inv.id}>
                  <td>#{inv.id}</td>
                  <td><Link to={`/bookings/${inv.bookingId}`}>#{inv.bookingId}</Link></td>
                  <td>{inv.guestName}</td>
                  <td>{inv.guestEmail || '—'}</td>
                  <td>{inv.guestPhone || '—'}</td>
                  <td>
                    <span className="badge completed">
                      {inv.method === 'sms' ? 'SMS' : inv.method === 'email' ? 'Email' : inv.method}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${inv.rsvpStatus.toLowerCase()}`}>
                      {inv.rsvpStatus}
                    </span>
                  </td>
                  {/* BUG #23: waiverSigned is always false */}
                  <td>
                    <span className={`badge ${inv.waiverSigned ? 'yes' : 'pending'}`}>
                      {inv.waiverSigned ? 'Signed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Invitation Message Preview</h3>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
          Messages are personalized per invitation with host name, child name, and venue details.
        </p>
        {invitations.length > 0 && invitations[0].message ? (
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, fontStyle: 'italic', color: '#64748b' }}>
            &quot;{invitations[0].message}&quot;
          </div>
        ) : (
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, fontStyle: 'italic', color: '#64748b' }}>
            Personalized messages are generated when invitations are sent.
          </div>
        )}
      </div>
    </div>
  );
}
