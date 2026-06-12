import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchListPage from './pages/ChurchListPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import BibleCollegeListPage from './pages/BibleCollegeListPage';
import BibleCollegeDetailPage from './pages/BibleCollegeDetailPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/churches" element={<ChurchListPage />} />
        <Route path="/churches/:slug" element={<ChurchDetailPage />} />
        <Route path="/colleges" element={<BibleCollegeListPage />} />
        <Route path="/colleges/:slug" element={<BibleCollegeDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;