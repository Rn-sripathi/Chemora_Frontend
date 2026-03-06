import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const AGENTS = [
  { name: 'Intent Parser', desc: 'Parse query and constraints' },
  { name: 'Canonicalizer', desc: 'Resolve molecular identity' },
  { name: 'Literature Search', desc: 'Retrieve scientific precedents' },
  { name: 'Reaction Search', desc: 'Fetch reaction analogs' },
  { name: 'Retrosynthesis', desc: 'Generate candidate routes' },
  { name: 'Yield Prediction', desc: 'Estimate feasibility' },
  { name: 'Safety Check', desc: 'Flag hazards and controls' },
  { name: 'Procurement', desc: 'Price and sourcing check' },
  { name: 'Route Scoring', desc: 'Rank route quality' },
  { name: 'Protocol Gen', desc: 'Generate bench-ready protocol' },
  { name: 'Data Curation', desc: 'Persist context and outputs' },
];

const AgentOrchestrator = ({ isActive, activeIndex = -1, completedIndices = [] }) => {
  if (!isActive && completedIndices.length === 0) return null;

  return (
    <section className="pipeline-surface" aria-live="polite">
      <div className="section-header compact">
        <h2 className="section-title section-title-accent">Agent Pipeline</h2>
        <span className="pipeline-meta">
          {completedIndices.length}/{AGENTS.length} complete
        </span>
      </div>

      <div className="pipeline-grid">
        {AGENTS.map((agent, index) => {
          const isCompleted = completedIndices.includes(index);
          const isCurrent = activeIndex === index;
          const statusClass = isCurrent
            ? 'is-current'
            : isCompleted
              ? 'is-complete'
              : activeIndex === -1
                ? 'is-idle'
                : 'is-pending';

          return (
            <article key={agent.name} className={`pipeline-step ${statusClass}`}>
              <div className="pipeline-step-icon">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <div>
                <h3>{agent.name}</h3>
                <p>{isCurrent ? 'Running now' : isCompleted ? 'Completed' : agent.desc}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AgentOrchestrator;
