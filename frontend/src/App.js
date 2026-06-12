import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home2 from './pages/Home2';
import ChurchDetailPage from './pages/ChurchDetailPage';
import SearchPage from './pages/SearchPage';
import SubmitChurch from './pages/SubmitChurch';
import Contact from './pages/Contact';
import PlannerPage from './pages/tools/PlannerPage';
import './App.css';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home2 />} />
            <Route path="/church/:slug" element={<ChurchDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/submit-church" element={<SubmitChurch />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/planner" element={<PlannerPage />} />
          </Routes>
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;