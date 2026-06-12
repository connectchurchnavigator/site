import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchListPage from './pages/ChurchListPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import VisitorRegisterPage from './pages/VisitorRegisterPage';
import VisitorDashboard from './pages/admin/VisitorDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/churches" element={<ChurchListPage />} />
          <Route path="/church/:slug" element={<ChurchDetailPage />} />
          <Route path="/church/:slug/visit" element={<VisitorRegisterPage />} />
          <Route path="/admin/visitors" element={<VisitorDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;