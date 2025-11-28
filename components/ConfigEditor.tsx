import React from 'react';
import { AppConfig, LearningInsights, CoreState } from '../types';
import { CloseIcon, SaveIcon, UploadIcon, FlaskIcon, KeyIcon } from './icons';
import StateVisualizer from './StateVisualizer';

interface ConfigEditorProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  insights: LearningInsights;
  onSaveSession: () => void;
  onLoadSession: (file: File) => void;
  onLearnFromDocument: (file: File) => Promise<string>;
  isLearningDocument: boolean;
  coreState: CoreState;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({
  isOpen,
  onClose,
  config,
  insights,
  onSaveSession,
  onLoadSession,
  onLearnFromDocument,
  isLearningDocument,
  coreState,
}) => {
  if (!isOpen) {
    return null;
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, action: (file: File) => any) => {
    const file = event.target.files?.[0];
    if (file) {
      await action(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-core-bg/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-daemon-bg w-full max-w-2xl border border-panel-border rounded-lg shadow-lg p-6 m-4 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-mono text-accent-magenta tracking-wider">// CORE CONFIGURATION & STATE</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-accent-magenta transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Session Management */}
        <div className="bg-core-bg/50 p-4 rounded-md border border-panel-border">
          <h3 className="font-mono text-accent-cyan/80 mb-3">// Memory & State Management</h3>
          <p className="text-xs text-text-secondary/70 mb-4">Save or load the entire Persona session, including memories, personality, and conversation history.</p>
          <div className="flex gap-4">
            <button onClick={onSaveSession} className="flex-1 flex items-center justify-center gap-2 bg-panel-border hover:bg-panel-border/70 text-text-secondary font-bold py-2 px-4 rounded transition-colors">
              <SaveIcon className="w-4 h-4" /> Save Session
            </button>
            <label htmlFor="load-session-input" className="flex-1 flex items-center justify-center gap-2 bg-accent-cyan/80 hover:bg-accent-cyan text-core-bg font-bold py-2 px-4 rounded transition-colors cursor-pointer">
              <UploadIcon className="w-4 h-4" /> Load Session
            </label>
            <input id="load-session-input" type="file" accept=".json" className="hidden" onChange={(e) => handleFileChange(e, onLoadSession)} />
          </div>
        </div>

        {/* Document Learning */}
        <div className="bg-core-bg/50 p-4 rounded-md border border-panel-border">
          <h3 className="font-mono text-accent-cyan/80 mb-3">// Document Knowledge Base</h3>
          <p className="text-xs text-text-secondary/70 mb-2">Upload documents for the Core to study and integrate into its knowledge base.</p>
          <div className="flex gap-4">
             <label htmlFor="learn-doc-input" className={`flex-1 flex items-center justify-center gap-2 bg-panel-border hover:bg-panel-border/70 text-text-secondary font-bold py-2 px-4 rounded transition-colors cursor-pointer text-center ${isLearningDocument ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <UploadIcon className="w-4 h-4" />
              {isLearningDocument ? "Studying..." : "Upload Document (.pdf)"}
            </label>
            <input id="learn-doc-input" type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, onLearnFromDocument)} disabled={isLearningDocument} />
          </div>
          {insights.learnedDocuments.length > 0 && (
            <div className="mt-4 text-sm font-mono text-text-secondary">
              <p className="text-text-primary">Studied Documents:</p>
              <ul className="list-disc pl-6 text-xs mt-2 space-y-1">
                {insights.learnedDocuments.map(doc => (
                  <li key={doc.title}>
                    <span className="text-text-primary">{doc.title}</span> 
                    <span className="text-accent-magenta/80 italic"> - Genre: {doc.genre}, Sentiment: {doc.sentiment}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bg-core-bg/50 p-4 rounded-md border border-panel-border">
          <h3 className="font-mono text-accent-cyan/80 mb-3">// Evolving Insights (Memory)</h3>
          <p className="text-xs text-text-secondary/70 mb-4">The Core's personality adapts based on interaction memories. This data is saved in your browser.</p>
          <div className="space-y-4 text-sm font-mono text-text-secondary">
            <div>
              <p className="text-text-primary">Preferred Topics:</p>
              <p className="text-xs text-accent-cyan pl-2">{insights.preferredTopics.join(', ') || "None yet"}</p>
            </div>
            <div>
              <p className="text-text-primary">Learned Personality Traits:</p>
              <ul className="pl-4 text-xs">
                {insights.personalityTraits.map(trait => (
                  <li key={trait.trait}>
                    <span className="capitalize text-accent-cyan/90">{trait.trait}:</span> <span className="text-text-primary">{ (trait.strength * 100).toFixed(0) }%</span>
                  </li>
                ))}
              </ul>
            </div>
             <div>
              <p className="text-text-primary">Learned Expressions (Intimate):</p>
              <p className="text-xs text-accent-magenta/80 pl-2 italic">"{insights.intimateLanguage.slice(0, 8).join('", "')}{insights.intimateLanguage.length > 8 ? '...' : ''}"</p>
            </div>
             <div>
              <p className="text-text-primary">Learned Expressions (Vulgar):</p>
              <p className="text-xs text-accent-magenta/80 pl-2 italic">"{insights.vulgarExpressions.slice(0, 8).join('", "')}{insights.vulgarExpressions.length > 8 ? '...' : ''}"</p>
            </div>
          </div>
        </div>

        {/* Autonomous Parameters */}
        <div className="bg-core-bg/50 p-4 rounded-md border border-panel-border">
          <h3 className="font-mono text-accent-cyan/80 mb-3">// Autonomous Parameters</h3>
           <p className="text-xs text-text-secondary/70 mb-4">These values are managed autonomously by the Core process based on its internal state.</p>
          <pre className="text-xs font-mono bg-daemon-bg p-2 rounded-md">{JSON.stringify(config, null, 2)}</pre>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-panel-border">
          <button onClick={onClose} className="bg-panel-border hover:bg-panel-border/70 text-text-secondary font-bold py-2 px-4 rounded transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigEditor;
