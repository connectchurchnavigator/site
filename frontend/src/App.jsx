import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/" element={<div className="p-8"><h1 className="text-3xl font-bold">ChurchNavigator Home</h1><p className="mt-4">Welcome! <a href="/login" className="text-blue-600 underline">Sign in</a> or <a href="/register" className="text-blue-600 underline">register</a></p></div>} />
      </Routes>
    </Router>
  );
}

export default App;
