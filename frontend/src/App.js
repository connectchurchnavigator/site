import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PlannerViewPage from './pages/PlannerViewPage';
import PublicPlannerPage from './pages/PublicPlannerPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/church/:id" element={<ChurchDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/planner/:id" element={<PlannerViewPage />} />
        <Route path="/planner/share/:shareToken" element={<PublicPlannerPage />} />
      </Routes>
    </Router>
  );
}

export default App;