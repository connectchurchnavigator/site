import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const PatternIntelligence = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [error, setError] = useState(null);

  const fetchPatterns = async (refresh = false) => {
    if (!user?.church_slug) return;
    
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await axios.post(
        `${API_URL}/api/tools/pattern-intelligence/${user.church_slug}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          params: refresh ? { bust_cache: true } : {}
        }
      );
      
      setPatterns(response.data.patterns || []);
      setError(null);
    } catch (err) {
      if (err.response?.status === 402) {
        setError('Premium subscription required');
      } else {
        setError(err.response?.data?.detail || 'Failed to load pattern intelligence');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing your church data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">Access Restricted</h3>
            <p className="text-red-600 mb-4">{error}</p>
            {error.includes('Premium') && (
              <button
                onClick={() => navigate('/pricing')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Pattern Intelligence</h1>
            <p className="text-gray-600 mt-2">Non-obvious insights from your church data</p>
          </div>
          <button
            onClick={() => fetchPatterns(true)}
            disabled={refreshing}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {refreshing ? (
              <><span className="animate-spin">↻</span> Refreshing...</>
            ) : (
              <>↻ Refresh Analysis</>
            )}
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          {patterns.map((pattern, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-600">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{pattern.title}</h3>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Pattern {index + 1}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-2">What We See</h4>
                  <p className="text-gray-800">{pattern.pattern}</p>
                  {pattern.data_points && pattern.data_points.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pattern.data_points.map((point, i) => (
                        <span key={i} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                          {point}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-900 uppercase mb-2">Why It Matters</h4>
                  <p className="text-yellow-900">{pattern.why_matters}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-green-900 uppercase mb-2">Action to Take</h4>
                  <p className="text-green-900 font-medium">{pattern.action}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex gap-3">
                <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                  Share with team
                </button>
                <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">
                  Add to task list
                </button>
              </div>
            </div>
          ))}
        </div>

        {patterns.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">No patterns detected yet. Check back after more data is collected.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternIntelligence;