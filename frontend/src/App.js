import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PlannerDashboard from './pages/PlannerDashboard';
import PlannerTripPage from './pages/PlannerTripPage';
import PlannerDiscoverPage from './pages/PlannerDiscoverPage';
import './App.css';

function App() {
  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/church/:slug" element={<ChurchDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/planner"
              element={
                <ProtectedRoute>
                  <PlannerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner/:trip_id"
              element={
                <ProtectedRoute>
                  <PlannerTripPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner/:trip_id/discover"
              element={
                <ProtectedRoute>
                  <PlannerDiscoverPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
