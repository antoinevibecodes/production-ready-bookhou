import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingsData = await api.get('/bookings');
        setRecentBookings(bookingsData.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
      // Admin dashboard may 403 for employees — handle gracefully
      try {
        const dashData = await api.get('/admin/dashboard');
        setStats(dashData);
      } catch (err) {
        // Employees get 403 — that's expected
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/bookings/new" className="btn btn-primary">New Booking</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Bookings</div>
          <div className="value">{stats?.totalBookings || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Confirmed</div>
          <div className="value">{stats?.confirmedBookings || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Cancelled</div>
          <div className="value">{stats?.cancelledBookings || 0}</div>
        </div>
        {user?.role === 'ADMIN' && (
          <div className="stat-card">
            <div className="label">Total Income</div>
            <div className="value money positive">
              ${((stats?.totalIncome || 0) / 100).toFixed(2)}
            </div>
          </div>
        )}
        {user?.role === 'ADMIN' && (
          <div className="stat-card">
            <div className="label">Today&apos;s Income</div>
            <div className="value money positive">
              ${((stats?.todayIncome || 0) / 100).toFixed(2)}
            </div>
          </div>
        )}
        <div className="stat-card">
          <div className="label">Total Transactions</div>
          <div className="value">{stats?.totalTransactions || 0}</div>
        </div>
      </div>

      <div className="card">
        <h3>Business Metrics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Birthdays Booked</div>
            <div className="value">{stats?.totalBirthdaysBooked || 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Field Trips</div>
            <div className="value">{stats?.totalFieldTrips || 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Packages</div>
            <div className="value">{stats?.totalPackages || 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Add-Ons</div>
            <div className="value">{stats?.totalAddOns || 0}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Events</h3>
        {recentBookings.length === 0 ? (
          <p>No bookings found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Host</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Venue</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id}>
                  <td><Link to={`/bookings/${b.id}`}>#{b.id}</Link></td>
                  <td>{b.hostName}</td>
                  <td>
                    <span className={`badge ${b.type === 'BIRTHDAY' ? 'birthday' : 'field-trip'}`}>
                      {b.type}
                    </span>
                  </td>
                  <td>{b.displayDate}</td>
                  <td>
                    <span className={`badge ${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </td>
                  <td>{b.venue?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/reports" className="btn btn-primary">View Reports</Link>
          {user?.role === 'ADMIN' && (
            <button
              className="btn btn-success"
              onClick={() => {
                window.open('/api/reports/export', '_blank');
              }}
            >
              Export Data
            </button>
          )}
          {user?.role === 'ADMIN' && (
            <button
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              Print
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
