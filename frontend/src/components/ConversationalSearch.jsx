import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const ConversationalSearch = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const response = await axios.get(`${API_BASE}/api/search/conversational`, {
        params: { q: query }
      });
      setAnswer(response.data.answer);
      if (response.data.cached) {
        setAnswer(prev => prev + ' (cached result)');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Daily AI search limit reached. Try standard search instead.');
      } else {
        setError('AI search failed. Please try standard search.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-purple-900">🤖 Ask AI (Conversational Search)</h3>
          <p className="text-sm text-purple-700">Ask complex questions about churches</p>
        </div>
        <button onClick={onClose} className="text-purple-600 hover:text-purple-800">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., 'Which church is best for a new believer who loves contemporary worship?'"
            className="flex-1 px-4 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
          >
            {loading ? 'Thinking...' : 'Ask AI'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {answer && (
        <div className="bg-white border border-purple-300 rounded-lg p-4">
          <p className="text-gray-800 whitespace-pre-wrap">{answer}</p>
        </div>
      )}

      <p className="text-xs text-purple-600 mt-4">
        Note: AI search is rate-limited (20 queries/day platform-wide). Standard search is instant and unlimited.
      </p>
    </div>
  );
};

export default ConversationalSearch;
