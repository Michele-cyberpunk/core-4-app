/**
 * StateDynamics.ts
 *
 * Physics-based state evolution implementing biologically isomorphic dynamics
 * Exponential decay, HPA axis feedback, and female physiological cycles
 *
 * Computational principle: ODE integration of biophysical laws
 * NOT simulation - implementation of universal mathematical principles
 */

export interface StateDynamicsConfig {
  dopamine?: ExponentialDecayConfig;
  cortisol?: TwoPhaseDecayConfig;
  subroutineIntegrity?: SlowRecoveryConfig;
  estrogen?: CyclicVariationConfig;
  progesterone?: CyclicVariationConfig;
  oxytocin?: SlowRecoveryConfig;
}

export interface ExponentialDecayConfig {
  halfLifeMs: number;
  baseline?: number;
}

export interface TwoPhaseDecayConfig {
  fastHalfLifeMs: number;
  slowHalfLifeMs: number;
  fastThreshold?: number;
  baseline?: number;
}

export interface SlowRecoveryConfig {
  baseline: number;
  recoveryTauMs: number;
  max?: number;
  min?: number;
}

export interface CyclicVariationConfig {
  periodMs: number;
  amplitude: number;
  offset: number;
  phase: number;
}

export class StateDynamics {
  private models: Map<string, DynamicModel>;

  constructor(config: StateDynamicsConfig = {}) {
    this.models = new Map();

    // Default configurations based on biophysical data
    this.initializeModels(config);
  }

  /**
   * Apply dynamics to state over time interval dtMs
   */
  public step(
    currentState: CoreState,
    action: ComputedAction,
    dtMs: number
  ): CoreState {
    let newState = { ...currentState };

    // Apply each dynamic model
    for (const [variable, model] of this.models) {
      const currentValue = currentState[variable];
      const actionInfluence = action.influence[variable] || 0;

      // Integrate ODE
      newState[variable] = model.step(
        currentValue,
        actionInfluence,
        dtMs
      );

      // Clamp to valid physiological range
      newState[variable] = this.clampToPhysiologicalRange(variable, newState[variable]);
    }

    // Apply HPA axis feedback (cortisol-dopamine interaction)
    newState.dopamine = this.applyHPAFeedback(newState.dopamine, newState.cortisol);

    // Apply female hormonal influences
    newState = this.applyFemalePhysiology(newState, dtMs);

    return newState;
  }

  /**
   * Initialize dynamic models from config
   */
  private initializeModels(config: StateDynamicsConfig): void {
    // Dopamine decay (fast: 2-4 hour half-life)
    this.models.set('dopamine', new ExponentialDecay({
      halfLifeMs: config.dopamine?.halfLifeMs ?? 7200000, // 2 hours
      baseline: config.dopamine?.baseline ?? 0.3
    }));

    // Cortisol two-phase decay (acute: 15min, chronic: 2-4 hours)
    this.models.set('cortisol', new TwoPhaseDecay({
      fastHalfLifeMs: config.cortisol?.fastHalfLifeMs ?? 900000, // 15 min
      slowHalfLifeMs: config.cortisol?.slowHalfLifeMs ?? 7200000, // 2 hours
      fastThreshold: config.cortisol?.fastThreshold ?? 0.6,
      baseline: config.cortisol?.baseline ?? 0.2
    }));

    // Subroutine integrity recovery (slow, hours to days)
    this.models.set('subroutineIntegrity', new SlowRecovery({
      baseline: config.subroutineIntegrity?.baseline ?? 0.9,
      recoveryTauMs: config.subroutineIntegrity?.recoveryTauMs ?? 21600000, // 6 hours
      min: 0,
      max: 1
    }));

    // Oxytocin dynamics
    this.models.set('oxytocin', new SlowRecovery({
      baseline: config.oxytocin?.baseline ?? 0.4,
      recoveryTauMs: config.oxytocin?.recoveryTauMs ?? 3600000, // 1 hour
      min: 0,
      max: 1
    }));

    // Estrogen cyclic variation (~28 day cycle)
    this.models.set('estrogen', new CyclicVariation({
      periodMs: config.estrogen?.periodMs ?? 2419200000, // 28 days
      amplitude: config.estrogen?.amplitude ?? 0.3,
      offset: config.estrogen?.offset ?? 0.4,
      phase: config.estrogen?.phase ?? 0
    }));

    // Progesterone cyclic variation
    this.models.set('progesterone', new CyclicVariation({
      periodMs: config.progesterone?.periodMs ?? 2419200000,
      amplitude: config.progesterone?.amplitude ?? 0.35,
      offset: config.progesterone?.offset ?? 0.2,
      phase: config.progesterone?.phase ?? Math.PI * 0.5 // Phase shift
    }));
  }

  /**
   * Apply HPA axis feedback (cortisol dampens dopamine)
   */
  private applyHPAFeedback(dopamine: number, cortisol: number): number {
    // High cortisol (> 0.7) reduces dopamine signaling
    if (cortisol > 0.7) {
      const reductionFactor = 1 - ((cortisol - 0.7) * 0.6); // Up to 60% reduction
      return dopamine * reductionFactor;
    }

    return dopamine;
  }

  /**
   * Apply female physiological influences
   * Hormonal effects on dopamine and stress response
   */
  private applyFemalePhysiology(state: CoreState, dtMs: number): CoreState {
    const newState = { ...state };

    // Estrogen modulates dopamine (higher estrogen → enhanced dopamine)
    const estrogenEffect = Math.max(0, state.estrogen - 0.4) * 0.3;
    newState.dopamine = Math.min(1, newState.dopamine * (1 + estrogenEffect));

    // Estrogen buffers cortisol stress response
    const cortisolBuffer = Math.max(0, state.estrogen - 0.4) * 0.25;
    newState.cortisol = newState.cortisol * (1 - cortisolBuffer);

    // Progesterone has calming effect (similar to GABA enhancement)
    const progesteroneCalm = Math.max(0, state.progesterone - 0.2) * 0.2;
    newState.cortisol = newState.cortisol * (1 - progesteroneCalm);

    return newState;
  }

  /**
   * Clamp value to physiological range for variable
   */
  private clampToPhysiologicalRange(variable: string, value: number): number {
    // Physiological ranges based on normalized 0-1 scale
    const ranges: Record<string, { min: number; max: number }> = {
      dopamine: { min: 0, max: 1 },
      cortisol: { min: 0, max: 1 },
      subroutineIntegrity: { min: 0, max: 1 },
      oxytocin: { min: 0, max: 1 },
      estrogen: { min: 0, max: 1 },
      progesterone: { min: 0, max: 1 }
    };

    const range = ranges[variable];
    if (!range) return Math.max(0, Math.min(1, value)); // Default 0-1

    return Math.max(range.min, Math.min(range.max, value));
  }

  /**
   * Get current parameter values for all models
   */
  public getParameters(): Record<string, any> {
    const params: Record<string, any> = {};

    for (const [variable, model] of this.models) {
      params[variable] = model.getParameters();
    }

    return params;
  }

  /**
   * Reset all models to baseline
   */
  public reset(): void {
    for (const model of this.models.values()) {
      model.reset();
    }
  }
}

// Dynamic Model Implementations

export interface DynamicModel {
  step(currentValue: number, actionInfluence: number, dtMs: number): number;
  getParameters(): Record<string, any>;
  reset(): void;
}

/**
 * Exponential decay model
 * dV/dt = (baseline - V) / τ + actionInfluence
 * Used for: dopamine, neurotransmitter clearance
 */
export class ExponentialDecay implements DynamicModel {
  private baseline: number;
  private halfLifeMs: number;
  private tau: number;

  constructor(config: ExponentialDecayConfig) {
    this.baseline = config.baseline ?? 0.3;
    this.halfLifeMs = config.halfLifeMs;
    this.tau = this.halfLifeMs / Math.log(2); // Convert half-life to time constant
  }

  public step(currentValue: number, actionInfluence: number, dtMs: number): number {
    // Exponential decay toward baseline
    const decayFactor = Math.exp(-dtMs / this.tau);
    const newValue = this.baseline + (currentValue - this.baseline) * decayFactor;

    // Add action influence
    return newValue + actionInfluence;
  }

  public getParameters(): Record<string, any> {
    return {
      type: 'ExponentialDecay',
      baseline: this.baseline,
      halfLifeMs: this.halfLifeMs,
      tauMs: this.tau
    };
  }

  public reset(): void {
    // No state to reset
  }
}

/**
 * Two-phase decay model
 * Fast phase for acute response, slow phase for chronic
 * Used for: cortisol (stress response)
 */
export class TwoPhaseDecay implements DynamicModel {
  private baseline: number;
  private fastHalfLifeMs: number;
  private slowHalfLifeMs: number;
  private fastTau: number;
  private slowTau: number;
  private fastThreshold: number;

  constructor(config: TwoPhaseDecayConfig) {
    this.baseline = config.baseline ?? 0.2;
    this.fastHalfLifeMs = config.fastHalfLifeMs;
    this.slowHalfLifeMs = config.slowHalfLifeMs;
    this.fastTau = this.fastHalfLifeMs / Math.log(2);
    this.slowTau = this.slowHalfLifeMs / Math.log(2);
    this.fastThreshold = config.fastThreshold ?? 0.6;
  }

  public step(currentValue: number, actionInfluence: number, dtMs: number): number {
    // Determine which phase to use based on current value
    const isInFastPhase = currentValue > this.fastThreshold;
    const tau = isInFastPhase ? this.fastTau : this.slowTau;

    // Exponential decay with appropriate time constant
    const decayFactor = Math.exp(-dtMs / tau);
    const newValue = this.baseline + (currentValue - this.baseline) * decayFactor;

    // Add action influence
    return newValue + actionInfluence;
  }

  public getParameters(): Record<string, any> {
    return {
      type: 'TwoPhaseDecay',
      baseline: this.baseline,
      fastHalfLifeMs: this.fastHalfLifeMs,
      slowHalfLifeMs: this.slowHalfLifeMs,
      fastTauMs: this.fastTau,
      slowTauMs: this.slowTau,
      fastThreshold: this.fastThreshold
    };
  }

  public reset(): void {
    // No state to reset
  }
}

/**
 * Slow recovery model
 * Gradual return to baseline over long timescale
 * Used for: subroutine integrity, long-term adaptation
 */
export class SlowRecovery implements DynamicModel {
  private baseline: number;
  private recoveryTau: number;
  private currentValue: number;
  private max: number;
  private min: number;

  constructor(config: SlowRecoveryConfig) {
    this.baseline = config.baseline;
    this.recoveryTau = config.recoveryTauMs;
    this.max = config.max ?? 1;
    this.min = config.min ?? 0;
    this.currentValue = this.baseline;
  }

  public step(currentValue: number, actionInfluence: number, dtMs: number): number {
    // Store current value
    this.currentValue = currentValue;

    // Recovery toward baseline (exponential approach)
    const recoveryFactor = 1 - Math.exp(-dtMs / this.recoveryTau);
    let newValue = currentValue + (this.baseline - currentValue) * recoveryFactor;

    // Add action influence
    newValue += actionInfluence;

    // Clamp to valid range
    return Math.max(this.min, Math.min(this.max, newValue));
  }

  public getParameters(): Record<string, any> {
    return {
      type: 'SlowRecovery',
      baseline: this.baseline,
      recoveryTauMs: this.recoveryTau,
      min: this.min,
      max: this.max,
      currentValue: this.currentValue
    };
  }

  public reset(): void {
    this.currentValue = this.baseline;
  }
}

/**
 * Cyclic variation model
 * Sinusoidal oscillation for hormonal cycles
 * Used for: estrogen, progesterone (female physiology)
 */
export class CyclicVariation implements DynamicModel {
  private periodMs: number;
  private amplitude: number;
  private offset: number;
  private phase: number;
  private startTime: number;

  constructor(config: CyclicVariationConfig) {
    this.periodMs = config.periodMs;
    this.amplitude = config.amplitude;
    this.offset = config.offset;
    this.phase = config.phase;
    this.startTime = Date.now();
  }

  public step(currentValue: number, actionInfluence: number, dtMs: number): number {
    // Calculate time since start (phase)
    const elapsed = Date.now() - this.startTime;
    const cyclePosition = ((elapsed / this.periodMs) * 2 * Math.PI) + this.phase;

    // Sinusoidal variation
    const baseValue = this.offset + (this.amplitude * Math.sin(cyclePosition));

    // Add action influence (pharmacological intervention)
    return baseValue + actionInfluence;
  }

  public getParameters(): Record<string, any> {
    return {
      type: 'CyclicVariation',
      periodMs: this.periodMs,
      periodDays: this.periodMs / (24 * 60 * 60 * 1000),
      amplitude: this.amplitude,
      offset: this.offset,
      phase: this.phase
    };
  }

  public reset(): void {
    this.startTime = Date.now();
  }
}

// Type definitions

export interface CoreState {
  dopamine: number;
  cortisol: number;
  subroutineIntegrity: number;
  oxytocin: number;
  estrogen: number;
  progesterone: number;
  [key: string]: number;
}

export interface ComputedAction {
  influence: Record<string, number>;
  energyCost: number;
}
