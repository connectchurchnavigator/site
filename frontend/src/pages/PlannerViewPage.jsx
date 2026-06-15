import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const PlannerViewPage = () => {
  const { tripId } = useParams();
  const [conflicts, setConflicts] = useState([]);
  const [feasibility, setFeasibility] = useState(100);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const debounce = setTimeout(() => checkConflicts(), 2000);
    return () => clearTimeout(debounce);
  }, [tripId]);

  const checkConflicts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/planner/${tripId}/check-conflicts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setConflicts(data.conflicts || []);
      setFeasibility(data.overall_feasibility || 100);
      setSummary(data.feasibility_summary || '');
    } catch (err) {
      console.error('Conflict check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'bg-red-100 border-red-500 text-red-900';
    if (severity === 'warning') return 'bg-amber-100 border-amber-500 text-amber-900';
    return 'bg-blue-100 border-blue-500 text-blue-900';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return '🚨';
    if (severity === 'warning') return '⚠️';
    return '💡';
  };

  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const warningConflicts = conflicts.filter(c => c.severity === 'warning');
  const suggestionConflicts = conflicts.filter(c => c.severity === 'suggestion');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Trip Itinerary</h1>
        <p className="text-gray-600">Build and refine your ministry trip</p>
      </div>

      {/* Feasibility Gauge */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Trip Feasibility</h2>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: feasibility >= 80 ? '#10b981' : feasibility >= 60 ? '#f59e0b' : '#ef4444' }}>
              {feasibility}%
            </div>
            <div className="text-sm text-gray-600">Overall Score</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${feasibility}%`,
              backgroundColor: feasibility >= 80 ? '#10b981' : feasibility >= 60 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
        <p className="text-sm text-gray-700">{summary}</p>
      </div>

      {/* Critical Conflicts */}
      {criticalConflicts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-700 mb-3">Critical Issues ({criticalConflicts.length})</h3>
          <div className="space-y-3">
            {criticalConflicts.map((conflict, idx) => (
              <div key={idx} className={`border-l-4 p-4 rounded ${getSeverityColor(conflict.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getSeverityIcon(conflict.severity)}</span>
                      <span className="font-semibold uppercase text-xs">{conflict.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm mb-2">{conflict.message}</p>
                    <p className="text-sm font-medium">💡 Suggested Fix: {conflict.suggested_fix}</p>
                  </div>
                  <button className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    Apply Fix
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warningConflicts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-amber-700 mb-3">Warnings ({warningConflicts.length})</h3>
          <div className="space-y-3">
            {warningConflicts.map((conflict, idx) => (
              <div key={idx} className={`border-l-4 p-4 rounded ${getSeverityColor(conflict.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getSeverityIcon(conflict.severity)}</span>
                      <span className="font-semibold uppercase text-xs">{conflict.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm mb-2">{conflict.message}</p>
                    <p className="text-sm font-medium">💡 Suggested Fix: {conflict.suggested_fix}</p>
                  </div>
                  <button className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    Apply Fix
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestionConflicts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-3">Suggestions ({suggestionConflicts.length})</h3>
          <div className="space-y-3">
            {suggestionConflicts.map((conflict, idx) => (
              <div key={idx} className={`border-l-4 p-4 rounded ${getSeverityColor(conflict.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getSeverityIcon(conflict.severity)}</span>
                      <span className="font-semibold uppercase text-xs">{conflict.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm mb-2">{conflict.message}</p>
                    <p className="text-sm font-medium">💡 Suggested Fix: {conflict.suggested_fix}</p>
                  </div>
                  <button className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    Apply Fix
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {conflicts.length === 0 && !loading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">✓</div>
          <p className="text-green-800 font-semibold">No conflicts detected</p>
          <p className="text-green-700 text-sm mt-1">Your itinerary looks great!</p>
        </div>
      )}
    </div>
  );
};

export default PlannerViewPage;
