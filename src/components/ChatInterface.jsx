import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, User } from 'lucide-react';
import MoleculeViewer3D from './MoleculeViewer3D';
import { API_BASE } from '../api';

const DEFAULT_SUGGESTIONS = [
  'Propose a safer synthesis route for aspirin.',
  'Explain mechanism and hazard controls for nitration.',
  'Suggest greener solvent alternatives for this route.',
  'How can I optimize yield without increasing risk?',
];

const formatLines = (content) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'AI Research Assistant initialized. Ask for mechanism details, synthesis strategy, hazard analysis, or optimization guidance.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: 'user', content: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      if (data.session_id) setSessionId(data.session_id);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response || 'No response generated.',
          timestamp: new Date(),
          context: data.context,
        },
      ]);

      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I hit a connection error while processing that. Please retry in a few seconds.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <section className="chat-workbench">
      <div className="chat-banner">
        <div>
          <h2>
            <Bot className="w-4 h-4" /> AI Research Assistant initialized
          </h2>
          <p>Mechanism analysis, safety considerations, and route optimization for synthesis workflows.</p>
        </div>
        <time>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
      </div>

      <div className="chat-thread">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <article key={`${msg.role}-${idx}`} className={`chat-note ${isUser ? 'is-user' : 'is-assistant'}`}>
              <div className="chat-note-head">
                <span>
                  {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  {isUser ? 'You' : 'Assistant'}
                </span>
                <time>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
              </div>

              <div className="chat-note-body">
                {formatLines(msg.content).map((line, lineIdx) => (
                  <p key={`${idx}-${lineIdx}`}>{line}</p>
                ))}
              </div>

              {msg.context?.smiles ? (
                <div className="chat-note-viewer">
                  <MoleculeViewer3D
                    smiles={msg.context.smiles}
                    moleculeName={msg.context.current_molecule || 'Molecule'}
                    height="300px"
                  />
                </div>
              ) : null}
            </article>
          );
        })}

        {loading ? (
          <article className="chat-note is-assistant is-loading">
            <div className="chat-note-head">
              <span>
                <Bot className="w-3 h-3" /> Assistant
              </span>
            </div>
            <div className="chat-loading-inline">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating recommendation...
            </div>
          </article>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {suggestions.length > 0 && !loading ? (
        <div className="chat-suggestion-bar">
          {suggestions.map((suggestion, idx) => (
            <button key={`s-${idx}`} type="button" className="example-chip" onClick={() => sendMessage(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form className="chat-compose" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for mechanism, route, safety, or optimization guidance..."
          disabled={loading}
        />
        <button type="submit" className="run-btn" disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </section>
  );
};

export default ChatInterface;
