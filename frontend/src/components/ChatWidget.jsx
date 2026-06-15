import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Sparkles } from 'lucide-react';
import './ChatWidget.css';

const ChatWidget = ({ listingType, slug, listingName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
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
      const defaultActions = {
        church: ['Service times', 'Find us', 'Meet the pastor', 'Upcoming events'],
        event: ['Register now', "What's included", 'Location & parking'],
        pastor: ['Invite to visit', 'View sermons', 'Contact']
      };
      setSuggestedActions([...(defaultActions[listingType] || []), 'Contact directly']);
    }
  }, [isOpen, listingType, messages.length]);

  const sendMessage = async (messageText) => {
    const userMessage = messageText || input.trim();
    if (!userMessage) return;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${listingType}/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      const botMessage = {
        role: 'assistant',
        content: data.answer,
        source: data.source,
        contactPrompt: data.contact_prompt,
        contactEmail: data.contact_email,
        contactPhone: data.contact_phone
      };

      setMessages(prev => [...prev, botMessage]);
      
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
      setIsLoading(false);
    }
  };

  const handleQuickReply = (action) => {
    sendMessage(action);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-widget-button"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
          <span className="chat-widget-pulse" />
        </button>
      )}

      {isOpen && (
        <div className="chat-widget-container">
          <div className="chat-widget-header">
            <div className="chat-widget-header-content">
              <MessageCircle size={20} />
              <div>
                <div className="chat-widget-title">Ask about {listingName}</div>
                <div className="chat-widget-subtitle">Quick answers, instant help</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="chat-widget-close" aria-label="Close chat">
              <X size={20} />
            </button>
          </div>

          <div className="chat-widget-messages">
            {messages.length === 0 && (
              <div className="chat-widget-welcome">
                <MessageCircle size={48} className="chat-widget-welcome-icon" />
                <p>Hi! I can help answer questions about {listingName}.</p>
                <p className="chat-widget-welcome-subtitle">Try asking about service times, location, or upcoming events.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-widget-message chat-widget-message-${msg.role}`}>
                <div className="chat-widget-message-content">
                  {msg.source === 'ai' && (
                    <Sparkles size={14} className="chat-widget-ai-icon" />
                  )}
                  {msg.content}
                  
                  {msg.contactPrompt && (
                    <div className="chat-widget-contact-card">
                      {msg.contactEmail && (
                        <div className="chat-widget-contact-item">
                          <strong>Email:</strong> <a href={`mailto:${msg.contactEmail}`}>{msg.contactEmail}</a>
                        </div>
                      )}
                      {msg.contactPhone && (
                        <div className="chat-widget-contact-item">
                          <strong>Phone:</strong> <a href={`tel:${msg.contactPhone}`}>{msg.contactPhone}</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="chat-widget-message chat-widget-message-assistant">
                <div className="chat-widget-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {suggestedActions.length > 0 && messages.length > 0 && !isLoading && (
            <div className="chat-widget-quick-replies">
              {suggestedActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(action)}
                  className="chat-widget-quick-reply"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="chat-widget-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="chat-widget-input"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="chat-widget-send"
              aria-label="Send message"
            >
              <Send size={18} />
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