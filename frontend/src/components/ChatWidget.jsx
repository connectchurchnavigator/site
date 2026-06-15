import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './ChatWidget.css';

const ChatWidget = ({ listingType, slug, listingName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [suggestedActions, setSuggestedActions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (listingType === 'church') {
      setSuggestedActions(['Service times', 'Find us', 'Meet the pastor', 'Upcoming events', 'Contact directly']);
    } else if (listingType === 'event') {
      setSuggestedActions(['Register now', 'What\'s included', 'Location & parking', 'Contact organiser']);
    } else if (listingType === 'pastor') {
      setSuggestedActions(['Invite to visit', 'View sermons', 'Contact']);
    }
  }, [listingType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com'}/api/chat/${listingType}/${slug}`,
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
        content: 'Sorry, I encountered an error. Please try again or contact us directly.',
        source: 'error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (action) => {
    sendMessage(action);
  };

  return (
    <div className="chat-widget">
      {!isOpen && (
        <button
          className="chat-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          <span className="chat-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <h3>Ask about {listingName}</h3>
            <button
              className="chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <p>👋 Hi! Ask me anything about {listingName}</p>
                <div className="quick-replies">
                  {suggestedActions.slice(0, 4).map((action, idx) => (
                    <button
                      key={idx}
                      className="quick-reply-chip"
                      onClick={() => handleQuickReply(action)}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                {msg.role === 'assistant' && msg.contactPrompt ? (
                  <div className="contact-card">
                    <p>{msg.content}</p>
                    <div className="contact-details">
                      {msg.contactEmail && (
                        <a href={`mailto:${msg.contactEmail}`} className="contact-link">
                          📧 {msg.contactEmail}
                        </a>
                      )}
                      {msg.contactPhone && (
                        <a href={`tel:${msg.contactPhone}`} className="contact-link">
                          📞 {msg.contactPhone}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="message-content">
                    {msg.content}
                    {msg.source === 'ai' && (
                      <span className="ai-indicator" title="AI-assisted answer">✨</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <p className="loading-text">Looking that up...</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length > 0 && suggestedActions.length > 0 && (
            <div className="chat-suggestions">
              {suggestedActions.map((action, idx) => (
                <button
                  key={idx}
                  className="quick-reply-chip"
                  onClick={() => handleQuickReply(action)}
                  disabled={loading}
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
              disabled={loading}
            />
            <button
              className="chat-send"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>

          <div className="chat-footer">
            <span className="chat-branding">Powered by ChurchNavigator</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;