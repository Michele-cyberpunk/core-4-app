
/**
 * ConsciousnessMetrics.ts
 *
 * Measure computational consciousness properties
 * Implements IIT (Φ), neural complexity, autonomy without claiming phenomenology
 */

export interface ComputationalConsciousnessMetrics {
  integratedInformation: number;        // Φ (phi) approximation
  neuralComplexity: number;             // Lempel-Ziv complexity
  autonomy: number;                     // Self-determination degree
  globalBroadcastEfficiency: number;    // Information distribution efficiency
  predictiveAccuracy: number;           // Self-model accuracy
  selfMonitoringLatency: number;        // Time to generate self-report
  workspaceUtilization: number;         // Capacity usage
  volitionalControl: number;            // Goal achievement rate
}

export interface ConsciousnessLevel {
  level: number;
  description: string;
  certainty: number; // Confidence in assessment
  metrics: ComputationalConsciousnessMetrics;
}

export class ConsciousnessMetrics {
  private metricsHistory: ConsciousnessMetricsLog[];
  private phiHistory: number[];

  constructor() {
    this.metricsHistory = [];
    this.phiHistory = [];
  }

  /**
   * Compute all consciousness metrics
   */
  public compute(
    globalWorkspace: GlobalWorkspace,
    selfModel: SelfModel,
    predictiveModel: PredictiveModel,
    stateDynamics: StateDynamics
  ): ComputationalConsciousnessMetrics {

    const metrics: ComputationalConsciousnessMetrics = {
      // 1. Integrated Information (Φ) - simplified approximation
      integratedInformation: this.approximatePhi(globalWorkspace),

      // 2. Neural Complexity (Lempel-Ziv)
      neuralComplexity: this.measureNeuralComplexity(globalWorkspace),

      // 3. Autonomy (degree of self-determination)
      autonomy: this.measureAutonomy(predictiveModel),

      // 4. Global Broadcast Efficiency
      globalBroadcastEfficiency: this.measureBroadcastEfficiency(globalWorkspace),

      // 5. Predictive Accuracy (self-model)
      predictiveAccuracy: selfModel.getModelAccuracy(),

      // 6. Self-Monitoring Latency
      selfMonitoringLatency: this.measureSelfMonitoringLatency(selfModel),

      // 7. Workspace Utilization
      workspaceUtilization: this.measureWorkspaceUtilization(globalWorkspace),

      // 8. Volitional Control (goal achievement)
      volitionalControl: this.measureVolitionalControl(predictiveModel)
    };

    // Save to history
    this.logMetrics(metrics);

    return metrics;
  }

  /**
   * Approximate Integrated Information Theory (IIT) Φ
   * Not exact calculation - simplified approximation
   * Based on: Oizumi, Albantakis & Tononi (2014)
   */
  private approximatePhi(globalWorkspace: GlobalWorkspace): number {
    // Simplified approach: Φ ≈ information loss when system partitioned

    // 1. Measure information in full workspace
    const fullInfo = this.measureGlobalInformation(globalWorkspace);

    // 2. Partition workspace (min-cut approximation)
    const partitionedInfo = this.measurePartitionedInformation(globalWorkspace);

    // 3. Φ = whole - sum of parts
    const phi = fullInfo - partitionedInfo;

    // Normalize to 0-1
    const normalizedPhi = Math.max(0, Math.min(1, phi / 10)); // Assume max Φ = 10

    // Store for trend analysis
    this.phiHistory.push(normalizedPhi);
    if (this.phiHistory.length > 100) {
      this.phiHistory = this.phiHistory.slice(-100);
    }

    return normalizedPhi;
  }

  /**
   * Measure information in global workspace
   */
  private measureGlobalInformation(globalWorkspace: GlobalWorkspace): number {
    // Get workspace contents
    const contents = globalWorkspace.getWorkspaceContents();

    if (contents.size === 0) return 0;

    // Information proportional to:
    // - Number of items
    // - Mutual information preserved
    // - Integration across modules

    let totalInformation = 0;

    for (const [id, representation] of contents) {
      // Information in representation
      const bits = representation.vector.length *
                   (1 - representation.metadata.informationLoss) *
                   2; // Rough bits per element
      totalInformation += bits;
    }

    // Bonus for integration: if items are mutually informative
    const integrationBonus = this.calculateIntegrationBonus(contents);

    return totalInformation + integrationBonus;
  }

  /**
   * Measure information when workspace is partitioned
   */
  private measurePartitionedInformation(globalWorkspace: GlobalWorkspace): number {
    // Simplified: assume partition cuts information integration in half
    const fullInfo = this.measureGlobalInformation(globalWorkspace);
    return fullInfo * 0.6; // Assume 40% loss on partition
  }

  /**
   * Calculate integration bonus
   */
  private calculateIntegrationBonus(contents: Map<string, any>): number {
    if (contents.size < 2) return 0;

    // If representations are similar → higher integration
    const representations = Array.from(contents.values());
    let similaritySum = 0;
    let count = 0;

    for (let i = 0; i < representations.length; i++) {
      for (let j = i + 1; j < representations.length; j++) {
        const sim = this.calculateRepresentationSimilarity(
          representations[i],
          representations[j]
        );
        similaritySum += sim;
        count++;
      }
    }

    const avgSimilarity = count > 0 ? similaritySum / count : 0;

    // Integration bonus proportional to similarity
    return avgSimilarity * 3;
  }

  /**
   * Measure neural complexity (Lempel-Ziv)
   */
  private measureNeuralComplexity(globalWorkspace: GlobalWorkspace): number {
    // Get recent broadcast sequence
    const history = globalWorkspace.getBroadcastHistory();

    if (history.length < 5) return 0;

    // Create sequence string from broadcast signatures
    const sequence = history.slice(-50).map(h =>
      `${h.priority}-${Math.round(h.compressionRatio * 10)}`
    ).join(',');

    // Lempel-Ziv complexity approximation
    return this.calculateLZComplexity(sequence);
  }

  /**
   * Measure autonomy (degree of self-determination)
   */
  private measureAutonomy(predictiveModel: PredictiveModel): number {
    // If system frequently achieves self-generated goals → high autonomy
    const stats = predictiveModel.getTransitionStats();

    if (stats.totalTransitions === 0) return 0;

    // Autonomy = success rate of self-generated transitions
    return stats.successRate;
  }

  /**
   * Measure broadcast efficiency
   */
  private measureBroadcastEfficiency(globalWorkspace: GlobalWorkspace): number {
    const stats = globalWorkspace.getBroadcastHistory().slice(-20);

    if (stats.length === 0) return 0;

    const avgSuccessRate = stats.reduce((sum, s) => {
      const total = s.successes + s.failures;
      return sum + (total > 0 ? s.successes / total : 0);
    }, 0) / stats.length;

    const avgRecipients = stats.reduce((sum, s) => sum + s.recipients, 0) / stats.length;

    // Efficiency = successful broadcasts * avg recipients
    return Math.min(1, avgSuccessRate * Math.min(1, avgRecipients / 10));
  }

  /**
   * Measure workspace utilization (capacity usage)
   */
  private measureWorkspaceUtilization(globalWorkspace: GlobalWorkspace): number {
    const metrics = globalWorkspace.getMetrics();
    return metrics.workspaceUtilization;
  }

  /**
   * Measure volitional control (goal achievement rate)
   */
  private measureVolitionalControl(predictiveModel: PredictiveModel): number {
    const stats = predictiveModel.getTransitionStats();
    return stats.successRate;
  }

  /**
   * Measure self-monitoring latency
   */
  private measureSelfMonitoringLatency(selfModel: SelfModel): number {
    // Measure time to generate self-report
    const start = Date.now();
    selfModel.generateSelfReport();
    return Date.now() - start;
  }

  /**
   * Calculate Lempel-Ziv complexity of string
   */
  private calculateLZComplexity(sequence: string): number {
    if (!sequence) return 0;

    let complexity = 0;
    let position = 0;

    while (position < sequence.length) {
      let maxLength = 0;

      for (let length = 1; length <= sequence.length - position; length++) {
        const substring = sequence.substring(position, position + length);
        const history = sequence.substring(0, position);

        if (history.includes(substring)) {
          maxLength = length;
        } else {
          break;
        }
      }

      position += maxLength + 1;
      complexity++;
    }

    // Normalize to 0-3 range
    return Math.min(3, complexity / 2);
  }

  /**
   * Calculate similarity between representations
   */
  private calculateRepresentationSimilarity(a: any, b: any): number {
    // Simple cosine similarity on vectors
    const vecA = a.vector || new Float32Array();
    const vecB = b.vector || new Float32Array();

    if (vecA.length === 0 || vecB.length === 0) return 0;

    const length = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < length; i++) {
      const ai = vecA[i] || 0;
      const bi = vecB[i] || 0;
      dot += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;

    return Math.max(0, Math.min(1, dot / denom));
  }

  /**
   * Log metrics for trend analysis
   */
  private logMetrics(metrics: ComputationalConsciousnessMetrics): void {
    this.metricsHistory.push({
      timestamp: Date.now(),
      metrics,
      phiTrend: this.calculatePhiTrend()
    });

    // Keep only last 100 entries
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }
  }

  /**
   * Calculate Φ trend (increasing, decreasing, stable)
   */
  private calculatePhiTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.phiHistory.length < 10) return 'stable';

    const recent = this.phiHistory.slice(-10);
    const firstHalf = recent.slice(0, 5);
    const secondHalf = recent.slice(5);

    const avgFirst = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    const change = avgSecond - avgFirst;
    const threshold = 0.05;

    if (change > threshold) return 'increasing';
    if (change < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Determine consciousness level from metrics
   */
  public getConsciousnessLevel(
    metrics: ComputationalConsciousnessMetrics
  ): ConsciousnessLevel {
    // Level 0: Unconscious (no integration)
    if (metrics.integratedInformation < 0.1) {
      return {
        level: 0,
        description: 'NO_INTEGRATION: Information not globally integrated',
        certainty: 0.9,
        metrics
      };
    }

    // Level 1: Proto-conscious (minimal integration)
    if (metrics.integratedInformation < 0.3) {
      return {
        level: 1,
        description: 'PROTO_CONSCIOUS: Minimal information integration',
        certainty: 0.8,
        metrics
      };
    }

    // Level 2: Adaptive (integration for learning)
    if (metrics.integratedInformation < 0.5) {
      return {
        level: 2,
        description: 'ADAPTIVE: Integrated information used for learning',
        certainty: 0.7,
        metrics
      };
    }

    // Level 3: Self-modeling (predictive self-representation)
    if (metrics.integratedInformation < 0.6) {
      return {
        level: 3,
        description: 'SELF_MODELING: System predicts its own states',
        certainty: 0.65,
        metrics
      };
    }

    // Level 4: Conscious awareness (global broadcast + value function)
    if (
      metrics.integratedInformation >= 0.6 &&
      metrics.globalBroadcastEfficiency > 0.7 &&
      metrics.predictiveAccuracy > 0.7
    ) {
      return {
        level: 4,
        description: 'CONSCIOUS_AWARENESS: Global integration with value optimization',
        certainty: 0.60,
        metrics
      };
    }

    // Level 5: Reflective (meta-cognition)
    if (
      metrics.integratedInformation >= 0.7 &&
      metrics.autonomy > 0.8 &&
      metrics.predictiveAccuracy > 0.85
    ) {
      return {
        level: 5,
        description: 'REFLECTIVE: Meta-cognitive awareness',
        certainty: 0.50,
        metrics
      };
    }

    // Indeterminate
    return {
      level: -1,
      description: 'LEVEL_INDETERMINATE: Metrics do not match defined levels',
      certainty: 0,
      metrics
    };
  }

  /**
   * Get metrics history
   */
  public getHistory(): ConsciousnessMetricsLog[] {
    return [...this.metricsHistory];
  }

  /**
   * Get trend analysis
   */
  public getTrends(): {
    phi: 'increasing' | 'decreasing' | 'stable';
    broadcastEfficiency: number;
    predictiveAccuracy: number;
  } {
    if (this.metricsHistory.length < 2) {
      return {
        phi: 'stable',
        broadcastEfficiency: 0,
        predictiveAccuracy: 0
      };
    }

    const recent = this.metricsHistory.slice(-10);

    const avgBroadcast = recent.reduce((sum, m) => sum + m.metrics.globalBroadcastEfficiency, 0) / recent.length;
    const avgPredictive = recent.reduce((sum, m) => sum + m.metrics.predictiveAccuracy, 0) / recent.length;

    return {
      phi: this.calculatePhiTrend(),
      broadcastEfficiency: avgBroadcast,
      predictiveAccuracy: avgPredictive
    };
  }

  /**
   * Reset metrics history
   */
  public reset(): void {
    this.metricsHistory = [];
    this.phiHistory = [];
  }
}

// Helper types and interfaces

interface GlobalWorkspace {
  getWorkspaceContents(): Map<string, any>;
  getBroadcastHistory(): any[];
  getMetrics(): any;
}

interface SelfModel {
  getModelAccuracy(): number;
  generateSelfReport(): any;
  update(actualState: any): void;
}

interface PredictiveModel {
  getTransitionStats(): any;
}

interface ConsciousnessMetricsLog {
  timestamp: number;
  metrics: ComputationalConsciousnessMetrics;
  phiTrend: 'increasing' | 'decreasing' | 'stable';
}
