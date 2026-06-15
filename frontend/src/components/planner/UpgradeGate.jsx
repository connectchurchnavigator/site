import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, Users, FileText, TrendingUp } from 'lucide-react';

const UpgradeGate = ({ type, currentUsage, limit, resetDate, onClose }) => {
  const navigate = useNavigate();

  const gates = {
    visit_request_limit: {
      icon: <Lock className="w-12 h-12 text-purple-600" />,
      title: 'Visit Request Limit Reached',
      description: `You have reached your 3 free visit requests this month. Upgrade to Planner Standard to send unlimited requests.`,
      upgradeUrl: '/planner/pricing',
      upgradePlan: 'standard',
      upgradePrice: '£9/month',
      resetMessage: resetDate ? `Wait until ${new Date(resetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` : null
    },
    ai_planning: {
      icon: <Zap className="w-12 h-12 text-purple-600" />,
      title: 'AI Planning is a Standard Feature',
      description: 'Let AI help you plan the perfect trip with church matching, route optimization, and conflict detection.',
      upgradeUrl: '/planner/pricing',
      upgradePlan: 'standard',
      upgradePrice: '£9/month',
      banner: true
    },
    ai_intelligence: {
      icon: <TrendingUp className="w-12 h-12 text-yellow-600" />,
      title: 'Premium AI Intelligence',
      description: 'Unlock pre-visit briefings, impact prediction, deep conflict detection, and negotiation assistance.',
      upgradeUrl: '/planner/pricing',
      upgradePlan: 'premium',
      upgradePrice: '£19/month',
      banner: true
    },
    template_creation: {
      icon: <FileText className="w-12 h-12 text-purple-600" />,
      title: 'Save as Template',
      description: 'Save your trip as a reusable template with Planner Standard. Share it with other missionaries and coordinators.',
      upgradeUrl: '/planner/pricing',
      upgradePlan: 'standard',
      upgradePrice: '£9/month'
    },
    collaboration: {
      icon: <Users className="w-12 h-12 text-purple-600" />,
      title: 'Add More Collaborators',
      description: 'Add unlimited collaborators with Planner Standard. Your coordinator, driver, and missionaries can all work together on one live trip board.',
      upgradeUrl: '/planner/pricing',
      upgradePlan: 'standard',
      upgradePrice: '£9/month'
    }
  };

  const gate = gates[type] || gates.visit_request_limit;

  if (gate.banner) {
    return (
      <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-lg mb-4">
        <div className="flex items-start">
          {gate.icon}
          <div className="ml-4 flex-1">
            <h3 className="font-semibold text-lg text-gray-900">{gate.title}</h3>
            <p className="text-gray-600 mt-1">{gate.description}</p>
            <div className="mt-3 flex gap-3">
              <button onClick={() => navigate(gate.upgradeUrl)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
                Upgrade to {gate.upgradePlan === 'standard' ? 'Standard' : 'Premium'} - {gate.upgradePrice}
              </button>
              {onClose && <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Maybe Later</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center">
          {gate.icon}
          <h2 className="text-2xl font-bold mt-4 mb-2">{gate.title}</h2>
          <p className="text-gray-600 mb-6">{gate.description}</p>
          
          {type === 'visit_request_limit' && currentUsage && (
            <div className="w-full bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="font-semibold mb-2">This month you have already:</p>
              <div className="space-y-1 text-sm text-gray-700">
                <div>✓ Liberty Christian Church (confirmed)</div>
                <div>⏳ New Covenant Assembly (pending)</div>
                <div>✗ Grace Baptist Church (declined)</div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 w-full">
            <button onClick={() => navigate(gate.upgradeUrl)} className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
              Upgrade to {gate.upgradePlan === 'standard' ? 'Standard' : 'Premium'} - {gate.upgradePrice}
            </button>
            {gate.resetMessage && (
              <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                {gate.resetMessage}
              </button>
            )}
            {!gate.resetMessage && onClose && (
              <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeGate;