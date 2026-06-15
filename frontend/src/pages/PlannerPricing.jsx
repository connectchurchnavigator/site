import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const PlannerPricing = () => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (plan) => {
    if (!user) {
      window.location.href = '/login?redirect=/planner/pricing';
      return;
    }
    setLoading(plan);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/planner/subscribe`, {
        plan,
        annual: billingCycle === 'annual'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription. Please try again.');
      setLoading(null);
    }
  };

  const prices = {
    monthly: { standard: 9, premium: 19 },
    annual: { standard: 81, premium: 171 }
  };

  const features = {
    free: [
      { name: 'Browse 30,000+ churches', included: true },
      { name: 'Map view with filters', included: true },
      { name: 'Create unlimited draft trips', included: true },
      { name: 'Visit requests per month', value: '3' },
      { name: 'Community templates (read-only)', included: true },
      { name: 'Basic PDF export', included: true },
      { name: 'Share trip as link', included: true },
      { name: 'AI Guided Planning', included: false },
      { name: 'Professional PDF', included: false },
      { name: 'Create templates', included: false },
      { name: 'Collaboration', included: false }
    ],
    standard: [
      { name: 'Everything in Free', included: true },
      { name: 'Unlimited visit requests', included: true },
      { name: 'AI Guided Trip Planning', included: true },
      { name: 'Church Matching AI scores', included: true },
      { name: 'Basic conflict detection', included: true },
      { name: 'Professional PDF with QR codes', included: true },
      { name: 'WhatsApp, iCal, email sharing', included: true },
      { name: 'Create and save templates', value: '5' },
      { name: 'Live collaboration', value: '3 people' },
      { name: 'Post-trip summary report', included: true },
      { name: 'Full AI Intelligence Layer', included: false },
      { name: 'Unlimited templates', included: false }
    ],
    premium: [
      { name: 'Everything in Standard', included: true },
      { name: 'Deep conflict detection', included: true },
      { name: 'Negotiation assistant', included: true },
      { name: 'Pre-visit church briefings', included: true },
      { name: 'Impact prediction dashboard', included: true },
      { name: 'Multi-factor cost/time analysis', included: true },
      { name: 'Unlimited templates', included: true },
      { name: 'Share templates publicly', included: true },
      { name: 'Unlimited collaborators', included: true },
      { name: 'Full post-trip analytics', included: true },
      { name: 'Priority support', included: true },
      { name: 'WhatsApp group integration', included: true }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ministry Trip Planner Pricing</h1>
          <p className="text-xl text-gray-600">Start free. Upgrade when you're ready.</p>
          <div className="mt-6 inline-flex bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'annual' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Annual <span className="text-green-600 ml-1">(Save 25%)</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-8 border-2 border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
            <p className="text-gray-600 mb-4">For ministers planning occasional trips</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£0</span>
              <span className="text-gray-600">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">3 visit requests/month</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Basic trip builder</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Community templates</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Basic PDF</span>
              </li>
            </ul>
            <Link
              to="/planner"
              className="block w-full text-center bg-gray-100 text-gray-900 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-purple-500 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Standard</h3>
            <p className="text-gray-600 mb-4">For active travelling ministers</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£{prices[billingCycle].standard}</span>
              <span className="text-gray-600">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">Everything in Free</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited visit requests</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">AI Guided Planning</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Professional PDF</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Collaboration (3 people)</span>
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('standard')}
              disabled={loading === 'standard'}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading === 'standard' ? 'Processing...' : `Start Standard - £${prices[billingCycle].standard}/${billingCycle === 'annual' ? 'year' : 'month'}`}
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">14-day free trial • No card required</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 border-2 border-yellow-500 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="bg-yellow-500 text-white px-4 py-1 rounded-full text-sm font-medium">Best Value</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
            <p className="text-gray-600 mb-4">For full-time itinerant ministers</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">£{prices[billingCycle].premium}</span>
              <span className="text-gray-600">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">Everything in Standard</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Full AI Intelligence</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited templates</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited collaborators</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Post-trip analytics</span>
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('premium')}
              disabled={loading === 'premium'}
              className="w-full bg-yellow-500 text-white py-3 rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {loading === 'premium' ? 'Processing...' : `Start Premium - £${prices[billingCycle].premium}/${billingCycle === 'annual' ? 'year' : 'month'}`}
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">14-day free trial</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white mb-12">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4">For Denominations & Ministry Organisations</h3>
            <p className="text-lg mb-6">Cover all your ministers with custom branding, bulk management, and dedicated support</p>
            <ul className="grid md:grid-cols-2 gap-3 text-left mb-6">
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>Premium for all ministers</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>Custom branded PDFs</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>Bulk trip dashboard</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>Dedicated account manager</span>
              </li>
            </ul>
            <p className="text-xl font-bold mb-4">From £500/year</p>
            <a
              href="mailto:planner@churchnavigator.com?subject=Denomination Plan Enquiry"
              className="inline-flex items-center bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact us for a quote
            </a>
          </div>
        </div>

        <div className="text-center mb-8">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-purple-600 font-medium hover:text-purple-700"
          >
            {showComparison ? 'Hide' : 'Show'} detailed feature comparison
          </button>
        </div>

        {showComparison && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-12 overflow-x-auto">
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
                {features.free.map((feature, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4">{feature.name}</td>
                    <td className="text-center py-3 px-4">
                      {feature.included ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : feature.value || <X className="w-5 h-5 text-gray-300 mx-auto" />}
                    </td>
                    <td className="text-center py-3 px-4">
                      {i < 7 ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : features.standard[i - 1]?.included ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : features.standard[i - 1]?.value || <X className="w-5 h-5 text-gray-300 mx-auto" />}
                    </td>
                    <td className="text-center py-3 px-4">
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600">Yes. Cancel anytime and keep access until your current period ends. No questions asked.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">What happens to my trips if I downgrade?</h4>
              <p className="text-gray-600">All your trips are kept forever. You just lose access to premium features. You can export your data anytime.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Is there a discount for annual payment?</h4>
              <p className="text-gray-600">Yes! Annual Standard is £81/year (save £27), annual Premium is £171/year (save £57). That's 25% off.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Can my denomination sponsor our ministers?</h4>
              <p className="text-gray-600">Absolutely. Contact us for the Denomination Plan starting at £500/year for your entire network.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerPricing;
