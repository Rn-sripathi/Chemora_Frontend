import React, { useState } from 'react';
import { Send, FlaskConical, Atom, BookOpen, Activity, Loader2 } from 'lucide-react';
import { processQuery } from './api';
import AgentOrchestrator from './components/AgentOrchestrator';


function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Artificial delay to show animation (7 seconds total for 4 steps)
      const [data] = await Promise.all([
        processQuery(query),
        new Promise(resolve => setTimeout(resolve, 7000))
      ]);

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chemistry-primary text-white p-4 md:p-8 bg-molecule-pattern bg-blend-overlay bg-fixed">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header className="text-center space-y-2">
          <div className="flex justify-center items-center gap-3">
            <div className="p-3 bg-chemistry-accent/10 rounded-full border border-chemistry-accent/20 backdrop-blur-sm">
              <FlaskConical className="w-8 h-8 text-chemistry-accent" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-chemistry-accent to-chemistry-highlight bg-clip-text text-transparent">
              ChemAgent
            </h1>
          </div>
          <p className="text-slate-400">Advanced Chemical Synthesis Planning System</p>
        </header>

        {/* Input Section */}
        <div className="bg-chemistry-secondary/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-xl">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., I need the synthesis of Aspirin cheaply..."
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-4 pl-6 pr-14 text-lg focus:outline-none focus:border-chemistry-accent focus:ring-1 focus:ring-chemistry-accent transition-all placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 p-3 bg-chemistry-accent hover:bg-chemistry-accent/90 text-chemistry-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* Agent Orchestration Animation */}
        {loading && (
          <AgentOrchestrator loading={loading} />
        )}

        {/* Results Section */}
        {!loading && result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Intent & Canonicalization */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Intent Card */}
              <div className="bg-chemistry-secondary/60 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-chemistry-highlight">
                  <Activity className="w-5 h-5" />
                  <h2 className="text-xl font-semibold">Parsed Intent</h2>
                </div>
                <div className="space-y-2 text-slate-300">
                  <p><span className="text-slate-500">Target:</span> <span className="text-white font-medium">{result.intent.target || "N/A"}</span></p>
                  <p><span className="text-slate-500">Mode:</span> {result.intent.mode}</p>
                  <p><span className="text-slate-500">Priority:</span> {result.intent.priority}</p>
                  <div className="flex gap-2 mt-2">
                    {result.intent.constraints.map(c => (
                      <span key={c} className="px-2 py-1 bg-chemistry-accent/10 text-chemistry-accent text-xs rounded-full border border-chemistry-accent/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Molecule Card */}
              <div className="bg-chemistry-secondary/60 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-chemistry-success">
                  <Atom className="w-5 h-5" />
                  <h2 className="text-xl font-semibold">Molecule Data</h2>
                </div>
                {result.canonical_data && !result.canonical_data.error ? (
                  <div className="space-y-2 text-slate-300">
                    <p><span className="text-slate-500">Name:</span> {result.canonical_data.name}</p>
                    <p><span className="text-slate-500">Formula:</span> {result.canonical_data.formula}</p>
                    <p><span className="text-slate-500">MW:</span> {result.canonical_data.molecular_weight}</p>
                    <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700 break-all font-mono text-xs text-slate-400">
                      {result.canonical_data.canonical_smiles}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No molecule data found.</p>
                )}
              </div>
            </div>

            {/* Literature Results */}
            <div className="bg-chemistry-secondary/60 backdrop-blur-md rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-chemistry-warning">
                <BookOpen className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Literature Precedents</h2>
              </div>
              <div className="space-y-3">
                {result.literature_results?.map((doc, i) => (
                  <div key={i} className="p-4 bg-slate-900/30 rounded-lg border border-slate-700 hover:border-chemistry-warning/30 transition-colors">
                    <p className="text-slate-200">{doc.text}</p>
                    <div className="mt-2 flex justify-between items-center text-sm text-slate-500">
                      <span>Yield: <span className="text-chemistry-success">{doc.yield}</span></span>
                      {doc.score && <span>Score: {doc.score.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
                {(!result.literature_results || result.literature_results.length === 0) && (
                  <p className="text-slate-500 italic">No literature found.</p>
                )}
              </div>
            </div>

            {/* Reaction Results */}
            <div className="bg-chemistry-secondary/60 backdrop-blur-md rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-chemistry-accent">
                <FlaskConical className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Reaction Pathways</h2>
              </div>
              <div className="space-y-3">
                {result.reaction_results?.map((rxn, i) => (
                  <div key={i} className="p-4 bg-slate-900/30 rounded-lg border border-slate-700 hover:border-chemistry-accent/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-chemistry-accent">{rxn.name}</h3>
                      <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400">
                        Sim: {rxn.similarity?.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-slate-400 break-all">
                      {rxn.smiles}
                    </div>
                  </div>
                ))}
                {(!result.reaction_results || result.reaction_results.length === 0) && (
                  <p className="text-slate-500 italic">No reactions found.</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default App;
