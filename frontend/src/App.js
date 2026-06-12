import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WorshipLeadersPage from './pages/listings/WorshipLeadersPage';
import MediaTeamsPage from './pages/listings/MediaTeamsPage';
import EventsPage from './pages/listings/EventsPage';
import PlannerInboxPage from './pages/tools/PlannerInboxPage';
import NavigationBar from './components/NavigationBar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100">
          <NavigationBar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/church/:id" element={<ChurchDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/worship-leaders" element={<WorshipLeadersPage />} />
              <Route path="/media-teams" element={<MediaTeamsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/planner/inbox" element={<PrivateRoute><PlannerInboxPage /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;