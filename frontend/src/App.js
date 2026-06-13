import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ChurchListPage from './pages/ChurchListPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import PastorListPage from './pages/PastorListPage';
import PastorDetailPage from './pages/PastorDetailPage';
import WorshipLeaderListPage from './pages/WorshipLeaderListPage';
import WorshipLeaderDetailPage from './pages/WorshipLeaderDetailPage';
import MediaTeamListPage from './pages/MediaTeamListPage';
import MediaTeamDetailPage from './pages/MediaTeamDetailPage';
import EventListPage from './pages/EventListPage';
import EventDetailPage from './pages/EventDetailPage';
import BibleCollegeListPage from './pages/BibleCollegeListPage';
import BibleCollegeDetailPage from './pages/BibleCollegeDetailPage';
import PlannerLandingPage from './pages/PlannerLandingPage';
import PlannerDashboard from './pages/PlannerDashboard';
import ToolsLandingPage from './pages/ToolsLandingPage';
import HealthScoreChecker from './pages/HealthScoreChecker';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import VisitorDashboard from './pages/VisitorDashboard';
import CityPage from './pages/CityPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/churches" element={<ChurchListPage />} />
          <Route path="/churches/:slug" element={<ChurchDetailPage />} />
          <Route path="/pastors" element={<PastorListPage />} />
          <Route path="/pastors/:slug" element={<PastorDetailPage />} />
          <Route path="/worship-leaders" element={<WorshipLeaderListPage />} />
          <Route path="/worship-leaders/:slug" element={<WorshipLeaderDetailPage />} />
          <Route path="/media-teams" element={<MediaTeamListPage />} />
          <Route path="/media-teams/:slug" element={<MediaTeamDetailPage />} />
          <Route path="/events" element={<EventListPage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/bible-colleges" element={<BibleCollegeListPage />} />
          <Route path="/bible-colleges/:slug" element={<BibleCollegeDetailPage />} />
          <Route path="/planner" element={<PlannerLandingPage />} />
          <Route path="/planner/dashboard" element={<PlannerDashboard />} />
          <Route path="/tools" element={<ToolsLandingPage />} />
          <Route path="/tools/health-score-checker" element={<HealthScoreChecker />} />
          <Route path="/dashboard/analytics" element={<AnalyticsDashboard />} />
          <Route path="/dashboard/visitors" element={<VisitorDashboard />} />
          <Route path="/city/:citySlug" element={<CityPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
