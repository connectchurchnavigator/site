import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const RecommendedEvents = ({ userId, limit = 5 }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(`${API_BASE}/api/recommendations/events`, {
          params: { limit },
          headers: { Authorization: `Bearer ${token}` }
        });
        setRecommendations(response.data);
      } catch (err) {
        setError('Failed to load recommendations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, limit]);

  if (!userId || loading) return null;
  if (error) return null;
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Recommended for You</h2>
      <div className="space-y-4">
        {recommendations.map((event) => (
          <Link
            key={event._id}
            to={`/events/${event._id}`}
            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-800 mb-1">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{event.church_name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(event.start_date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {event.city}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecommendedEvents;
