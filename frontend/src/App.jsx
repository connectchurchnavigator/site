import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChurchDetail from './pages/ChurchDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PlannerPricing from './pages/PlannerPricing';
import PlannerSubscription from './pages/PlannerSubscription';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/church/:id" element={<ChurchDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/planner/pricing" element={<PlannerPricing />} />
            <Route path="/planner/subscription" element={<PlannerSubscription />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;