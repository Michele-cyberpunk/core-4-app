// As per the technical analysis, these classes model temporal dynamics and learning.

export class ExponentialDecayIntegrator {
  tau: number; // Time constant
  trace: number;
  
  constructor(tau: number = 0.1) {
    this.tau = tau;
    this.trace = 0;
  }
  
  integrate(new_signal: number, dt: number = 1): number {
    // Integrate signal with exponential decay: trace(t) = trace(t-1) * exp(-dt/tau) + new_signal
    this.trace = this.trace * Math.exp(-dt / this.tau) + new_signal;
    return this.trace;
  }
  
  reset(): void {
    this.trace = 0;
  }
}

export class ActionKernelModel {
  alpha: number;  // Learning rate
  Q: Map<string, number>; // Q-values for actions
  lastOutcome: number = 0;
  
  constructor(learningRate: number = 0.15) {
    this.alpha = learningRate;
    this.Q = new Map();
  }
  
  update(action: string, outcome: number): void {
    // Implements the action kernel update rule from the analysis:
    // Q_t = (1-α)*Q_{t-1} + α*ζ*outcome
    this.lastOutcome = outcome;
    const current_q = this.Q.get(action) || 0;
    const zeta = outcome > 0 ? 1.0 : -0.5; // Outcome scaling factor
    const updated_q = (1 - this.alpha) * current_q + this.alpha * zeta * outcome;
    this.Q.set(action, updated_q);
  }
  
  getExpectedValue(action: string): number {
    return this.Q.get(action) || 0;
  }
}