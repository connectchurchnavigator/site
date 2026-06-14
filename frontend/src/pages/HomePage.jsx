import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Church, User, Music, Video, Calendar, GraduationCap, MapPin, Users, Heart } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const CountUp = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          animate();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const HomePage = () => {
  const [featuredChurches, setFeaturedChurches] = useState([]);
  const [weekendEvents, setWeekendEvents] = useState([]);
  const [listingCounts, setListingCounts] = useState({
    churches: 0,
    pastors: 0,
    worshipLeaders: 0,
    mediaTeams: 0,
    events: 0,
    colleges: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [churchesRes, eventsRes, countsRes] = await Promise.all([
          fetch(`${API_BASE}/api/churches?featured=true&limit=6`),
          fetch(`${API_BASE}/api/events/weekend?limit=4`),
          fetch(`${API_BASE}/api/stats/counts`)
        ]);

        if (churchesRes.ok) {
          const data = await churchesRes.json();
          setFeaturedChurches(data.churches || []);
        }

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setWeekendEvents(data.events || []);
        }

        if (countsRes.ok) {
          const data = await countsRes.json();
          setListingCounts(data);
        }
      } catch (err) {
        console.error('Error fetching homepage data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-700 to-purple-900 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Discover Churches Across the UK
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-purple-100">
            Connect with thousands of churches, events, and ministry opportunities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/churches"
              className="bg-white text-purple-700 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition inline-block"
            >
              Browse Churches
            </Link>
            <Link
              to="/submit"
              className="bg-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-purple-500 transition inline-block border-2 border-white"
            >
              List Your Church
            </Link>
          </div>
        </div>
      </section>

      {/* UK Stats Counter Band */}
      <section className="bg-purple-800 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">
                <CountUp end={29000} suffix="+" />
              </div>
              <div className="text-purple-200 text-lg">Churches across the UK</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">
                <Heart className="inline-block w-12 h-12" />
              </div>
              <div className="text-purple-200 text-lg">Built for the faith community</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">Free</div>
              <div className="text-purple-200 text-lg">To discover & connect</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Churches */}
      {featuredChurches.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-gray-900">Featured Churches</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
                {featuredChurches.map((church) => (
                  <Link
                    key={church._id}
                    to={`/churches/${church.slug || church._id}`}
                    className="flex-shrink-0 w-80 bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition group"
                  >
                    <div className="h-48 bg-gradient-to-br from-purple-400 to-purple-600 relative overflow-hidden">
                      {church.image_url ? (
                        <img
                          src={church.image_url}
                          alt={church.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Church className="w-20 h-20 text-white opacity-50" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-purple-700 transition">
                        {church.name}
                      </h3>
                      {church.denomination && (
                        <p className="text-sm text-purple-600 mb-2">{church.denomination}</p>
                      )}
                      {church.address && (
                        <p className="text-sm text-gray-600 flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{church.address.city || church.address.town}, {church.address.postcode}</span>
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Weekend Events */}
      {weekendEvents.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-gray-900">Happening This Weekend</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {weekendEvents.map((event) => (
                <Link
                  key={event._id}
                  to={`/events/${event._id}`}
                  className="bg-purple-50 rounded-xl p-6 hover:bg-purple-100 transition border-2 border-purple-200 hover:border-purple-400"
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-purple-600 rounded-lg flex flex-col items-center justify-center text-white">
                        <div className="text-xs uppercase">
                          {new Date(event.start_date).toLocaleDateString('en-GB', { month: 'short' })}
                        </div>
                        <div className="text-2xl font-bold">
                          {new Date(event.start_date).getDate()}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 text-gray-900">{event.title}</h3>
                      {event.church_name && (
                        <p className="text-sm text-purple-700 mb-1">{event.church_name}</p>
                      )}
                      {event.location && (
                        <p className="text-sm text-gray-600">{event.location}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Listing Type Explorer */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-gray-900 text-center">Explore Directory</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Church, label: 'Churches', count: listingCounts.churches, link: '/churches' },
              { icon: User, label: 'Pastors', count: listingCounts.pastors, link: '/pastors' },
              { icon: Music, label: 'Worship Leaders', count: listingCounts.worshipLeaders, link: '/worship-leaders' },
              { icon: Video, label: 'Media Teams', count: listingCounts.mediaTeams, link: '/media-teams' },
              { icon: Calendar, label: 'Events', count: listingCounts.events, link: '/events' },
              { icon: GraduationCap, label: 'Bible Colleges', count: listingCounts.colleges, link: '/colleges' }
            ].map((item) => (
              <Link
                key={item.label}
                to={item.link}
                className="bg-white rounded-xl p-6 text-center hover:shadow-xl transition border-2 border-gray-100 hover:border-purple-400 group"
              >
                <item.icon className="w-12 h-12 mx-auto mb-3 text-purple-600 group-hover:text-purple-700" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {item.count.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 group-hover:text-purple-700">{item.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-gray-900 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Search or Browse',
                description: 'Explore 29,000+ UK churches by location, denomination, or ministry type'
              },
              {
                step: '2',
                title: 'Discover Resources',
                description: 'Find events, pastors, worship leaders, media teams & Bible colleges'
              },
              {
                step: '3',
                title: 'Connect & Grow',
                description: 'Register your interest, attend events, and build faith community connections'
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-gray-900 text-center">What People Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "ChurchNavigator helped me find a vibrant church community when I moved to Manchester. The directory made it so easy to explore options.",
                author: "Sarah Mitchell",
                role: "London"
              },
              {
                quote: "As a worship leader, I love being able to connect with other churches and find ministry opportunities across the UK.",
                author: "David Thompson",
                role: "Worship Leader, Birmingham"
              },
              {
                quote: "Finally, a comprehensive UK church directory that's easy to use and keeps growing. We've listed our events and seen real engagement.",
                author: "Pastor James Roberts",
                role: "Lead Pastor, Edinburgh"
              }
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                <p className="text-gray-700 mb-4 italic leading-relaxed">"{testimonial.quote}"</p>
                <div className="border-t-2 border-purple-200 pt-4">
                  <div className="font-bold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-purple-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-purple-700 to-purple-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-purple-100">
            Join thousands discovering and connecting with UK churches
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/churches"
              className="bg-white text-purple-700 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition inline-block"
            >
              Explore Churches
            </Link>
            <Link
              to="/submit"
              className="bg-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-purple-500 transition inline-block border-2 border-white"
            >
              List Your Ministry
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;