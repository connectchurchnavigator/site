import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ChurchesPage from './pages/ChurchesPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import EventsPage from './pages/EventsPage';
import WorshipLeadersPage from './pages/WorshipLeadersPage';
import MediaTeamsPage from './pages/MediaTeamsPage';
import FlyerGeneratorPage from './pages/tools/FlyerGeneratorPage';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/churches" element={<ChurchesPage />} />
            <Route path="/churches/:slug" element={<ChurchDetailPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/worship-leaders" element={<WorshipLeadersPage />} />
            <Route path="/media-teams" element={<MediaTeamsPage />} />
            <Route path="/tools/flyer-generator/:eventSlug" element={<FlyerGeneratorPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;