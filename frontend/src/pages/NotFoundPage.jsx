import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Home, Calendar, MapPin, Wrench, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/churches?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const popularLinks = [
    { icon: Home, label: 'Browse Churches', path: '/churches', color: 'bg-purple-100 text-purple-600' },
    { icon: Calendar, label: 'Upcoming Events', path: '/events', color: 'bg-blue-100 text-blue-600' },
    { icon: MapPin, label: 'Find Nearby', path: '/churches?nearby=true', color: 'bg-green-100 text-green-600' },
    { icon: Wrench, label: 'Service Planner', path: '/planner', color: 'bg-orange-100 text-orange-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex items-center justify-center px-4">
      <Helmet>
        <title>404 - Page Not Found | ChurchNavigator</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="inline-block relative">
            <h1 className="text-9xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              404
            </h1>
            <div className="absolute -top-4 -right-4 text-6xl animate-bounce">🙏</div>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          This Page Took a Different Path
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          The page you're looking for seems to have wandered off. Don't worry — we'll help you find your way back to discovering churches, events, and faith resources across the UK.
        </p>

        <form onSubmit={handleSearch} className="mb-12">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for churches, events, or locations..."
              className="w-full pl-12 pr-4 py-4 rounded-lg border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-gray-900 placeholder-gray-400 shadow-lg"
            />
          </div>
        </form>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Popular Destinations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {popularLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  key={index}
                  to={link.path}
                  className="group p-4 rounded-lg bg-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className={`w-12 h-12 rounded-full ${link.color} mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg font-medium"
          >
            <Home className="w-5 h-5" />
            Return Home
          </Link>
        </div>

        <p className="mt-12 text-sm text-gray-500">
          Need help? <a href="mailto:support@churchnavigator.com" className="text-purple-600 hover:text-purple-700 font-medium">Contact our support team</a>
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;