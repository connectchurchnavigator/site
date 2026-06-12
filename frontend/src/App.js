import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HealthCheckPage from './pages/tools/HealthCheckPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tools/health-check" element={<HealthCheckPage />} />
      </Routes>
    </Router>
  );
}

export default App;