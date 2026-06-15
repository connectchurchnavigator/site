import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, User, Music, Video, GraduationCap, Church, TrendingUp, Star, Users, QrCode, Trophy, Map } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const HomePage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [mode, setMode] = useState('curated');
  const [activity, setActivity] = useState([]);
  const [counts, setCounts] = useState(null);
  const [featuredChurches, setFeaturedChurches] = useState([]);
  const [weekendEvents, setWeekendEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');

  useEffect(() => {
    fetchHomepageData();
    const interval = setInterval(() => {
      if (mode === 'live') {
        fetchActivity();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [mode]);

  const fetchHomepageData = async () => {
    try {
      const [statsRes, modeRes, countsRes, featuredRes, eventsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/homepage/stats`),
        axios.get(`${API_BASE}/api/homepage/mode`),
        axios.get(`${API_BASE}/api/homepage/counts`),
        axios.get(`${API_BASE}/api/churches?is_featured=true&limit=6`),
        axios.get(`${API_BASE}/api/events?limit=6&status=published`)
      ]);
      
      setStats(statsRes.data);
      setMode(modeRes.data.mode);
      setCounts(countsRes.data);
      setFeaturedChurches(featuredRes.data.churches || []);
      setWeekendEvents(eventsRes.data.events || []);
      
      if (modeRes.data.mode === 'live') {
        fetchActivity();
      }
    } catch (error) {
      console.error('Error fetching homepage data:', error);
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/homepage/activity?limit=20`);
      setActivity(res.data);
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
    }
  };

  const getActivityIcon = (icon) => {
    const iconMap = {
      church: Church,
      calendar: Calendar,
      users: Users,
      star: Star,
      qrcode: QrCode,
      trophy: Trophy,
      map: Map,
      person: User
    };
    const IconComponent = iconMap[icon] || TrendingUp;
    return <IconComponent className="w-5 h-5" />;
  };

  const getActivityColor = (color) => {
    const colorMap = {
      lavender: 'bg-purple-100 text-purple-600',
      cyan: 'bg-cyan-100 text-cyan-600',
      green: 'bg-green-100 text-green-600',
      amber: 'bg-amber-100 text-amber-600',
      teal: 'bg-teal-100 text-teal-600',
      gold: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
      blue: 'bg-blue-100 text-blue-600'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white py-24">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Discover Churches Across the UK</h1>
            <p className="text-xl md:text-2xl mb-12 text-purple-100">
              {stats ? `${stats.churches.toLocaleString()}+` : '29,000+'} churches, pastors, events and ministries — all in one place. Free to explore.
            </p>
            
            <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-2xl p-3 flex flex-col md:flex-row gap-3 max-w-3xl mx-auto">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="px-4 py-3 rounded-lg border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All</option>
                <option value="churches">Churches</option>
                <option value="events">Events</option>
                <option value="pastors">Pastors</option>
              </select>
              <input
                type="text"
                placeholder="Search churches, pastors, events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-6 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition">
                Search
              </button>
            </form>
            
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Link to="/churches" className="px-6 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition">Churches</Link>
              <Link to="/events" className="px-6 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition">Events</Link>
              <Link to="/pastors" className="px-6 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition">Pastors</Link>
              <Link to="/worship-leaders" className="px-6 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition">Worship Leaders</Link>
              <Link to="/planner" className="px-6 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition">Planner</Link>
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <section className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">{stats.churches.toLocaleString()}</div>
                <div className="text-purple-200">Churches</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">{stats.events}</div>
                <div className="text-purple-200">Events</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">{stats.cities}</div>
                <div className="text-purple-200">Cities</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">{stats.registered_users.toLocaleString()}</div>
                <div className="text-purple-200">Believers Connected</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {mode === 'live' && activity.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Live Platform Activity</h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {activity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className={`p-3 rounded-full ${getActivityColor(item.color)}`}>
                    {getActivityIcon(item.icon)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{item.title}</div>
                    <div className="text-gray-600 text-sm">{item.subtitle}</div>
                    <div className="text-gray-400 text-xs mt-1">{item.time_ago}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {weekendEvents.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Events This Weekend</h2>
              <Link to="/events" className="text-purple-600 hover:text-purple-700 font-semibold">View all →</Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weekendEvents.map((event) => (
                <Link key={event._id} to={`/events/${event._id}`} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                  <div className="flex items-start gap-2 text-purple-600 mb-3">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm">{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{event.name}</h3>
                  <div className="text-gray-600 text-sm mb-2">{event.location}</div>
                  <div className="text-purple-600 font-semibold">{event.price === 0 ? 'Free' : `£${event.price}`}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {counts && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Explore by Type</h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
              <Link to="/churches" className="bg-purple-50 hover:bg-purple-100 rounded-lg p-6 text-center transition">
                <Church className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                <div className="font-bold text-lg">{counts.churches.toLocaleString()}</div>
                <div className="text-gray-600 text-sm">Churches</div>
              </Link>
              <Link to="/pastors" className="bg-blue-50 hover:bg-blue-100 rounded-lg p-6 text-center transition">
                <User className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <div className="font-bold text-lg">{counts.pastors}</div>
                <div className="text-gray-600 text-sm">Pastors</div>
              </Link>
              <Link to="/worship-leaders" className="bg-cyan-50 hover:bg-cyan-100 rounded-lg p-6 text-center transition">
                <Music className="w-12 h-12 mx-auto mb-3 text-cyan-600" />
                <div className="font-bold text-lg">{counts.worship_leaders}</div>
                <div className="text-gray-600 text-sm">Worship Leaders</div>
              </Link>
              <Link to="/media-teams" className="bg-teal-50 hover:bg-teal-100 rounded-lg p-6 text-center transition">
                <Video className="w-12 h-12 mx-auto mb-3 text-teal-600" />
                <div className="font-bold text-lg">{counts.media_teams}</div>
                <div className="text-gray-600 text-sm">Media Teams</div>
              </Link>
              <Link to="/events" className="bg-amber-50 hover:bg-amber-100 rounded-lg p-6 text-center transition">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                <div className="font-bold text-lg">{counts.events}</div>
                <div className="text-gray-600 text-sm">Events</div>
              </Link>
              <Link to="/bible-colleges" className="bg-green-50 hover:bg-green-100 rounded-lg p-6 text-center transition">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <div className="font-bold text-lg">{counts.bible_colleges}</div>
                <div className="text-gray-600 text-sm">Bible Colleges</div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {featuredChurches.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Featured Churches</h2>
              <Link to="/churches" className="text-purple-600 hover:text-purple-700 font-semibold">View all →</Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredChurches.map((church) => (
                <Link key={church._id} to={`/churches/${church._id}`} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                  {church.image_url && (
                    <img src={church.image_url} alt={church.name} className="w-full h-48 object-cover" />
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-2">{church.name}</h3>
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{church.city}</span>
                    </div>
                    <div className="text-purple-600 text-sm">{church.denomination}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-xl mb-2">Search</h3>
              <p className="text-gray-600">Search 29,000+ UK churches, events and ministries</p>
            </div>
            <div className="text-center">
              <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="font-bold text-xl mb-2">Discover</h3>
              <p className="text-gray-600">Discover pastors, worship leaders, Bible colleges and more</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-xl mb-2">Connect</h3>
              <p className="text-gray-600">Register for events, plan ministry trips and grow together</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-purple-800 to-indigo-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Planning a Ministry Trip?</h2>
          <p className="text-xl mb-8 text-purple-100 max-w-2xl mx-auto">
            Our AI Planner finds the right churches, checks availability, handles invitations and builds your complete itinerary.
          </p>
          <Link to="/planner" className="inline-block bg-white text-purple-800 px-8 py-4 rounded-lg font-bold hover:bg-purple-50 transition text-lg">
            Start Planning Free →
          </Link>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">What People Are Saying</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-gray-700 mb-4">"I found 12 Telugu-speaking churches in Birmingham I never knew existed. ChurchNavigator is incredible."</p>
              <div className="font-semibold">— Pastor Ravi Kumar, Birmingham</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-gray-700 mb-4">"We got 340 registrations for our healing night through ChurchNavigator. The QR check-in made it seamless."</p>
              <div className="font-semibold">— Coordinator Sarah Mensah, London Gospel Conference</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-gray-700 mb-4">"The Ministry Trip Planner saved me 3 days of WhatsApp coordination. Everything was confirmed in 2 hours."</p>
              <div className="font-semibold">— Bishop Emmanuel Adewale, UK Ministry Tour</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;