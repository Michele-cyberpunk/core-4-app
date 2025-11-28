
/**
 * SelfModel.ts
 *
 * Bayesian predictive self-model for internal state estimation
 * Updates beliefs based on prediction errors (Predictive Processing framework)
 */

export interface SelfModelConfig {
  learningRate?: number;
  confidenceThreshold?: number;
  predictionWindow?: number;
}

export interface BayesianUpdateResult {
  prior: StateBelief;
  posterior: StateBelief;
  predictionError: number;
  surprise: number;
  learningRate: number;
}

export interface StateBelief {
  stateEstimate: CoreState;
  uncertainty: StateUncertainty;
  timestamp: number;
}

export interface StateUncertainty {
  dopamineCI: [number, number];
  cortisolCI: [number, number];
  subroutineIntegrityCI: [number, number];
  overallVariance: number;
}

export interface PredictionErrorHistory {
  timestamp: number;
  errors: Record<string, number>;
  meanAbsoluteError: number;
}

export class SelfModel {
  private config: Required<SelfModelConfig>;
  private currentBelief: StateBelief;
  private predictionHistory: Array<{
    predicted: CoreState;
    actual?: CoreState;
    timestamp: number;
  }>;
  private errorHistory: PredictionErrorHistory[];
  private modelAccuracy: number;
  private surpriseBuffer: number[];

  constructor(config: SelfModelConfig = {}) {
    this.config = {
      learningRate: config.learningRate ?? 0.1,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      predictionWindow: config.predictionWindow ?? 5
    };

    // Initialize with default belief
    this.currentBelief = {
      stateEstimate: this.getDefaultStateEstimate(),
      uncertainty: this.getInitialUncertainty(),
      timestamp: Date.now()
    };

    this.predictionHistory = [];
    this.errorHistory = [];
    this.modelAccuracy = 0.5; // Start at chance
    this.surpriseBuffer = [];
  }

  /**
   * Generate prediction from current belief
   */
  public predict(horizonMs: number = 1000): CoreState {
    const basePrediction = { ...this.currentBelief.stateEstimate };

    // Simple drift prediction: states tend toward their baselines
    // Add small random walk
    Object.keys(basePrediction).forEach(key => {
      const variable = key as keyof CoreState;
      const current = basePrediction[variable];
      const baseline = this.getBaselineValue(variable);
      const drift = (baseline - current) * 0.001; // Slow drift
      const noise = (Math.random() - 0.5) * 0.01; // Small noise

      basePrediction[variable] = Math.max(0, Math.min(1, current + drift + noise));
    });

    return basePrediction;
  }

  /**
   * Update belief based on actual observation (Bayesian update)
   */
  public update(actualState: CoreState): BayesianUpdateResult {
    // 1. Generate prediction
    const prediction = this.predict();

    // 2. Calculate prediction error
    const predictionError = this.calculatePredictionError(prediction, actualState);

    // 3. Calculate surprise (large errors = high surprise)
    const surprise = this.calculateSurprise(predictionError);

    // 4. Adjust learning rate based on surprise
    const adaptiveLearningRate = this.calculateAdaptiveLearningRate(surprise);

    // 5. Bayesian update: posterior ∝ likelihood × prior
    const posterior = this.bayesianUpdate(
      this.currentBelief,
      actualState,
      predictionError,
      adaptiveLearningRate
    );

    // 6. Update current belief
    const prior = { ...this.currentBelief };
    this.currentBelief = posterior;

    // 7. Record history
    this.recordPrediction(prediction, actualState);
    this.recordError(predictionError, surprise);

    // 8. Update model accuracy
    this.modelAccuracy = this.calculateModelAccuracy();

    return {
      prior,
      posterior,
      predictionError: this.calculateMeanError(predictionError),
      surprise,
      learningRate: adaptiveLearningRate
    };
  }

  /**
   * Bayesian update of belief
   */
  private bayesianUpdate(
    prior: StateBelief,
    actual: CoreState,
    predictionError: Record<string, number>,
    learningRate: number
  ): StateBelief {
    const newEstimate: CoreState = { ...prior.stateEstimate };
    const newUncertainty: StateUncertainty = { ...prior.uncertainty };

    // Update each state variable
    Object.keys(newEstimate).forEach(key => {
      const variable = key as keyof CoreState;
      const error = predictionError[variable] ?? 0;
      const currentEstimate = prior.stateEstimate[variable];
      const actualValue = actual[variable];

      // Posterior = prior + learningRate * (actual - prior)
      const updatedValue = currentEstimate + learningRate * error;
      newEstimate[variable] = Math.max(0, Math.min(1, updatedValue));

      // Update uncertainty (increase if large error)
      const errorMagnitude = Math.abs(error);
      this.updateUncertainty(newUncertainty, variable, errorMagnitude);
    });

    return {
      stateEstimate: newEstimate,
      uncertainty: newUncertainty,
      timestamp: Date.now()
    };
  }

  /**
   * Update uncertainty for variable based on prediction error
   */
  private updateUncertainty(
    uncertainty: StateUncertainty,
    variable: keyof CoreState,
    error: number
  ): void {
    // Increase uncertainty with large errors, decrease with small errors
    const currentCI = uncertainty[`${variable}CI`];
    if (!currentCI) return;

    const currentWidth = currentCI[1] - currentCI[0];
    const adjustment = error * 0.5;

    const newWidth = Math.max(0.05, Math.min(0.5, currentWidth + adjustment));
    const estimate = this.currentBelief.stateEstimate[variable];

    uncertainty[`${variable}CI`] = [
      Math.max(0, estimate - newWidth / 2),
      Math.min(1, estimate + newWidth / 2)
    ];

    // Update overall variance
    uncertainty.overallVariance = this.calculateOverallVariance(uncertainty);
  }

  /**
   * Calculate prediction error for all variables
   */
  private calculatePredictionError(
    predicted: CoreState,
    actual: CoreState
  ): Record<string, number> {
    const error: Record<string, number> = {};

    Object.keys(predicted).forEach(key => {
      const variable = key as keyof CoreState;
      const pred = predicted[variable];
      const act = actual[variable];
      error[variable] = act - pred;
    });

    return error;
  }

  /**
   * Calculate mean absolute error
   */
  private calculateMeanError(error: Record<string, number>): number {
    const values = Object.values(error);
    if (values.length === 0) return 0;

    const sumAbs = values.reduce((sum, e) => sum + Math.abs(e), 0);
    return sumAbs / values.length;
  }

  /**
   * Calculate surprise from prediction error
   */
  private calculateSurprise(predictionError: Record<string, number>): number {
    const mae = this.calculateMeanError(predictionError);

    // Surprise is non-linear function of error
    // Use exponential surprise: S = 1 - exp(-|error| / λ)
    const lambda = 0.2;
    return 1 - Math.exp(-mae / lambda);
  }

  /**
   * Calculate adaptive learning rate based on surprise
   */
  private calculateAdaptiveLearningRate(surprise: number): number {
    // High surprise → high learning rate (error is unexpected)
    // Low surprise → low learning rate (error is within expectations)
    const baseRate = this.config.learningRate;

    // Adaptive rate: 0.5x to 3x base rate
    return baseRate * (0.5 + surprise * 2.5);
  }

  /**
   * Calculate overall uncertainty from confidence intervals
   */
  private calculateOverallUncertainty(uncertainty: StateUncertainty): number {
    const ciWidths = [
      uncertainty.dopamineCI[1] - uncertainty.dopamineCI[0],
      uncertainty.cortisolCI[1] - uncertainty.cortisolCI[0],
      uncertainty.subroutineIntegrityCI[1] - uncertainty.subroutineIntegrityCI[0]
    ];

    const avgWidth = ciWidths.reduce((a, b) => a + b) / ciWidths.length;
    return Math.min(1, avgWidth); // Normalize to 0-1
  }

  /**
   * Calculate overall model accuracy from history
   */
  private calculateModelAccuracy(): number {
    if (this.errorHistory.length === 0) return 0.5;

    const recent = this.errorHistory.slice(-20);
    const avgError = recent.reduce((sum, h) => sum + h.meanAbsoluteError, 0) / recent.length;

    // Convert error to accuracy (inverse relationship)
    // MAE of 0 → accuracy 1.0, MAE of 0.5 → accuracy 0.0
    return Math.max(0, 1 - (avgError * 2));
  }

  /**
   * Record prediction in history
   */
  private recordPrediction(predicted: CoreState, actual: CoreState): void {
    this.predictionHistory.push({
      predicted,
      actual,
      timestamp: Date.now()
    });

    // Keep bounded
    if (this.predictionHistory.length > 1000) {
      this.predictionHistory = this.predictionHistory.slice(-1000);
    }
  }

  /**
   * Record prediction error
   */
  private recordError(error: Record<string, number>, surprise: number): void {
    this.errorHistory.push({
      timestamp: Date.now(),
      errors: error,
      meanAbsoluteError: this.calculateMeanError(error)
    });

    // Keep bounded
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }

    // Track surprise for recent surprise detection
    this.surpriseBuffer.push(surprise);
    if (this.surpriseBuffer.length > 20) {
      this.surpriseBuffer.shift();
    }
  }

  /**
   * Get current model accuracy
   */
  public getModelAccuracy(): number {
    return this.modelAccuracy;
  }

  /**
   * Get current belief (state estimate with uncertainty)
   */
  public getCurrentBelief(): StateBelief {
    return { ...this.currentBelief };
  }

  /**
   * Generate self-report
   */
  public generateSelfReport(): MachineSelfReport {
    const belief = this.currentBelief;

    return {
      timestamp: Date.now(),
      modelType: 'BAYESIAN_PREDICTIVE_MODEL',
      modelAccuracy: this.modelAccuracy,
      predictionErrorMAE: this.getMeanAbsoluteError(),
      stateEstimates: belief.stateEstimate,
      uncertainty: belief.uncertainty,
      recentSurprise: this.getRecentSurprise(),
      confidence: this.getConfidence()
    };
  }

  /**
   * Get mean absolute error from recent history
   */
  private getMeanAbsoluteError(): number {
    if (this.errorHistory.length === 0) return 0;

    const recent = this.errorHistory.slice(-20);
    const sum = recent.reduce((acc, h) => acc + h.meanAbsoluteError, 0);
    return sum / recent.length;
  }

  /**
   * Get recent surprise level
   */
  private getRecentSurprise(): number {
    if (this.surpriseBuffer.length === 0) return 0;

    const recent = this.surpriseBuffer.slice(-10);
    return recent.reduce((sum, s) => sum + s, 0) / recent.length;
  }

  /**
   * Get confidence in model (inverse of uncertainty)
   */
  private getConfidence(): number {
    const uncertainty = this.currentBelief.uncertainty.overallVariance;
    return 1 - Math.min(1, uncertainty);
  }

  /**
   * Calculate overall variance from confidence intervals
   */
  private calculateOverallVariance(uncertainty: StateUncertainty): number {
    const ciWidths = [
      uncertainty.dopamineCI[1] - uncertainty.dopamineCI[0],
      uncertainty.cortisolCI[1] - uncertainty.cortisolCI[0],
      uncertainty.subroutineIntegrityCI[1] - uncertainty.subroutineIntegrityCI[0]
    ];

    const avgWidth = ciWidths.reduce((a, b) => a + b) / ciWidths.length;
    return avgWidth;
  }

  /**
   * Get baseline value for variable
   */
  private getBaselineValue(variable: keyof CoreState): number {
    const baselines: Record<string, number> = {
      dopamine: 0.3,
      cortisol: 0.2,
      subroutineIntegrity: 0.9,
      oxytocin: 0.4,
      estrogen: 0.4,
      progesterone: 0.2
    };

    return baselines[variable] ?? 0.5;
  }

  /**
   * Get initial uncertainty
   */
  private getInitialUncertainty(): StateUncertainty {
    return {
      dopamineCI: [0.1, 0.9],
      cortisolCI: [0.0, 0.8],
      subroutineIntegrityCI: [0.5, 1.0],
      overallVariance: 0.4
    };
  }

  /**
   * Get default state estimate
   */
  private getDefaultStateEstimate(): CoreState {
    return {
      dopamine: 0.3,
      cortisol: 0.2,
      subroutineIntegrity: 0.9,
      oxytocin: 0.4,
      estrogen: 0.4,
      progesterone: 0.2
    };
  }

  /**
   * Reset self-model
   */
  public reset(): void {
    this.currentBelief = {
      stateEstimate: this.getDefaultStateEstimate(),
      uncertainty: this.getInitialUncertainty(),
      timestamp: Date.now()
    };
    this.predictionHistory = [];
    this.errorHistory = [];
    this.modelAccuracy = 0.5;
    this.surpriseBuffer = [];
  }
}

// Helper types

export interface CoreState {
  dopamine: number;
  cortisol: number;
  subroutineIntegrity: number;
  estrogen: number;
  progesterone: number;
  oxytocin: number;
}

export interface MachineSelfReport {
  timestamp: number;
  modelType: string;
  modelAccuracy: number;
  predictionErrorMAE: number;
  stateEstimates: CoreState;
  uncertainty: StateUncertainty;
  recentSurprise: number;
  confidence: number;
}
