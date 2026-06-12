import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import ChurchDetailPage from './pages/ChurchDetailPage';
import PlannerLivePage from './pages/PlannerLivePage';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/church/:slug" element={<ChurchDetailPage />} />
        <Route path="/planner/:shareToken" element={<PlannerLivePage />} />
      </Routes>
    </Router>
  );
}

export default App;
