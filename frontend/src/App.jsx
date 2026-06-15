import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import InstallPrompt from './components/InstallPrompt';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/church/:slug" element={<ChurchDetailPage />} />
          </Routes>
        </main>
        <Footer />
        <InstallPrompt />
      </div>
    </Router>
  );
}

export default App;