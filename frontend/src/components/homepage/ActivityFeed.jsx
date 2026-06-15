import React, { useEffect, useState } from 'react';
import { Church, Calendar, Users, Star, QrCode, Trophy, Map, UserPlus } from 'lucide-react';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const response = await api.get('/homepage/activity?limit=20');
      setActivities(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading activity feed:', error);
      setLoading(false);
    }
  };

  const getIcon = (iconName) => {
    const icons = {
      church: Church,
      calendar: Calendar,
      users: Users,
      star: Star,
      qrcode: QrCode,
      trophy: Trophy,
      map: Map,
      person: UserPlus
    };
    return icons[iconName] || Church;
  };

  const getColorClasses = (color) => {
    const colors = {
      lavender: 'bg-purple-100 text-purple-600',
      cyan: 'bg-cyan-100 text-cyan-600',
      green: 'bg-green-100 text-green-600',
      amber: 'bg-amber-100 text-amber-600',
      teal: 'bg-teal-100 text-teal-600',
      gold: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
      blue: 'bg-blue-100 text-blue-600'
    };
    return colors[color] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Live Platform Activity</h2>
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = getIcon(activity.icon);
              const colorClasses = getColorClasses(activity.color);
              
              return (
                <div key={activity._id || index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition animate-fade-in">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{activity.title}</h3>
                    <p className="text-gray-600 text-sm mb-1">{activity.subtitle}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActivityFeed;