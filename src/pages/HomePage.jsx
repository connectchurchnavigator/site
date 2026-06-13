import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Church, Users, Music, Video, Calendar, GraduationCap, Search, ChevronRight } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const CountUpNumber = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
};

const HomePage = () => {
  const [featuredChurches, setFeaturedChurches] = useState([]);
  const [weekendEvents, setWeekendEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [churchesRes, eventsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/churches?featured=true&limit=6`),
          fetch(`${API_BASE}/api/events?date_from=this_saturday&date_to=next_sunday&limit=4`),
          fetch(`${API_BASE}/api/stats`)
        ]);

        const [churchesData, eventsData, statsData] = await Promise.all([
          churchesRes.json(),
          eventsRes.json(),
          statsRes.json()
        ]);

        setFeaturedChurches(churchesData.churches || []);
        setWeekendEvents(eventsData.events || []);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const listingTypes = [
    { icon: Church, label: 'Churches', count: stats?.churches || 0, link: '/churches' },
    { icon: Users, label: 'Pastors', count: stats?.pastors || 0, link: '/pastors' },
    { icon: Music, label: 'Worship Leaders', count: stats?.worship_leaders || 0, link: '/worship-leaders' },
    { icon: Video, label: 'Media Teams', count: stats?.media_teams || 0, link: '/media-teams' },
    { icon: Calendar, label: 'Events', count: stats?.events || 0, link: '/events' },
    { icon: GraduationCap, label: 'Bible Colleges', count: stats?.bible_colleges || 0, link: '/bible-colleges' }
  ];

  const steps = [
    {
      number: '1',
      title: 'Search or browse 29,000+ UK churches',
      description: 'Find churches by location, denomination, or style of worship'
    },
    {
      number: '2',
      title: 'Discover events, pastors & ministry resources',
      description: 'Connect with worship leaders, media teams, and local events'
    },
    {
      number: '3',
      title: 'Connect, register & grow together',
      description: 'Join a community and strengthen your faith journey'
    }
  ];

  const testimonials = [
    {
      quote: "ChurchNavigator helped us find the perfect church for our family when we moved to Manchester. The detailed listings made all the difference.",
      author: "Sarah M.",
      location: "Manchester"
    },
    {
      quote: "As a worship leader, I love being able to connect with other churches and share resources. This platform is exactly what the UK church community needed.",
      author: "David T.",
      location: "Birmingham"
    },
    {
      quote: "The events section keeps us updated on what's happening across different churches in our area. It's brilliant for building connections.",
      author: "Rebecca L.",
      location: "London"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Discover Churches Across the UK</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">Connect with your local faith community, find events, and explore ministry opportunities</p>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-2 flex items-center">
              <Search className="text-gray-400 ml-3" size={20} />
              <input
                type="text"
                placeholder="Search by church name, city, or postcode..."
                className="flex-1 px-4 py-3 text-gray-800 outline-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    window.location.href = `/churches?search=${e.target.value}`;
                  }
                }}
              />
              <Link
                to="/churches"
                className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition"
              >
                Search
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* UK Stats Counter Band */}
      <div className="bg-purple-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">
                <CountUpNumber target={29000} suffix="+" />
              </div>
              <div className="text-purple-200">Churches across the UK</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">Built for faith</div>
              <div className="text-purple-200">Supporting the church community</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">Free to discover</div>
              <div className="text-purple-200">No cost, no barriers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Churches */}
      {featuredChurches.length > 0 && (
        <div className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Featured Churches</h2>
              <Link to="/churches" className="text-purple-600 hover:text-purple-700 flex items-center gap-2">
                View all <ChevronRight size={20} />
              </Link>
            </div>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
                {featuredChurches.map((church) => (
                  <Link
                    key={church._id}
                    to={`/church/${church._id}`}
                    className="flex-shrink-0 w-80 bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden"
                  >
                    {church.image_url && (
                      <img
                        src={church.image_url}
                        alt={church.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold mb-2 text-gray-800">{church.name}</h3>
                      <p className="text-gray-600 mb-2">{church.city}</p>
                      {church.denomination && (
                        <span className="inline-block bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                          {church.denomination}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekend Events */}
      {weekendEvents.length > 0 && (
        <div className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Happening This Weekend</h2>
              <Link to="/events" className="text-purple-600 hover:text-purple-700 flex items-center gap-2">
                View all events <ChevronRight size={20} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {weekendEvents.map((event) => (
                <div key={event._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Calendar className="text-purple-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-gray-800">{event.title}</h3>
                      <p className="text-gray-600 mb-2">{new Date(event.event_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      {event.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Listing Type Explorer */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Explore by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {listingTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Link
                  key={type.label}
                  to={type.link}
                  className="bg-purple-50 rounded-lg p-6 text-center hover:bg-purple-100 transition group"
                >
                  <Icon className="mx-auto mb-3 text-purple-600 group-hover:scale-110 transition" size={32} />
                  <h3 className="font-semibold text-gray-800 mb-1">{type.label}</h3>
                  <p className="text-2xl font-bold text-purple-600">{type.count}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">What People Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-purple-50 rounded-lg p-8">
                <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                <div className="font-semibold text-gray-800">{testimonial.author}</div>
                <div className="text-gray-600 text-sm">{testimonial.location}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8">Join thousands discovering faith communities across the UK</p>
          <Link
            to="/churches"
            className="inline-block bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Explore Churches Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;