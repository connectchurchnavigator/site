import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const PlannerPricing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (plan) => {
    setLoading(plan);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login?redirect=/planner/pricing');
        return;
      }
      const response = await axios.post(
        `${API_URL}/api/planner/subscribe`,
        { plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = response.data.checkout_url;
    } catch (error) {
      alert('Failed to start subscription. Please try again.');
      setLoading(null);
    }
  };

  const features = [
    { name: 'Browse 30,000+ churches', free: true, standard: true, premium: true },
    { name: 'Language filters', free: true, standard: true, premium: true },
    { name: 'Map view', free: true, standard: true, premium: true },
    { name: 'Draft trips', free: 'Unlimited', standard: 'Unlimited', premium: 'Unlimited' },
    { name: 'Visit requests', free: '3/month', standard: 'Unlimited', premium: 'Unlimited' },
    { name: 'Community templates', free: 'Read-only', standard: true, premium: true },
    { name: 'Basic PDF export', free: true, standard: false, premium: false },
    { name: 'Professional PDF', free: false, standard: true, premium: true },
    { name: 'AI Guided Planning', free: false, standard: true, premium: true },
    { name: 'Church Matching AI', free: false, standard: true, premium: true },
    { name: 'Create templates', free: false, standard: '5 templates', premium: 'Unlimited' },
    { name: 'Collaborators', free: '1', standard: '3', premium: 'Unlimited' },
    { name: 'Share formats', free: 'Link only', standard: 'All formats', premium: 'All formats' },
    { name: 'AI Intelligence Layer', free: false, standard: false, premium: true },
    { name: 'Conflict detection', free: false, standard: 'Basic', premium: 'Deep' },
    { name: 'Pre-visit briefings', free: false, standard: false, premium: true },
    { name: 'Impact prediction', free: false, standard: false, premium: true },
    { name: 'Post-trip analytics', free: false, standard: 'Summary', premium: 'Full report' },
    { name: 'WhatsApp integration', free: false, standard: false, premium: true },
    { name: 'Priority support', free: false, standard: false, premium: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ministry Trip Planner Pricing</h1>
          <p className="text-xl text-gray-600">Start free. Upgrade when you're ready.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-8">
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <div className="text-4xl font-bold mb-4">£0<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-6">For ministers planning occasional trips</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>3 visit requests/month</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Basic trip builder</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Community templates</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Basic PDF export</span></li>
            </ul>
            <button onClick={() => navigate('/planner')} className="w-full py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Get Started Free</button>
          </div>

          <div className="bg-white rounded-lg shadow-lg border-2 border-purple-500 p-8 relative">
            <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 rounded-bl-lg text-sm font-semibold">Most Popular</div>
            <h3 className="text-2xl font-bold mb-2">Standard</h3>
            <div className="text-4xl font-bold mb-4">£9<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-6">For active travelling ministers</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Everything in Free</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Unlimited visit requests</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>AI Guided Planning</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Professional PDF</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>3 collaborators</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Save 5 templates</span></li>
            </ul>
            <button onClick={() => handleSubscribe('standard')} disabled={loading === 'standard'} className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400">
              {loading === 'standard' ? 'Loading...' : 'Start Standard - £9/month'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">14-day free trial, no card required</p>
          </div>

          <div className="bg-white rounded-lg shadow-md border-2 border-yellow-500 p-8 relative">
            <div className="absolute top-0 right-0 bg-yellow-500 text-white px-4 py-1 rounded-bl-lg text-sm font-semibold">Best Value</div>
            <h3 className="text-2xl font-bold mb-2">Premium</h3>
            <div className="text-4xl font-bold mb-4">£19<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-6">For full-time itinerant ministers</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Everything in Standard</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Full AI Intelligence</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Unlimited templates</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Unlimited collaborators</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Post-trip analytics</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Priority support</span></li>
            </ul>
            <button onClick={() => handleSubscribe('premium')} disabled={loading === 'premium'} className="w-full py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 disabled:bg-gray-400">
              {loading === 'premium' ? 'Loading...' : 'Start Premium - £19/month'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">14-day free trial</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-8 mb-16">
          <h2 className="text-3xl font-bold mb-4">For Denominations & Ministry Organisations</h2>
          <p className="text-lg mb-4">Cover all your ministers with custom branding and bulk trip management</p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" /><span>Premium features for all ministers</span></li>
            <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" /><span>Custom branded PDF with your logo</span></li>
            <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" /><span>Bulk trip management dashboard</span></li>
            <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" /><span>Dedicated account manager</span></li>
          </ul>
          <p className="text-xl font-semibold mb-4">From £500/year</p>
          <a href="mailto:planner@churchnavigator.com" className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700">Contact Us for a Quote</a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Free</th>
                  <th className="text-center py-3 px-4">Standard</th>
                  <th className="text-center py-3 px-4">Premium</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3 px-4">{feature.name}</td>
                    <td className="text-center py-3 px-4">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                      ) : feature.free}
                    </td>
                    <td className="text-center py-3 px-4">
                      {typeof feature.standard === 'boolean' ? (
                        feature.standard ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                      ) : feature.standard}
                    </td>
                    <td className="text-center py-3 px-4">
                      {typeof feature.premium === 'boolean' ? (
                        feature.premium ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                      ) : feature.premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">Yes. Cancel anytime and keep access until your current period ends. No penalties.</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">What happens to my trips if I downgrade?</h3>
              <p className="text-gray-600">All trips are kept. You just lose access to premium features. Export your data anytime.</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Is there a discount for annual payment?</h3>
              <p className="text-gray-600">Yes - Annual Standard £81/year (save £27), Annual Premium £171/year (save £57).</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Can my denomination sponsor our ministers?</h3>
              <p className="text-gray-600">Yes - contact us for the Denomination Plan with custom branding and bulk management.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerPricing;