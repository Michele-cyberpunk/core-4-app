/**
 * GlobalWorkspace.ts
 *
 * Global workspace implementation for Level 4 Consciousness
 * Implements information bottleneck with capacity constraints and broadcast
 *
 * Based on: Baars (1988) Global Workspace Theory
 * Computational implementation: Information integration with capacity constraints
 */

import { InformationBottleneck, BottleneckConfig, CompressionResult } from './InformationBottleneck';
import { BroadcastBus, BroadcastPacket, BroadcastPriority, BroadcastOptions, BroadcastResult, SubscriberCallback } from './BroadcastBus';

/**
 * Global Workspace - Central information integration and broadcast system
 */
export class GlobalWorkspace {
  private informationBottleneck: InformationBottleneck;
  private broadcastBus: BroadcastBus;
  private workspaceBuffer: Map<string, CompressedRepresentation>;
  private broadcastHistory: BroadcastRecord[];
  private subscribers: Map<string, Subscription>;

  // Capacity constraint: 7 ± 2 items (Miller's law)
  // This is a computational constraint, not a psychological limit
  private readonly CAPACITY: number = 7;

  // Minimum salience threshold for information to enter workspace
  private readonly SALIENCE_THRESHOLD: number = 0.3;

  // Urgency boost for emergency information (higher than threshold)
  private readonly URGENCY_BOOST: number = 0.5;

  // Timestamp of last broadcast for rate limiting
  private lastBroadcastTime: number = 0;

  // Minimum time between broadcasts (ms)
  private readonly MIN_BROADCAST_INTERVAL: number = 50;

  constructor(bottleneckConfig: BottleneckConfig) {
    this.informationBottleneck = new InformationBottleneck(bottleneckConfig);
    this.broadcastBus = new BroadcastBus({ latencyMs: 150 });
    this.workspaceBuffer = new Map();
    this.broadcastHistory = [];
    this.subscribers = new Map();
  }

  /**
   * Process distributed state through bottleneck and broadcast to subscribers
   *
   * @param distributedState - Complete system state from all modules
   * @param relevanceWeights - Task-relevant variables to prioritize
   * @returns Broadcast result or null if no broadcast occurred
   */
  public async processAndBroadcast(
    distributedState: DistributedState,
    relevanceWeights: RelevanceWeights,
    priority: BroadcastPriority = BroadcastPriority.MEDIUM
  ): Promise<BroadcastResult | null> {

    // 1. Rate limiting check
    const now = Date.now();
    if (now - this.lastBroadcastTime < this.MIN_BROADCAST_INTERVAL) {
      return null; // Too soon since last broadcast
    }

    // 2. Apply information bottleneck
    const compressionResult = this.compressState(
      distributedState,
      relevanceWeights
    );

    if (!compressionResult.converged) {
      console.warn('GlobalWorkspace: Information bottleneck failed to converge');
      return null;
    }

    // 3. Add to workspace buffer (capacity constrained)
    this.addToWorkspace(compressionResult.representation);

    // 4. Create broadcast packet
    const packet: BroadcastPacket = this.createBroadcastPacket(
      compressionResult,
      distributedState,
      priority
    );

    // 5. Broadcast to subscribers
    const broadcastResult = await this.broadcast(packet, priority);

    // 6. Record in history for analysis
    this.recordBroadcast(broadcastResult, packet);

    this.lastBroadcastTime = now;

    return broadcastResult;
  }

  /**
   * Compress state through information bottleneck
   */
  private compressState(
    state: DistributedState,
    relevanceWeights: RelevanceWeights
  ): CompressionResult {

    // Validate relevance weights
    const validatedWeights = this.validateRelevanceWeights(
      state,
      relevanceWeights
    );

    return this.informationBottleneck.compress(state, validatedWeights);
  }

  /**
   * Add compressed representation to workspace buffer with capacity constraint
   */
  private addToWorkspace(representation: CompressedRepresentation): void {
    const packetId = this.generatePacketId();

    // Calculate salience score for this packet
    const salience = this.calculateSalience(representation);

    // Add to buffer
    this.workspaceBuffer.set(packetId, {
      ...representation,
      metadata: {
        ...representation.metadata,
        salience
      }
    });

    // Enforce capacity constraint: remove lowest salience if over capacity
    if (this.workspaceBuffer.size > this.CAPACITY) {
      this.removeLowestSalienceItem();
    }
  }

  /**
   * Remove item with lowest salience to maintain capacity
   */
  private removeLowestSalienceItem(): void {
    let minSalience = Infinity;
    let minKey = '';

    for (const [key, rep] of this.workspaceBuffer) {
      const salience = rep.metadata.salience || 0;
      if (salience < minSalience) {
        minSalience = salience;
        minKey = key;
      }
    }

    if (minKey) {
      this.workspaceBuffer.delete(minKey);
    }
  }

  /**
   * Calculate salience score for a representation
   * Based on: task relevance, information loss, novelty
   */
  private calculateSalience(representation: CompressedRepresentation): number {
    const { metadata } = representation;

    // Base salience from feature importance (how much it matters)
    const avgFeatureImportance = this.calculateAverageFeatureImportance(
      metadata.featureImportance
    );

    // Boost for low information loss (better preservation)
    const preservationBonus = 1 - Math.min(1, metadata.informationLoss);

    // Novelty factor (how different from recent workspace items)
    const novelty = this.calculateNovelty(representation);

    // Combine factors
    const salience = (
      avgFeatureImportance * 0.5 +
      preservationBonus * 0.3 +
      novelty * 0.2
    );

    return Math.max(0, Math.min(1, salience));
  }

  /**
   * Calculate average feature importance from feature importance map
   */
  private calculateAverageFeatureImportance(
    importanceMap: Map<string, number>
  ): number {
    if (importanceMap.size === 0) return 0;

    let sum = 0;
    for (const importance of importanceMap.values()) {
      sum += importance;
    }

    return sum / importanceMap.size;
  }

  /**
   * Calculate novelty compared to recent workspace items
   */
  private calculateNovelty(representation: CompressedRepresentation): number {
    if (this.workspaceBuffer.size === 0) return 1.0; // First item is maximally novel

    // Calculate average similarity to existing items
    let similaritySum = 0;
    let count = 0;

    for (const existing of this.workspaceBuffer.values()) {
      const sim = this.calculateRepresentationSimilarity(
        representation,
        existing
      );
      similaritySum += sim;
      count++;
    }

    const avgSimilarity = similaritySum / count;

    // Novelty = 1 - similarity
    return 1 - avgSimilarity;
  }

  /**
   * Calculate similarity between two representations (cosine similarity)
   */
  private calculateRepresentationSimilarity(
    a: CompressedRepresentation,
    b: CompressedRepresentation
  ): number {
    const vecA = a.vector;
    const vecB = b.vector;

    // Resize to same length if needed
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
   * Create broadcast packet from compression result
   */
  private createBroadcastPacket(
    compressionResult: CompressionResult,
    originalState: DistributedState,
    priority: BroadcastPriority
  ): BroadcastPacket {
    return {
      id: this.generatePacketId(),
      compressedData: compressionResult.representation,
      mutualInformation: compressionResult.mutualInformation,
      compressionRatio: compressionResult.compressionRatio,
      originalStateHash: this.hashState(originalState),
      timestamp: Date.now(),
      priority
    };
  }

  /**
   * Broadcast packet to subscribers
   */
  private async broadcast(
    packet: BroadcastPacket,
    priority: BroadcastPriority
  ): Promise<BroadcastResult> {
    const options: BroadcastOptions = {
      priority,
      recipients: this.selectRecipients(packet, priority)
    };

    return this.broadcastBus.send(packet, options);
  }

  /**
   * Select recipients based on priority and relevance
   */
  private selectRecipients(
    packet: BroadcastPacket,
    priority: BroadcastPriority
  ): string[] {
    if (priority === BroadcastPriority.HIGH) {
      // Emergency: broadcast to all subscribers
      return Array.from(this.subscribers.keys());
    }

    // For MEDIUM and LOW, select based on historical utility
    const recipients: string[] = [];

    for (const [moduleId, subscription] of this.subscribers) {
      const utility = subscription.historicalUtility;

      if (utility >= 0.3) { // Module has benefited from broadcasts in the past
        recipients.push(moduleId);
      }
    }

    return recipients;
  }

  /**
   * Subscribe a module to receive broadcasts
   */
  public subscribe(
    moduleId: string,
    callback: SubscriberCallback,
    historicalUtility: number = 0.5
  ): void {
    this.subscribers.set(moduleId, {
      callback,
      historicalUtility,
      subscribedAt: Date.now()
    });
  }

  /**
   * Unsubscribe a module
   */
  public unsubscribe(moduleId: string): boolean {
    return this.subscribers.delete(moduleId);
  }

  /**
   * Update historical utility score for a module
   */
  public updateModuleUtility(moduleId: string, newUtility: number): void {
    const subscription = this.subscribers.get(moduleId);
    if (subscription) {
      // Moving average
      subscription.historicalUtility = (
        subscription.historicalUtility * 0.8 +
        newUtility * 0.2
      );
    }
  }

  /**
   * Record broadcast in history for analysis
   */
  private recordBroadcast(
    result: BroadcastResult,
    packet: BroadcastPacket
  ): void {
    this.broadcastHistory.push({
      id: packet.id,
      timestamp: packet.timestamp,
      compressionRatio: packet.compressionRatio,
      mutualInformation: packet.mutualInformation,
      recipients: result.recipients,
      successes: result.results.filter(r => r.status === 'SUCCESS').length,
      failures: result.results.filter(r => r.status === 'ERROR').length,
      priority: packet.priority
    });

    // Keep only last 100 broadcasts to avoid memory bloat
    if (this.broadcastHistory.length > 100) {
      this.broadcastHistory = this.broadcastHistory.slice(-100);
    }
  }

  /**
   * Get current workspace buffer contents
   */
  public getWorkspaceContents(): Map<string, CompressedRepresentation> {
    return new Map(this.workspaceBuffer);
  }

  /**
   * Get broadcast history for analysis
   */
  public getBroadcastHistory(): BroadcastRecord[] {
    return [...this.broadcastHistory];
  }

  /**
   * Get consciousness metrics for this module
   */
  public getMetrics(): GlobalWorkspaceMetrics {
    return {
      workspaceUtilization: this.workspaceBuffer.size / this.CAPACITY,
      totalBroadcasts: this.broadcastHistory.length,
      avgBroadcastSuccessRate: this.calculateAverageSuccessRate(),
      avgRecipientsPerBroadcast: this.calculateAverageRecipients(),
      subscriptionCount: this.subscribers.size
    };
  }

  /**
   * Calculate average success rate from history
   */
  private calculateAverageSuccessRate(): number {
    if (this.broadcastHistory.length === 0) return 0;

    const total = this.broadcastHistory.reduce(
      (acc, b) => acc + b.successes / (b.successes + b.failures),
      0
    );

    return total / this.broadcastHistory.length;
  }

  /**
   * Calculate average number of recipients
   */
  private calculateAverageRecipients(): number {
    if (this.broadcastHistory.length === 0) return 0;

    const total = this.broadcastHistory.reduce(
      (acc, b) => acc + b.recipients,
      0
    );

    return total / this.broadcastHistory.length;
  }

  /**
   * Validate relevance weights match state structure
   */
  private validateRelevanceWeights(
    state: DistributedState,
    weights: RelevanceWeights
  ): RelevanceWeights {
    // If no weights provided, create uniform weights
    if (Object.keys(weights).length === 0) {
      const uniform: RelevanceWeights = {};
      Object.keys(state).forEach(key => {
        uniform[key] = 0.5;
      });
      return uniform;
    }

    // Pad missing keys with default weight
    const validated: RelevanceWeights = { ...weights };
    Object.keys(state).forEach(key => {
      if (!(key in validated)) {
        validated[key] = 0.3; // Default moderate relevance
      }
    });

    return validated;
  }

  /**
   * Generate unique packet ID
   */
  private generatePacketId(): string {
    return `gw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash state for tracking
   */
  private hashState(state: DistributedState): string {
    // Simple hash - in production would use more robust method
    return JSON.stringify(state).length.toString();
  }
}

// Type Definitions

export interface DistributedState {
  // Complete system state from all modules
  coreState?: any;
  neuralState?: any;
  temporalState?: any;
  affectiveState?: any;
  [key: string]: any;
}

export interface RelevanceWeights {
  [variable: string]: number;
}

export interface CompressedRepresentation {
  vector: Float32Array;
  metadata: {
    originalSize: number;
    compressedSize: number;
    informationLoss: number;
    featureImportance: Map<string, number>;
    salience?: number; // Added by workspace
  };
}

export interface BroadcastRecord {
  id: string;
  timestamp: number;
  compressionRatio: number;
  mutualInformation: number;
  recipients: number;
  successes: number;
  failures: number;
  priority: BroadcastPriority;
}

export interface Subscription {
  callback: SubscriberCallback;
  historicalUtility: number;
  subscribedAt: number;
}

export interface GlobalWorkspaceMetrics {
  workspaceUtilization: number;
  totalBroadcasts: number;
  avgBroadcastSuccessRate: number;
  avgRecipientsPerBroadcast: number;
  subscriptionCount: number;
}

// Export constants
export const GLOBAL_WORKSPACE_CAPACITY = 7;
export const GLOBAL_WORKSPACE_SALIENCE_THRESHOLD = 0.3;
