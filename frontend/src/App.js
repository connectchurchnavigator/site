import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchesPage from './pages/ChurchesPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import PlannerNewPage from './pages/tools/PlannerNewPage';
import PlannerViewPage from './pages/tools/PlannerViewPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/churches" element={<ChurchesPage />} />
          <Route path="/churches/:slug" element={<ChurchDetailPage />} />
          <Route path="/planner/new" element={<PlannerNewPage />} />
          <Route path="/planner/:id" element={<PlannerViewPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;