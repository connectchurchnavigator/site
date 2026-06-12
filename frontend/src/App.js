import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import AnalyticsPage from './pages/tools/AnalyticsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/church/:slug" element={<ChurchDetailPage />} />
          <Route path="/tools/analytics/:listingId" element={<AnalyticsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;