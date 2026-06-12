import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import SearchPage from './pages/SearchPage';
import AISearchChatbot from './components/AISearchChatbot';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/churches/:id" element={<ChurchDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
        <Footer />
        <AISearchChatbot />
      </div>
    </Router>
  );
}

export default App;