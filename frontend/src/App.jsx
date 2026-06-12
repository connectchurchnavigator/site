import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChurchDetail from './pages/ChurchDetail';
import Dashboard from './pages/dashboard/Dashboard';
import Gallery from './pages/dashboard/Gallery';
import Videos from './pages/dashboard/Videos';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/church/:slug" element={<ChurchDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard/gallery" element={<PrivateRoute><Gallery /></PrivateRoute>} />
        <Route path="/dashboard/videos" element={<PrivateRoute><Videos /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;