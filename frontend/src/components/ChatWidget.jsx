import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const ChatWidget = ({ listingType, slug, listingName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
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
      const defaultActions = listingType === 'church'
        ? ['Service times', 'Find us', 'Meet the pastor', 'Upcoming events']
        : listingType === 'event'
        ? ['Register now', "What's included", 'Location & parking']
        : ['Invite to visit', 'View sermons', 'Contact'];
      setSuggestedActions(defaultActions);
      
      setMessages([{
        text: `Hi! I can help you learn about ${listingName}. What would you like to know?`,
        isBot: true,
        source: 'system'
      }]);
    }
  }, [isOpen, listingType, listingName, messages.length]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = { text: messageText, isBot: false };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/${listingType}/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const botMessage = {
        text: data.answer,
        isBot: true,
        source: data.source,
        contactPrompt: data.contact_prompt,
        contactEmail: data.contact_email,
        contactPhone: data.contact_phone
      };

      setMessages(prev => [...prev, botMessage]);
      setSuggestedActions(data.suggested_actions || []);
    } catch (error) {
      setMessages(prev => [...prev, {
        text: 'Sorry, I encountered an error. Please try again or contact us directly.',
        isBot: true,
        source: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickReply = (action) => {
    sendMessage(action);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          style={{
            boxShadow: '0 0 30px rgba(124, 58, 237, 0.5), 0 0 60px rgba(124, 58, 237, 0.3)'
          }}
        >
          <MessageCircle size={24} />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            boxShadow: '0 0 40px rgba(124, 58, 237, 0.4), 0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-white" />
              <h3 className="text-white font-semibold">Chat with us</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50/30 to-white">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.isBot
                      ? 'bg-purple-100 text-gray-800'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  }`}
                  style={msg.isBot ? {} : {
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                  }}
                >
                  <div className="flex items-start gap-2">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.source === 'ai' && (
                      <Sparkles size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  
                  {msg.contactPrompt && (
                    <div className="mt-3 pt-3 border-t border-purple-200 space-y-1">
                      {msg.contactEmail && (
                        <a
                          href={`mailto:${msg.contactEmail}`}
                          className="block text-xs text-purple-600 hover:text-purple-800 font-medium"
                        >
                          ✉️ {msg.contactEmail}
                        </a>
                      )}
                      {msg.contactPhone && (
                        <a
                          href={`tel:${msg.contactPhone}`}
                          className="block text-xs text-purple-600 hover:text-purple-800 font-medium"
                        >
                          📞 {msg.contactPhone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-purple-100 rounded-2xl px-4 py-2">
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
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {suggestedActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(action)}
                  className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">Powered by ChurchNavigator</p>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;