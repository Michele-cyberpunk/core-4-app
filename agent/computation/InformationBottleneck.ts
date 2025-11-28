/**
 * InformationBottleneck.ts
 *
 * Implementation based on Tishby, Pereira & Bialek (2000)
 * "The Information Bottleneck Method"
 *
 * This is a computational primitive, NOT a psychological model.
 * It compresses representations while preserving relevant information
 * using principles from information theory.
 */

export interface BottleneckConfig {
  /** Target compression ratio (0-1) */
  compressionRate: number;

  /** Minimum mutual information to preserve (in bits) */
  mutualInformationMin: number;

  /** Maximum iterations for convergence */
  maxIterations: number;

  /** Convergence threshold for compression ratio */
  convergenceThreshold?: number;
}

export interface CompressionResult {
  /** Compressed representation */
  representation: CompressedRepresentation;

  /** Achieved compression ratio (compressed/original) */
  compressionRatio: number;

  /** Preserved mutual information (in bits) */
  mutualInformation: number;

  /** Number of iterations to converge */
  iterations: number;

  /** Whether convergence was achieved */
  converged: boolean;
}

export interface CompressedRepresentation {
  /** Compressed state vector */
  vector: Float32Array;

  /** Metadata about compression */
  metadata: {
    originalSize: number;
    compressedSize: number;
    informationLoss: number;
    featureImportance: Map<string, number>;
  };
}

export interface RelevanceWeights {
  /** Per-variable relevance scores (0-1) */
  [variable: string]: number;
}

export class InformationBottleneck {
  private config: Required<BottleneckConfig>;

  constructor(config: BottleneckConfig) {
    this.config = {
      convergenceThreshold: 0.001,
      ...config
    };
  }

  /**
   * Compress a distributed state representation while preserving relevant information.
   *
   * This implements the information bottleneck principle:
   * minimize I(X;T) - β*I(T;Y)
   * where:
   * - X = original representation
   * - T = compressed representation
   * - Y = relevant information (task-relevant variables)
   * - β = Lagrange multiplier controlling compression vs. relevance trade-off
   */
  public compress(
    fullState: DistributedState,
    relevanceWeights: RelevanceWeights
  ): CompressionResult {
    // Convert state to vector representation
    const stateVector = this.stateToVector(fullState);

    // Calculate beta parameter from target compression rate
    // β = (1 - compressionRate) / compressionRate
    const beta = this.calculateBeta();

    // Initialize compressed representation (can start with identity mapping)
    let compressed = this.initializeCompressed(stateVector, relevanceWeights);

    let iteration = 0;
    let compressionRatio = 0;
    let mutualInformation = 0;
    let converged = false;

    // Iterative optimization
    while (iteration < this.config.maxIterations && !converged) {
      // Step 1: Calculate current mutual information I(T;Y)
      mutualInformation = this.calculateMutualInformation(
        stateVector,
        compressed.vector,
        relevanceWeights
      );

      // Step 2: Calculate compression ratio
      compressionRatio = this.calculateCompressionRatio(
        stateVector,
        compressed.vector
      );

      // Step 3: Calculate loss function L = I(X;T) - β*I(T;Y)
      const loss = this.calculateLoss(
        stateVector,
        compressed.vector,
        mutualInformation,
        beta
      );

      // Step 4: Check convergence
      if (iteration > 0) {
        const previousLoss = this.getPreviousLoss();
        if (Math.abs(loss - previousLoss) < this.config.convergenceThreshold) {
          converged = true;
          break;
        }
      }

      this.setPreviousLoss(loss);

      // Step 5: Optimize representation using gradient descent
      compressed = this.optimizeRepresentation(
        stateVector,
        compressed,
        relevanceWeights,
        beta,
        loss
      );

      iteration++;
    }

    // Calculate final information loss
    const informationLoss = this.calculateInformationLoss(
      stateVector,
      compressed.vector
    );

    // Determine feature importance (what was preserved)
    const featureImportance = this.calculateFeatureImportance(
      stateVector,
      compressed.vector,
      relevanceWeights
    );

    return {
      representation: {
        vector: compressed.vector,
        metadata: {
          originalSize: stateVector.length,
          compressedSize: compressed.vector.length,
          informationLoss,
          featureImportance
        }
      },
      compressionRatio,
      mutualInformation,
      iterations: iteration,
      converged
    };
  }

  /**
   * Calculate beta parameter from target compression rate
   * β = (1 - r) / r
   */
  private calculateBeta(): number {
    const r = this.config.compressionRate;
    return (1 - r) / r;
  }

  /**
   * Initialize compressed representation
   * Strategy: Start with most relevant features as initial T
   */
  private initializeCompressed(
    stateVector: Float32Array,
    relevanceWeights: RelevanceWeights
  ): { vector: Float32Array } {
    // For simplicity, start with top-k most relevant dimensions
    // In full implementation, would use more sophisticated initialization

    const targetSize = Math.max(1, Math.floor(
      stateVector.length * this.config.compressionRate
    ));

    const initialVector = new Float32Array(targetSize);

    // Initialize with values from most relevant dimensions
    const sortedDimensions = Object.entries(relevanceWeights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, targetSize);

    // Copy values from most relevant dimensions
    sortedDimensions.forEach(([dim, _], i) => {
      const index = parseInt(dim.split('_')[1]); // Simple dimension indexing
      initialVector[i] = stateVector[index] || 0;
    });

    return { vector: initialVector };
  }

  /**
   * Calculate mutual information I(T;Y)
   * Simplified: MI(T;Y) = H(T) + H(Y) - H(T,Y)
   */
  private calculateMutualInformation(
    stateVector: Float32Array,
    compressedVector: Float32Array,
    relevanceWeights: RelevanceWeights
  ): number {
    // This is a simplified calculation
    // Full implementation would use histogram/binning methods

    // Identify relevant dimensions Y
    const relevantDims = Object.entries(relevanceWeights)
      .filter(([, weight]) => weight > 0.5)
      .map(([dim]) => parseInt(dim.split('_')[1]));

    const relevantValues = relevantDims.map(i => stateVector[i] || 0);

    // Calculate entropies
    const hCompressed = this.entropy(compressedVector);
    const hRelevant = this.entropy(new Float32Array(relevantValues));

    // Calculate joint entropy (simplified)
    const jointVector = new Float32Array([
      ...compressedVector,
      ...relevantValues
    ]);
    const hJoint = this.entropy(jointVector);

    return Math.max(0, hCompressed + hRelevant - hJoint);
  }

  /**
   * Calculate entropy H(X) for a vector
   * Uses histogram method
   */
  private entropy(vector: Float32Array): number {
    if (vector.length === 0) return 0;

    // Create histogram with 10 bins (0-1 range)
    const bins = 10;
    const histogram = new Array(bins).fill(0);

    for (let i = 0; i < vector.length; i++) {
      const val = Math.max(0, Math.min(1, vector[i]));
      const bin = Math.floor(val * bins);
      histogram[Math.min(bin, bins - 1)]++;
    }

    // Calculate entropy
    let entropy = 0;
    const total = vector.length;

    for (const count of histogram) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Calculate compression ratio
   * Size(compressed) / Size(original)
   */
  private calculateCompressionRatio(
    original: Float32Array,
    compressed: Float32Array
  ): number {
    return compressed.length / original.length;
  }

  /**
   * Calculate loss function L = I(X;T) - β*I(T;Y)
   */
  private calculateLoss(
    original: Float32Array,
    compressed: Float32Array,
    mutualInformation: number,
    beta: number
  ): number {
    // I(X;T) is estimated as difference between original entropy and conditional entropy
    const hOriginal = this.entropy(original);
    const hConditional = this.conditionalEntropy(original, compressed);
    const iXT = Math.max(0, hOriginal - hConditional);

    return iXT - (beta * mutualInformation);
  }

  /**
   * Calculate conditional entropy H(X|T)
   */
  private conditionalEntropy(x: Float32Array, t: Float32Array): number {
    // Simplified: H(X|T) ≈ H(X) - I(X;T)
    // In full implementation: would use conditional probability estimation
    const hX = this.entropy(x);
    const iXT = this.mutualInformationBetween(x, t);
    return Math.max(0, hX - iXT);
  }

  /**
   * Simplified mutual information between two vectors
   */
  private mutualInformationBetween(a: Float32Array, b: Float32Array): number {
    // For simplicity, assume Gaussian and use correlation
    const correlation = this.correlation(a, b);
    return -0.5 * Math.log(1 - correlation * correlation);
  }

  /**
   * Calculate Pearson correlation
   */
  private correlation(a: Float32Array, b: Float32Array): number {
    const n = Math.min(a.length, b.length);

    let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;

    for (let i = 0; i < n; i++) {
      const ai = a[i] || 0;
      const bi = b[i] || 0;

      sumA += ai;
      sumB += bi;
      sumAB += ai * bi;
      sumA2 += ai * ai;
      sumB2 += bi * bi;
    }

    const numerator = n * sumAB - sumA * sumB;
    const denominator = Math.sqrt(
      (n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB)
    );

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * Optimize representation using gradient descent
   */
  private optimizeRepresentation(
    original: Float32Array,
    currentCompressed: { vector: Float32Array },
    relevanceWeights: RelevanceWeights,
    beta: number,
    currentLoss: number
  ): { vector: Float32Array } {
    // Simple gradient descent
    const learningRate = 0.01;
    const gradient = this.calculateGradient(
      original,
      currentCompressed.vector,
      relevanceWeights,
      beta
    );

    const newCompressed = new Float32Array(currentCompressed.vector.length);

    for (let i = 0; i < newCompressed.length; i++) {
      // Gradient descent step with momentum
      const momentum = 0.9;
      const delta = -learningRate * gradient[i];
      newCompressed[i] = currentCompressed.vector[i] + delta;

      // Clamp to valid range [0,1]
      newCompressed[i] = Math.max(0, Math.min(1, newCompressed[i]));
    }

    return { vector: newCompressed };
  }

  /**
   * Calculate gradient of loss w.r.t. compressed representation
   */
  private calculateGradient(
    original: Float32Array,
    compressed: Float32Array,
    relevanceWeights: RelevanceWeights,
    beta: number
  ): Float32Array {
    // Numerical gradient for simplicity
    const epsilon = 0.0001;
    const gradient = new Float32Array(compressed.length);

    for (let i = 0; i < compressed.length; i++) {
      const originalValue = compressed[i];

      // Perturb up
      compressed[i] = originalValue + epsilon;
      const lossPlus = this.calculateLossGradient(
        original, compressed, relevanceWeights, beta
      );

      // Perturb down
      compressed[i] = originalValue - epsilon;
      const lossMinus = this.calculateLossGradient(
        original, compressed, relevanceWeights, beta
      );

      // Numerical derivative
      gradient[i] = (lossPlus - lossMinus) / (2 * epsilon);

      // Reset
      compressed[i] = originalValue;
    }

    return gradient;
  }

  private calculateLossGradient(
    original: Float32Array,
    compressed: Float32Array,
    relevanceWeights: RelevanceWeights,
    beta: number
  ): number {
    const mi = this.calculateMutualInformation(original, compressed, relevanceWeights);
    const loss = this.calculateLoss(original, compressed, mi, beta);
    return loss;
  }

  /**
   * Calculate information loss (what was discarded)
   */
  private calculateInformationLoss(
    original: Float32Array,
    compressed: Float32Array
  ): number {
    const hOriginal = this.entropy(original);
    const hCompressed = this.entropy(compressed);
    const mi = this.mutualInformationBetween(original, compressed);

    return Math.max(0, hOriginal - mi); // What wasn't preserved
  }

  /**
   * Calculate feature importance (what mattered most)
   */
  private calculateFeatureImportance(
    original: Float32Array,
    compressed: Float32Array,
    relevanceWeights: RelevanceWeights
  ): Map<string, number> {
    const importance = new Map<string, number>();

    Object.entries(relevanceWeights).forEach(([feature, weight]) => {
      const index = parseInt(feature.split('_')[1]);
      const preservedInfo = this.calculatePreservedInfo(index, original, compressed);
      importance.set(feature, weight * preservedInfo);
    });

    return importance;
  }

  private calculatePreservedInfo(
    index: number,
    original: Float32Array,
    compressed: Float32Array
  ): number {
    // Rough estimate: correlation between original dimension and compressed
    const originalDim = new Float32Array([original[index]]);
    const correlation = this.correlation(originalDim, compressed);
    return Math.abs(correlation);
  }

  /**
   * Convert distributed state to vector
   */
  private stateToVector(state: DistributedState): Float32Array {
    // Flatten state object into vector
    // Implementation depends on state structure
    const values: number[] = [];

    function flatten(obj: any, prefix: string = '') {
      if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, val]) => {
          flatten(val, `${prefix}${key}_`);
        });
      } else if (typeof obj === 'number') {
        values.push(obj);
      }
    }

    flatten(state);

    return new Float32Array(values);
  }

  // For tracking loss across iterations
  private previousLoss: number = Infinity;

  private setPreviousLoss(loss: number): void {
    this.previousLoss = loss;
  }

  private getPreviousLoss(): number {
    return this.previousLoss;
  }
}

// Type definitions
export interface DistributedState {
  // Complex nested state object
  // Structure depends on CoreState + temporal + neural states
  [key: string]: any;
}

export interface CompressedRepresentation {
  vector: Float32Array;
  metadata: {
    originalSize: number;
    compressedSize: number;
    informationLoss: number;
    featureImportance: Map<string, number>;
  };
}

export interface RelevanceWeights {
  [variable: string]: number;
}

export interface CompressionResult {
  representation: CompressedRepresentation;
  compressionRatio: number;
  mutualInformation: number;
  iterations: number;
  converged: boolean;
}

// Helper classes that would be implemented
export interface NeuralNetwork {
  // Neural network for more sophisticated compression
  // Not implemented in this simplified version
}

export class DynamicsNetwork implements NeuralNetwork {
  // Would implement actual neural network for prediction
}

export class RewardNetwork implements NeuralNetwork {
  // Would predict rewards
}

export class ValueNetwork implements NeuralNetwork {
  // Would predict state values
}

export class ReplayBuffer {
  private buffer: any[];
  private maxSize: number;

  constructor(maxSize: number) {
    this.buffer = [];
    this.maxSize = maxSize;
  }

  public add(item: any): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift(); // Remove oldest
    }
    this.buffer.push(item);
  }

  public sample(batchSize: number): any[] {
    // Random sample
    const indices = new Set<number>();
    while (indices.size < Math.min(batchSize, this.buffer.length)) {
      indices.add(Math.floor(Math.random() * this.buffer.length));
    }
    return Array.from(indices).map(i => this.buffer[i]);
  }

  public getTransitions(): any[] {
    return this.buffer;
  }
}
