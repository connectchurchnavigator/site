import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import EventCard from '../components/EventCard';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [featuredEvents, setFeaturedEvents] = useState([]);

  useEffect(() => {
    const fetchFeaturedEvents = async () => {
      try {
        const response = await fetch(`${API_URL}/api/events?limit=3&upcoming=true`);
        if (response.ok) {
          const data = await response.json();
          setFeaturedEvents(data.events || []);
        }
      } catch (err) {
        console.error('Error fetching featured events:', err);
      }
    };
    fetchFeaturedEvents();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (location) params.append('city', location);
    window.location.href = `/churches?${params.toString()}`;
  };

  return (
    <>
      <Helmet>
        <title>ChurchNavigator - Find Churches Across the UK</title>
        <meta name="description" content="Discover churches, worship leaders, media teams, and Christian events across the UK. Your comprehensive church directory." />
      </Helmet>

      <div className="min-h-screen">
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-6">Find Your Spiritual Home</h1>
            <p className="text-xl mb-8 text-blue-100">Discover churches, events, and ministry opportunities across the UK</p>
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-2 flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2 px-4">
                <Search className="text-gray-400" />
                <input type="text" placeholder="Search churches, denominations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 py-3 text-gray-900 placeholder-gray-500 focus:outline-none" />
              </div>
              <div className="flex-1 flex items-center gap-2 px-4 border-t md:border-t-0 md:border-l border-gray-200">
                <MapPin className="text-gray-400" />
                <input type="text" placeholder="Location (city, postcode)" value={location} onChange={(e) => setLocation(e.target.value)} className="flex-1 py-3 text-gray-900 placeholder-gray-500 focus:outline-none" />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors">
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What You Can Find</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Churches</h3>
                <p className="text-gray-600 mb-4">Browse thousands of churches across the UK with detailed profiles, service times, and contact information.</p>
                <Link to="/churches" className="text-blue-600 hover:text-blue-700 font-medium">Explore Churches →</Link>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Events</h3>
                <p className="text-gray-600 mb-4">Discover conferences, concerts, prayer meetings, and other Christian events happening near you.</p>
                <Link to="/events" className="text-purple-600 hover:text-purple-700 font-medium">View Events →</Link>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Ministry Opportunities</h3>
                <p className="text-gray-600 mb-4">Find worship leaders, media teams, and other ministry roles to serve in your local church.</p>
                <Link to="/churches" className="text-green-600 hover:text-green-700 font-medium">Get Involved →</Link>
              </div>
            </div>
          </div>
        </section>

        {featuredEvents.length > 0 && (
          <section className="py-16 bg-white">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Upcoming Events</h2>
                <Link to="/events" className="text-blue-600 hover:text-blue-700 font-medium">View All Events →</Link>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {featuredEvents.map(event => <EventCard key={event._id} event={event} />)}
              </div>
            </div>
          </section>
        )}

        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Join the ChurchNavigator Community</h2>
            <p className="text-xl text-blue-100 mb-8">Help us grow the UK's most comprehensive church directory</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact" className="bg-white text-blue-600 hover:bg-blue-50 font-medium px-8 py-3 rounded-lg transition-colors">List Your Church</Link>
              <Link to="/contact" className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-8 py-3 rounded-lg transition-colors">Get in Touch</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;