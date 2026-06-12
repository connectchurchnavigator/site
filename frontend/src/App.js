import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChurchDetail from './pages/ChurchDetail';
import AdminEnrichment from './pages/AdminEnrichment';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/church/:id" element={<ChurchDetail />} />
        <Route path="/admin/enrichment" element={<AdminEnrichment />} />
      </Routes>
    </Router>
  );
}

export default App;
