import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import WorshipLeadersPage from './pages/WorshipLeadersPage';
import MediaTeamPage from './pages/MediaTeamPage';
import EventsPage from './pages/EventsPage';
import SocialHealthPage from './pages/tools/SocialHealthPage';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/church/:id" element={<ChurchDetailPage />} />
            <Route path="/worship-leaders" element={<WorshipLeadersPage />} />
            <Route path="/media-team" element={<MediaTeamPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/tools/social/:listingId" element={<SocialHealthPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
