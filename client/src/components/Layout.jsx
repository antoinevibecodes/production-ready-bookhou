import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialExpanded = () => {
    const p = location.pathname;
    if (p.startsWith('/analytics') || p === '/transactions' || p === '/reports') return 'analytics';
    if (p.startsWith('/bookings') || p === '/calendar' || p === '/block-time') return 'events';
    if (p === '/packages' || p === '/add-ons' || p === '/rooms' || p === '/categories') return 'packages';
    if (p.startsWith('/marketing')) return 'marketing';
    if (p.startsWith('/waivers')) return 'waivers';
    return null;
  };

  const [expanded, setExpanded] = useState(getInitialExpanded());

  const toggle = (section) => {
    setExpanded(prev => prev === section ? null : section);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="top-header">
        <div className="header-left">
          <span className="logo">book<b>hou</b></span>
        </div>
        <button className="venue-selector">HelenFunFactory (TI...) &#9662;</button>
        <div className="header-gradient"></div>
        <div className="header-right">
          <span className="revenue-badge">REVENUE GENERATED : $577.51</span>
          <div className="header-avatar">{user?.name?.[0] || 'A'}</div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-role">BUSINESS ADMIN</div>
          <nav className="sidebar-nav">
            <NavLink to="/" end className="nav-item">
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Dashboard
            </NavLink>

            <div className="nav-section">
              <button className={`nav-item section-toggle ${expanded === 'analytics' ? 'open' : ''}`} onClick={() => toggle('analytics')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Analytics
                <span className="chevron">{expanded === 'analytics' ? '\u25BE' : '\u203A'}</span>
              </button>
              {expanded === 'analytics' && (
                <div className="sub-menu">
                  <NavLink to="/analytics" end className="nav-sub-item">Analytics</NavLink>
                  <NavLink to="/transactions" className="nav-sub-item">Transactions</NavLink>
                  <NavLink to="/reports" className="nav-sub-item">Reports</NavLink>
                </div>
              )}
            </div>

            <div className="nav-section">
              <button className={`nav-item section-toggle ${expanded === 'events' ? 'open' : ''}`} onClick={() => toggle('events')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Events
                <span className="chevron">{expanded === 'events' ? '\u25BE' : '\u203A'}</span>
              </button>
              {expanded === 'events' && (
                <div className="sub-menu">
                  <NavLink to="/bookings/new" className="nav-sub-item">Create An Event</NavLink>
                  <NavLink to="/bookings" end className="nav-sub-item">Event List</NavLink>
                  <NavLink to="/calendar" className="nav-sub-item">Calendar View</NavLink>
                  <NavLink to="/block-time" className="nav-sub-item">Block Time</NavLink>
                </div>
              )}
            </div>

            <div className="nav-section">
              <button className={`nav-item section-toggle ${expanded === 'packages' ? 'open' : ''}`} onClick={() => toggle('packages')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                Packages &amp; Rooms
                <span className="chevron">{expanded === 'packages' ? '\u25BE' : '\u203A'}</span>
              </button>
              {expanded === 'packages' && (
                <div className="sub-menu">
                  <NavLink to="/packages" end className="nav-sub-item">Packages</NavLink>
                  <NavLink to="/add-ons" className="nav-sub-item">Add-Ons</NavLink>
                  <NavLink to="/rooms" className="nav-sub-item">Rooms</NavLink>
                  <NavLink to="/categories" className="nav-sub-item">Categories</NavLink>
                </div>
              )}
            </div>

            <div className="nav-section">
              <button className={`nav-item section-toggle ${expanded === 'marketing' ? 'open' : ''}`} onClick={() => toggle('marketing')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Marketing
                <span className="chevron">{expanded === 'marketing' ? '\u25BE' : '\u203A'}</span>
              </button>
              {expanded === 'marketing' && (
                <div className="sub-menu">
                  <NavLink to="/marketing/emails" className="nav-sub-item">Email Automation</NavLink>
                  <NavLink to="/marketing/notifications" className="nav-sub-item">Notifications Bar</NavLink>
                  <NavLink to="/marketing/discounts" className="nav-sub-item">Discount &amp; Promo</NavLink>
                  <NavLink to="/marketing/booking-page" className="nav-sub-item">Booking Page Se...</NavLink>
                  <NavLink to="/marketing/media" className="nav-sub-item">Media Files</NavLink>
                  <NavLink to="/marketing/leads" className="nav-sub-item">Leads</NavLink>
                </div>
              )}
            </div>

            <NavLink to="/users" className="nav-item">
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              Users
            </NavLink>

            <div className="nav-section">
              <button className={`nav-item section-toggle ${expanded === 'waivers' ? 'open' : ''}`} onClick={() => toggle('waivers')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Waivers
                <span className="chevron">{expanded === 'waivers' ? '\u25BE' : '\u203A'}</span>
              </button>
              {expanded === 'waivers' && (
                <div className="sub-menu">
                  <NavLink to="/waivers/events" className="nav-sub-item">Waiver Dashboard</NavLink>
                  <NavLink to="/waivers/customers" className="nav-sub-item">Customer List</NavLink>
                  <NavLink to="/waivers/standard" className="nav-sub-item">Waiver Settings</NavLink>
                </div>
              )}
            </div>

            <NavLink to="/settings" className="nav-item">
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Settings
            </NavLink>

            <NavLink to="/profile" className="nav-item">
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profile
            </NavLink>
          </nav>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </aside>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
