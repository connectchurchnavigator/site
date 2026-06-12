import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

const HomePage = lazy(() => import('./pages/HomePage'));
const ChurchListPage = lazy(() => import('./pages/ChurchListPage'));
const ChurchDetailPage = lazy(() => import('./pages/ChurchDetailPage'));
const PastorListPage = lazy(() => import('./pages/PastorListPage'));
const PastorDetailPage = lazy(() => import('./pages/PastorDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/churches" element={<ChurchListPage />} />
              <Route path="/church/:slug" element={<ChurchDetailPage />} />
              <Route path="/pastors" element={<PastorListPage />} />
              <Route path="/pastor/:slug" element={<PastorDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;