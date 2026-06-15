import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const EventRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/recommendations/events/${user._id}?limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) return null;
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <Link
            key={rec.event_id}
            to={`/events/${rec.event_id}`}
            className="block p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold text-lg">{rec.title}</h3>
            <p className="text-gray-600 text-sm">{rec.church_name}</p>
            <p className="text-gray-500 text-sm mt-1">
              {new Date(rec.start_date).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default EventRecommendations;