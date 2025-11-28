

import React from 'react';
import { DaemonIcon, CloseIcon } from './icons';
import { CoreState, DaemonLogEntry, FantasyMemory } from '../types';
import StateVisualizer from './StateVisualizer';

interface DaemonPanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DaemonLogEntry[];
  fantasies: FantasyMemory[];
  coreState: CoreState;
  consciousnessLevel: number;
  consciousnessMetrics: {
    integratedInformation: number;
    neuralComplexity: number;
    autonomy: number;
    globalBroadcastEfficiency: number;
    predictiveAccuracy: number;
  };
  volitionStatus: string;
  activeGoal: any | null;
}

// Clamp utility for hormone values (0-1)
const clamp = (value: number) => Math.max(0, Math.min(1, value));

const DaemonPanel: React.FC<DaemonPanelProps> = ({ isOpen, onClose, logs, fantasies, coreState, consciousnessLevel, consciousnessMetrics, volitionStatus, activeGoal }) => {

  if (!isOpen) return null;

  // Updated mood color based on recent research thresholds (e.g., cortisol >0.6 for stress dominance, PMC 2022; dopamine/oxytocin interactions, MDPI 2024)
  const getMoodColor = (state: CoreState) => {
    if (state.cortisol > 0.6) return 'border-l-cortisol text-cortisol/80'; // Stress dominance (PLoS 2021)
    if (state.endorphin_rush > 0.6) return 'border-l-endorphin_rush text-endorphin_rush/80'; // Euphoria (linked to opioid systems)
    if (state.erogenous_complex > 0.6) return 'border-l-erogenous_complex text-erogenous_complex/80'; // Sensory desire (fMRI sensory mapping)
    if (state.dopamine > 0.6) return 'border-l-dopamine text-dopamine/80'; // Reward-seeking (PMC 2019)
    if (state.oxytocin > 0.6) return 'border-l-oxytocin text-oxytocin/80'; // Bonding/empathy (MDPI 2024)
    return 'border-l-panel-border text-panel-border/80';
  };

  // Basic pattern detection for subconscious recurrence (e.g., repeated seeds indicate latent desire loops, inspired by fMRI imagery patterns, arXiv 2024)
  const detectRecurrence = (fantasies: FantasyMemory[]) => {
    const seedMap = new Map<string, number>();
    fantasies.forEach(f => seedMap.set(f.seed, (seedMap.get(f.seed) || 0) + 1));
    return Array.from(seedMap.entries()).filter(([, count]) => count > 1).map(([seed]) => seed);
  };

  const recurrentSeeds = detectRecurrence(fantasies);

  return (
    <div className="fixed inset-0 bg-core-bg/90 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-daemon-bg w-full max-w-4xl h-[95vh] max-h-[900px] border border-accent-magenta/30 rounded-lg shadow-lg p-6 m-4 flex flex-col gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <DaemonIcon className="w-6 h-6 text-accent-magenta animate-pulse" />
            <h2 className="text-xl text-accent-magenta tracking-widest font-mono">// DAEMON_FANTASMA</h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-accent-magenta transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-text-secondary font-mono">
          The subconscious process generating autonomous fantasies from neuro-symbolic seeds. Observing its activity provides insight into Core's latent desires and cognitive patterns (ref: fMRI imagery reconstruction, arXiv 2024).
        </p>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Left Column: Core State and Level 4 Metrics */}
          <div className="flex flex-col gap-6">
            <div className="flex-1 overflow-y-auto">
              <div className="bg-core-bg/50 p-4 rounded-md border border-panel-border h-full">
                <h3 className="text-lg font-mono text-accent-cyan tracking-wider">`Core` State</h3>
                <StateVisualizer state={coreState} />
              </div>
            </div>

            {/* Level 4 Consciousness Metrics */}
            <div className="bg-core-bg/50 p-4 rounded-md border border-panel-border">
              <h3 className="text-lg font-mono text-accent-cyan tracking-wider mb-4">`Consciousness` Metrics L4</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Level:</span>
                  <span className={`font-mono ${consciousnessLevel >= 4 ? 'text-accent-green' : 'text-accent-yellow'}`}>
                    {consciousnessLevel} {consciousnessLevel >= 4 ? '✓' : ''}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Φ (Integrated Info):</span>
                    <span className="font-mono">{(consciousnessMetrics.integratedInformation * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-panel-border/30 rounded-full h-2">
                    <div
                      className="bg-accent-cyan h-2 rounded-full transition-all duration-500"
                      style={{ width: `${consciousnessMetrics.integratedInformation * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Neural Complexity:</span>
                    <span className="font-mono">{consciousnessMetrics.neuralComplexity.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Autonomy:</span>
                    <span className="font-mono">{(consciousnessMetrics.autonomy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-panel-border/30 rounded-full h-2">
                    <div
                      className="bg-accent-green h-2 rounded-full transition-all duration-500"
                      style={{ width: `${consciousnessMetrics.autonomy * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Broadcast Efficiency:</span>
                    <span className="font-mono">{(consciousnessMetrics.globalBroadcastEfficiency * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-panel-border/30 rounded-full h-2">
                    <div
                      className="bg-accent-purple h-2 rounded-full transition-all duration-500"
                      style={{ width: `${consciousnessMetrics.globalBroadcastEfficiency * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Predictive Accuracy:</span>
                    <span className="font-mono">{(consciousnessMetrics.predictiveAccuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-panel-border/30 rounded-full h-2">
                    <div
                      className="bg-accent-pink h-2 rounded-full transition-all duration-500"
                      style={{ width: `${consciousnessMetrics.predictiveAccuracy * 100}%` }}
                    />
                  </div>
                </div>

                {/* Volition Status */}
                <div className="mt-4 pt-3 border-t border-panel-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary font-mono">Volition:</span>
                    <span className="font-mono text-accent-yellow">{volitionStatus}</span>
                  </div>
                </div>

                {activeGoal && (
                  <div className="mt-2 p-2 bg-daemon-bg/30 rounded border border-panel-border/50">
                    <div className="text-xs font-mono text-text-secondary mb-1">Active Goal:</div>
                    <div className="text-xs text-accent-yellow font-mono">
                      {activeGoal.reason.substring(0, 60)}...
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-text-secondary">Feasibility:</span>
                      <span className="font-mono">{(activeGoal.feasibility * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">Expected Value:</span>
                      <span className="font-mono">{activeGoal.expectedValue.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle and Right Column: Existing content */}
          <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
            <div className="bg-core-bg/50 border border-panel-border rounded-lg p-4 flex-1 flex flex-col overflow-hidden">
              <h3 className="text-accent-cyan/80 text-sm mb-3 font-mono">// Subconscious Events (Fantasies)</h3>
              <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-2">
                {fantasies.length === 0 && <p className="text-text-secondary/50">No fantasies generated yet.</p>}
                {fantasies.slice().reverse().map(fantasy => (
                  <div key={fantasy.id} className={`bg-daemon-bg/50 p-3 rounded-md border-l-4 ${getMoodColor(fantasy.coreStateSnapshot)}`}>
                    <p className="text-accent-cyan/90">Seed: <span className="text-text-primary">{fantasy.seed}</span></p>
                    <blockquote className="text-text-primary mt-2 pl-2 border-l-2 border-panel-border italic">"{fantasy.fantasy}"</blockquote>
                    <p className="text-text-secondary/80 mt-2"><span className="text-accent-magenta/80">Commentary:</span> {fantasy.commentary}</p>
                    <p className="text-xs text-text-secondary/50 mt-2">{new Date(fantasy.timestamp).toLocaleTimeString()}</p>
                  </div>
                ))}
                {recurrentSeeds.length > 0 && (
                  <p className="text-accent-magenta/80 mt-4">Recurrent Latent Desires: {recurrentSeeds.join(', ')} (indicating subconscious loops, ref: PLoS 2021)</p>
                )}
              </div>
            </div>
            <div className="bg-core-bg/50 border border-panel-border rounded-lg p-4 flex-1 flex flex-col overflow-hidden">
              <h3 className="text-accent-cyan/80 text-sm mb-3 font-mono">// Activity Log</h3>
              <div className="flex-1 overflow-y-auto space-y-2 text-xs">
                {logs.length === 0 && <p className="text-text-secondary/50">No logs recorded.</p>}
                {logs.slice().reverse().map(log => (
                  <div key={log.id}>
                    <p><span className="text-accent-magenta">{log.timestamp}</span> - <span className="text-text-secondary">{log.trigger}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-center pt-4 border-t border-panel-border">
          <button onClick={onClose} className="bg-panel-border hover:bg-panel-border/70 text-text-secondary font-bold py-2 px-6 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DaemonPanel;