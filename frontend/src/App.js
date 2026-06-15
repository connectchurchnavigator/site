import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import EventsPage from './pages/EventsPage';
import WorshipLeadersPage from './pages/WorshipLeadersPage';
import MediaTeamsPage from './pages/MediaTeamsPage';
import FlyerGeneratorPage from './pages/tools/FlyerGeneratorPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/churches/:slug" element={<ChurchDetailPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/worship-leaders" element={<WorshipLeadersPage />} />
          <Route path="/media-teams" element={<MediaTeamsPage />} />
          <Route path="/tools/flyer-generator/:eventSlug" element={<FlyerGeneratorPage />} />
          <Route path="/flyers/:eventSlug" element={<FlyerGeneratorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;
