import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CalendarDays, Clock, MapPin, ExternalLink, Share2, Ticket, Users, Globe } from 'lucide-react';
import EventCard from '../components/EventCard';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const eventTypeColors = {
  conference: 'bg-purple-100 text-purple-800',
  concert: 'bg-pink-100 text-pink-800',
  prayer_meeting: 'bg-blue-100 text-blue-800',
  worship_night: 'bg-indigo-100 text-indigo-800',
  youth_event: 'bg-green-100 text-green-800',
  bible_study: 'bg-yellow-100 text-yellow-800',
  outreach: 'bg-orange-100 text-orange-800',
  social: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-800'
};

const EventDetailPage = () => {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/events/${slug}`);
        if (!response.ok) throw new Error('Event not found');
        const data = await response.json();
        setEvent(data);

        if (data.church_id) {
          const relatedRes = await fetch(`${API_URL}/api/events?church_id=${data.church_id}&limit=3`);
          if (relatedRes.ok) {
            const relatedData = await relatedRes.json();
            setRelatedEvents(relatedData.events.filter(e => e._id !== data._id));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `${event.title} - ${formatDate(event.start_date)}`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <Link to="/events" className="text-blue-600 hover:text-blue-700">Browse all events</Link>
        </div>
      </div>
    );
  }

  const coverImage = event.cover_image || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-event.jpg';
  const isPastEvent = new Date(event.end_date || event.start_date) < new Date();

  return (
    <>
      <Helmet>
        <title>{event.title} | ChurchNavigator</title>
        <meta name="description" content={event.description?.substring(0, 160)} />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={event.description?.substring(0, 160)} />
        <meta property="og:image" content={coverImage} />
        <meta property="og:type" content="event" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="relative h-96 bg-gray-900">
          <img src={coverImage} alt={event.title} className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${eventTypeColors[event.event_type] || eventTypeColors.other}`}>
                  {event.event_type?.replace('_', ' ').toUpperCase()}
                </span>
                {event.is_free && <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">FREE</span>}
                {event.is_online && <span className="px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-800">ONLINE</span>}
                {isPastEvent && <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">PAST EVENT</span>}
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">{event.title}</h1>
              <p className="text-white/90 text-lg">{event.church_name}</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4">Event Details</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                </div>
              </div>

              {event.organiser_name && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Organiser
                  </h2>
                  <p className="text-lg font-medium text-gray-900">{event.organiser_name}</p>
                  {event.organiser_email && (
                    <a href={`mailto:${event.organiser_email}`} className="text-blue-600 hover:text-blue-700">
                      {event.organiser_email}
                    </a>
                  )}
                  {event.organiser_phone && (
                    <p className="text-gray-600 mt-1">{event.organiser_phone}</p>
                  )}
                </div>
              )}

              {relatedEvents.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-4">More Events from {event.church_name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relatedEvents.map(relatedEvent => (
                      <EventCard key={relatedEvent._id} event={relatedEvent} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(event.start_date)}</p>
                      {event.end_date && event.end_date !== event.start_date && (
                        <p className="text-sm text-gray-600">to {formatDate(event.end_date)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{formatTime(event.start_time)}</p>
                      {event.end_time && (
                        <p className="text-sm text-gray-600">to {formatTime(event.end_time)}</p>
                      )}
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{event.location}</p>
                        <p className="text-sm text-gray-600">{event.city}</p>
                      </div>
                    </div>
                  )}

                  {event.is_online && event.online_link && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-gray-600 mt-0.5" />
                      <a href={event.online_link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Join Online <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {!isPastEvent && event.registration_link && (
                  <a href={event.registration_link} target="_blank" rel="noopener noreferrer" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-center mb-3 flex items-center justify-center gap-2">
                    <Ticket className="w-5 h-5" />
                    {event.is_free ? 'Register Now' : 'Get Tickets'}
                  </a>
                )}

                <button onClick={handleShare} className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Share Event
                </button>

                {event.church_slug && (
                  <Link to={`/church/${event.church_slug}`} className="block text-center text-blue-600 hover:text-blue-700 mt-4">
                    View Church Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EventDetailPage;