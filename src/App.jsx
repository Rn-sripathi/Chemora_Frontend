import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Atom,
  BookOpen,
  FlaskConical,
  Leaf,
  Loader2,
  MessageSquare,
  Moon,
  Paperclip,
  Send,
  ShieldCheck,
  Sun,
  X,
  Zap,
  Beaker,
  GitBranch,
} from 'lucide-react';
import { processQueryStream } from './api';
import AgentOrchestrator from './components/AgentOrchestrator';
import ChatInterface from './components/ChatInterface';
import MoleculeStructure2D from './components/MoleculeStructure2D';

const PLANNER_EXAMPLES = [
  'Design a practical synthesis of celecoxib at 5 g scale from commercial materials.',
  'Propose a safer and scalable route for aspirin with green solvent suggestions.',
  'Suggest a low-temperature ibuprofen route and estimate a likely yield window.',
];

const SCALE_OPTIONS = ['1', '5', '10', '25', '50'];

const CONSTRAINT_LABELS = {
  lowHazard: 'low hazard profile',
  scalable: 'scalable to pilot level',
  tempLimit: 'temperature max 50C',
};

const LAB_PRESETS = [
  {
    label: 'Green Solvents',
    instruction: 'Prioritize greener solvents (EtOH, EtOAc, 2-MeTHF) and avoid chlorinated solvents.',
  },
  {
    label: 'Scale-Up Safe',
    instruction: 'Favor scalable operations and avoid pyrophoric or highly moisture-sensitive reagents.',
  },
  {
    label: 'Low Temp Window',
    instruction: 'Constrain all key transformations to 0-40C and note cooling strategy.',
  },
  {
    label: 'Cost-Aware',
    instruction: 'Prefer commercially available reagents and minimize high-cost catalysts.',
  },
];

const SCIENCE_PILLS = [
  { label: 'Molecule Profiling', icon: Atom },
  { label: 'Route Intelligence', icon: FlaskConical },
  { label: 'Scale Safety', icon: ShieldCheck },
  { label: 'Agent-to-Agent', icon: Zap },
  { label: 'Retrosynthesis', icon: GitBranch },
];

const getInitialTheme = () => {
  const persisted = localStorage.getItem('chemora-theme');
  if (persisted === 'dark' || persisted === 'light') return persisted;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const toSubscriptFormula = (formula) => {
  if (!formula) return null;
  return formula.split(/(\d+)/).map((chunk, idx) => {
    if (/^\d+$/.test(chunk)) return <sub key={`f-${idx}`}>{chunk}</sub>;
    return <span key={`f-${idx}`}>{chunk}</span>;
  });
};

const confidenceLabel = (value) => {
  if (typeof value !== 'number') return null;
  const normalized = value > 1 ? value : value * 100;
  return `${Math.round(normalized)}% conf`;
};

const shortReactionLabel = (reaction) => {
  if (!reaction) return 'Reaction step';
  const [left] = reaction.split('->');
  if (!left) return 'Reaction step';
  return left
    .split('+')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' + ');
};

const toStringList = (...inputs) => {
  const list = [];
  inputs.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === 'string' && entry.trim()) list.push(entry.trim());
      });
    } else if (typeof value === 'string' && value.trim()) {
      list.push(value.trim());
    }
  });
  return [...new Set(list)];
};

const pickFirstString = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
};

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [activeView, setActiveView] = useState('planner');

  const [query, setQuery] = useState('');
  const [targetName, setTargetName] = useState('');
  const [smilesInput, setSmilesInput] = useState('');
  const [scale, setScale] = useState('5');
  const [constraints, setConstraints] = useState({
    lowHazard: true,
    scalable: true,
    tempLimit: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [agentProgress, setAgentProgress] = useState({ activeIndex: -1, completedIndices: [] });
  const [a2aMessages, setA2aMessages] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chemora-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const clearFile = () => setSelectedFile(null);

  const applyExample = (text) => {
    setQuery(text);
    setActiveView('planner');
  };

  const applyPreset = (instruction) => {
    setQuery((prev) => (prev ? `${prev}\n${instruction}` : instruction));
  };

  const normalizedResult = useMemo(() => {
    if (!result) return null;
    return {
      intent: result.intent || {},
      molecule: result.canonical_data || result.molecule_info || {},
      routes: Array.isArray(result.routes) ? result.routes : [],
      protocol: result.protocol || '',
      literature: result.literature_results || result.literature || [],
      reactions: result.reaction_results || result.reactions || [],
      warnings: toStringList(result.warnings, result.warning, result.errors, result.error_messages),
    };
  }, [result]);

  useEffect(() => {
    if (!normalizedResult) return;
    if (normalizedResult.molecule?.name) {
      setTargetName((prev) => prev || normalizedResult.molecule.name);
    } else if (normalizedResult.intent?.target) {
      setTargetName((prev) => prev || normalizedResult.intent.target);
    }
    if (normalizedResult.molecule?.canonical_smiles) {
      setSmilesInput((prev) => prev || normalizedResult.molecule.canonical_smiles);
    }
  }, [normalizedResult]);

  const routeSummary = useMemo(() => {
    if (!normalizedResult?.routes?.length) return [];
    return normalizedResult.routes.slice(0, 3).map((route, idx) => ({
      key: route.id || `${idx}`,
      index: idx + 1,
      score: typeof route.score === 'number' ? Number(route.score).toFixed(1) : '--',
      steps: Array.isArray(route.steps) ? route.steps.length : 0,
      cost: route.cost?.total_estimated_cost || null,
    }));
  }, [normalizedResult]);

  const activeSmiles = useMemo(
    () => smilesInput || normalizedResult?.molecule?.canonical_smiles || '',
    [smilesInput, normalizedResult],
  );

  const chemicalSnapshot = useMemo(() => {
    if (!activeSmiles) return [];

    const tokens = activeSmiles.match(/Cl|Br|[A-Z][a-z]?|[cnosp]/g) || [];
    const heavyAtoms = tokens.filter((token) => token !== 'H').length;
    const heteroAtoms = tokens.filter((token) => !['C', 'c', 'H'].includes(token)).length;
    const ringMarkers = (activeSmiles.match(/\d/g) || []).length / 2;
    const aromaticSymbols = (activeSmiles.match(/[cnosp]/g) || []).length;
    const stereoCenters = (activeSmiles.match(/@/g) || []).length;

    return [
      { label: 'Heavy Atoms', value: heavyAtoms || '--' },
      { label: 'Hetero Atoms', value: heteroAtoms || '--' },
      { label: 'Ring Count', value: ringMarkers ? Math.round(ringMarkers) : '--' },
      { label: 'Aromatic Marks', value: aromaticSymbols || '--' },
      { label: 'Stereo Flags', value: stereoCenters || '--' },
      { label: 'SMILES Length', value: activeSmiles.length || '--' },
    ];
  }, [activeSmiles]);

  const elementProfile = useMemo(() => {
    const formula = normalizedResult?.molecule?.formula;
    if (!formula) return [];

    const parsed = [];
    const pattern = /([A-Z][a-z]?)(\d*)/g;
    let match;
    while ((match = pattern.exec(formula)) !== null) {
      parsed.push({
        symbol: match[1],
        count: Number(match[2] || '1'),
      });
    }
    return parsed;
  }, [normalizedResult]);

  const reagentRows = useMemo(() => {
    if (!normalizedResult?.routes?.length) return [];
    const rows = [];
    const seen = new Set();

    normalizedResult.routes.forEach((route) => {
      (Array.isArray(route.steps) ? route.steps : []).forEach((step) => {
        const name = shortReactionLabel(step.reaction);
        if (seen.has(name)) return;
        seen.add(name);
        rows.push({
          name,
          temperature: step.conditions || 'Ambient',
          yield: step.prediction?.predicted_yield || null,
          feasibility: step.prediction?.feasibility || null,
        });
      });
    });

    return rows.slice(0, 6);
  }, [normalizedResult]);

  const diagnosticRows = useMemo(() => {
    if (!normalizedResult) return [];
    return [
      { label: 'Routes', value: normalizedResult.routes.length || 0 },
      { label: 'Literature Hits', value: normalizedResult.literature.length || 0 },
      { label: 'Reaction Analogs', value: normalizedResult.reactions.length || 0 },
      { label: 'Reagent Candidates', value: reagentRows.length || 0 },
      { label: 'Warnings', value: normalizedResult.warnings.length || 0 },
    ];
  }, [normalizedResult, reagentRows.length]);

  const literatureCards = useMemo(() => {
    if (!normalizedResult?.literature?.length) return [];
    return normalizedResult.literature.slice(0, 8).map((entryRaw, index) => {
      const entry =
        entryRaw && typeof entryRaw === 'object'
          ? entryRaw
          : { text: typeof entryRaw === 'string' ? entryRaw : '' };
      const source = pickFirstString(entry.source, entry.database, entry.provider) || 'Literature';
      const title = pickFirstString(entry.title, entry.name, entry.reaction) || `Precedent ${index + 1}`;
      const detail =
        pickFirstString(entry.summary, entry.description, entry.abstract, entry.text, entry.snippet) ||
        'No abstract provided.';
      const yieldText = pickFirstString(
        entry.yield ? `Yield: ${entry.yield}` : '',
        entry.predicted_yield ? `Yield: ${entry.predicted_yield}%` : '',
      );

      return {
        source,
        title,
        detail,
        yieldText,
        url: pickFirstString(entry.url, entry.link, entry.reference_url),
      };
    });
  }, [normalizedResult]);

  const reactionCards = useMemo(() => {
    if (!normalizedResult?.reactions?.length) return [];
    return normalizedResult.reactions.slice(0, 10).map((entryRaw, index) => {
      const entry =
        entryRaw && typeof entryRaw === 'object'
          ? entryRaw
          : { reaction: typeof entryRaw === 'string' ? entryRaw : '' };
      const title = pickFirstString(entry.name, entry.transformation, entry.reaction_name) || `Reaction ${index + 1}`;
      const reaction = pickFirstString(entry.reaction, entry.reaction_smiles, entry.smiles);
      const conditions = pickFirstString(entry.conditions, entry.solvent, entry.catalyst, entry.temperature);
      const similarity =
        typeof entry.similarity === 'number' ? `${Math.round(entry.similarity * 100)}% similarity` : '';

      return {
        title,
        reaction,
        conditions,
        similarity,
        source: pickFirstString(entry.source, entry.database),
      };
    });
  }, [normalizedResult]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const enabledConstraints = Object.entries(constraints)
      .filter(([, enabled]) => enabled)
      .map(([key]) => CONSTRAINT_LABELS[key]);

    const composedQuery = [
      query.trim() || `Design a practical synthesis route for ${targetName || 'target molecule'}.`,
      targetName ? `Target: ${targetName}` : null,
      smilesInput ? `Canonical SMILES: ${smilesInput}` : null,
      `Scale: ${scale} g`,
      enabledConstraints.length ? `Constraints: ${enabledConstraints.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    if (!composedQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAgentProgress({ activeIndex: -1, completedIndices: [] });
    setA2aMessages([]);

    const queryPromise = processQueryStream(
      composedQuery,
      selectedFile,
      (agentUpdate) => {
        setAgentProgress((prev) => {
          const next = { ...prev, activeIndex: agentUpdate.index };
          if (agentUpdate.status === 'complete' && !prev.completedIndices.includes(agentUpdate.index)) {
            next.completedIndices = [...prev.completedIndices, agentUpdate.index];
          }
          return next;
        });
      },
      (a2aMsg) => {
        setA2aMessages((prev) => [...prev, a2aMsg]);
      },
    );

    try {
      const data = await queryPromise;
      setResult(data);
      if (data?.error) setError(data.error);
      // Mark pipeline as finished (activeIndex -1 = idle) but keep completedIndices
      setAgentProgress((prev) => ({ ...prev, activeIndex: -1 }));
    } catch (err) {
      if (err.message?.includes('timed out')) {
        setError('Request timed out after 5 minutes. Try a shorter or simpler query.');
      } else {
        setError('Failed to connect to backend. Ensure the API server is running on port 8000.');
      }
      console.error('API Error:', err);
      setAgentProgress({ activeIndex: -1, completedIndices: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className={`workspace-header${activeView === 'chat' ? ' header-compact' : ''}`}>
        <div className="header-brand-block">
          <div className="brand-icon-ring">
            <Beaker className="w-6 h-6" />
          </div>
          <div>
            <p className="eyebrow">AI-Powered Synthesis Workspace</p>
            <h1 className="brand-title">CHEMORA</h1>
          </div>
        </div>
        <p className="brand-subtitle">
          Design, compare, and operationalize chemical routes with orchestration-grade AI agents and real-time Agent-to-Agent communication.
        </p>
        <div className="science-pill-row">
          {SCIENCE_PILLS.map((pill) => {
            const Icon = pill.icon;
            return (
              <span key={pill.label} className="science-pill">
                <Icon className="w-3.5 h-3.5" />
                {pill.label}
              </span>
            );
          })}
        </div>

        <div className="workspace-actions">
          <div className="mode-switch" role="tablist" aria-label="Application views">
            <button
              type="button"
              className={`mode-btn ${activeView === 'planner' ? 'is-active' : ''}`}
              onClick={() => setActiveView('planner')}
              role="tab"
              aria-selected={activeView === 'planner'}
            >
              <FlaskConical className="w-4 h-4" />
              Synthesis Planner
            </button>
            <button
              type="button"
              className={`mode-btn ${activeView === 'chat' ? 'is-active' : ''}`}
              onClick={() => setActiveView('chat')}
              role="tab"
              aria-selected={activeView === 'chat'}
            >
              <MessageSquare className="w-4 h-4" />
              Chat Assistant
            </button>
          </div>

          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <main className="workspace-main">
        <div key={activeView} className="view-panel">
        {activeView === 'chat' ? (
          <ChatInterface />
        ) : (
          <section className="planner-layout">
            <aside className="planner-sidebar">
              <article className="compound-card">
                <div className="compound-top">
                  <h3>{targetName || 'Target Molecule'}</h3>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <p className="compound-caption">Structure slate, molecular profile, and safety gates.</p>

                <div className="compound-slate">
                  <MoleculeStructure2D
                    smiles={smilesInput || normalizedResult?.molecule?.canonical_smiles}
                    height={170}
                  />
                </div>

                <dl className="compound-stats">
                  <div>
                    <dt>Molecular Weight</dt>
                    <dd>{normalizedResult?.molecule?.molecular_weight || '--'}</dd>
                  </div>
                  <div>
                    <dt>Formula</dt>
                    <dd>{toSubscriptFormula(normalizedResult?.molecule?.formula) || '--'}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{confidenceLabel(normalizedResult?.routes?.[0]?.confidence) || '--'}</dd>
                  </div>
                </dl>

                <div className="compound-badges">
                  <span><AlertTriangle className="w-3 h-3" /> Safety-first</span>
                  <span><Leaf className="w-3 h-3" /> Green options</span>
                </div>
              </article>

              <article className="side-panel">
                <div className="side-panel-head">
                  <h4>Proposed Routes</h4>
                </div>
                {routeSummary.length > 0 ? (
                  <div className="route-mini-list">
                    {routeSummary.map((route) => (
                      <div key={route.key} className="route-mini-item">
                        <div>
                          <p>Route {route.index}</p>
                          <small>{route.steps} steps</small>
                        </div>
                        <div>
                          <strong>{route.score}</strong>
                          <small>{route.cost ? `$${route.cost}` : ''}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-note">No routes yet. Run the synthesis pipeline to populate suggestions.</p>
                )}
              </article>

              <article className="side-panel">
                <div className="side-panel-head">
                  <h4>Chemical Snapshot</h4>
                </div>
                {chemicalSnapshot.length > 0 ? (
                  <div className="chem-stat-grid">
                    {chemicalSnapshot.map((item) => (
                      <div key={item.label} className="chem-stat-cell">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-note">Add SMILES to generate instant molecular descriptors.</p>
                )}

                <div className="element-profile">
                  <p>Element Profile</p>
                  {elementProfile.length > 0 ? (
                    <div className="element-chip-row">
                      {elementProfile.map((element) => (
                        <span key={`${element.symbol}-${element.count}`} className="element-chip">
                          {element.symbol}
                          <b>{element.count}</b>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <small>Formula breakdown appears after molecule canonicalization.</small>
                  )}
                </div>
              </article>

              <article className="side-panel">
                <div className="side-panel-head">
                  <h4>Lab Presets</h4>
                </div>
                <div className="preset-list">
                  {LAB_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="preset-btn"
                      onClick={() => applyPreset(preset.instruction)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </article>
            </aside>

            <section className="planner-content">
              <article className="paper-panel">
                <h2 className="panel-title">Target Synthesis</h2>

                <form onSubmit={handleSubmit} className="synthesis-form">
                  <div className="form-grid two-col">
                    <label>
                      <span>Target Name</span>
                      <input value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="Celecoxib" />
                    </label>
                    <label>
                      <span>Scale (g)</span>
                      <select value={scale} onChange={(e) => setScale(e.target.value)}>
                        {SCALE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    <span>SMILES</span>
                    <input
                      value={smilesInput}
                      onChange={(e) => setSmilesInput(e.target.value)}
                      placeholder="Enter canonical SMILES"
                    />
                  </label>

                  <label>
                    <span>Objective</span>
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Describe route goals, hazards to avoid, and process constraints..."
                      rows={4}
                    />
                  </label>

                  <div className="constraint-grid">
                    {Object.entries(CONSTRAINT_LABELS).map(([key, label]) => (
                      <label key={key} className="check-row">
                        <input
                          type="checkbox"
                          checked={constraints[key]}
                          onChange={(e) => setConstraints((prev) => ({ ...prev, [key]: e.target.checked }))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="form-actions">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="file-upload" className="ghost-btn" title="Attach molecule sketch or image">
                      <Paperclip className="w-4 h-4" />
                      Attach
                    </label>

                    <button type="submit" disabled={loading} className="run-btn">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Run Synthesis Pipeline
                    </button>
                  </div>
                </form>

                {selectedFile ? (
                  <div className="file-pill">
                    <Paperclip className="w-3 h-3" />
                    <span>{selectedFile.name}</span>
                    <button type="button" onClick={clearFile} aria-label="Remove file">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}

                <div className="example-row">
                  {PLANNER_EXAMPLES.map((example) => (
                    <button key={example} type="button" className="example-chip" onClick={() => applyExample(example)}>
                      {example}
                    </button>
                  ))}
                </div>
              </article>

              {!loading && !normalizedResult && (
                <article className="welcome-hero">
                  <div className="hero-molecule-bg" aria-hidden="true">
                    <svg viewBox="0 0 200 200" className="hero-molecule-svg">
                      <circle cx="100" cy="60" r="8" className="hero-atom hero-atom-1" />
                      <circle cx="60" cy="100" r="8" className="hero-atom hero-atom-2" />
                      <circle cx="140" cy="100" r="8" className="hero-atom hero-atom-3" />
                      <circle cx="80" cy="140" r="6" className="hero-atom hero-atom-4" />
                      <circle cx="120" cy="140" r="6" className="hero-atom hero-atom-5" />
                      <circle cx="100" cy="100" r="10" className="hero-atom hero-atom-6" />
                      <line x1="100" y1="60" x2="100" y2="100" className="hero-bond" />
                      <line x1="60" y1="100" x2="100" y2="100" className="hero-bond" />
                      <line x1="140" y1="100" x2="100" y2="100" className="hero-bond" />
                      <line x1="80" y1="140" x2="100" y2="100" className="hero-bond" />
                      <line x1="120" y1="140" x2="100" y2="100" className="hero-bond" />
                    </svg>
                  </div>
                  <div className="hero-content">
                    <h3>Ready to Design Your Synthesis</h3>
                    <p>
                      Enter a target molecule above, configure your constraints, and let our
                      12-agent pipeline design optimized synthetic routes with real-time
                      Agent-to-Agent communication.
                    </p>
                    <div className="hero-features">
                      <div className="hero-feature">
                        <Zap className="w-4 h-4" />
                        <span>A2A Protocol</span>
                        <small>Agents share insights in real-time</small>
                      </div>
                      <div className="hero-feature">
                        <GitBranch className="w-4 h-4" />
                        <span>Multi-Route</span>
                        <small>Parallel route exploration</small>
                      </div>
                      <div className="hero-feature">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Safety-First</span>
                        <small>GHS hazard screening built-in</small>
                      </div>
                    </div>
                  </div>
                </article>
              )}

              {(loading || agentProgress.completedIndices.length > 0) ? (
                <article className="paper-panel">
                  <AgentOrchestrator
                    isActive={loading}
                    activeIndex={agentProgress.activeIndex}
                    completedIndices={agentProgress.completedIndices}
                    a2aMessages={a2aMessages}
                  />
                </article>
              ) : null}

              {error ? <article className="paper-panel error-surface">{error}</article> : null}

              {normalizedResult ? (
                <section className="planner-results-grid">
                  <article className="paper-panel full-span">
                    <h3 className="panel-subtitle">
                      <Activity className="w-4 h-4" /> Run Diagnostics
                    </h3>
                    <div className="diagnostic-grid">
                      {diagnosticRows.map((item) => (
                        <div key={item.label} className="diagnostic-cell">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                    {normalizedResult.warnings.length > 0 ? (
                      <div className="warning-stack">
                        {normalizedResult.warnings.map((warning, idx) => (
                          <p key={`warning-${idx}`}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {warning}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </article>

                  <article className="paper-panel">
                    <h3 className="panel-subtitle">
                      <Activity className="w-4 h-4" /> Parsed Intent
                    </h3>
                    <div className="mini-kv-grid">
                      <div>
                        <span>Target</span>
                        <strong>{normalizedResult.intent.target || targetName || 'N/A'}</strong>
                      </div>
                      <div>
                        <span>Mode</span>
                        <strong>{normalizedResult.intent.mode || 'automation'}</strong>
                      </div>
                      <div>
                        <span>Priority</span>
                        <strong>{normalizedResult.intent.priority || 'normal'}</strong>
                      </div>
                      <div>
                        <span>Canonicalized</span>
                        <strong>{normalizedResult.molecule?.name ? 'yes' : 'pending'}</strong>
                      </div>
                    </div>
                  </article>

                  <article className="paper-panel">
                    <h3 className="panel-subtitle">
                      <Atom className="w-4 h-4" /> Reagent Suggestions
                    </h3>
                    {reagentRows.length > 0 ? (
                      <div className="reagent-list">
                        {reagentRows.map((item, idx) => (
                          <div key={`${item.name}-${idx}`} className="reagent-item">
                            <h4>{item.name}</h4>
                            <p>{item.temperature}</p>
                            <div>
                              <span>{item.yield ? `Yield ${item.yield}%` : 'Yield variable'}</span>
                              <span>{item.feasibility || 'Feasibility unknown'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-note">No reagent list available yet for this run.</p>
                    )}
                  </article>

                  <article className="paper-panel full-span">
                    <h3 className="panel-subtitle">
                      <FlaskConical className="w-4 h-4" /> Synthetic Routes
                    </h3>
                    <div className="route-detail-list">
                      {normalizedResult.routes.length > 0 ? (
                        normalizedResult.routes.map((route, routeIdx) => (
                          <div key={route.id || routeIdx} className="route-detail-card">
                            <div className="route-detail-head">
                              <h4>Route {routeIdx + 1}</h4>
                              <div>
                                {typeof route.score === 'number' ? <span>Score {route.score.toFixed(1)}</span> : null}
                                {route.confidence ? <span>{confidenceLabel(route.confidence)}</span> : null}
                              </div>
                            </div>
                            <p className="route-algo">{route.algorithm || 'Workflow route'}</p>
                            <div className="route-step-list">
                              {(Array.isArray(route.steps) ? route.steps : []).map((step, stepIdx) => (
                                <p key={`${routeIdx}-${stepIdx}`}>{step.reaction || 'Reaction step'} | {step.conditions || 'conditions not specified'}</p>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="empty-note">No synthetic routes were returned.</p>
                      )}
                    </div>
                  </article>

                  <article className="paper-panel full-span">
                    <h3 className="panel-subtitle">
                      <BookOpen className="w-4 h-4" /> Literature Precedents
                    </h3>
                    {literatureCards.length > 0 ? (
                      <div className="literature-list">
                        {literatureCards.map((item, idx) => (
                          <article key={`${item.title}-${idx}`} className="literature-card">
                            <div className="literature-head">
                              <h4>{item.title}</h4>
                              <span>{item.source}</span>
                            </div>
                            <p>{item.detail}</p>
                            <div className="literature-foot">
                              <small>{item.yieldText || 'Yield not reported'}</small>
                              {item.url ? (
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                  Open Reference
                                </a>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-note">No literature precedents were returned for this run.</p>
                    )}
                  </article>

                  <article className="paper-panel full-span">
                    <h3 className="panel-subtitle">
                      <Atom className="w-4 h-4" /> Reaction Pathways
                    </h3>
                    {reactionCards.length > 0 ? (
                      <div className="reaction-grid">
                        {reactionCards.map((item, idx) => (
                          <article key={`${item.title}-${idx}`} className="reaction-card">
                            <div className="reaction-head">
                              <h4>{item.title}</h4>
                              {item.similarity ? <span>{item.similarity}</span> : null}
                            </div>
                            <code>{item.reaction || 'Reaction string unavailable'}</code>
                            <div className="reaction-meta">
                              <small>{item.conditions || 'Conditions unavailable'}</small>
                              <small>{item.source || 'Generated'}</small>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-note">No reaction analogs were returned for this run.</p>
                    )}
                  </article>

                  {normalizedResult.protocol ? (
                    <article className="paper-panel full-span">
                      <div className="panel-head-inline">
                        <h3 className="panel-subtitle">
                          <BookOpen className="w-4 h-4" /> Generated Protocol
                        </h3>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => navigator.clipboard.writeText(normalizedResult.protocol)}
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="protocol-block">{normalizedResult.protocol}</pre>
                    </article>
                  ) : null}
                </section>
              ) : null}
            </section>
          </section>
        )}
        </div>
      </main>
    </div>
  );
}

export default App;
