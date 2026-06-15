import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import ToolsPage from './pages/ToolsPage';
import SocialHealthPage from './pages/tools/SocialHealthPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/church/:slug" element={<ChurchDetailPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/social-health" element={<SocialHealthPage />} />
      </Routes>
    </Router>
  );
}

export default App;