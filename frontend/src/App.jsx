import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import ChurchList from './pages/ChurchList';
import ChurchDetail from './pages/ChurchDetail';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import PatternIntelligence from './pages/PatternIntelligence';
import VisitorJourney from './pages/VisitorJourney';
import Benchmarking from './pages/Benchmarking';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/churches" element={<ChurchList />} />
            <Route path="/church/:slug" element={<ChurchDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/tools/pattern-intelligence" element={<PrivateRoute><PatternIntelligence /></PrivateRoute>} />
            <Route path="/tools/visitor-journey" element={<PrivateRoute><VisitorJourney /></PrivateRoute>} />
            <Route path="/tools/benchmarking" element={<PrivateRoute><Benchmarking /></PrivateRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;