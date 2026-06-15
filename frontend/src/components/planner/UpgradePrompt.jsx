import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Zap, Users, FileText, Brain } from 'lucide-react';

const UpgradePrompt = ({ feature, currentTier, inline = false }) => {
  const prompts = {
    visit_requests_limit: {
      icon: Lock,
      title: 'Visit Request Limit Reached',
      description: 'You have reached your 3 free visit requests this month.',
      cta: 'Upgrade to Standard for unlimited requests',
      price: '£9/month',
      requiredTier: 'standard'
    },
    ai_guided_planning: {
      icon: Brain,
      title: 'AI-Powered Trip Planning',
      description: 'Let AI help you build the perfect ministry trip with smart suggestions.',
      cta: 'Unlock AI planning',
      price: '£9/month',
      requiredTier: 'standard'
    },
    ai_intelligence: {
      icon: Zap,
      title: 'AI Intelligence Layer',
      description: 'Pre-visit briefings, impact prediction, negotiation assistant and deep conflict detection.',
      cta: 'Upgrade to Premium',
      price: '£19/month',
      requiredTier: 'premium'
    },
    templates_create: {
      icon: FileText,
      title: 'Save as Template',
      description: 'Save your trip as a reusable template and share it with other missionaries.',
      cta: 'Unlock templates',
      price: '£9/month',
      requiredTier: 'standard'
    },
    collaboration: {
      icon: Users,
      title: 'Add Collaborators',
      description: 'Work together with your coordinator, driver, and missionaries on one live trip board.',
      cta: 'Unlock collaboration',
      price: '£9/month',
      requiredTier: 'standard'
    },
    professional_pdf: {
      icon: FileText,
      title: 'Professional PDF',
      description: 'Export beautifully branded PDFs with QR codes, maps, and church details.',
      cta: 'Upgrade to Standard',
      price: '£9/month',
      requiredTier: 'standard'
    }
  };

  const prompt = prompts[feature] || prompts.ai_guided_planning;
  const Icon = prompt.icon;

  if (inline) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <Lock className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{prompt.description}</span>
              {' '}
              <Link to="/planner/pricing" className="text-purple-600 hover:text-purple-700 font-medium">
                {prompt.cta} – {prompt.price}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
            <Icon className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{prompt.title}</h3>
        </div>
        
        <p className="text-gray-600 mb-6">{prompt.description}</p>
        
        {feature === 'visit_requests_limit' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">This month you have already:</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✓ Requested Liberty Christian (confirmed)</li>
              <li>✓ Requested New Covenant (pending)</li>
              <li>✓ Requested Grace Baptist (declined)</li>
            </ul>
          </div>
        )}
        
        <div className="space-y-3">
          <Link
            to="/planner/pricing"
            className="block w-full bg-purple-600 text-white text-center py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            {prompt.cta} – {prompt.price}
          </Link>
          
          {feature === 'visit_requests_limit' && (
            <button
              className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Wait until 1st July – 18 days
            </button>
          )}
          
          <button
            onClick={() => window.history.back()}
            className="block w-full text-gray-600 text-center py-2 text-sm hover:text-gray-800"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
