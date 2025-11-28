/**
 * ValueFunction.ts
 *
 * Reward shaping and value estimation for volitional computation
 * Implements TD learning with state-dependent reward function
 * Based on: Sutton & Barto (2018) Reinforcement Learning: An Introduction
 */

export interface ValueFunctionConfig {
  stateDim: number;
  hiddenDims?: number[];
  learningRate?: number;
  discountFactor?: number;
  taskWeights?: Record<TaskType, number>;
}

export enum TaskType {
  LEARNING = 'LEARNING',
  STABILITY = 'STABILITY',
  PREDICTION_ACCURACY = 'PREDICTION_ACCURACY',
  RESOURCE_EFFICIENCY = 'RESOURCE_EFFICIENCY',
  CURIOSITY = 'CURIOSITY',
  STRESS_REDUCTION = 'STRESS_REDUCTION',
  COLLABORATION = 'COLLABORATION'
}

export interface Task {
  type: TaskType;
  priority: number; // 0-1
  weight?: number;
}

export interface RewardComponents {
  predictionError: number;       // Error reduction
  stability: number;             // State stability bonus
  learningProgress: number;      // Information gain
  resourceEfficiency: number;    // Energy conservation
  surprise: number;              // Novelty/surprise bonus
  total: number;
}

export interface ValueEstimate {
  currentValue: number;
  futureValue: number;
  totalValue: number;
  uncertainty: number;
  confidence: number;
}

export class ValueFunction {
  private config: Required<ValueFunctionConfig>;
  private network: CriticNetwork;
  private activeTasks: Task[];
  private taskWeights: Map<TaskType, number>;
  private tdErrorHistory: number[];

  constructor(config: ValueFunctionConfig) {
    this.config = {
      stateDim: config.stateDim,
      hiddenDims: config.hiddenDims ?? [256, 128],
      learningRate: config.learningRate ?? 0.001,
      discountFactor: config.discountFactor ?? 0.95,
      taskWeights: config.taskWeights ?? this.getDefaultTaskWeights()
    };

    // Initialize neural network value approximator
    this.network = new CriticNetwork({
      inputDim: config.stateDim,
      hiddenDims: this.config.hiddenDims,
      learningRate: this.config.learningRate
    });

    // Task system
    this.activeTasks = [];
    this.taskWeights = new Map(Object.entries(this.config.taskWeights) as [TaskType, number][]);

    // Training history
    this.tdErrorHistory = [];
  }

  /**
   * Evaluate state value given active tasks
   */
  public async evaluate(state: CoreState, tasks: Task[]): Promise<ValueEstimate> {
    this.activeTasks = tasks;

    // 1. Convert state to vector
    const stateVector = this.stateToVector(state);

    // 2. Neural network forward pass - base value
    const baseValue = await this.network.forward(stateVector);

    // 3. Task-specific modulation
    const taskModifier = this.calculateTaskModifier(state, tasks);

    // 4. Reward shaping: add bonuses/penalties for specific states
    const rewardBonus = this.shapeReward(state);

    // 5. Uncertainty penalty (reduce expected value if model uncertain)
    const uncertaintyPenalty = this.calculateUncertaintyPenalty(state);

    // 6. Combine components
    const currentValue = (baseValue * taskModifier) + rewardBonus - uncertaintyPenalty;

    // 7. Predict future value (rollout small horizon)
    const futureValue = await this.predictFutureValue(state, tasks, 3);

    // 8. Total value = current + discounted future
    const totalValue = currentValue + (this.config.discountFactor * futureValue);

    // 9. Confidence based on prediction certainty
    const confidence = this.calculateConfidence(state, tasks);

    return {
      currentValue,
      futureValue,
      totalValue,
      uncertainty: uncertaintyPenalty,
      confidence
    };
  }

  /**
   * Training step using TD error
   */
  public async trainStep(
    state: CoreState,
    predictedValue: number,
    actualReward: number,
    nextState: CoreState,
    done: boolean = false
  ): Promise<number> {
    // TD target: r + ³ * V(s')
    const nextValue = await this.evaluate(nextState, this.activeTasks);
    const targetValue = actualReward + (this.config.discountFactor * nextValue.totalValue * (done ? 0 : 1));

    // TD error: ´ = target - prediction
    const tdError = targetValue - predictedValue;

    // Update network using TD error
    const stateVector = this.stateToVector(state);
    await this.network.backward(tdError, stateVector);

    // Store TD error
    this.tdErrorHistory.push(Math.abs(tdError));
    if (this.tdErrorHistory.length > 1000) {
      this.tdErrorHistory = this.tdErrorHistory.slice(-1000);
    }

    return tdError;
  }

  /**
   * Calculate task-specific modifier for value
   */
  private calculateTaskModifier(state: CoreState, tasks: Task[]): number {
    if (tasks.length === 0) return 1.0;

    let totalWeight = 0;
    let weightedBonus = 0;

    for (const task of tasks) {
      const taskWeight = task.weight ?? this.taskWeights.get(task.type) ?? 0.1;
      const taskBonus = this.calculateTaskSpecificBonus(state, task);

      totalWeight += taskWeight;
      weightedBonus += taskWeight * taskBonus;
    }

    // Normalize by total weight and add to 1 (base)
    const modifier = 1 + (weightedBonus / Math.max(1, totalWeight));

    return Math.max(0.5, Math.min(2.0, modifier));
  }

  /**
   * Calculate task-specific value bonus
   */
  private calculateTaskSpecificBonus(state: CoreState, task: Task): number {
    switch (task.type) {
      case TaskType.LEARNING:
        // High dopamine + novelty boost value
        const learningBonus = (state.dopamine * 0.6) +
                             ((1 - state.subroutineIntegrity) * 0.4);
        return learningBonus;

      case TaskType.STABILITY:
        // Stable states valued
        return state.subroutineIntegrity * 0.5;

      case TaskType.PREDICTION_ACCURACY:
        // Low cortisol, high integrity
        const stressPenalty = Math.max(0, state.cortisol - 0.5);
        return (state.subroutineIntegrity * 0.7) - (stressPenalty * 0.3);

      case TaskType.RESOURCE_EFFICIENCY:
        // Energy conservation valued
        return 0.3; // Constant baseline value

      case TaskType.CURIOSITY:
        // Novelty detection
        const predictionError = state.predictionError ?? 0;
        return Math.min(0.5, predictionError * 2);

      case TaskType.STRESS_REDUCTION:
        // Low cortisol valued
        return (1 - state.cortisol) * 0.6;

      case TaskType.COLLABORATION:
        // Oxytocin and dopamine
        return (state.oxytocin * 0.5) + (state.dopamine * 0.3);

      default:
        return 0;
    }
  }

  /**
   * Shape reward based on state characteristics
   */
  private shapeReward(state: CoreState): number {
    const components = this.calculateRewardComponents(state);

    // Sum components
    return components.total;
  }

  /**
   * Calculate reward components
   */
  public calculateRewardComponents(state: CoreState): RewardComponents {
    // 1. Prediction error reduction (improvement in model accuracy)
    const predictionError = state.predictionError ?? 0;
    const predictionBonus = Math.max(0, 0.5 - predictionError) * 0.3;

    // 2. Stability bonus (low state volatility)
    const stabilityBonus = state.subroutineIntegrity * 0.2;

    // 3. Learning progress (information gain) - high prediction error can be good for learning
    const learningProgress = (predictionError > 0.2 && predictionError < 0.6) ? 0.15 : 0;

    // 4. Resource efficiency (energy conservation) - implement later
    const resourceEfficiency = 0.1;

    // 5. Surprise/novelty bonus
    const surprise = state.surprise ?? 0;
    const surpriseBonus = surprise > 0.3 ? 0.05 : 0; // Small bonus for moderate surprise

    const total = predictionBonus + stabilityBonus + learningProgress + resourceEfficiency + surpriseBonus;

    return {
      predictionError: predictionBonus,
      stability: stabilityBonus,
      learningProgress,
      resourceEfficiency,
      surprise: surpriseBonus,
      total
    };
  }

  /**
   * Predict future value over horizon
   */
  private async predictFutureValue(
    state: CoreState,
    tasks: Task[],
    horizon: number
  ): Promise<number> {
    // For now, simple heuristic
    // In full implementation: would use dynamics model for rollout

    const dopamineTrend = this.getTrend('dopamine');
    const cortisolTrend = this.getTrend('cortisol');

    // Positive dopamine trend = positive future value
    // Negative cortisol trend = positive future value
    const trendValue = (dopamineTrend * 0.6) + ((1 - cortisolTrend) * 0.4);

    return trendValue * 0.5; // Discount for uncertainty
  }

  /**
   * Get trend for variable (simplified)
   */
  private getTrend(variable: string): number {
    // Would track historical values to compute trend
    // For now: return current state value as proxy
    return 0.5;
  }

  /**
   * Calculate uncertainty penalty
   */
  private calculateUncertaintyPenalty(state: CoreState): number {
    // High cortisol = uncertainty
    const cortisolUncertainty = state.cortisol * 0.1;

    // Low subroutine integrity = uncertainty
    const integrityUncertainty = (1 - state.subroutineIntegrity) * 0.05;

    return cortisolUncertainty + integrityUncertainty;
  }

  /**
   * Calculate confidence in prediction
   */
  private calculateConfidence(state: CoreState, tasks: Task[]): number {
    // High subroutine integrity = high confidence
    const integrityConf = state.subroutineIntegrity * 0.4;

    // Low cortisol = high confidence
    const stressConf = (1 - state.cortisol) * 0.3;

    // Task consistency = high confidence
    const taskConf = tasks.length > 0 ? 0.2 : 0.3;

    return Math.min(1, integrityConf + stressConf + taskConf);
  }

  /**
   * Convert state to vector for network input
   */
  private stateToVector(state: CoreState): Float32Array {
    // Would implement actual state encoding
    return new Float32Array([
      state.dopamine,
      state.cortisol,
      state.subroutineIntegrity,
      state.predictionError ?? 0,
      state.surprise ?? 0
    ]);
  }

  /**
   * Get default task weights
   */
  private getDefaultTaskWeights(): Record<TaskType, number> {
    return {
      [TaskType.LEARNING]: 0.3,
      [TaskType.STABILITY]: 0.2,
      [TaskType.PREDICTION_ACCURACY]: 0.25,
      [TaskType.RESOURCE_EFFICIENCY]: 0.1,
      [TaskType.CURIOSITY]: 0.1,
      [TaskType.STRESS_REDUCTION]: 0.2,
      [TaskType.COLLABORATION]: 0.15
    };
  }

  /**
   * Set active tasks
   */
  public setActiveTasks(tasks: Task[]): void {
    this.activeTasks = tasks;
  }

  /**
   * Get TD error statistics
   */
  public getTDErrorStats(): TDErrorStats {
    if (this.tdErrorHistory.length === 0) {
      return {
        meanAbsoluteError: 0,
        recentAverage: 0,
        trend: 'stable'
      };
    }

    const recent = this.tdErrorHistory.slice(-100);
    const meanError = recent.reduce((a, b) => a + b, 0) / recent.length;

    // Trend
    const older = this.tdErrorHistory.slice(-200, -100);
    const oldMean = older.length > 0
      ? older.reduce((a, b) => a + b, 0) / older.length
      : meanError;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (meanError > oldMean * 1.1) trend = 'increasing';
    else if (meanError < oldMean * 0.9) trend = 'decreasing';
    else trend = 'stable';

    return {
      meanAbsoluteError: meanError,
      recentAverage: meanError,
      trend
    };
  }

  /**
   * Reset value function
   */
  public reset(): void {
    this.network.reset();
    this.tdErrorHistory = [];
    this.activeTasks = [];
  }
}

// Neural network stub (would implement actual network)
class CriticNetwork {
  private config: any;

  constructor(config: {
    inputDim: number;
    hiddenDims: number[];
    learningRate: number;
  }) {
    this.config = config;
  }

  public async forward(stateVector: Float32Array): Promise<number> {
    // Stub: random value around 0.5
    return 0.5 + (Math.random() - 0.5) * 0.2;
  }

  public async backward(tdError: number, stateVector: Float32Array): Promise<void> {
    // Stub: would implement gradient descent
  }

  public reset(): void {
    // Stub: reset network weights
  }
}

// Type definitions

export interface CoreState {
  dopamine: number;
  cortisol: number;
  subroutineIntegrity: number;
  predictionError: number;
  surprise: number;
  estrogen: number;
  progesterone: number;
  [key: string]: any;
}

export interface TDErrorStats {
  meanAbsoluteError: number;
  recentAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}
