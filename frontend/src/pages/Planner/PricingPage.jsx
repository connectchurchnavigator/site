import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';

const PricingPage = () => {
  const navigate = useNavigate();
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (plan) => {
    setLoading(plan);
    try {
      const response = await api.post('/planner/subscribe', {
        plan,
        success_url: `${window.location.origin}/planner/subscription/success`,
        cancel_url: `${window.location.origin}/planner/pricing`
      });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription. Please try again.');
      setLoading(null);
    }
  };

  const features = [
    { name: 'Browse 30,000+ churches', free: true, standard: true, premium: true },
    { name: 'Language filters', free: true, standard: true, premium: true },
    { name: 'Map view', free: true, standard: true, premium: true },
    { name: 'Create draft trips', free: 'Unlimited', standard: 'Unlimited', premium: 'Unlimited' },
    { name: 'Visit requests per month', free: '3', standard: 'Unlimited', premium: 'Unlimited' },
    { name: 'AI Guided Trip Planning', free: false, standard: true, premium: true },
    { name: 'Church Matching AI', free: false, standard: true, premium: true },
    { name: 'Conflict detection', free: false, standard: 'Basic', premium: 'Advanced' },
    { name: 'PDF export', free: 'Basic', standard: 'Professional', premium: 'Professional' },
    { name: 'Share formats', free: 'Link only', standard: 'All', premium: 'All' },
    { name: 'Create templates', free: false, standard: '5', premium: 'Unlimited' },
    { name: 'Collaborators', free: '1', standard: '3', premium: 'Unlimited' },
    { name: 'AI Intelligence Layer', free: false, standard: false, premium: true },
    { name: 'Pre-visit briefings', free: false, standard: false, premium: true },
    { name: 'Impact prediction', free: false, standard: false, premium: true },
    { name: 'Post-trip analytics', free: false, standard: 'Summary', premium: 'Full' },
    { name: 'Priority support', free: false, standard: false, premium: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ministry Trip Planner Pricing</h1>
          <p className="text-xl text-gray-600">Start free. Upgrade when you're ready.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <div className="text-3xl font-bold mb-4">£0<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-6">For ministers planning occasional trips</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>3 visit requests/month</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Basic trip builder</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Community templates</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Basic PDF</span></li>
            </ul>
            <button onClick={() => navigate('/signup')} className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300">Get Started Free</button>
          </div>

          <div className="bg-white border-2 border-purple-500 rounded-lg p-8 relative">
            <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">Most Popular</div>
            <h3 className="text-2xl font-bold mb-2">Standard</h3>
            <div className="text-3xl font-bold mb-4">£9<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-6">For active travelling ministers</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Everything in Free</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Unlimited visit requests</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>AI Guided Planning</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Professional PDF</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>3 collaborators</span></li>
            </ul>
            <button onClick={() => handleSubscribe('standard')} disabled={loading === 'standard'} className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50">
              {loading === 'standard' ? 'Processing...' : 'Start Standard'}
            </button>
            <p className="text-sm text-gray-500 text-center mt-2">14-day free trial</p>
          </div>

          <div className="bg-white border-2 border-yellow-500 rounded-lg p-8 relative">
            <div className="absolute top-0 right-0 bg-yellow-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">Best Value</div>
            <h3 className="text-2xl font-bold mb-2">Premium</h3>
            <div className="text-3xl font-bold mb-4">£19<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-6">For full-time itinerant ministers</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Everything in Standard</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Full AI Intelligence</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Unlimited templates</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Unlimited collaborators</span></li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span>Priority support</span></li>
            </ul>
            <button onClick={() => handleSubscribe('premium')} disabled={loading === 'premium'} className="w-full bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 disabled:opacity-50">
              {loading === 'premium' ? 'Processing...' : 'Start Premium'}
            </button>
            <p className="text-sm text-gray-500 text-center mt-2">14-day free trial</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-8 mb-12">
          <h3 className="text-2xl font-bold mb-4">For Denominations & Organisations</h3>
          <p className="text-gray-700 mb-4">Cover all your ministers with custom branding, bulk management, and dedicated support.</p>
          <p className="text-xl font-semibold mb-4">From £500/year</p>
          <a href="mailto:planner@churchnavigator.com" className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700">Contact us for a quote</a>
        </div>

        <div className="bg-white rounded-lg p-8">
          <button onClick={() => setShowComparison(!showComparison)} className="flex items-center justify-between w-full text-left">
            <h3 className="text-2xl font-bold">Full Feature Comparison</h3>
            {showComparison ? <ChevronUp /> : <ChevronDown />}
          </button>
          {showComparison && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Feature</th>
                    <th className="text-center py-3 px-4">Free</th>
                    <th className="text-center py-3 px-4">Standard</th>
                    <th className="text-center py-3 px-4">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
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
          )}
        </div>

        <div className="mt-12 bg-white rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-6">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600">Yes. Cancel anytime and keep access until your billing period ends.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What happens to my trips if I downgrade?</h4>
              <p className="text-gray-600">All trips are kept. You just lose access to premium features. Export your data anytime.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Is there a discount for annual payment?</h4>
              <p className="text-gray-600">Yes — annual Standard £81/year (save £27), annual Premium £171/year (save £57).</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Can my denomination sponsor our ministers?</h4>
              <p className="text-gray-600">Yes — contact us for the Denomination Plan.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
