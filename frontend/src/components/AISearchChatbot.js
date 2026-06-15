import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './AISearchChatbot.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const AISearchChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hi! I'm your church finder assistant. Tell me what you're looking for and I'll help you find the perfect church or event.\n\nFor example: \"I'm new to London and looking for a contemporary church\" or \"Find me family events this weekend\""
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_URL}/api/search/chat`, {
        message: input,
        conversation_history: messages
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
        results: response.data.results
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderResult = (result) => {
    const type = result.type || 'church';
    const link = type === 'church' ? `/churches/${result._id}` : 
                 type === 'event' ? `/events/${result._id}` : 
                 `/worship-leaders/${result._id}`;

    return (
      <a href={link} key={result._id} className="chatbot-result" target="_blank" rel="noopener noreferrer">
        <div className="chatbot-result__image">
          {result.images?.[0] || result.image || result.profile_image ? (
            <img src={result.images?.[0] || result.image || result.profile_image} alt={result.name || result.title} />
          ) : (
            <div className="chatbot-result__placeholder">📍</div>
          )}
        </div>
        <div className="chatbot-result__content">
          <div className="chatbot-result__title">{result.name || result.title}</div>
          <div className="chatbot-result__meta">
            {result.address?.city || result.location?.city}
            {result.match_score && ` • ${result.match_score}% match`}
          </div>
        </div>
      </a>
    );
  };

  return (
    <>
      <button 
        className={`chatbot-fab ${isOpen ? 'chatbot-fab--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI search assistant"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <circle cx="9" cy="10" r="1" fill="currentColor"/>
            <circle cx="12" cy="10" r="1" fill="currentColor"/>
            <circle cx="15" cy="10" r="1" fill="currentColor"/>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header__title">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M10 6v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              AI Church Finder
            </div>
            <button onClick={() => setIsOpen(false)} className="chatbot-header__close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div key={index} className={`chatbot-message chatbot-message--${message.role}`}>
                <div className="chatbot-message__content">
                  {message.content}
                </div>
                {message.results && message.results.length > 0 && (
                  <div className="chatbot-results">
                    {message.results.map(renderResult)}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="chatbot-message chatbot-message--assistant">
                <div className="chatbot-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              rows="1"
            />
            <button onClick={sendMessage} disabled={!input.trim() || isTyping}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M18 10L2 2l4 8-4 8 16-8z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AISearchChatbot;