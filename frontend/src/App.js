import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/HomePage';
import ChurchesPage from './pages/ChurchesPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import WorshipLeadersListPage from './pages/WorshipLeadersListPage';
import WorshipLeaderDetailPage from './pages/WorshipLeaderDetailPage';
import Header from './components/Header';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/churches" element={<ChurchesPage />} />
            <Route path="/church/:slug" element={<ChurchDetailPage />} />
            <Route path="/worship-leaders" element={<WorshipLeadersListPage />} />
            <Route path="/worship-leader/:slug" element={<WorshipLeaderDetailPage />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;