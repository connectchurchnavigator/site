import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

export default function PlannerWizard() {
  const [tripId, setTripId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    initTrip();
  }, []);

  const initTrip = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/planner/new`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTripId(res.data.trip_id);
      
      const aiRes = await axios.post(`${API_URL}/api/planner/${res.data.trip_id}/conversation`, 
        { role: 'assistant', content: "Welcome! Let's plan your UK ministry trip together. First -- how many days are you visiting for?" },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setConversation([{role: 'assistant', content: "Welcome! Let's plan your UK ministry trip together. First -- how many days are you visiting for?"}]);
    } catch (err) {
      console.error('Failed to init trip:', err);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !tripId) return;
    
    const newMsg = { role: 'user', content: userInput };
    setConversation(prev => [...prev, newMsg]);
    setUserInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/planner/${tripId}/conversation`, newMsg, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.response) {
        setConversation(prev => [...prev, { role: 'assistant', content: res.data.response }]);
      }
      
      if (res.data.complete) {
        setComplete(true);
        setTimeout(() => navigate(`/planner/${tripId}/analysis`), 2000);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">AI</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trip Planning Assistant</h1>
              <p className="text-sm text-gray-500">Powered by Claude Sonnet</p>
            </div>
          </div>

          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {conversation.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!complete && (
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !userInput.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Send
              </button>
            </div>
          )}

          {complete && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-full">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Planning complete! Analyzing your trip...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}