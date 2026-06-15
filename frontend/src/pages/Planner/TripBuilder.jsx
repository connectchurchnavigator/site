import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

export default function TripBuilder() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('planning');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (tripId) {
      loadTrip();
    } else {
      createTrip();
    }
  }, [tripId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const createTrip = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post(`${API_BASE}/api/planner/trips`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/planner/new/${res.data.trip_id}`, { replace: true });
      setConversation([{
        role: 'assistant',
        content: 'Welcome! Let us plan your UK ministry trip together. First -- how many days are you visiting for?',
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('Error creating trip:', err);
    }
  };

  const loadTrip = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_BASE}/api/planner/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrip(res.data);
      setConversation(res.data.conversation || []);
      setStatus(res.data.status);
    } catch (err) {
      console.error('Error loading trip:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input, timestamp: new Date() };
    setConversation(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post(
        `${API_BASE}/api/planner/trips/${tripId}/conversation`,
        { message: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const aiMsg = { role: 'assistant', content: res.data.response, timestamp: new Date() };
      setConversation(prev => [...prev, aiMsg]);
      
      if (res.data.status === 'ready_for_analysis') {
        setStatus('ready_for_analysis');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const proceedToRecommendations = () => {
    navigate(`/planner/${tripId}/recommendations`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">AI Trip Planner</h1>
            <p className="text-purple-100 text-sm mt-1">Let's build your ministry trip together</p>
          </div>

          <div className="p-6">
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {conversation.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-4 py-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {status === 'ready_for_analysis' ? (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Trip Details Collected!</h3>
                <p className="text-gray-600 mb-4">I'll now find the best churches for your ministry trip.</p>
                <button
                  onClick={proceedToRecommendations}
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                >
                  See Church Recommendations →
                </button>
              </div>
            ) : (
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your answer..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}