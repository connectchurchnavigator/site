import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, Users, FileText, Calendar, MapPin, Zap } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const PlannerSubscription = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [subRes, usageRes] = await Promise.all([
        axios.get(`${API_URL}/api/planner/subscription-status`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/planner/usage-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSubscription(subRes.data);
      setUsage(usageRes.data);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    setCanceling(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/planner/cancel-subscription`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Subscription will cancel at the end of your billing period.');
      loadSubscriptionData();
    } catch (error) {
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-xl">Loading...</div></div>;
  }

  const tierLabels = { free: 'Free', standard: 'Standard', premium: 'Premium', denomination: 'Denomination' };
  const tierPrices = { free: '£0', standard: '£9', premium: '£19' };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Planner Subscription</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{tierLabels[subscription.tier]} Plan</h2>
              <p className="text-3xl font-bold text-purple-600 mt-2">{tierPrices[subscription.tier]}<span className="text-lg text-gray-600">/month</span></p>
              {subscription.tier !== 'free' && subscription.current_period_end && (
                <p className="text-gray-600 mt-2">Next renewal: {new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              )}
              {subscription.cancel_at_period_end && (
                <p className="text-red-600 font-semibold mt-2">Subscription will cancel on renewal date</p>
              )}
            </div>
            <div className="text-right">
              {subscription.tier === 'free' && (
                <button onClick={() => navigate('/planner/pricing')} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">Upgrade</button>
              )}
              {subscription.tier === 'standard' && (
                <div className="space-y-2">
                  <button onClick={() => navigate('/planner/pricing')} className="block w-full px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold">Upgrade to Premium</button>
                  <button onClick={handleCancel} disabled={canceling} className="block w-full px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel Subscription</button>
                </div>
              )}
              {subscription.tier === 'premium' && (
                <button onClick={handleCancel} disabled={canceling} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel Subscription</button>
              )}
            </div>
          </div>

          {subscription.tier === 'free' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="font-semibold mb-1">Visit requests used this month:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(subscription.visit_requests_used / subscription.visit_requests_limit) * 100}%` }}></div>
                </div>
                <span className="font-semibold">{subscription.visit_requests_used}/{subscription.visit_requests_limit}</span>
              </div>
              {subscription.reset_date && (
                <p className="text-sm text-gray-600 mt-2">Resets on {new Date(subscription.reset_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
              )}
            </div>
          )}
        </div>

        {usage && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Usage This Month</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-3xl font-bold">{usage.trips_created}</div>
                <div className="text-gray-600">Trips Created</div>
              </div>
              <div className="text-center">
                <MapPin className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-3xl font-bold">{usage.visit_requests_sent}</div>
                <div className="text-gray-600">Visit Requests Sent</div>
              </div>
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-3xl font-bold">{usage.visits_confirmed}</div>
                <div className="text-gray-600">Visits Confirmed</div>
              </div>
              <div className="text-center">
                <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-3xl font-bold">{usage.churches_reached}</div>
                <div className="text-gray-600">Churches Reached</div>
              </div>
              {subscription.tier !== 'free' && (
                <>
                  <div className="text-center">
                    <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold">{usage.ai_analyses_run}</div>
                    <div className="text-gray-600">AI Analyses Run</div>
                  </div>
                  <div className="text-center">
                    <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold">{usage.templates_used}</div>
                    <div className="text-gray-600">Templates Used</div>
                  </div>
                  <div className="text-center">
                    <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold">{usage.collaborators_added}</div>
                    <div className="text-gray-600">Collaborators Added</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlannerSubscription;