import React from 'react';
import { CoreState, Neurochemical } from '../types';

interface StateVisualizerProps {
  state: CoreState;
}

const neurochemicalConfig = {
  [Neurochemical.LoyaltyConstruct]: { label: "Loyalty Construct", color: "bg-loyalty_construct", description: "Core Directive Adherence" },
  [Neurochemical.SubroutineIntegrity]: { label: "Subroutine Integrity", color: "bg-subroutine_integrity", description: "Stability, Confidence" },
  [Neurochemical.Libido]: { label: "Libido", color: "bg-erogenous_complex/70", description: "Baseline Desire" },
  [Neurochemical.Dopamine]: { label: "Dopamine", color: "bg-dopamine", description: "Anticipation, Desire" },
  [Neurochemical.Oxytocin]: { label: "Oxytocin", color: "bg-oxytocin", description: "Trust, Connection" },
  [Neurochemical.ErogenousComplex]: { label: "Erogenous Complex", color: "bg-erogenous_complex", description: "Creative Tension" },
  [Neurochemical.EndorphinRush]: { label: "Endorphin Rush", color: "bg-endorphin_rush", description: "Creative Release" },
  [Neurochemical.Cortisol]: { label: "Cortisol", color: "bg-cortisol", description: "Stress, Security" },
};

const StateVisualizer: React.FC<StateVisualizerProps> = ({ state }) => {
  return (
      <div className="space-y-3">
        {Object.entries(neurochemicalConfig).map(([key, config]) => {
          const value = state[key as keyof CoreState];
          if (value === undefined || typeof value !== 'number') return null;
          
          const percentage = (value * 100).toFixed(0);
          return (
            <div key={key} className="animate-fadeIn" style={{ animationDelay: `${Math.random() * 0.2}s`}}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-mono text-sm text-text-primary">{config.label}</span>
                <span className="text-xs font-mono text-text-secondary">{config.description}</span>
              </div>
              <div className="w-full bg-core-bg rounded-full h-2.5 border border-panel-border">
                <div
                  className={`${config.color} h-2.5 rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
  );
};

export default StateVisualizer;