import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Tag } from 'lucide-react';

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

const EventCard = ({ event }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const coverImage = event.cover_image || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-event.jpg';
  const isPastEvent = new Date(event.end_date || event.start_date) < new Date();

  return (
    <Link to={`/event/${event.slug}`} className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative h-48">
        <img src={coverImage} alt={event.title} className="w-full h-full object-cover" />
        {isPastEvent && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white px-4 py-2 rounded-lg font-medium text-gray-900">Past Event</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventTypeColors[event.event_type] || eventTypeColors.other}`}>
            {event.event_type?.replace('_', ' ').toUpperCase()}
          </span>
          {event.is_free && <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">FREE</span>}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
        <p className="text-sm text-gray-600 mb-3">{event.church_name}</p>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            <span>{formatDate(event.start_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{formatTime(event.start_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{event.city}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;