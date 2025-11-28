/**
 * BroadcastBus.ts
 *
 * Data distribution system for Global Workspace
 * Implements utility-based recipient selection and latency simulation
 *
 * Computational principle: Message passing with utility-based routing
 * Isomorphic to cortico-cortical connections, but implemented as async broadcast
 */

export enum BroadcastPriority {
  HIGH = 0.9,
  MEDIUM = 0.6,
  LOW = 0.3
}

export interface BroadcastPacket {
  id: string;
  compressedData: CompressedRepresentation;
  mutualInformation: number;
  timestamp: number;
  priority: BroadcastPriority;
  originalStateHash: string;
  compressionRatio: number;
}

export interface BroadcastOptions {
  priority: BroadcastPriority;
  recipients?: string[];
}

export interface BroadcastResult {
  packetId: string;
  timestamp: number;
  recipients: number;
  results: BroadcastRecipientResult[];
}

export type BroadcastRecipientResult =
  | { recipientId: string; status: 'SUCCESS' }
  | { recipientId: string; status: 'ERROR'; error: Error }
  | { recipientId: string; status: 'TIMEOUT' }
  | { recipientId: string; status: 'NO_HANDLER' };

export type SubscriberCallback = (packet: BroadcastPacket) => Promise<void> | void;

export interface Subscription {
  callback: SubscriberCallback;
  historicalUtility: number;
  subscribedAt: number;
  successCount: number;
  failureCount: number;
}

export interface BroadcastBusConfig {
  latencyMs?: number;
  jitterFactor?: number;
  defaultTimeoutMs?: number;
  retryAttempts?: number;
}

export class BroadcastBus {
  private subscribers: Map<string, Subscription>;
  private config: Required<BroadcastBusConfig>;
  private broadcastHistory: Map<string, BroadcastLog>;

  constructor(config: BroadcastBusConfig = {}) {
    this.config = {
      latencyMs: config.latencyMs ?? 150,
      jitterFactor: config.jitterFactor ?? 0.2,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 5000,
      retryAttempts: config.retryAttempts ?? 3
    };
    this.subscribers = new Map();
    this.broadcastHistory = new Map();
  }

  /**
   * Send packet to subscribers with simulated neural latency
   */
  public async send(
    packet: BroadcastPacket,
    options: BroadcastOptions
  ): Promise<BroadcastResult> {

    // 1. Simulate neural latency
    await this.simulateNeuralLatency();

    // 2. Determine recipients
    const recipients = this.selectRecipients(packet, options);

    // 3. Broadcast to recipients
    const results = await this.broadcastToRecipients(packet, recipients);

    // 4. Log broadcast
    this.logBroadcast(packet, results);

    return {
      packetId: packet.id,
      timestamp: packet.timestamp,
      recipients: recipients.length,
      results
    };
  }

  /**
   * Simulate realistic neural processing latency with jitter
   */
  private async simulateNeuralLatency(): Promise<void> {
    if (this.config.latencyMs <= 0) return;

    const jitter = (Math.random() - 0.5) * 2 * this.config.jitterFactor * this.config.latencyMs;
    const delay = this.config.latencyMs + jitter;

    await new Promise(resolve => setTimeout(resolve, Math.max(0, delay)));
  }

  /**
   * Select recipients based on priority and historical utility
   */
  private selectRecipients(
    packet: BroadcastPacket,
    options: BroadcastOptions
  ): string[] {

    // HIGH priority: broadcast to all subscribers (emergency/non-stationary state)
    if (options.priority === BroadcastPriority.HIGH) {
      return Array.from(this.subscribers.keys());
    }

    // If explicit recipients provided
    if (options.recipients && options.recipients.length > 0) {
      return options.recipients.filter(id => this.subscribers.has(id));
    }

    // MEDIUM/LOW: select based on historical utility
    const selected: string[] = [];

    for (const [moduleId, subscription] of this.subscribers) {
      const utility = this.calculateUtilityScore(subscription, packet, options.priority);

      if (utility >= 0.3) {
        selected.push(moduleId);
      }
    }

    return selected;
  }

  /**
   * Calculate utility score for a subscription
   */
  private calculateUtilityScore(
    subscription: Subscription,
    packet: BroadcastPacket,
    priority: BroadcastPriority
  ): number {
    // Historical utility (success rate)
    const totalAttempts = subscription.successCount + subscription.failureCount;
    const successRate = totalAttempts > 0 ? subscription.successCount / totalAttempts : 0.5;

    // Time since last broadcast (recency factor)
    const timeSinceLastBroadcast = (Date.now() - subscription.subscribedAt) / 1000;
    const recencyFactor = Math.exp(-timeSinceLastBroadcast / 3600); // Exponential decay over 1 hour

    // Packet relevance (mutual information)
    const relevanceFactor = packet.mutualInformation / (packet.mutualInformation + 1);

    // Combine factors with different weights based on priority
    if (priority === BroadcastPriority.HIGH) {
      return 0.9; // Always high for emergency broadcasts
    }

    if (priority === BroadcastPriority.MEDIUM) {
      return (subscription.historicalUtility * 0.5) + (successRate * 0.3) + (relevanceFactor * 0.2);
    }

    // LOW: prioritize modules with high historical utility
    return (subscription.historicalUtility * 0.7) + (successRate * 0.2) + (relevanceFactor * 0.1);
  }

  /**
   * Broadcast to recipients with retry logic
   */
  private async broadcastToRecipients(
    packet: BroadcastPacket,
    recipientIds: string[]
  ): Promise<BroadcastRecipientResult[]> {

    const results = await Promise.all(
      recipientIds.map(async (recipientId) => {
        const subscription = this.subscribers.get(recipientId);
        if (!subscription) {
          return { recipientId, status: 'NO_HANDLER' as const };
        }

        try {
          // Use timeout wrapper
          await this.withTimeout(
            subscription.callback(packet),
            this.config.defaultTimeoutMs
          );

          // Success - update statistics
          subscription.successCount++;
          return { recipientId, status: 'SUCCESS' as const };

        } catch (error) {
          // Error occurred
          subscription.failureCount++;

          if (error instanceof Error && error.name === 'BroadcastTimeoutError') {
            return { recipientId, status: 'TIMEOUT' as const };
          }

          return {
            recipientId,
            status: 'ERROR' as const,
            error: error instanceof Error ? error : new Error(String(error))
          };
        }
      })
    );

    return results;
  }

  /**
   * Wrap promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new BroadcastTimeoutError(`Timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      )
    ]);
  }

  /**
   * Log broadcast in history
   */
  private logBroadcast(
    packet: BroadcastPacket,
    results: BroadcastRecipientResult[]
  ): void {
    const log: BroadcastLog = {
      packetId: packet.id,
      timestamp: packet.timestamp,
      priority: packet.priority,
      compressionRatio: packet.compressionRatio,
      mutualInformation: packet.mutualInformation,
      recipients: results.length,
      successes: results.filter(r => r.status === 'SUCCESS').length,
      failures: results.filter(r => r.status === 'ERROR' || r.status === 'TIMEOUT').length,
      noHandler: results.filter(r => r.status === 'NO_HANDLER').length
    };

    this.broadcastHistory.set(packet.id, log);
  }

  /**
   * Subscribe a module to receive broadcasts
   */
  public subscribe(
    moduleId: string,
    callback: SubscriberCallback,
    historicalUtility: number = 0.5
  ): boolean {
    if (this.subscribers.has(moduleId)) {
      return false; // Already subscribed
    }

    this.subscribers.set(moduleId, {
      callback,
      historicalUtility,
      subscribedAt: Date.now(),
      successCount: 0,
      failureCount: 0
    });

    return true;
  }

  /**
   * Unsubscribe a module
   */
  public unsubscribe(moduleId: string): boolean {
    return this.subscribers.delete(moduleId);
  }

  /**
   * Update historical utility for a module
   */
  public updateHistoricalUtility(moduleId: string, utility: number): boolean {
    const subscription = this.subscribers.get(moduleId);
    if (!subscription) {
      return false;
    }

    // Moving average update
    subscription.historicalUtility = subscription.historicalUtility * 0.9 + utility * 0.1;
    return true;
  }

  /**
   * Get broadcast statistics
   */
  public getStats(): BroadcastStats {
    const logs = Array.from(this.broadcastHistory.values());

    const totalBroadcasts = logs.length;
    const totalSuccesses = logs.reduce((sum, log) => sum + log.successes, 0);
    const totalFailures = logs.reduce((sum, log) => sum + log.failures, 0);
    const totalRecipients = logs.reduce((sum, log) => sum + log.recipients, 0);

    return {
      totalBroadcasts,
      totalRecipients,
      avgRecipients: totalBroadcasts > 0 ? totalRecipients / totalBroadcasts : 0,
      avgSuccessRate: totalRecipients > 0 ? totalSuccesses / (totalSuccesses + totalFailures) : 0,
      subscriberCount: this.subscribers.size,
      recentHighPriority: logs.filter(l => l.priority === BroadcastPriority.HIGH).slice(-10),
      recentMediumPriority: logs.filter(l => l.priority === BroadcastPriority.MEDIUM).slice(-10),
      recentLowPriority: logs.filter(l => l.priority === BroadcastPriority.LOW).slice(-10)
    };
  }

  /**
   * Clear broadcast history
   */
  public clearHistory(): void {
    this.broadcastHistory.clear();
  }

  /**
   * Reset all subscribers
   */
  public reset(): void {
    this.subscribers.clear();
    this.broadcastHistory.clear();
  }
}

// Custom error for timeouts
class BroadcastTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BroadcastTimeoutError';
  }
}

// Helper types
export interface CompressedRepresentation {
  vector: Float32Array;
  metadata: {
    originalSize: number;
    compressedSize: number;
    informationLoss: number;
    featureImportance: Map<string, number>;
    salience?: number;
  };
}

interface BroadcastLog {
  packetId: string;
  timestamp: number;
  priority: BroadcastPriority;
  compressionRatio: number;
  mutualInformation: number;
  recipients: number;
  successes: number;
  failures: number;
  noHandler: number;
}

export interface BroadcastStats {
  totalBroadcasts: number;
  totalRecipients: number;
  avgRecipients: number;
  avgSuccessRate: number;
  subscriberCount: number;
  recentHighPriority: BroadcastLog[];
  recentMediumPriority: BroadcastLog[];
  recentLowPriority: BroadcastLog[];
}
