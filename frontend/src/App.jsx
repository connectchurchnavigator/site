import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import ChurchList from './pages/ChurchList';
import ChurchDetail from './pages/ChurchDetail';
import TripPlanner from './components/Planner/TripPlanner';
import VisitRequestResponse from './components/Planner/VisitRequestResponse';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/churches" element={<ChurchList />} />
            <Route path="/church/:id" element={<ChurchDetail />} />
            <Route path="/planner/trips/:tripId" element={<TripPlanner />} />
            <Route path="/visit-request/:requestId/:action" element={<VisitRequestResponse />} />
            <Route path="/visit-request/:requestId" element={<VisitRequestResponse />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
