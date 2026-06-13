import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InstallPrompt from './components/InstallPrompt';
import Home from './pages/Home';
import ChurchDetail from './pages/ChurchDetail';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/church/:slug" element={<ChurchDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <InstallPrompt />
      </div>
    </Router>
  );
}

export default App;