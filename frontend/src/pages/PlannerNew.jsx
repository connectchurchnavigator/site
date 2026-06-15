import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

export default function PlannerNew() {
  const navigate = useNavigate();
  const [tripId, setTripId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login?redirect=/planner/new');
      return;
    }

    axios.post(`${API_URL}/api/planner/new`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setTripId(res.data.trip_id);
        setConversation([res.data.message]);
      })
      .catch(err => {
        console.error('Failed to create trip:', err);
        alert('Failed to start planning. Please try again.');
      });
  }, [navigate]);

  const handleSend = async () => {
    if (!userInput.trim() || !tripId) return;

    const userMsg = {
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };

    setConversation(prev => [...prev, userMsg]);
    setUserInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/planner/${tripId}/message`,
        { role: 'user', content: userInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setConversation(prev => [...prev, res.data.message]);
      setStep(res.data.step);

      if (res.data.step >= 7) {
        setTimeout(() => {
          navigate(`/planner/${tripId}/analysis`);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Plan Your Ministry Trip</h1>
            <p className="text-purple-100 mt-2">AI-guided step-by-step planning for UK ministers</p>
          </div>

          <div className="px-8 py-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Progress</span>
                <span className="text-sm font-medium text-purple-600">{step}/7 steps</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(step / 7) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto mb-6 pr-2">
              {conversation.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                      msg.role === 'user' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-purple-600">AI Planner</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <span className="text-xs opacity-70 mt-2 block">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-3">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                disabled={loading || step >= 7}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={!userInput.trim() || loading || step >= 7}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
                Send
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Trip Basics', done: step >= 1 },
                { label: 'Cities', done: step >= 2 },
                { label: 'Ministry Focus', done: step >= 3 },
                { label: 'Services/Day', done: step >= 4 },
                { label: 'Budget', done: step >= 5 },
                { label: 'Congregation', done: step >= 6 },
                { label: 'Churches', done: step >= 7 }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    item.done ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {item.done && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    item.done ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Powered by AI • Your trip is automatically saved</p>
        </div>
      </div>
    </div>
  );
}