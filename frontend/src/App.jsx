import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import TemplateLibrary from './components/planner/TemplateLibrary';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/church/:id" element={<ChurchDetailPage />} />
        <Route path="/planner/templates" element={<TemplateLibrary />} />
      </Routes>
    </Router>
  );
}

export default App;