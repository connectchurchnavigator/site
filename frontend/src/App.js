import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home2 from './pages/Home2';
import SearchPage from './pages/SearchPage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import ToolsPage from './pages/ToolsPage';
import './App.css';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home2 />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/church/:id" element={<ChurchDetailPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/tools/health-check" element={<div style={{padding: '4rem', textAlign: 'center'}}><h1>Health Check Tool</h1><p>Coming soon - Task 49</p></div>} />
            <Route path="/tools/analytics" element={<div style={{padding: '4rem', textAlign: 'center'}}><h1>Analytics Dashboard</h1><p>Coming soon - Task 50</p></div>} />
            <Route path="/tools/social" element={<div style={{padding: '4rem', textAlign: 'center'}}><h1>Social Media Health</h1><p>Coming soon - Task 51</p></div>} />
            <Route path="/tools/intelligence" element={<div style={{padding: '4rem', textAlign: 'center'}}><h1>AI Pattern Intelligence</h1><p>Coming soon - Task 52</p></div>} />
            <Route path="/tools/network" element={<div style={{padding: '4rem', textAlign: 'center'}}><h1>Network Benchmarking</h1><p>Coming soon - Task 53</p></div>} />
            <Route path="*" element={<div style={{padding: '4rem', textAlign: 'center'}}><h1>404 - Page Not Found</h1></div>} />
          </Routes>
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;