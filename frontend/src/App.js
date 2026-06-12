import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import PlannerReportPage from './pages/PlannerReportPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/churches/:id" element={<ChurchDetailPage />} />
          <Route path="/planner/:trip_id/report" element={<PlannerReportPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;