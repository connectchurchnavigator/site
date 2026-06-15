import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ToolsPage from './pages/tools/ToolsPage';
import QRCheckInPage from './pages/tools/QRCheckInPage';
import SocialHealthPage from './pages/tools/SocialHealthPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#7c3aed',
    },
    secondary: {
      main: '#ec4899',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/church/:slug" element={<ChurchDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/tools" element={<ToolsPage />} />
          <Route path="/dashboard/tools/qr-checkin" element={<QRCheckInPage />} />
          <Route path="/dashboard/tools/social-health" element={<SocialHealthPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
