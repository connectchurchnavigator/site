import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import WorshipLeaderDetailPage from './pages/WorshipLeaderDetailPage';
import WorshipLeadersListPage from './pages/WorshipLeadersListPage';
import MediaTeamDetailPage from './pages/MediaTeamDetailPage';
import MediaTeamsListPage from './pages/MediaTeamsListPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/church/:slug" element={<ChurchDetailPage />} />
          <Route path="/worship-leaders" element={<WorshipLeadersListPage />} />
          <Route path="/worship-leader/:slug" element={<WorshipLeaderDetailPage />} />
          <Route path="/media-teams" element={<MediaTeamsListPage />} />
          <Route path="/media-team/:slug" element={<MediaTeamDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;