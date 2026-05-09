import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home2 from './pages/Home2';
import About2 from './pages/About2';
import AuthPage from './pages/AuthPage';
import Explore2 from './pages/Explore2';
import ChurchDetailPage from './pages/ChurchDetailPage';
import PastorDetailPage from './pages/PastorDetailPage';
import AddListingPage from './pages/AddListingPage';
import DashboardPage from './pages/DashboardPage';
import ChurchCreationFlow from './pages/listing/ChurchCreationFlow';
import PastorCreationFlow2 from './pages/listing/PastorCreationFlow2';
import ScrollToTop from './components/ScrollToTop';
import {
  AdminLayout,
  AdminDashboard,
  AdminUsers,
  AdminChurches,
  AdminPastors,
  AdminVerification,
  AdminTaxonomies,
  AdminAnalytics,
  AdminReports,
  AdminAnnouncements,
  AdminLogs,
  AdminSettings
} from './pages/admin';
import CookieConsent from './components/CookieConsent';
import '@/App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/auth/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home2 />} />
      <Route path="/about" element={<About2 />} />
      <Route path="/explore" element={<Explore2 />} />
      <Route path="/church/:slug" element={<ChurchDetailPage />} />
      <Route path="/pastor/:slug" element={<PastorDetailPage />} />
      <Route path="/auth/login" element={<AuthPage />} />
      <Route path="/auth/register" element={<AuthPage />} />
      
      {/* Protected Routes */}
      <Route path="/add-listing" element={
        <ProtectedRoute>
          <AddListingPage />
        </ProtectedRoute>
      } />
      <Route path="/listing/church/create" element={
        <ProtectedRoute>
          <ChurchCreationFlow />
        </ProtectedRoute>
      } />
      <Route path="/listing/pastor/create" element={
        <ProtectedRoute>
          <PastorCreationFlow2 />
        </ProtectedRoute>
      } />
      {/* PastorCreationFlow2 is now the default */}
      <Route path="/listing/church/edit/:id" element={
        <ProtectedRoute>
          <ChurchCreationFlow />
        </ProtectedRoute>
      } />
      <Route path="/listing/pastor/edit/:id" element={
        <ProtectedRoute>
          <PastorCreationFlow2 />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/*" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="churches" element={<AdminChurches />} />
        <Route path="pastors" element={<AdminPastors />} />
        <Route path="verification" element={<AdminVerification />} />
        <Route path="verifications" element={<AdminVerification />} /> {/* Fallback for old links */}
        <Route path="taxonomies" element={<AdminTaxonomies />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      
      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <ScrollToTop />
          <AppRoutes />
          <CookieConsent />
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;