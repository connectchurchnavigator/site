import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const ChatWidget = ({ listingType, slug, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [suggestedActions, setSuggestedActions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchInitialActions();
    }
  }, [isOpen]);

  const fetchInitialActions = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/chat/${listingType}/${slug}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'help',
            session_id: sessionId
          })
        }
      );
      const data = await response.json();
      if (data.suggested_actions) {
        setSuggestedActions(data.suggested_actions);
      }
    } catch (error) {
      console.error('Failed to fetch initial actions:', error);
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/chat/${listingType}/${slug}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            session_id: sessionId
          })
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      const assistantMessage = {
        role: 'assistant',
        content: data.answer,
        source: data.source,
        contactPrompt: data.contact_prompt,
        contactEmail: data.contact_email,
        contactPhone: data.contact_phone
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.suggested_actions && data.suggested_actions.length > 0) {
        setSuggestedActions(data.suggested_actions);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble answering that. Please try again or contact us directly.',
        source: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickReply = (action) => {
    sendMessage(action);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-purple-200">
      <div className="bg-gradient-to-r from-purple-600 to-lavender-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
        <h3 className="font-semibold text-lg">Ask a Question</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Close chat"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-lavender-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">👋 Hi! How can I help you today?</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-800 shadow-sm border border-lavender-200'
              }`}
            >
              {message.role === 'assistant' && message.source === 'ai' && (
                <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                  <Sparkles size={12} />
                  <span>AI-powered answer</span>
                </div>
              )}
              
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {message.contactPrompt && (
                <div className="mt-3 p-3 bg-lavender-50 rounded-lg border border-lavender-200">
                  <p className="text-xs font-semibold text-purple-700 mb-2">Contact Information:</p>
                  {message.contactEmail && (
                    <p className="text-xs text-gray-700">✉️ {message.contactEmail}</p>
                  )}
                  {message.contactPhone && (
                    <p className="text-xs text-gray-700 mt-1">📞 {message.contactPhone}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 p-3 rounded-2xl shadow-sm border border-lavender-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {suggestedActions.length > 0 && (
        <div className="px-4 py-2 border-t border-lavender-200 bg-white">
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(action)}
                className="px-3 py-1.5 text-xs bg-lavender-100 hover:bg-lavender-200 text-purple-700 rounded-full transition-colors border border-lavender-300"
                disabled={isLoading}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t border-lavender-200 bg-white rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 px-4 py-2 border border-lavender-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            disabled={isLoading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">Powered by ChurchNavigator</p>
      </form>
    </div>
  );
};

export default ChatWidget;