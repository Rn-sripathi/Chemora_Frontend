import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Atom, BarChart2, BeakerIcon, Bot, ChevronLeft, ChevronRight, Clock, Copy, Download, Eye, EyeOff, FlaskConical, Leaf, Loader2, MessageSquare, Microscope, Plus, Send, Sparkles, TestTube, Trash2, User, Wrench, Zap } from 'lucide-react';
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

// Scientist workflow quick-prompt categories shown in the sidebar
const SCIENTIST_PROMPTS = {
  synthesis: {
    label: 'Synthesis',
    icon: 'flask',
    prompts: [
      'Design a retrosynthetic route for a target molecule.',
      'Generate a detailed bench protocol for this synthesis.',
      'Compare alternative synthetic routes by step count and atom economy.',
      'Find literature precedents for this transformation.',
      'What starting materials are commercially available for this route?',
    ],
  },
  troubleshoot: {
    label: 'Troubleshoot',
    icon: 'wrench',
    prompts: [
      'My reaction gave no product — what should I check first?',
      'I\'m getting a major side product — how do I diagnose the cause?',
      'My yield dropped on scale-up — what went wrong?',
      'Starting material is remaining after 12 h — what should I try?',
      'I\'m seeing decomposition at room temperature — what\'s happening?',
    ],
  },
  analysis: {
    label: 'Analysis',
    icon: 'spectrum',
    prompts: [
      'Predict the ¹H NMR shifts for this molecule.',
      'Help me interpret this mass spectrum fragmentation pattern.',
      'What IR bands confirm successful product formation?',
      'What HPLC method should I use for this compound?',
      'Explain the COSY/HSQC cross-peaks I\'m observing.',
    ],
  },
  safety: {
    label: 'Safety',
    icon: 'alert',
    prompts: [
      'What PPE is required for working with this reagent?',
      'Describe emergency procedures for exposure to this chemical.',
      'What chemicals are incompatible with this compound?',
      'What waste disposal procedure applies to this reaction?',
      'Generate a safety briefing for working with organolithiums.',
    ],
  },
  green: {
    label: 'Green',
    icon: 'leaf',
    prompts: [
      'Calculate the atom economy of this synthesis.',
      'Apply the CHEM21 solvent selection guide to my conditions.',
      'Which step has the worst E-factor — how can I improve it?',
      'Suggest bio-based or renewable feedstock alternatives.',
      'How do I reduce the PMI below 10 for this process?',
    ],
  },
};

// Human-readable labels for context intent types
const INTENT_LABELS = {
  synthesis: 'Synthesis',
  safety: 'Safety',
  mechanism: 'Mechanism',
  literature: 'Literature',
  spectroscopy: 'Spectroscopy',
  calculation: 'Calculation',
  troubleshoot: 'Troubleshooting',
  optimize: 'Optimization',
  compare: 'Comparison',
  green_chemistry: 'Green Chemistry',
  scaleup: 'Scale-Up',
  experimental_design: 'Exp. Design',
  molecule_info: 'Molecule Info',
  general: 'General',
};

const excerpt = (text, maxLength = 52) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};

const STRIP_PREFIXES = [
  /^(please\s+)?(can\s+you\s+)?(help\s+me\s+)?/i,
  /^(explain|describe|tell me about|what is|what are|how (do|does|can|to)|why (does|is)|design|propose|suggest|compare|give me|provide|generate|write|show me|list)\s+/i,
  /^(a|an|the)\s+/i,
];

const smartTitle = (text, maxLength = 38) => {
  if (!text) return 'New conversation';
  let t = text.trim().replace(/\s+/g, ' ');
  for (const re of STRIP_PREFIXES) t = t.replace(re, '');
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/[?.!]+$/, '').trim();
  return t.length > maxLength ? `${t.slice(0, maxLength - 1)}…` : t;
};

// Detect loading message based on query content
const detectLoadingMessage = (text) => {
  const lower = text.toLowerCase();
  if (/(synthes|retrosyn|route|make|prepare)\b/i.test(lower)) return 'Planning synthesis routes with retrosynthesis agents…';
  if (/(safe|hazard|toxic|danger|ppe|ghs|corros)\b/i.test(lower)) return 'Checking GHS hazard data and safety databases…';
  if (/(mechanism|electron|pathway|intermediate|how does|why does)/i.test(lower)) return 'Analyzing reaction mechanism and electron flow…';
  if (/(literature|paper|reference|publication|study|precedent)/i.test(lower)) return 'Searching scientific literature databases…';
  if (/(nmr|ir |infrared|mass spec|\bms\b|spectrum|spectroscopy|hplc|chromatography)/i.test(lower)) return 'Retrieving analytical chemistry data…';
  if (/(calculat|stoichiometry|yield|molarity|ph |buffer)/i.test(lower)) return 'Performing stoichiometry calculation…';
  if (/(protocol|procedure|step.by.step|bench)/i.test(lower)) return 'Generating laboratory protocol…';
  if (/(scale.?up|kilogram|pilot|process|flow chemistry)/i.test(lower)) return 'Analyzing scale-up parameters…';
  return 'Processing your chemistry query…';
};

// Detect if a string looks like a SMILES notation
const isSmilesLike = (str) => {
  if (!str || str.length < 3 || str.includes(' ')) return false;
  // Must contain at least one structural SMILES character (branch, ring, bond order)
  if (!/[()[\]=#@\\/]/.test(str)) return false;
  // Must consist only of valid SMILES characters
  return /^[A-Za-z0-9@+\-[\]()=#\\/%$.:]*$/.test(str);
};

// Inline SMILES code renderer — renders a "View 3D" button for SMILES code blocks
const SmilesCodeRenderer = ({ children, className }) => {
  const [viewing, setViewing] = useState(false);
  const codeStr = String(children).trim();
  const isSmiles = !className && isSmilesLike(codeStr);

  if (!isSmiles) {
    return <code className={className}>{children}</code>;
  }

  return (
    <span className="smiles-inline-wrap">
      <code className="smiles-code">{codeStr}</code>
      <button
        type="button"
        className="smiles-view-btn"
        onClick={() => setViewing((v) => !v)}
        title={viewing ? 'Hide 3D structure' : 'View molecule in 3D'}
      >
        {viewing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {viewing ? 'Hide 3D' : 'View 3D'}
      </button>
      {viewing && (
        <span className="smiles-inline-viewer">
          <MoleculeViewer3D
            smiles={codeStr}
            moleculeName={codeStr.length > 28 ? `${codeStr.slice(0, 26)}…` : codeStr}
            height="280px"
            defaultMode="2d"
          />
        </span>
      )}
    </span>
  );
};

// Stable components map — prevents ReactMarkdown from unmounting on every render
const MARKDOWN_COMPONENTS = { code: SmilesCodeRenderer };

const buildInitialMessages = () => ([
  {
    role: 'assistant',
    content:
      "Hi — I'm **Chemora**, your chemistry research assistant. Ask me anything about synthesis, mechanisms, safety, spectroscopy, or lab techniques. Paste a SMILES and I'll show you the 3D structure inline.",
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
  const [exportDone, setExportDone] = useState(false);
  const [activeSciCat, setActiveSciCat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sciWorkflowsOpen, setSciWorkflowsOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const composeRef = useRef(null);
  const currentChatIdRef = useRef(`chat-${Date.now()}`);
  const lastInputRef = useRef('');

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

  // Export the current conversation as a Markdown file
  const exportConversation = useCallback(() => {
    const header = [
      `# Chemora Research Session\n`,
      `**Topic:** ${activeTitle}`,
      `**Exported:** ${new Date().toLocaleString()}\n`,
      `---\n`,
    ].join('\n');

    const body = messages
      .map((m) => {
        const who = m.role === 'user' ? '## You' : '## Chemora Assistant';
        const ts = m.timestamp ? `*${new Date(m.timestamp).toLocaleTimeString()}*` : '';
        return `${who}  ${ts}\n\n${m.content}`;
      })
      .join('\n\n---\n\n');

    const blob = new Blob([header + body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chemora-${activeTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2000);
  }, [messages, activeTitle]);

  const sendMessage = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    lastInputRef.current = trimmed;

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
    lastInputRef.current = '';
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

  // Derive active scientific context from the last assistant message
  const lastContext = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].context) return messages[i].context;
    }
    return null;
  }, [messages]);

  // Active scientist prompts: category selection or backend-driven suggestions
  const visibleSuggestions = useMemo(() => {
    if (activeSciCat && SCIENTIST_PROMPTS[activeSciCat]) {
      return SCIENTIST_PROMPTS[activeSciCat].prompts;
    }
    return suggestions;
  }, [activeSciCat, suggestions]);

  return (
    <section className={`chat-workbench chatgpt-shell${sidebarOpen ? '' : ' rail-collapsed'}`}>
      <aside className="chat-rail">
        <div className="chat-rail-top-row">
          <button type="button" className="chat-new-btn" onClick={startNewChat}>
            <Plus className="w-4 h-4" />
            New chat
          </button>
          <button
            type="button"
            className="chat-rail-collapse-btn"
            onClick={() => setSidebarOpen(false)}
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

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
          <button
            type="button"
            className="chat-sci-section-header"
            onClick={() => { setSciWorkflowsOpen(o => !o); setActiveSciCat(null); }}
            aria-expanded={sciWorkflowsOpen}
          >
            <span>Scientist Workflows</span>
            <ChevronRight className={`chat-sci-chevron${sciWorkflowsOpen ? ' is-open' : ''}`} />
          </button>

          {sciWorkflowsOpen && (
            <>
              <div className="chat-sci-cats">
                {Object.entries(SCIENTIST_PROMPTS).map(([key, cat]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chat-sci-cat-btn${activeSciCat === key ? ' is-active' : ''}`}
                    onClick={() => setActiveSciCat(activeSciCat === key ? null : key)}
                    title={cat.label}
                  >
                    {key === 'synthesis' && <FlaskConical className="w-3.5 h-3.5" />}
                    {key === 'troubleshoot' && <Wrench className="w-3.5 h-3.5" />}
                    {key === 'analysis' && <Microscope className="w-3.5 h-3.5" />}
                    {key === 'safety' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {key === 'green' && <Leaf className="w-3.5 h-3.5" />}
                    {cat.label}
                  </button>
                ))}
              </div>

              {activeSciCat && (
                <div className="chat-rail-prompt-list">
                  {SCIENTIST_PROMPTS[activeSciCat].prompts.map((p, idx) => (
                    <button
                      key={`sci-${idx}`}
                      type="button"
                      className="chat-rail-prompt"
                      onClick={() => { sendMessage(p); setActiveSciCat(null); }}
                      disabled={loading}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{excerpt(p, 60)}</span>
                    </button>
                  ))}
                </div>
              )}

              {!activeSciCat && (
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
              )}
            </>
          )}
        </div>
      </aside>

      <div className="chat-main">
        {/* Floating sidebar expand tab — visible only when sidebar is collapsed */}
        {!sidebarOpen && (
          <button
            type="button"
            className="rail-expand-tab"
            onClick={() => setSidebarOpen(true)}
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Context status strip — shows active molecule, intent, and step count */}
        {lastContext?.current_molecule && (
          <div className="chat-context-strip">
            <span className="ctx-chip ctx-molecule">
              <TestTube className="w-3 h-3" />
              {lastContext.current_molecule}
            </span>
            {lastContext.last_response_type && lastContext.last_response_type !== 'general' && (
              <span className="ctx-chip ctx-intent">
                {INTENT_LABELS[lastContext.last_response_type] || lastContext.last_response_type}
              </span>
            )}
            {lastContext.synthesis_steps?.length > 0 && (
              <span className="ctx-chip ctx-step">
                Step {lastContext.current_step_number || lastContext.synthesis_steps.length}
              </span>
            )}
            {lastContext.reaction_type && (
              <span className="ctx-chip ctx-reaction">
                {lastContext.reaction_type}
              </span>
            )}
          </div>
        )}

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
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Show molecule viewer whenever SMILES is present in context */}
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
                  {detectLoadingMessage(lastInputRef.current)}
                </div>
              </article>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {visibleSuggestions.length > 0 && !loading ? (
          <div className="chat-suggestion-bar">
            {visibleSuggestions.slice(0, 6).map((suggestion, idx) => (
              <button
                key={`s-${idx}`}
                type="button"
                className="chat-suggestion-chip"
                onClick={() => { sendMessage(suggestion); setActiveSciCat(null); }}
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
            placeholder="Ask about synthesis, mechanisms, safety, spectroscopy, or lab protocols… Paste a SMILES to visualize a molecule."
            disabled={loading}
            rows={1}
          />
          <div className="chat-compose-actions">
            <small>Enter to send · Shift+Enter for newline</small>
            <div className="chat-compose-btns">
              <button
                type="button"
                className="chat-export-btn"
                onClick={exportConversation}
                disabled={messages.length <= 1}
                title="Export conversation as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                {exportDone ? 'Saved!' : 'Export'}
              </button>
              <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ChatInterface;
