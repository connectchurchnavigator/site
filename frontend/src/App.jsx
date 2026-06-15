import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import ChurchDetail from './pages/ChurchDetail';
import Search from './pages/Search';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import PatternIntelligence from './pages/tools/PatternIntelligence';
import VisitorJourney from './pages/tools/VisitorJourney';
import Benchmarking from './pages/tools/Benchmarking';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/church/:slug" element={<ChurchDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/tools/pattern-intelligence/:churchSlug" element={<PatternIntelligence />} />
            <Route path="/tools/visitor-journey/:churchSlug" element={<VisitorJourney />} />
            <Route path="/tools/benchmarking/:churchSlug" element={<Benchmarking />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;