import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChurchDetail from './pages/ChurchDetail';
import VisitorRegistration from './pages/VisitorRegistration';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/church/:slug" element={<ChurchDetail />} />
        <Route path="/church/:slug/visit" element={<VisitorRegistration />} />
      </Routes>
    </Router>
  );
}

export default App;