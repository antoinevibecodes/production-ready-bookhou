import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BookingsPage from './pages/BookingsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import TransactionsPage from './pages/TransactionsPage';
import ReportsPage from './pages/ReportsPage';
import InvoicesPage from './pages/InvoicesPage';
import InvitationsPage from './pages/InvitationsPage';
import WaiverPage from './pages/WaiverPage';
import RsvpPage from './pages/RsvpPage';
import NewBookingPage from './pages/NewBookingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CalendarPage from './pages/CalendarPage';
import BlockTimePage from './pages/BlockTimePage';
import PackagesPage from './pages/PackagesPage';
import AddOnsPage from './pages/AddOnsPage';
import RoomsPage from './pages/RoomsPage';
import CategoriesPage from './pages/CategoriesPage';
import EmailAutomationPage from './pages/EmailAutomationPage';
import NotificationsPage from './pages/NotificationsPage';
import DiscountsPage from './pages/DiscountsPage';
import BookingPageSettingsPage from './pages/BookingPageSettingsPage';
import MediaFilesPage from './pages/MediaFilesPage';
import LeadsPage from './pages/LeadsPage';
import UsersPage from './pages/UsersPage';
import EventWaiversPage from './pages/EventWaiversPage';
import StandardWaiversPage from './pages/StandardWaiversPage';
import WaiverVerifyPage from './pages/WaiverVerifyPage';
import CustomerListPage from './pages/CustomerListPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

function WaiverWalkinRedirect() {
  const { venueId } = useParams();
  // Navigate renders WaiverPage with token = "walkin-{venueId}"
  return <Navigate to={`/waiver/walkin-${venueId}`} replace />;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/rsvp/:token" element={<RsvpPage />} />
      <Route path="/waiver/walkin/:venueId" element={<WaiverWalkinRedirect />} />
      <Route path="/waiver/:token" element={<WaiverPage />} />
      <Route path="/verify/:token" element={<WaiverVerifyPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/bookings/new" element={<NewBookingPage />} />
                <Route path="/bookings/:id" element={<BookingDetailPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invitations" element={<InvitationsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/block-time" element={<BlockTimePage />} />
                <Route path="/packages" element={<PackagesPage />} />
                <Route path="/add-ons" element={<AddOnsPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/marketing/emails" element={<EmailAutomationPage />} />
                <Route path="/marketing/notifications" element={<NotificationsPage />} />
                <Route path="/marketing/discounts" element={<DiscountsPage />} />
                <Route path="/marketing/booking-page" element={<BookingPageSettingsPage />} />
                <Route path="/marketing/media" element={<MediaFilesPage />} />
                <Route path="/marketing/leads" element={<LeadsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/waivers/events" element={<EventWaiversPage />} />
                <Route path="/waivers/customers" element={<CustomerListPage />} />
                <Route path="/waivers/standard" element={<StandardWaiversPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
