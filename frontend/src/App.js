import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChurchesPage from './pages/ChurchesPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import EventsPage from './pages/EventsPage';
import PastorsPage from './pages/PastorsPage';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/churches" element={<ChurchesPage />} />
            <Route path="/churches/:id" element={<ChurchDetailPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/pastors" element={<PastorsPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;