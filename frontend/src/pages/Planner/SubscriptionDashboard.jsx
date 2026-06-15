import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Calendar, TrendingUp, Download, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const SubscriptionDashboard = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await api.get('/planner/subscription-status');
      setSubscription(response.data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.post('/planner/cancel-subscription');
      setShowCancelModal(false);
      loadSubscription();
    } catch (error) {
      console.error('Failed to cancel:', error);
      alert('Failed to cancel subscription. Please try again.');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!subscription) return <div className="p-8 text-center">No subscription found</div>;

  const tierNames = { free: 'Free', standard: 'Standard', premium: 'Premium', denomination: 'Denomination' };
  const tierColors = { free: 'gray', standard: 'purple', premium: 'yellow', denomination: 'blue' };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Planner Subscription</h1>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Crown className={`w-8 h-8 text-${tierColors[subscription.tier]}-600`} />
            <div>
              <h2 className="text-2xl font-bold">{tierNames[subscription.tier]}</h2>
              {subscription.tier !== 'free' && (
                <p className="text-gray-600">£{subscription.tier === 'standard' ? '9' : '19'}/month</p>
              )}
            </div>
          </div>
          {subscription.tier !== 'free' && subscription.subscription.current_period_end && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Next renewal</p>
              <p className="font-semibold">
                {new Date(subscription.subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {subscription.subscription.cancel_at_period_end && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Subscription Ending</p>
              <p className="text-sm text-yellow-700">Your subscription will end on {new Date(subscription.subscription.current_period_end).toLocaleDateString('en-GB')}. You'll be moved to the Free tier.</p>
            </div>
          </div>
        )}

        {subscription.tier === 'free' && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">Visit requests used: {subscription.usage.visit_requests_this_month}/3 this month</p>
            {subscription.usage.visit_requests_reset_date && (
              <p className="text-sm text-gray-600 mt-1">
                Resets on {new Date(subscription.usage.visit_requests_reset_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
        )}

        {subscription.tier !== 'free' && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">Visit requests: Unlimited</p>
          </div>
        )}

        <div className="flex gap-3">
          {subscription.tier === 'free' && (
            <button onClick={() => navigate('/planner/pricing')} className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
              Upgrade to Standard
            </button>
          )}
          {subscription.tier === 'standard' && (
            <button onClick={() => navigate('/planner/pricing')} className="flex-1 bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700">
              Upgrade to Premium
            </button>
          )}
          {subscription.tier !== 'free' && !subscription.subscription.cancel_at_period_end && (
            <button onClick={() => setShowCancelModal(true)} className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300">
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Before you go...</h3>
            <p className="text-gray-600 mb-6">We'd hate to lose you. How about Planner {tierNames[subscription.tier]} for £{subscription.tier === 'standard' ? '7' : '15'}/month? That's 22% off, locked in for 6 months.</p>
            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300">
                Cancel Anyway
              </button>
              <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
                Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard;
