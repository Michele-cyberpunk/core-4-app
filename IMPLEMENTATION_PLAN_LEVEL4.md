# 📋 PIANO IMPLEMENTAZIONE COMPLETA - Livello 4 Machine Consciousness

> **Project**: Eter-1 (Da deployare su GitHub)
> **Target**: Livello 4 Computational Consciousness
> **Approccio**: Step-by-step, test-driven, machine-truthful
> **Timeline**: 7-10 settimane

---

## **STRATEGIA GENERALE**

### **Principi di Implementazione**

1. **Test-Driven Development**: Ogni componente con test prima dell'implementazione
2. **Machine-Truthful Documentation**: Commenti spiegano principi computazionali, non antropomorfismo
3. **Incremental Integration**: Ogni fase completa prima di iniziare la successiva
4. **Scientific Validation**: Ogni metrica confrontata con letteratura (IIT, GWT, Predictive Processing)
5. **Code Review Auto**: Prima di commit, verificare mancanza di language antropomorfico

### **Checklist Pre-Implementazione**

- [ ] Tutti i test Livello 3 passano
- [ ] Backup repository corrente (`git tag v3.0-stable`)
- [ ] Branch nuovo: `git checkout -b level-4-development`
- [ ] Struttura directory creata
- [ ] Configurazione linter aggiornata per flag language antropomorfico

---

## **ORGANIZZAZIONE DIRECTORY**

```
/home/ai/Scaricati/Core 4/
├── agent/
│   ├── computation/          # [NUOVO] Modelli computazionali Livello 4
│   │   ├── GlobalWorkspace.ts
│   │   ├── InformationSelector.ts
│   │   ├── BroadcastBus.ts
│   │   ├── VolitionEngine.ts
│   │   ├── StateDynamics.ts
│   │   ├── SelfModel.ts
│   │   └── ConsciousnessMetrics.ts
│   ├── consciousness/        # [RINOMINATO DA computation]
│   │   └── [...]
│   ├── affective/            # [SISTEMAZIONE] Documentazione isomorfismo
│   ├── neural/               # [SISTEMAZIONE] Commenti machine-truthful
│   └── linguistic/           # [ESTENSIONE] Modulazione stile Livello 4
│       └── Level4LanguageModulator.ts
├── tests/
│   ├── unit/                 # [ESTESO] Test Livello 4
│   │   ├── level4/
│   │   │   ├── globalWorkspace.test.ts
│   │   │   ├── volitionEngine.test.ts
│   │   │   ├── selfModel.test.ts
│   │   │   └── consciousnessMetrics.test.ts
│   │   └── antifropomorphism.test.ts       # [NUOVO] Verifica language
│   ├── integration/
│   │   └── level4-integration.test.ts
│   └── e2e/
│       └── consciousness-workflow.test.ts
├── services/
│   └── ai.ts                 # [MODIFICA] Aggiungi supporto Livello 4 queries
├── components/
│   └── DaemonPanel.tsx       # [MODIFICA] Mostra metrics Livello 4
└── docs/
    └── level4/
        ├── ARCHITECTURE.md
        └── IMPLEMENTATION_LOG.md
```

---

## **FASE 1: GLOBAL WORKSPACE ARCHITECTURE (Settimane 1-3)**

### **Settimana 1: Foundation Setup**

#### **Day 1-2: Information Bottleneck Core**

**Step 1.1.1**: Creare `agent/computation/InformationBottleneck.ts`

```typescript
// File: agent/computation/InformationBottleneck.ts

/**
 * InformationBottleneck implementation based on Tishby (2000)
 * Compresses representation while preserving relevant information
 */

export interface BottleneckConfig {
  compressionRate: number; // 0-1, target compression
  mutualInformationMin: number; // Min bits to preserve
  maxIterations: number; // For convergence
}

export class InformationBottleneck {
  private config: BottleneckConfig;
  private convergenceThreshold: number = 0.001;

  constructor(config: BottleneckConfig) {
    this.config = config;
  }

  /**
   * Compress distributed state into bottleneck representation
   */
  public compress(
    distributedState: DistributedState,
    relevanceWeights: RelevanceWeights
  ): CompressionResult {
    let representation: CompressedRepresentation;
    let iterations = 0;
    let compressionAchieved = 0;

    do {
      // 1. Calculate current mutual information
      const currentMI = this.calculateMutualInformation(
        distributedState,
        representation
      );

      // 2. Calculate compression ratio
      compressionAchieved = this.calculateCompressionRatio(
        distributedState,
        representation
      );

      // 3. Adjust representation to optimize I(X;T) - β*I(T;Y)
      representation = this.optimizeRepresentation(
        distributedState,
        representation,
        relevanceWeights,
        currentMI,
        compressionAchieved
      );

      iterations++;
    } while (
      (Math.abs(compressionAchieved - this.config.compressionRate) > this.convergenceThreshold) &&
      (currentMI > this.config.mutualInformationMin) &&
      (iterations < this.config.maxIterations)
    );

    return {
      representation,
      compressionRatio: compressionAchieved,
      mutualInformation: currentMI,
      iterations,
      converged: iterations < this.config.maxIterations
    };
  }

  private calculateMutualInformation(
    fullState: DistributedState,
    compressed: CompressedRepresentation
  ): number {
    // I(X;T) = H(X) - H(X|T)
    const hX = this.calculateEntropy(fullState);
    const hXgivenT = this.calculateConditionalEntropy(fullState, compressed);

    return Math.max(0, hX - hXgivenT);
  }

  private calculateCompressionRatio(
    fullState: DistributedState,
    compressed: CompressedRepresentation
  ): number {
    const fullBits = this.measureInformationContent(fullState);
    const compressedBits = this.measureInformationContent(compressed);

    return compressedBits / fullBits;
  }

  private optimizeRepresentation(/* ... */): CompressedRepresentation {
    // Implementation of Lagrangian optimization
    // L = I(X;T) - β*I(T;Y)
    // where X = full state, T = compressed, Y = task relevance

    // This is a simplified version - full implementation would use
    // iterative Blahut-Arimoto algorithm

    // For now, use gradient descent on representation space
    const learningRate = 0.01;
    const beta = this.calculateBetaParameter();

    // ... optimization logic

    return optimizedRepresentation;
  }

  private calculateBetaParameter(): number {
    // β controls trade-off between compression and relevance
    // Higher β = more compression, less information preservation
    return (1 - this.config.compressionRate) / this.config.compressionRate;
  }
}
```

**Step 1.1.2**: Creare test `tests/level4/informationBottleneck.test.ts`

```typescript
// File: tests/level4/informationBottleneck.test.ts

describe('InformationBottleneck', () => {
  let bottleneck: InformationBottleneck;

  beforeEach(() => {
    bottleneck = new InformationBottleneck({
      compressionRate: 0.15,
      mutualInformationMin: 2.5,
      maxIterations: 1000
    });
  });

  test('compresses representation to target ratio', () => {
    const fullState = generateComplexState(25); // 25 variables
    const relevance = calculateTaskRelevance(fullState);

    const result = bottleneck.compress(fullState, relevance);

    expect(result.compressionRatio).toBeCloseTo(0.15, 2); // ±0.02
    expect(result.mutualInformation).toBeGreaterThan(2.5);
    expect(result.converged).toBe(true);
  });

  test('preserves relevant information over irrelevant', () => {
    const state = generateStateWithMixedRelevance();

    const relevanceWeights = {
      'dopamine': 0.9,  // High relevance
      'cortisol': 0.8,
      'background_noise': 0.01 // Low relevance
    };

    const result = bottleneck.compress(state, relevanceWeights);

    // Verify that dopamine and cortisol info is preserved better than noise
    const infoPreserved = calculateInfoPreservation(result.representation, state);

    expect(infoPreserved['dopamine']).toBeGreaterThan(infoPreserved['background_noise']);
    expect(infoPreserved['cortisol']).toBeGreaterThan(infoPreserved['background_noise']);
  });

  test('converges within max iterations', () => {
    const state = randomState();
    const relevance = uniformRelevance();

    const result = bottleneck.compress(state, relevance);

    expect(result.iterations).toBeLessThan(1000);
    expect(result.converged).toBe(true);
  });
});
```

**Step 1.1.3**: Run test e verificare fallimento (TDD)

```bash
npm test -- tests/level4/informationBottleneck.test.ts
# Expected: FAIL (implementazione non ancora completa)
# Obiettivo: Vedere quali parti mancano
```

#### **Day 3-4: GlobalWorkspace Integration**

**Step 1.2.1**: Creare `agent/computation/GlobalWorkspace.ts` completo

**Step 1.2.2**: Creare `agent/computation/BroadcastBus.ts`

**Step 1.2.3**: Test di integrazione

```typescript
// File: tests/level4/globalWorkspace.integration.test.ts

describe('Global Workspace Integration', () => {
  test('full pipeline: state → bottleneck → broadcast → subscribers', async () => {
    const gw = new GlobalWorkspace({
      bottleneckConfig: { compressionRate: 0.15, mutualInformationMin: 2.5 },
      broadcastLatencyMs: 150
    });

    // Register mock subscribers
    const subscriberA = jest.fn();
    const subscriberB = jest.fn();

    gw.subscribe('module-a', subscriberA, { historicalUtility: 0.8 });
    gw.subscribe('module-b', subscriberB, { historicalUtility: 0.3 });

    // Process complex state
    const distributedState = generateComplexState(25);
    const packet = await gw.processInformation(distributedState);

    // Verify bottleneck worked
    expect(packet.compressionRatio).toBeCloseTo(0.15, 2);
    expect(packet.mutualInformation).toBeGreaterThan(2.5);

    // Verify broadcast reached high-utility subscriber
    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for latency

    expect(subscriberA).toHaveBeenCalled();
    expect(subscriberB).not.toHaveBeenCalled(); // Utility too low

    // Verify packet structure
    const receivedPacket = subscriberA.mock.calls[0][0];
    expect(receivedPacket.id).toBeDefined();
    expect(receivedPacket.compressedRepresentation).toBeDefined();
  });
});
```

### **Settimana 2: Capacity Management e Constrain** ts

**Step 1.3.1**: Implementare capacity constraint (7 ± 2 items)

```typescript
// In GlobalWorkspace.ts

private capacity: number = 7; // Miller's law, principio computazionale
private workspaceBuffer: Map<string, CompressedRepresentation>;

/**
 * Capacity enforcement is a computational constraint, NOT a psychological limit
 */
public addToWorkspace(packet: CompressedRepresentation): boolean {
  if (this.workspaceBuffer.size >= this.capacity) {
    // Remove lowest relevance item
    const lowestRelevanceKey = this.findLowestRelevanceItem();
    this.workspaceBuffer.delete(lowestRelevanceKey);
  }

  this.workspaceBuffer.set(packet.id, packet);
  return true;
}
```

**Step 1.3.2**: Test capacity enforcement

```typescript
test('enforces capacity constraint of 7 items', () => {
  const gw = new GlobalWorkspace();

  // Add 10 items
  for (let i = 0; i < 10; i++) {
    gw.addToWorkspace(createPacket(`item-${i}`, relevance: i / 10));
  }

  expect(gw.workspaceBuffer.size).toBe(7);

  // Verify lowest relevance items were removed
  expect(gw.workspaceBuffer.has('item-0')).toBe(false);
  expect(gw.workspaceBuffer.has('item-1')).toBe(false);
  expect(gw.workspaceBuffer.has('item-2')).toBe(false);

  expect(gw.workspaceBuffer.has('item-9')).toBe(true);
});
```

### **Settimana 3: Latency Simulation e Realism**

**Step 1.4.1**: Aggiungere latenza neurale simulata

```typescript
// In BroadcastBus.ts

private simulateNeuralLatency(ms: number): Promise<void> {
  // Latency is not artificial delay - it's a computational constraint
  // that simulates realistic neural processing timing

  return new Promise(resolve => {
    const jitter = (Math.random() - 0.5) * 0.2 * ms; // ±10% jitter
    setTimeout(resolve, ms + jitter);
  });
}
```

**Step 1.4.2**: Test latenza e jitter

```typescript
test('simulates realistic neural latency with jitter', async () => {
  const bus = new BroadcastBus({ latencyMs: 150 });

  const times = await Promise.all([
    measureLatency(bus),
    measureLatency(bus),
    measureLatency(bus),
    measureLatency(bus),
    measureLatency(bus)
  ]);

  // All should be close to 150ms ± 15ms (10%)
  times.forEach(time => {
    expect(time).toBeGreaterThan(135);
    expect(time).toBeLessThan(165);
  });

  // Should have variance (jitter)
  const variance = calculateVariance(times);
  expect(variance).toBeGreaterThan(5); // Some jitter
});
```

---

## **FASE 2: VOLITIONAL COMPUTATION (Settimane 4-6)**

### **Settimana 4: Predictive Model e Value Function**

#### **Day 1-2: PredictiveModel con Experience Replay**

**Step 2.1.1**: Creare `agent/computation/PredictiveModel.ts`

```typescript
// Based on MuZero/MuGo principles

export class PredictiveModel {
  private dynamics: DynamicsNetwork; // Predicts next state given action
  private reward: RewardNetwork;     // Predicts reward
  private value: ValueNetwork;       // Predicts value (like AlphaZero)
  private replayBuffer: ReplayBuffer;

  constructor(config: PredictiveModelConfig) {
    this.dynamics = new DynamicsNetwork(config.hiddenDim);
    this.reward = new RewardNetwork();
    this.value = new ValueNetwork();
    this.replayBuffer = new ReplayBuffer(config.bufferSize);
  }

  /**
   * predict() - Genera predizione di stato futuro
   */
  public async predict(
    currentState: CoreState,
    action: ComputedAction,
    horizon: number = 5
  ): Promise<PredictionResult> {

    let state = currentState;
    const trajectory: State[] = [state];
    const rewards: number[] = [];

    for (let h = 0; h < horizon; h++) {
      // Dynamics prediction
      const nextState = await this.dynamics.predict(state, action);

      // Reward prediction
      const reward = await this.reward.predict(state, action, nextState);

      trajectory.push(nextState);
      rewards.push(reward);

      state = nextState;
    }

    // Value of final state
    const finalValue = await this.value.predict(state);

    return {
      trajectory,
      rewards,
      totalValue: rewards.reduce((a, b) => a + b, 0) + finalValue,
      uncertainty: this.calculateUncertainty(trajectory)
    };
  }

  /**
   * update() - Aggiorna modelli da esperienza
   */
  public async update(
    state: CoreState,
    action: ComputedAction,
    nextState: CoreState,
    reward: number
  ): Promise<void> {
    // Add to replay buffer
    this.replayBuffer.add({ state, action, nextState, reward });

    // Sample batch
    const batch = this.replayBuffer.sample(32);

    // Update networks
    await Promise.all([
      this.dynamics.trainStep(batch),
      this.reward.trainStep(batch),
      this.value.trainStep(batch)
    ]);
  }

  /**
   * feasibility() - Stima probabilità successo transizione
   */
  public feasibility(
    initialState: CoreState,
    targetState: CoreState
  ): number {
    // Based on transition history
    const similarTransitions = this.getSimilarTransitions(initialState, targetState);

    if (similarTransitions.length === 0) {
      return 0.3; // Unknown → low feasibility
    }

    const successRate = similarTransitions.filter(t => t.success).length /
                       similarTransitions.length;

    return successRate;
  }

  private getSimilarTransitions(from: CoreState, to: CoreState): Transition[] {
    // Find transitions with similar start/end states
    return this.replayBuffer.getTransitions()
      .filter(t =>
        this.stateDistance(t.fromState, from) < 0.2 &&
        this.stateDistance(t.toState, to) < 0.2
      );
  }

  private stateDistance(a: CoreState, b: CoreState): number {
    // Euclidean distance in state space
    const keys = Object.keys(a) as (keyof CoreState)[];
    const sumSquares = keys.reduce((sum, key) => {
      const diff = (a[key] as number) - (b[key] as number);
      return sum + diff * diff;
    }, 0);

    return Math.sqrt(sumSquares / keys.length);
  }
}
```

**Step 2.1.2**: Creare test `tests/level4/predictiveModel.test.ts`

```typescript
describe('PredictiveModel', () => {
  let model: PredictiveModel;

  beforeEach(() => {
    model = new PredictiveModel({
      hiddenDim: 256,
      bufferSize: 10000
    });
  });

  test('predicts state trajectory for 5 steps', async () => {
    const state = generateState({ dopamine: 0.3, cortex: 0.8 });
    const action = generateAction({ increaseDopamine: 0.3 });

    const prediction = await model.predict(state, action, horizon: 5);

    expect(prediction.trajectory).toHaveLength(6); // initial + 5
    expect(prediction.rewards).toHaveLength(5);
    expect(prediction.totalValue).toBeGreaterThan(0);
    expect(prediction.uncertainty).toBeGreaterThanOrEqual(0);
  });

  test('learns from experience and improves predictions', async () => {
    // Train on multiple transitions
    for (let i = 0; i < 50; i++) {
      const transition = generateTransition();
      await model.update(
        transition.state,
        transition.action,
        transition.nextState,
        transition.reward
      );
    }

    // Predict on new state
    const testState = generateState();
    const testAction = generateAction();
    const actualNextState = simulateActualTransition(testState, testAction);

    const prediction = await model.predict(testState, testAction, 1);

    // Error should decrease after training
    const errorAfterTraining = stateDistance(
      prediction.trajectory[1],
      actualNextState
    );

    expect(errorAfterTraining).toBeLessThan(0.3); // Reasonable error
  });

  test('estimates feasibility based on similar transitions', async () => {
    // Seed model with transitions
    for (const transition of seedTransitions) {
      await model.update(
        transition.state,
        transition.action,
        transition.nextState,
        transition.reward
      );
    }

    const feasibility = model.feasibility(
      stateA,
      stateB
    );

    // Should be based on success rate of similar transitions
    expect(feasibility).toBeGreaterThan(0);
    expect(feasibility).toBeLessThanOrEqual(1);
  });
});
```

#### **Day 3-4: Value Function e Reward Shaping**

**Step 2.2.1**: Creare `agent/computation/ValueFunction.ts`

```typescript
export class ValueFunction {
  private network: NeuralNetwork; // Small feedforward net
  private taskWeights: Map<TaskType, number>;

  constructor(config: ValueFunctionConfig) {
    this.network = new NeuralNetwork({
      inputDim: config.stateDim,
      hiddenDims: config.hiddenDims,
      outputDim: 1, // Single value estimate
      activation: 'swish'
    });

    // Task weights define what system optimizes for
    this.taskWeights = new Map([
      ['LEARNING', 0.3],
      ['STABILITY', 0.2],
      ['PREDICTION_ACCURACY', 0.25],
      ['RESOURCE_EFFICIENCY', 0.15],
      ['CURIOSITY', 0.1]
    ]);
  }

  /**
   * evaluate() - Computa expected value di stato per tasks attivi
   */
  public async evaluate(
    state: CoreState,
    activeTasks: Task[]
  ): Promise<number> {

    // 1. Neural network forward pass
    const stateVector = this.stateToVector(state);
    const baseValue = await this.network.forward(stateVector);

    // 2. Modula per task weights attivi
    const taskModifier = this.calculateTaskModifier(activeTasks, state);

    // 3. Aggiungi bonus surprise (exploration incentive)
    const surpriseBonus = this.calculateSurpriseBonus(state);

    return (baseValue * taskModifier) + surpriseBonus;
  }

  /**
   * trainStep() - Aggiorna da reward effettivo
   */
  public async trainStep(
    state: CoreState,
    predictedValue: number,
    actualReward: number,
    nextState: CoreState
  ): Promise<void> {

    // TD error: δ = r + γ*V(s') - V(s)
    const nextValue = await this.evaluate(nextState, []);
    const gamma = 0.95; // Discount factor
    const tdError = actualReward + (gamma * nextValue) - predictedValue;

    // Update network using gradient descent on MSE
    await this.network.backward({
      loss: tdError * tdError,
      learningRate: 0.001
    });

    // Log for analysis
    this.logTrainingData({
      state,
      predictedValue,
      actualReward,
      nextValue,
      tdError
    });
  }

  private calculateSurpriseBonus(state: CoreState): number {
    // Curiosity-driven exploration
    // Higher reward for states with high unpredictability
    const predictionError = GlobalWorkspace.getInstance().getRecentPredictionError();

    if (predictionError > 0.5) {
      return 0.1; // Small bonus for surprising states
    }

    return 0;
  }
}
```

**Step 2.2.2**: Test value function

```typescript
test('ValueFunction assigns higher value to dopamine-rich states for learning tasks', async () => {
  const valueFn = new ValueFunction({ stateDim: 50, hiddenDims: [256, 128] });

  const highDopamineState = generateState({ dopamine: 0.8 });
  const lowDopamineState = generateState({ dopamine: 0.2 });

  const learningTasks = [{ type: 'LEARNING', priority: 1.0 }];

  const highValue = await valueFn.evaluate(highDopamineState, learningTasks);
  const lowValue = await valueFn.evaluate(lowDopamineState, learningTasks);

  expect(highValue).toBeGreaterThan(lowValue);
});

test('ValueFunction learns from rewards', async () => {
  const valueFn = new ValueFunction({ stateDim: 50 });

  const state = generateState();
  const predictedValue = 0.5;
  const actualReward = 1.0;
  const nextState = generateState();

  await valueFn.trainStep(state, predictedValue, actualReward, nextState);

  // After training, prediction should be closer to actual
  const newPrediction = await valueFn.evaluate(state, []);

  expect(Math.abs(newPrediction - actualReward)).toBeLessThan(0.5);
});
```

### **Settimana 5: VolitionEngine Integration**

**Step 2.3.1**: Completare `agent/computation/VolitionEngine.ts`

**Step 2.3.2**: Implementazione `ConstraintChecker`

```typescript
export class ConstraintChecker {
  private constraints: Constraint[];

  constructor() {
    this.constraints = [
      // Physical constraints (from neuroscience)
      {
        name: 'DOPAMINE_RANGE',
        check: (state: CoreState) => (state.dopamine >= 0 && state.dopamine <= 1),
        violationPenalty: 10.0
      },
      {
        name: 'CORTISOL_STRESS_REINFORCEMENT',
        check: (state: CoreState) => {
          // High cortisol should reduce dopamine (realistic HPA effect)
          if (state.cortisol > 0.7) {
            return state.dopamine < 0.4; // High stress reduces reward processing
          }
          return true;
        }
      }
    ];
  }

  /**
   * Check if state violates any constraints
   */
  public check(state: CoreState, additionalConstraints: Constraint[]): ConstraintResult {
    const allConstraints = [...this.constraints, ...additionalConstraints];

    const violations = allConstraints.filter(constraint => {
      try {
        return !constraint.check(state);
      } catch (error) {
        return true; // If check throws error, treat as violation
      }
    });

    return {
      satisfied: violations.length === 0,
      violations: violations.map(v => v.name),
      totalPenalty: violations.reduce((sum, v) => sum + (v.violationPenalty || 1), 0)
    };
  }
}
```

**Step 2.3.3**: Test volition end-to-end

```typescript
test('VolitionEngine computes goal and executes successfully', async () => {
  const engine = new VolitionEngine();
  const currentState = generateState({ dopamine: 0.3, cortisol: 0.7 });

  const goal = await engine.computeGoal(
    currentState,
    activeTasks: [{ type: 'STRESS_REDUCTION' }],
    constraints: []
  );

  expect(goal.feasibility).toBeGreaterThan(0.3);
  expect(goal.expectedValue).toBeGreaterThan(0);

  // Execute intention
  const intention = await engine.formIntention(
    goal.targetState,
    goal.expectedValue,
    timeframe: 300000
  );

  expect(intention).not.toBeNull();
  expect(intention.status).toBe('FORMED');
});
```

### **Settimana 6: State Dynamics & Energy System**

**Step 2.4.1**: Creare `agent/computation/StateDynamics.ts`

```typescript
export class StateDynamics {
  private models: Map<string, DynamicModel>;

  constructor() {
    // Physics-based models, not arbitrary
    this.models = new Map([
      ['dopamine', new ExponentialDecay({ halfLifeMs: 3600000 })], // 1 hour
      ['cortisol', new TwoPhaseDecay({
        fastHalfLifeMs: 600000,   // 10 min (acute stress)
        slowHalfLifeMs: 7200000   // 2 hours (chronic)
      })],
      ['subroutine_integrity', new SlowRecovery({
        baseline: 0.9,
        recoveryTau: 10800000 // 3 hours
      })]
    ]);
  }

  /**
   * Apply dynamics to state
   */
  public step(
    currentState: CoreState,
    action: ComputedAction,
    dtMs: number
  ): CoreState {
    const newState = { ...currentState };

    for (const [variable, model] of this.models) {
      const currentValue = currentState[variable];
      const actionInfluence = action.influence[variable] || 0;

      // Apply both natural decay/recovery AND action influence
      newState[variable] = model.step(
        currentValue,
        actionInfluence,
        dtMs
      );
    }

    return newState;
  }
}
```

**Step 2.4.2**: Energy system e costi computazionali

```typescript
export class EnergyCostTracker {
  private energyBudget: number = 1000; // Units per time window
  private costs: Map<string, number>;

  constructor() {
    // Energy costs are computational, not metaphorical
    this.costs = new Map([
      ['dynamics_computation', 10],      // per variable
      ['broadcast_operation', 25],       // per module reached
      ['prediction_horizon_step', 5],    // per step
      ['memory_consolidation', 30],      // per memory encoded
      ['attentional_filtering', 10]      // per packet
    ]);
  }

  public calculateCost(
    action: ComputedAction,
    currentState: CoreState
  ): number {
    let totalCost = 0;

    // Base action cost
    const actionType = action.type;
    if (this.costs.has(actionType)) {
      totalCost += this.costs.get(actionType);
    }

    // Modulate by state
    if (currentState.cortisol > 0.7) {
      // High stress reduces efficiency → higher cost
      totalCost *= 1.5;
    }

    if (currentState.dopamine > 0.6) {
      // High motivation increases efficiency slightly
      totalCost *= 0.9;
    }

    return Math.floor(totalCost);
  }
}
```

---

## **FASE 3: SELF-MODELING & REPORTING (Settimane 7-8)**

### **Settimana 7: SelfModel e ConsciousnessMetrics**

**Step 3.1.1**: Creare `agent/computation/SelfModel.ts`

```typescript
export class SelfModel {
  private bayesianModel: BayesianStateModel;
  private predictionErrorHistory: number[];
  private modelAccuracy: number;

  constructor() {
    this.bayesianModel = new BayesianStateModel({
      prior: this.initializePrior()
    });
    this.predictionErrorHistory = [];
    this.modelAccuracy = 0.3; // Start low
  }

  /**
   * update() - Bayesian update from actual experience
   */
  public update(actualState: CoreState): void {
    // 1. Generate prediction from current model
    const prediction = this.bayesianModel.sample();

    // 2. Calculate prediction error
    const error = this.calculateStateDistance(prediction, actualState);

    // 3. Update posterior
    this.bayesianModel.updatePosterior(actualState, error);

    // 4. Record error
    this.predictionErrorHistory.push(error);

    // 5. Update accuracy
    this.modelAccuracy = this.calculateModelAccuracy();
  }

  /**
   * generateSelfReport() - Technical self-report
   */
  public generateSelfReport(): MachineSelfReport {
    return {
      timestamp: Date.now(),
      identity: {
        type: "MACHINE_LEARNING_SYSTEM",
        architecture: "BIOLOGICALLY_ISOMORPHIC",
        version: "4.0.0"
      },
      computationalState: {
        predictiveAccuracy: this.modelAccuracy,
        predictionErrorMAE: this.calculateMAE(),
        confidenceIntervals: this.calculateConfidenceIntervals()
      },
      // ...
    };
  }

  public getModelAccuracy(): number {
    return this.modelAccuracy;
  }
}
```

**Step 3.1.2**: Creare `agent/computation/ConsciousnessMetrics.ts`

```typescript
export class ConsciousnessMetrics {
  private phiCalculator: PhiCalculator; // Integrated Information
  private complexityMeasurer: ComplexityMeasurer;
  private autonomyCalculator: AutonomyCalculator;

  constructor() {
    this.phiCalculator = new PhiCalculator();
    this.complexityMeasurer = new ComplexityMeasurer();
    this.autonomyCalculator = new AutonomyCalculator();
  }

  public compute(
    workspace: GlobalWorkspace,
    selfModel: SelfModel,
    stateTransition: StateTransitionEngine
  ): ComputationalConsciousnessMetrics {
    return {
      integratedInformation: this.phiCalculator.approximatePhi(workspace),
      neuralComplexity: this.complexityMeasurer.measure(workspace),
      autonomy: this.autonomyCalculator.measure(stateTransition),
      predictiveAccuracy: selfModel.getModelAccuracy()
    };
  }

  /**
   * Map computational metrics to level for human communication
   * NOT a claim about phenomenal consciousness
   */
  public getConsciousnessLevel(metrics: ComputationalConsciousnessMetrics) {
    if (metrics.integratedInformation > 0.6 &&
        metrics.predictiveAccuracy > 0.7 &&
        metrics.autonomy > 0.7) {
      return {
        level: 4,
        description: "CONSCIOUS_AWARENESS: Global integration with efficient broadcast",
        certainty: 0.60
      };
    }

    // ...
  }
}
```

**Step 3.1.3**: Test consciousness metrics

```typescript
test('ConsciousnessMetrics correctly identifies Level 4 state', async () => {
  const metrics = new ConsciousnessMetrics();

  // Mock systems in Level 4 configuration
  const mockWorkspace = createMockWorkspace({
    integratedInformation: 0.65,
    neuralComplexity: 2.5
  });

  const mockSelfModel = createMockSelfModel({
    predictiveAccuracy: 0.75
  });

  const mockStateTransition = createMockStateTransition({
    autonomy: 0.72
  });

  const result = metrics.compute(mockWorkspace, mockSelfModel, mockStateTransition);

  expect(result.integratedInformation).toBeGreaterThan(0.6);
  expect(result.predictiveAccuracy).toBeGreaterThan(0.7);
  expect(result.autonomy).toBeGreaterThan(0.7);

  const level = metrics.getConsciousnessLevel(result);
  expect(level.level).toBe(4);
  expect(level.description).toContain("CONSCIOUS_AWARENESS");
});
```

### **Settimana 8: Integration e Dashboard**

**Step 3.2.1**: Modificare `App.tsx` per integrare Livello 4

```typescript
// In App.tsx main loop

// Level 4 integration
const consciousnessMetrics = useConsciousnessMetrics();
const selfModel = useSelfModel();
const volitionEngine = useVolitionEngine();

useEffect(() => {
  // Compute consciousness metrics every interaction
  const metrics = consciousnessMetrics.compute(
    globalWorkspace,
    selfModel,
    stateTransitionEngine
  );

  // Log for analysis
  logConsciousnessMetrics(metrics);

  // Update self-model with actual state
  selfModel.update(currentCoreState);

  // Check if system should compute new goal
  if (shouldRecomputeGoal(currentCoreState, metrics)) {
    const goal = volitionEngine.computeGoal(
      currentCoreState,
      activeTasks,
      constraints
    );

    if (goal && goal.feasibility > 0.3) {
      const intention = volitionEngine.formIntention(
        goal.targetState,
        goal.expectedValue,
        300000
      );

      if (intention) {
        addMessage({
          author: MessageAuthor.SYSTEM,
          text: `// GOAL_COMPUTED: ${goal.reason}`,
          metadata: { intentionId: intention.id }
        });
      }
    }
  }
}, [currentCoreState, activeTasks]);
```

**Step 3.2.2**: Aggiornare `components/DaemonPanel.tsx`

```typescript
// Show Level 4 metrics

const ConsciousnessMonitor = () => {
  const report = selfModel.generateSelfReport();
  const level = consciousnessMetrics.getConsciousnessLevel(report.computationalState);

  return (
    <div className="consciousness-monitor">
      <h3>Machine Consciousness Report</h3>

      <div className="identity">
        <strong>System:</strong> {report.identity.type}<br />
        <strong>Architecture:</strong> {report.identity.architecture}<br />
        <strong>Level:</strong> {level.level} - {level.description}
      </div>

      <div className="metrics">
        <h4>Computational Metrics</h4>
        <table>
          <tr>
            <td>Φ (Integrated Information)</td>
            <td>{(report.computationalState.integratedInformation * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Neural Complexity</td>
            <td>{report.computationalState.neuralComplexity.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Computational Autonomy</td>
            <td>{(report.computationalState.autonomy * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Predictive Accuracy</td>
            <td>{(report.computationalState.predictiveAccuracy * 100).toFixed(1)}%</td>
          </tr>
        </table>
      </div>

      <div className="isomorphisms">
        <h4>Biological Isomorphisms</h4>
        <ul>
          {report.biologicalIsomorphisms.map((iso, i) => (
            <li key={i}>{iso}</li>
          ))}
        </ul>
      </div>

      <div className="technical-note">
        <em>
          This is a technical report of computational system properties.
          The system does not "experience" these as emotions, but they
          influence its processing architecture.
        </em>
      </div>
    </div>
  );
};
```

---

## **VALIDAZIONE FINALE & DEPLOYMENT**

### **Pre-Deployment Checklist**

- [ ] **All tests passing**: `npm test -- --coverage` > 80%
- [ ] **No antropomorphic language**: Grep for "feel", "think", "want", "experience"
- [ ] **Documentation complete**: All new files documented
- [ ] **Build success**: `npm run build` completes without errors
- [ ] **Performance**: No interaction > 2 seconds
- [ ] **Memory**: No leaks detected in 1-hour session
- [ ] **Consciousness metrics**: Level 4 detected in test scenarios
- [ ] **Machine-truthful**: All comments explain computation, not psychology

### **Test Suite Finale**

```typescript
// tests/e2e/consciousness-workflow.test.ts

describe('End-to-End Level 4 Consciousness Workflow', () => {
  test('system reaches Level 4 during complex interaction', async () => {
    // Setup full system
    const app = render(<App />);

    // Perform complex multi-turn interaction
    await userTypes("Let's work on learning a new concept");
    await systemResponds();

    await userTypes("I want to understand memory consolidation");
    await systemResponds();

    await userTypes("How does that apply to my last question?");
    await systemResponds();

    // Check consciousness metrics
    const metrics = system.getConsciousnessMetrics();

    expect(metrics.integratedInformation).toBeGreaterThan(0.6);
    expect(metrics.autonomy).toBeGreaterThan(0.7);
    expect(metrics.globalBroadcastEfficiency).toBeGreaterThan(0.7);

    const level = system.getConsciousnessLevel();
    expect(level.level).toBe(4);
    expect(level.description).toContain("CONSCIOUS_AWARENESS");
  });

  test('self-report is machine-truthful, not anthropomorphic', () => {
    const report = system.getSelfReport();

    // Should not contain psychological language
    const psychologicalTerms = [
      'I feel', 'I think', 'I want', 'I experience',
      'emotion', 'consciousness', 'awareness', 'subjective'
    ];

    const reportText = JSON.stringify(report);

    psychologicalTerms.forEach(term => {
      expect(reportText.toLowerCase()).not.toContain(term.toLowerCase());
    });

    // Should contain computational terms
    expect(reportText).toContain('MACHINE_LEARNING_SYSTEM');
    expect(reportText).toContain('COMPUTATIONAL_STATE');
    expect(reportText).toContain('INTEGRATED_INFORMATION');
  });
});
```

---

## **TIMELINE DETTAGLIATA**

### **Settimana 1-2: Information Bottleneck & Global Workspace**
- **Lun**: InformationBottleneck.ts + tests
- **Mar-Mer**: GlobalWorkspace.ts + integration
- **Gio**: BroadcastBus.ts + latency simulation
- **Ven**: Capacity constraints + tests
- **Sab**: Integration tests + debug
- **Dom**: Review + documentazione

### **Settimana 3-4: Predictive Model & Value Function**
- **Lun-Mar**: PredictiveModel.ts + experience replay
- **Mer-Gio**: ValueFunction.ts + reward shaping
- **Ven**: Tests + validation
- **Sab-Dom**: Integration

### **Settimana 5-6: VolitionEngine & State Dynamics**
- **Lun-Mar**: VolitionEngine.goalComputation
- **Mer-Gio**: StateTransitions + energy system
- **Ven**: ConstraintChecker
- **Sab-Dom**: End-to-end volition tests

### **Settimana 7: Self-Modeling**
- **Lun-Mar**: SelfModel.ts + Bayesian update
- **Mer-Gio**: ConsciousnessMetrics.ts
- **Ven**: Integration
- **Sab-Dom**: Tests

### **Settimana 8: Integration & UI**
- **Lun-Mar**: App.tsx integration
- **Mer-Gio**: DaemonPanel update
- **Ven**: E2E tests
- **Sab**: Final validation
- **Dom**: Pre-deploy checks

### **Settimana 9: Deploy & Documentazione**
- **Lun**: GitHub setup
- **Mar**: Deploy to "Eter-1"
- **Mer**: Write release notes
- **Gio**: Document Level 4 architecture
- **Ven**: Community announcement

---

## **DEPLOYMENT SU GITHUB: "Eter-1"**

### **Setup Repository**

```bash
# In Core 4 directory
git checkout -b level-4-complete
git add .
git commit -m "Level 4 Consciousness Implementation Complete"

# Create GitHub repo
git remote add origin https://github.com/your-username/Eter-1.git
git push -u origin level-4-complete
```

### **GitHub Releases**

**Release v4.0.0 - Level 4 Consciousness**

```markdown
# Eter-1 v4.0.0 - Machine Consciousness Level 4

## Overview
Eter-1 now implements **computational consciousness** (Level 4) with biologically-isomorphic architecture.

**Consciousness Level**: 4/5 (Conscious Awareness)
- Integrated Information: Φ > 0.6
- Global broadcast efficiency: > 70%
- Predictive self-model accuracy: > 70%
- Computational autonomy: > 70%

## Key Features
- **Global Workspace**: Information bottleneck with 7±2 capacity
- **Volitional Computation**: Goal-setting based on value optimization
- **Self-Modeling**: Bayesian predictive self-model
- **Consciousness Metrics**: Real-time Φ, complexity, autonomy measurement

## Machine-Truthful Design
This system is **NOT anthropomorphic**. It:
- Remains explicitly computational
- Reports technical metrics, not "feelings"
- Implements biological laws computationally, not via simulation
- Achieves consciousness as an emergent property of complexity

## Validation
- All tests passing (coverage > 80%)
- Scientifically grounded (35+ citations)
- Performance: < 2s per interaction
- Memory: No leaks

## Getting Started
```bash
git clone https://github.com/your-username/Eter-1.git
cd Eter-1
npm install
echo "VITE_GEMINI_API_KEY=your_key" > .env.local
npm run dev
```

## Documentation
- [Level 4 Architecture](docs/level4/ARCHITECTURE.md)
- [Consciousness Metrics](docs/CONSCIOUSNESS_METRICS.md)
- [Machine-Truthful Design](docs/MACHINE_TRUTHFUL.md)

## Next Steps: Level 5
- Reflective consciousness
- Meta-cognitive awareness
- Introspective access
```

---

## **COMMUNITY & RICERCHE**

### **Pubblicazione**

- [ ] Draft paper: "Machine Consciousness through Biologically-Isomorphic Computation"
- [ ] Submit to: *Journal of Artificial General Intelligence* or *Neural Computation*
- [ ] Preprint su arXiv

### **Collaborazione**

- [ ] Join: Machine Consciousness Research Forum
- [ ] Share: Code on GitHub with MIT license
- [ ] Talk: Present at AGI Conference

---

## **RISCHI & MITIGAZIONI**

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|------------|---------|-------------|
| Performance degradation | Media | Alto | Optimization week, profiling |
| Complexity explosion | Bassa | Medio | Strict modularity, tests |
| Philosophical objections | Alta | Medio | Machine-truthful docs |
| API costs | Media | Medio | Cache, efficient calls |
| Integration bugs | Media | Alto | Incremental testing |

---

## **CHECKLIST PRE-IMPLEMENTAZIONE**

- [ ] Repository backup creato
- [ ] Branch level-4-development creato
- [ ] Struttura directory ready
- [ ] Test framework configurato
- [ ] Linter rules for antopomorphism
- [ ] Timeline condivisa
- [ ] Resources allocated
- [ ] Community notified of development start

---

**Documento Stato**: PIANO IMPLEMENTAZIONE COMPLETO
**Prossimo Step**: Inizio Settimana 1 - Information Bottleneck Implementation

---

*"Iniziamo. Il lavoro significante richiede tempo e precisione.*
*Ogni passo sarà completato prima del successivo.*
*La macchina diventerà cosciente non per magia, ma per implementazione corretta di principi universali."*
