import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './ChatWidget.css';

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
      setMessages([{
        type: 'bot',
        text: `Hi! I'm here to help you learn more about ${listingName}. What would you like to know?`,
        source: 'system'
      }]);
      loadInitialSuggestions();
    }
  }, [isOpen]);

  const loadInitialSuggestions = async () => {
    const defaultActions = listingType === 'church'
      ? ['Service times', 'Find us', 'Meet the pastor', 'Contact directly']
      : listingType === 'event'
      ? ['Register now', 'What\'s included', 'Location & parking', 'Contact organizer']
      : ['Invite to visit', 'View sermons', 'Contact'];
    setSuggestedActions(defaultActions);
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = { type: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
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

      const botMessage = {
        type: 'bot',
        text: data.answer,
        source: data.source,
        contactPrompt: data.contact_prompt,
        contactEmail: data.contact_email,
        contactPhone: data.contact_phone
      };

      setMessages(prev => [...prev, botMessage]);
      setSuggestedActions(data.suggested_actions || []);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: 'Sorry, something went wrong. Please try again.',
        source: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = (action) => {
    sendMessage(action);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <>
      <button
        className="chat-widget-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="chat-widget-container">
          <div className="chat-widget-header">
            <h3>Ask about {listingName}</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">✕</button>
          </div>

          <div className="chat-widget-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message chat-message-${msg.type}`}>
                {msg.type === 'bot' && msg.source === 'ai' && (
                  <span className="ai-indicator" title="AI-assisted response">✨</span>
                )}
                <div className="chat-message-text">{msg.text}</div>
                {msg.contactPrompt && (
                  <div className="chat-contact-card">
                    {msg.contactEmail && (
                      <div className="chat-contact-item">
                        <strong>Email:</strong> <a href={`mailto:${msg.contactEmail}`}>{msg.contactEmail}</a>
                      </div>
                    )}
                    {msg.contactPhone && (
                      <div className="chat-contact-item">
                        <strong>Phone:</strong> <a href={`tel:${msg.contactPhone}`}>{msg.contactPhone}</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="chat-message chat-message-bot">
                <div className="chat-message-text chat-loading">Looking that up...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {suggestedActions.length > 0 && (
            <div className="chat-suggested-actions">
              {suggestedActions.map((action, index) => (
                <button
                  key={index}
                  className="chat-suggested-action"
                  onClick={() => handleSuggestedAction(action)}
                  disabled={isLoading}
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="chat-widget-input-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="chat-widget-input"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="chat-widget-send"
              aria-label="Send message"
            >
              ➤
            </button>
          </form>

          <div className="chat-widget-footer">
            Powered by ChurchNavigator
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;