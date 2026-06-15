import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Church, Calendar, Users, Music, Video, GraduationCap, MapPin, Star, Trophy, QrCode, UserPlus, TrendingUp } from 'lucide-react';
import ActivityFeed from '../components/homepage/ActivityFeed';
import StatsCounter from '../components/homepage/StatsCounter';
import EventCard from '../components/EventCard';
import ChurchCard from '../components/ChurchCard';
import api from '../services/api';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('curated');
  const [stats, setStats] = useState(null);
  const [counts, setCounts] = useState(null);
  const [featuredChurches, setFeaturedChurches] = useState([]);
  const [weekendEvents, setWeekendEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomepageData();
  }, []);

  const loadHomepageData = async () => {
    try {
      const [modeRes, statsRes, countsRes] = await Promise.all([
        api.get('/homepage/mode'),
        api.get('/homepage/stats'),
        api.get('/homepage/counts')
      ]);

      setMode(modeRes.data.mode);
      setStats(statsRes.data);
      setCounts(countsRes.data);

      if (modeRes.data.mode === 'curated') {
        const [churchesRes, eventsRes] = await Promise.all([
          api.get('/churches?is_featured=true&limit=6'),
          api.get('/events?limit=6&status=published')
        ]);
        setFeaturedChurches(churchesRes.data.churches || []);
        setWeekendEvents(eventsRes.data.events || []);
      } else {
        const eventsRes = await api.get('/events?limit=6&status=published');
        setWeekendEvents(eventsRes.data.events || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading homepage:', error);
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const listingTypes = [
    { icon: Church, label: 'Churches', count: counts?.churches || 0, color: 'from-purple-500 to-indigo-600', link: '/churches' },
    { icon: Users, label: 'Pastors', count: counts?.pastors || 0, color: 'from-blue-500 to-cyan-600', link: '/pastors' },
    { icon: Music, label: 'Worship Leaders', count: counts?.worship_leaders || 0, color: 'from-pink-500 to-rose-600', link: '/worship-leaders' },
    { icon: Video, label: 'Media Teams', count: counts?.media_teams || 0, color: 'from-teal-500 to-emerald-600', link: '/media-teams' },
    { icon: Calendar, label: 'Events', count: counts?.events || 0, color: 'from-orange-500 to-amber-600', link: '/events' },
    { icon: GraduationCap, label: 'Bible Colleges', count: counts?.bible_colleges || 0, color: 'from-indigo-500 to-purple-600', link: '/bible-colleges' }
  ];

  const testimonials = [
    { text: "I found 12 Telugu-speaking churches in Birmingham I never knew existed. ChurchNavigator is incredible.", author: "Pastor Ravi Kumar", location: "Birmingham" },
    { text: "We got 340 registrations for our healing night through ChurchNavigator. The QR check-in made it seamless.", author: "Sarah Mensah", location: "London Gospel Conference" },
    { text: "The Ministry Trip Planner saved me 3 days of WhatsApp coordination. Everything was confirmed in 2 hours.", author: "Bishop Emmanuel Adewale", location: "UK Ministry Tour" }
  ];

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Discover Churches Across the UK</h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100">29,000+ churches, pastors, events and ministries — all in one place. Free to explore.</p>
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex flex-col md:flex-row gap-3 max-w-2xl mx-auto">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search churches, pastors, events..." className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <button type="submit" className="bg-white text-purple-900 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition">Search</button>
              </div>
            </form>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/churches" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition backdrop-blur-sm">Churches</Link>
              <Link to="/events" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition backdrop-blur-sm">Events</Link>
              <Link to="/pastors" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition backdrop-blur-sm">Pastors</Link>
              <Link to="/worship-leaders" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition backdrop-blur-sm">Worship Leaders</Link>
              <Link to="/planner" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition backdrop-blur-sm">Planner</Link>
            </div>
          </div>
        </div>
      </section>

      {stats && <StatsCounter stats={stats} />}

      {mode === 'live' && <ActivityFeed />}

      {mode === 'curated' && featuredChurches.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Featured Churches</h2>
              <Link to="/churches" className="text-purple-600 hover:text-purple-700 font-semibold">View all →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredChurches.map(church => <ChurchCard key={church._id} church={church} />)}
            </div>
          </div>
        </section>
      )}

      {weekendEvents.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Events This Weekend</h2>
              <Link to="/events" className="text-purple-600 hover:text-purple-700 font-semibold">View all →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weekendEvents.map(event => <EventCard key={event._id} event={event} />)}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Explore by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {listingTypes.map(({ icon: Icon, label, count, color, link }) => (
              <Link key={label} to={link} className={`bg-gradient-to-br ${color} text-white p-6 rounded-xl hover:scale-105 transition transform shadow-lg`}>
                <Icon size={32} className="mb-3" />
                <h3 className="font-semibold text-lg mb-1">{label}</h3>
                <p className="text-2xl font-bold">{count.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-purple-600" size={32} />
              </div>
              <h3 className="font-semibold text-xl mb-2">Search</h3>
              <p className="text-gray-600">Search 29,000+ UK churches, events and ministries</p>
            </div>
            <div className="text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-indigo-600" size={32} />
              </div>
              <h3 className="font-semibold text-xl mb-2">Discover</h3>
              <p className="text-gray-600">Discover pastors, worship leaders, Bible colleges and more</p>
            </div>
            <div className="text-center">
              <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-pink-600" size={32} />
              </div>
              <h3 className="font-semibold text-xl mb-2">Connect</h3>
              <p className="text-gray-600">Register for events, plan ministry trips and grow together</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Planning a ministry trip?</h2>
          <p className="text-xl mb-8 text-purple-100 max-w-2xl mx-auto">Our AI Planner finds the right churches, checks availability, handles invitations and builds your complete itinerary.</p>
          <Link to="/planner" className="inline-block bg-white text-purple-900 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition text-lg">Start Planning Free →</Link>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What People Are Saying</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="text-amber-400 fill-current" size={20} />)}
                </div>
                <p className="text-gray-700 mb-4 italic">"{t.text}"</p>
                <p className="font-semibold text-gray-900">{t.author}</p>
                <p className="text-sm text-gray-600">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;