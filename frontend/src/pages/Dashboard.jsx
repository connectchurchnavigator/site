import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import RecommendedEvents from '../components/RecommendedEvents';
import { Users, Calendar, BarChart3, Heart } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/users/${user.id}/stats`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Welcome back, {user?.name || 'User'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Heart className="w-6 h-6" />}
          label="Churches Following"
          value={stats?.followed_churches || 0}
          color="bg-red-500"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6" />}
          label="Events Registered"
          value={stats?.registered_events || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Churches Visited"
          value={stats?.visited_churches || 0}
          color="bg-green-500"
        />
        <StatCard
          icon={<BarChart3 className="w-6 h-6" />}
          label="Total Interactions"
          value={stats?.total_interactions || 0}
          color="bg-purple-500"
        />
      </div>

      <div className="space-y-8">
        {user && <RecommendedEvents userId={user.id} />}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <div className={`${color} text-white p-3 rounded-lg`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-600 mt-1">{label}</p>
  </div>
);

export default Dashboard;
