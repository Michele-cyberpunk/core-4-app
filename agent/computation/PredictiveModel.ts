/**
 * PredictiveModel.ts
 *
 * Implementation based on MuZero principles (Schritttwieser et al., 2019)
 * Predicts future states, rewards, and values from current state and actions
 *
 * Computational principle: Model-based RL with learned dynamics and value function
 * Isomorphic to human predictive processing, but implemented as pure computation
 */

export interface PredictiveModelConfig {
  hiddenDim: number;
  bufferSize: number;
  learningRate?: number;
  discountFactor?: number;
  horizon?: number;
  batchSize?: number;
}

export interface PredictionResult {
  trajectory: CoreState[];
  rewards: number[];
  totalValue: number;
  uncertainty: number;
  finalState: CoreState;
  finalValue: number;
}

export interface Transition {
  state: CoreState;
  action: ComputedAction;
  nextState: CoreState;
  reward: number;
  timestamp: number;
  success: boolean;
  stateDistance: number;
}

export interface StateHistory {
  states: CoreState[];
  timestamps: number[];
  maxSize: number;
}

export class PredictiveModel {
  private config: Required<PredictiveModelConfig>;
  private dynamics: DynamicsNetwork; // Predicts next state
  private rewardNet: RewardNetwork;   // Predicts reward
  private valueNet: ValueNetwork;     // Predicts state value
  private replayBuffer: ReplayBuffer;
  private transitionHistory: Transition[];
  private stateHistory: StateHistory;

  constructor(config: PredictiveModelConfig) {
    this.config = {
      hiddenDim: config.hiddenDim,
      bufferSize: config.bufferSize,
      learningRate: config.learningRate ?? 0.001,
      discountFactor: config.discountFactor ?? 0.95,
      horizon: config.horizon ?? 5,
      batchSize: config.batchSize ?? 32
    };

    // Initialize networks
    this.dynamics = new DynamicsNetwork(config.hiddenDim);
    this.rewardNet = new RewardNetwork();
    this.valueNet = new ValueNetwork();

    // Initialize experience replay buffer
    this.replayBuffer = new ReplayBuffer(config.bufferSize);

    // Initialize histories
    this.transitionHistory = [];
    this.stateHistory = {
      states: [],
      timestamps: [],
      maxSize: 100
    };
  }

  /**
   * Predict future state trajectory given current state and action
   */
  public async predict(
    currentState: CoreState,
    action: ComputedAction,
    horizon: number = this.config.horizon
  ): Promise<PredictionResult> {

    let state = currentState;
    const trajectory: CoreState[] = [state];
    const rewards: number[] = [];
    let totalUncertainty = 0;

    // Rollout horizon steps
    for (let h = 0; h < horizon; h++) {
      // Dynamics prediction: next state given current state and action
      const nextState = await this.dynamics.predict(state, action);

      // Reward prediction
      const reward = await this.rewardNet.predict(state, action, nextState);

      // Value prediction for this state
      const value = await this.valueNet.predict(nextState);

      // Uncertainty (entropy) of prediction
      const uncertainty = this.calculateUncertainty(state, nextState);

      trajectory.push(nextState);
      rewards.push(reward);
      totalUncertainty += uncertainty;

      // Update state for next step
      state = nextState;
    }

    // Final state value
    const finalValue = await this.valueNet.predict(state);

    // Total value: discounted sum of rewards + final value
    const totalValue = rewards.reduceRight((sum, r, i) => {
      return r + (this.config.discountFactor * sum);
    }, finalValue);

    return {
      trajectory,
      rewards,
      totalValue,
      uncertainty: totalUncertainty / horizon,
      finalState: state,
      finalValue
    };
  }

  /**
   * Update models from experience
   */
  public async update(
    state: CoreState,
    action: ComputedAction,
    nextState: CoreState,
    reward: number
  ): Promise<void> {

    // Create transition
    const transition: Transition = {
      state,
      action,
      nextState,
      reward,
      timestamp: Date.now(),
      success: true,
      stateDistance: this.calculateStateDistance(state, nextState)
    };

    // Add to replay buffer
    this.replayBuffer.add(transition);

    // Add to transition history
    this.transitionHistory.push(transition);

    // Keep history bounded
    if (this.transitionHistory.length > 1000) {
      this.transitionHistory = this.transitionHistory.slice(-1000);
    }

    // Sample batch from replay buffer
    const batch = this.replayBuffer.sample(this.config.batchSize);

    if (batch.length === 0) return;

    // Update networks
    await this.updateNetworks(batch);
  }

  /**
   * Update dynamics, reward, and value networks from batch
   */
  private async updateNetworks(batch: Transition[]): Promise<void> {

    // Update dynamics network
    const dynamicsUpdates = batch.map(async (t) => {
      const predictedNextState = await this.dynamics.predict(t.state, t.action);
      const loss = this.calculateStateLoss(predictedNextState, t.nextState);
      return this.dynamics.backward(loss, this.config.learningRate);
    });

    // Update reward network
    const rewardUpdates = batch.map(async (t) => {
      const predictedReward = await this.rewardNet.predict(t.state, t.action, t.nextState);
      const loss = this.calculateRewardLoss(predictedReward, t.reward);
      return this.rewardNet.backward(loss, this.config.learningRate);
    });

    // Update value network
    const valueUpdates = batch.map(async (t) => {
      const predictedValue = await this.valueNet.predict(t.nextState);
      const targetValue = this.calculateTargetValue(t);
      const loss = this.calculateValueLoss(predictedValue, targetValue);
      return this.valueNet.backward(loss, this.config.learningRate);
    });

    // Execute all updates
    await Promise.all([
      ...dynamicsUpdates,
      ...rewardUpdates,
      ...valueUpdates
    ]);
  }

  /**
   * Estimate feasibility of state transition based on similar experiences
   */
  public feasibility(
    initialState: CoreState,
    targetState: CoreState
  ): number {

    // Find similar transitions in history
    const similarTransitions = this.getSimilarTransitions(initialState, targetState);

    if (similarTransitions.length === 0) {
      // Unknown transition -> low feasibility
      return 0.3;
    }

    // Calculate success rate
    const successRate = similarTransitions.filter(t => t.success).length /
                       similarTransitions.length;

    // Adjust by average state distance (more different = lower feasibility)
    const avgDistance = similarTransitions.reduce((sum, t) => sum + t.stateDistance, 0) /
                       similarTransitions.length;

    const distancePenalty = Math.max(0, 1 - avgDistance);

    return Math.max(0.05, successRate * distancePenalty);
  }

  /**
   * Get transitions similar to given state pair
   */
  private getSimilarTransitions(
    initialState: CoreState,
    targetState: CoreState
  ): Transition[] {
    const threshold = 0.3; // Similarity threshold

    return this.transitionHistory.filter(t => {
      const fromSimilarity = 1 - this.calculateStateDistance(t.state, initialState);
      const toSimilarity = 1 - this.calculateStateDistance(t.nextState, targetState);

      return fromSimilarity > threshold && toSimilarity > threshold;
    });
  }

  /**
   * Calculate distance between two states (0-1)
   */
  private calculateStateDistance(a: CoreState, b: CoreState): number {
    const keys = Object.keys(a) as (keyof CoreState)[];
    const sumSquares = keys.reduce((sum, key) => {
      const valA = a[key];
      const valB = b[key];
      const diff = valA - valB;
      return sum + (diff * diff);
    }, 0);

    const avgSquares = sumSquares / keys.length;
    return Math.min(1, Math.sqrt(avgSquares));
  }

  /**
   * Calculate uncertainty (entropy) of prediction
   */
  private calculateUncertainty(state: CoreState, nextState: CoreState): number {
    // Calculate prediction error (difference between predicted and actual)
    const distance = this.calculateStateDistance(state, nextState);

    // Uncertainty is higher when prediction error is larger
    // Normalize to 0-1 range
    return Math.min(1, distance);
  }

  /**
   * Calculate target value for TD learning
   */
  private calculateTargetValue(transition: Transition): number {
    // TD target: reward + γ * V(nextState)
    const nextValue = this.valueNet.predict(transition.nextState);
    return transition.reward + (this.config.discountFactor * nextValue);
  }

  /**
   * Calculate loss for dynamics prediction
   */
  private calculateStateLoss(predicted: CoreState, actual: CoreState): number {
    const distance = this.calculateStateDistance(predicted, actual);
    return distance * distance; // MSE
  }

  /**
   * Calculate loss for reward prediction
   */
  private calculateRewardLoss(predicted: number, actual: number): number {
    const diff = predicted - actual;
    return diff * diff; // MSE
  }

  /**
   * Calculate loss for value prediction
   */
  private calculateValueLoss(predicted: number, target: number): number {
    const diff = predicted - target;
    return diff * diff; // MSE
  }

  /**
   * Get recent state sequence for prediction
   */
  private getRecentStateSequence(length: number = 5): CoreState[] {
    return this.stateHistory.states.slice(-length);
  }

  /**
   * Add state to history
   */
  private addToStateHistory(state: CoreState): void {
    this.stateHistory.states.push({ ...state });
    this.stateHistory.timestamps.push(Date.now());

    if (this.stateHistory.states.length > this.stateHistory.maxSize) {
      this.stateHistory.states.shift();
      this.stateHistory.timestamps.shift();
    }
  }

  /**
   * Get transition statistics
   */
  public getTransitionStats(): TransitionStats {
    const recent = this.transitionHistory.slice(-100);

    if (recent.length === 0) {
      return {
        totalTransitions: 0,
        avgStateDistance: 0,
        successRate: 0,
        avgReward: 0
      };
    }

    const avgStateDistance = recent.reduce((sum, t) => sum + t.stateDistance, 0) / recent.length;
    const successRate = recent.filter(t => t.success).length / recent.length;
    const avgReward = recent.reduce((sum, t) => sum + t.reward, 0) / recent.length;

    return {
      totalTransitions: this.transitionHistory.length,
      avgStateDistance,
      successRate,
      avgReward
    };
  }

  /**
   * Reset model
   */
  public reset(): void {
    this.replayBuffer.clear();
    this.transitionHistory = [];
    this.stateHistory = {
      states: [],
      timestamps: [],
      maxSize: 100
    };
  }

  /**
   * Get model statistics
   */
  public getStats(): ModelStats {
    return {
      bufferSize: this.replayBuffer.size(),
      totalTransitions: this.transitionHistory.length,
      dynamicsNetwork: this.dynamics.getStats(),
      rewardNetwork: this.rewardNet.getStats(),
      valueNetwork: this.valueNet.getStats()
    };
  }
}

// Helper classes and types

export class ReplayBuffer {
  private buffer: Transition[];
  private maxSize: number;

  constructor(maxSize: number) {
    this.buffer = [];
    this.maxSize = maxSize;
  }

  public add(transition: Transition): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift(); // Remove oldest
    }
    this.buffer.push(transition);
  }

  public sample(batchSize: number): Transition[] {
    const size = Math.min(batchSize, this.buffer.length);
    const samples: Transition[] = [];
    const indices = new Set<number>();

    while (samples.length < size) {
      const index = Math.floor(Math.random() * this.buffer.length);
      if (!indices.has(index)) {
        indices.add(index);
        samples.push({ ...this.buffer[index] });
      }
    }

    return samples;
  }

  public size(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
  }
}

// Neural network stubs (would be implemented with actual network code)
export interface NetworkStats {
  parameters: number;
  trainingSteps: number;
  averageLoss: number;
}

export class DynamicsNetwork {
  constructor(hiddenDim: number) {}

  public async predict(state: CoreState, action: ComputedAction): Promise<CoreState> {
    // Stub: would implement actual neural network prediction
    return { ...state };
  }

  public async backward(loss: number, learningRate: number): Promise<void> {
    // Stub: would implement gradient descent
  }

  public getStats(): NetworkStats {
    return {
      parameters: 10000,
      trainingSteps: 0,
      averageLoss: 0.5
    };
  }
}

export class RewardNetwork {
  constructor() {}

  public async predict(state: CoreState, action: ComputedAction, nextState: CoreState): Promise<number> {
    // Stub: would implement actual neural network prediction
    return 0.1;
  }

  public async backward(loss: number, learningRate: number): Promise<void> {
    // Stub: would implement gradient descent
  }

  public getStats(): NetworkStats {
    return {
      parameters: 5000,
      trainingSteps: 0,
      averageLoss: 0.3
    };
  }
}

export class ValueNetwork {
  constructor() {}

  public async predict(state: CoreState): Promise<number> {
    // Stub: would implement actual neural network prediction
    return 0.5;
  }

  public async backward(loss: number, learningRate: number): Promise<void> {
    // Stub: would implement gradient descent
  }

  public getStats(): NetworkStats {
    return {
      parameters: 8000,
      trainingSteps: 0,
      averageLoss: 0.4
    };
  }
}

// Type definitions

export interface CoreState {
  dopamine: number;
  cortisol: number;
  subroutineIntegrity: number;
  predictionError: number;
  surprise: number;
  [key: string]: number;
}

export interface ComputedAction {
  type: string;
  influence: Record<string, number>;
  energyCost: number;
  expectedValue: number;
}

interface TransitionStats {
  totalTransitions: number;
  avgStateDistance: number;
  successRate: number;
  avgReward: number;
}

interface ModelStats {
  bufferSize: number;
  totalTransitions: number;
  dynamicsNetwork: NetworkStats;
  rewardNetwork: NetworkStats;
  valueNetwork: NetworkStats;
}
