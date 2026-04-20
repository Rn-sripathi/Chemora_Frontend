import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Clock, Copy, FlaskConical, Loader2, MessageSquare, Plus, Send, Sparkles, Trash2, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MoleculeViewer3D from './MoleculeViewer3D';
import { API_BASE, deleteChatSession } from '../api';

const HISTORY_KEY = 'chemora-chat-history';
const MAX_HISTORY = 40;

const DEFAULT_SUGGESTIONS = [
  'Design a 3-step synthesis of celecoxib from commercial materials.',
  'Explain the mechanism and hazard controls for aromatic nitration.',
  'Compare greener solvent alternatives for Suzuki cross-coupling.',
  'How can I optimize yield for a Grignard reaction at scale?',
  'What safety precautions are needed for working with NaH?',
  'Explain retrosynthetic disconnection strategy for ibuprofen.',
];

const excerpt = (text, maxLength = 52) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};

// Strip common question prefixes and produce a compact Claude-style title
const STRIP_PREFIXES = [
  /^(please\s+)?(can\s+you\s+)?(help\s+me\s+)?/i,
  /^(explain|describe|tell me about|what is|what are|how (do|does|can|to)|why (does|is)|design|propose|suggest|compare|give me|provide|generate|write|show me|list)\s+/i,
  /^(a|an|the)\s+/i,
];

const smartTitle = (text, maxLength = 38) => {
  if (!text) return 'New conversation';
  let t = text.trim().replace(/\s+/g, ' ');
  // Capitalise first letter, strip trailing punctuation
  for (const re of STRIP_PREFIXES) t = t.replace(re, '');
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/[?.!]+$/, '').trim();
  return t.length > maxLength ? `${t.slice(0, maxLength - 1)}…` : t;
};

const buildInitialMessages = () => ([
  {
    role: 'assistant',
    content:
      'CHEMORA Research Assistant online. I have access to 12 specialized agents including retrosynthesis planning, safety assessment, literature search, and protocol generation.\n\nAsk me anything about:\n- Synthesis design and route optimization\n- Reaction mechanisms and selectivity\n- Safety assessment and GHS hazard analysis\n- Solvent selection and green chemistry\n- Scale-up considerations and process chemistry\n- Literature precedents and methodology comparison',
    timestamp: new Date().toISOString(),
  },
]);

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistory = (history) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // quota exceeded — silently ignore
  }
};

const groupByDate = (history) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const week = today - 6 * 86400000;
  const month = today - 29 * 86400000;

  const groups = { Today: [], Yesterday: [], 'Previous 7 days': [], 'Previous 30 days': [], Older: [] };

  history.forEach((item) => {
    const ts = new Date(item.savedAt).getTime();
    if (ts >= today) groups.Today.push(item);
    else if (ts >= yesterday) groups.Yesterday.push(item);
    else if (ts >= week) groups['Previous 7 days'].push(item);
    else if (ts >= month) groups['Previous 30 days'].push(item);
    else groups.Older.push(item);
  });

  return Object.entries(groups).filter(([, items]) => items.length > 0);
};

const ChatInterface = () => {
  const [messages, setMessages] = useState(buildInitialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [chatHistory, setChatHistory] = useState(loadHistory);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  const messagesEndRef = useRef(null);
  const composeRef = useRef(null);
  const currentChatIdRef = useRef(`chat-${Date.now()}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!composeRef.current) return;
    composeRef.current.style.height = 'auto';
    composeRef.current.style.height = `${Math.min(composeRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const persistCurrentChat = useCallback((currentMessages) => {
    const hasUserMessage = currentMessages.some((m) => m.role === 'user');
    if (!hasUserMessage) return;

    const firstUser = currentMessages.find((m) => m.role === 'user');
    const title = smartTitle(firstUser?.content || 'Chemistry consultation');
    const id = currentChatIdRef.current;

    const entry = {
      id,
      title,
      savedAt: new Date().toISOString(),
      messages: currentMessages,
    };

    setChatHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const updated = [entry, ...filtered];
      saveHistory(updated);
      return updated;
    });
  }, []);

  const activeTitle = useMemo(() => {
    const firstUserTurn = messages.find((message) => message.role === 'user');
    return firstUserTurn ? excerpt(firstUserTurn.content) : 'New chemistry consultation';
  }, [messages]);

  const sendMessage = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    const nextHistory = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setActiveHistoryId(null);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.session_id) setSessionId(data.session_id);

      const assistantMessage = {
        role: 'assistant',
        content: data.response || 'No response generated.',
        timestamp: new Date().toISOString(),
        context: data.context,
      };

      setMessages((prev) => {
        const updated = [...prev, assistantMessage];
        persistCurrentChat(updated);
        return updated;
      });

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
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    deleteChatSession(sessionId);
    currentChatIdRef.current = `chat-${Date.now()}`;
    setMessages(buildInitialMessages());
    setInput('');
    setSessionId(null);
    setSuggestions(DEFAULT_SUGGESTIONS);
    setCopiedIndex(null);
    setActiveHistoryId(null);
  };

  const loadHistoryChat = (item) => {
    deleteChatSession(sessionId);
    currentChatIdRef.current = item.id;
    setMessages(
      item.messages.map((m) => ({
        ...m,
        timestamp: m.timestamp || new Date().toISOString(),
      })),
    );
    setInput('');
    setSessionId(null);
    setSuggestions(DEFAULT_SUGGESTIONS);
    setCopiedIndex(null);
    setActiveHistoryId(item.id);
  };

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    setChatHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveHistory(updated);
      return updated;
    });
    if (activeHistoryId === id) {
      startNewChat();
    }
  };

  const copyMessage = async (content, idx) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const messageCount = messages.length;
  const groupedHistory = useMemo(() => groupByDate(chatHistory), [chatHistory]);

  return (
    <section className="chat-workbench chatgpt-shell">
      <aside className="chat-rail">
        <button type="button" className="chat-new-btn" onClick={startNewChat}>
          <Plus className="w-4 h-4" />
          New chat
        </button>

        <div className="chat-rail-section">
          <h3>Active Thread</h3>
          <button
            type="button"
            className={`chat-thread-item${!activeHistoryId ? ' is-active' : ''}`}
            onClick={startNewChat}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <div>
              <strong>{activeTitle}</strong>
              <small>{messageCount} messages</small>
            </div>
          </button>
        </div>

        {groupedHistory.length > 0 && (
          <div className="chat-rail-history">
            {groupedHistory.map(([group, items]) => (
              <div key={group} className="chat-rail-section">
                <h3>
                  <Clock className="w-3 h-3" />
                  {group}
                </h3>
                <div className="chat-history-list">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`chat-thread-item chat-history-item${activeHistoryId === item.id ? ' is-active' : ''}`}
                      onClick={() => loadHistoryChat(item)}
                    >
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="chat-history-title">{item.title}</span>
                      <button
                        type="button"
                        className="chat-history-delete"
                        onClick={(e) => deleteHistoryItem(e, item.id)}
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="chat-rail-section">
          <h3>Quick Prompts</h3>
          <div className="chat-rail-prompt-list">
            {DEFAULT_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
              <button
                key={`rail-${idx}`}
                type="button"
                className="chat-rail-prompt"
                onClick={() => sendMessage(suggestion)}
                disabled={loading}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{excerpt(suggestion, 62)}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="chat-main">
        <div className="chat-thread">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const ts = msg.timestamp ? new Date(msg.timestamp) : new Date();
            return (
              <div key={`${msg.role}-${idx}`} className={`chat-row ${isUser ? 'is-user' : 'is-assistant'}`}>
                <article className={`chat-note ${isUser ? 'is-user' : 'is-assistant'}`}>
                  <div className="chat-note-head">
                    <span>
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      {isUser ? 'You' : 'Assistant'}
                    </span>
                    <div className="chat-note-tools">
                      <time>{ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      <button
                        type="button"
                        className="chat-copy-btn"
                        onClick={() => copyMessage(msg.content, idx)}
                        title="Copy message"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedIndex === idx ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className={`chat-note-body ${isUser ? '' : 'markdown-body'}`}>
                    {isUser ? (
                      <p>{msg.content}</p>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    )}
                  </div>

                  {msg.context?.smiles && ['synthesis', 'molecule_info'].includes(msg.context?.last_response_type) ? (
                    <div className="chat-note-viewer">
                      <MoleculeViewer3D
                        smiles={msg.context.smiles}
                        moleculeName={msg.context.current_molecule || 'Molecule'}
                        height="300px"
                      />
                    </div>
                  ) : null}
                </article>
              </div>
            );
          })}

          {loading ? (
            <div className="chat-row is-assistant">
              <article className="chat-note is-assistant is-loading">
                <div className="chat-note-head">
                  <span>
                    <Bot className="w-3.5 h-3.5" /> Assistant
                  </span>
                </div>
                <div className="chat-loading-inline">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking through the synthesis strategy...
                </div>
              </article>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {suggestions.length > 0 && !loading ? (
          <div className="chat-suggestion-bar">
            {suggestions.slice(0, 6).map((suggestion, idx) => (
              <button
                key={`s-${idx}`}
                type="button"
                className="chat-suggestion-chip"
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <form className="chat-compose" onSubmit={handleSubmit}>
          <textarea
            ref={composeRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Message Chemora Assistant about mechanism, route safety, optimization, or reagents..."
            disabled={loading}
            rows={1}
          />
          <div className="chat-compose-actions">
            <small>Enter to send, Shift+Enter for newline</small>
            <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ChatInterface;
