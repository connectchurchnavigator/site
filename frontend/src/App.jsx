import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import WorshipLeadersPage from './pages/WorshipLeadersPage';
import MediaTeamPage from './pages/MediaTeamPage';
import FlyerGeneratorPage from './pages/tools/FlyerGeneratorPage';
import PublicFlyerPage from './pages/PublicFlyerPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/churches/:slug" element={<ChurchDetailPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />
        <Route path="/events/:eventSlug/flyer" element={<FlyerGeneratorPage />} />
        <Route path="/flyers/:eventSlug" element={<PublicFlyerPage />} />
        <Route path="/worship-leaders" element={<WorshipLeadersPage />} />
        <Route path="/media-team" element={<MediaTeamPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;