import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import ChurchDetail from './pages/ChurchDetail';
import AddChurchGuided from './pages/AddChurchGuided';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/church/:slug" element={<ChurchDetail />} />
            <Route path="/add-church/guided" element={<AddChurchGuided />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;