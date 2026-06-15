import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Zap, Crown } from 'lucide-react';

const UpgradePrompt = ({ type, onClose, context = {} }) => {
  const navigate = useNavigate();

  const prompts = {
    visit_limit: {
      icon: Lock,
      title: 'Visit Request Limit Reached',
      message: `You have reached your 3 free visit requests this month.`,
      details: context.recent_requests ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold">This month you have already:</p>
          {context.recent_requests.map((req, idx) => (
            <div key={idx} className="text-sm flex items-center gap-2">
              <span className={req.status === 'confirmed' ? 'text-green-600' : req.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}>
                {req.status === 'confirmed' ? '✓' : req.status === 'pending' ? '○' : '✗'}
              </span>
              <span>{req.church_name} ({req.status})</span>
            </div>
          ))}
        </div>
      ) : null,
      cta: 'Upgrade to Standard — £9/month',
      plan: 'standard',
      wait: context.reset_date ? `Wait until ${new Date(context.reset_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` : null
    },
    ai_planning: {
      icon: Zap,
      title: 'AI-Powered Trip Planning',
      message: 'Let AI help you plan the perfect ministry route with church matching, conflict detection, and smart scheduling.',
      cta: 'Upgrade to Standard — £9/month',
      plan: 'standard',
      banner: true
    },
    ai_intelligence: {
      icon: Crown,
      title: 'Premium Feature',
      message: 'Unlock pre-visit briefings, impact prediction, negotiation assistant and advanced analytics with Premium.',
      cta: 'Upgrade to Premium — £19/month',
      plan: 'premium',
      tooltip: true
    },
    templates: {
      icon: Lock,
      title: 'Save as Template',
      message: 'Save your trip as a reusable template and share it with other missionaries and coordinators.',
      cta: 'Upgrade to Standard — £9/month',
      plan: 'standard'
    },
    collaborators: {
      icon: Lock,
      title: 'Add More Collaborators',
      message: 'Add unlimited collaborators with Planner Standard. Your coordinator, driver, and missionaries can all work together on one live trip board.',
      cta: 'Upgrade to Standard — £9/month',
      plan: 'standard'
    }
  };

  const prompt = prompts[type] || prompts.visit_limit;
  const Icon = prompt.icon;

  if (prompt.banner) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-purple-600" />
          <div>
            <p className="font-semibold text-purple-900">{prompt.message}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/planner/pricing')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
            {prompt.cta}
          </button>
        </div>
      </div>
    );
  }

  if (prompt.tooltip) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
        <Lock className="w-4 h-4 text-yellow-600" />
        <span className="text-yellow-900">{prompt.message}</span>
        <button onClick={() => navigate('/planner/pricing')} className="text-yellow-700 underline font-semibold">
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Icon className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">{prompt.title}</h3>
            <p className="text-gray-600">{prompt.message}</p>
            {prompt.details}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => navigate('/planner/pricing')} className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
            {prompt.cta}
          </button>
          {prompt.wait && (
            <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300">
              {prompt.wait}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
