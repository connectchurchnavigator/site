import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChurchDetail from './pages/ChurchDetail';
import WorshipLeaders from './pages/WorshipLeaders';
import MediaTeam from './pages/MediaTeam';
import Events from './pages/Events';
import PatternIntelligence from './pages/PatternIntelligence';
import ChurnAnalysis from './pages/ChurnAnalysis';
import Benchmarking from './pages/Benchmarking';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/church/:slug" element={<ChurchDetail />} />
        <Route path="/worship-leaders" element={<WorshipLeaders />} />
        <Route path="/media-team" element={<MediaTeam />} />
        <Route path="/events" element={<Events />} />
        <Route path="/tools/pattern-intelligence/:churchSlug" element={<PatternIntelligence />} />
        <Route path="/tools/visitor-journey/:churchSlug" element={<ChurnAnalysis />} />
        <Route path="/tools/benchmarking/:churchSlug" element={<Benchmarking />} />
      </Routes>
    </BrowserRouter>
  );
}