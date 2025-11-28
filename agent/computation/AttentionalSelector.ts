/**
 * AttentionalSelector.ts
 *
 * Pre-attentive information selection for Global Workspace
 * Implements computational pruning based on mutual information and expected utility
 *
 * Computational principle: Information filtering before bottleneck entry
 * Based on task relevance, novelty, and prediction error minimization
 */

export interface InformationPacket {
  id: string;
  source: string;
  timestamp: number;
  data: any;
  // Computational metrics for selection
  taskRelevance: number;      // 0-1, relevance to current tasks
  predictionError: number;    // |predicted - actual|, 0-1
  actionUtility: number;      // Expected utility for action selection
  novelty: number;            // Difference from recent history
  salience: number;           // Pre-computed salience score
}

export interface SelectionResult {
  selected: InformationPacket[];
  rejected: InformationPacket[];
  selectionReasons: Map<string, string>;
  totalUtility: number;
}

export interface AttentionalSelectorConfig {
  capacity?: number;               // 7 ± 2 items constraint
  taskRelevanceWeight?: number;
  predictionErrorWeight?: number;
  actionUtilityWeight?: number;
  noveltyWeight?: number;
}

export class AttentionalSelector {
  private config: Required<AttentionalSelectorConfig>;
  private recentHistory: Map<string, InformationPacket>;
  private selectionHistory: SelectionLog[];

  constructor(config: AttentionalSelectorConfig = {}) {
    this.config = {
      capacity: config.capacity ?? 7,
      taskRelevanceWeight: config.taskRelevanceWeight ?? 0.35,
      predictionErrorWeight: config.predictionErrorWeight ?? 0.30,
      actionUtilityWeight: config.actionUtilityWeight ?? 0.25,
      noveltyWeight: config.noveltyWeight ?? 0.10
    };
    this.recentHistory = new Map();
    this.selectionHistory = [];
  }

  /**
   * Select top packets based on composite utility score
   * Respects capacity constraint (information bottleneck principle)
   */
  public select(packets: InformationPacket[]): SelectionResult {
    // 1. Update history
    this.updateHistory(packets);

    // 2. Calculate novelty for each packet (difference from history)
    const packetsWithNovelty = packets.map(packet => ({
      packet,
      novelty: this.calculateNovelty(packet)
    }));

    // 3. Calculate composite score (pre-attentive processing)
    const scored = packetsWithNovelty.map(({ packet, novelty }) => {
      const compositeScore = this.calculateCompositeScore(packet, novelty);
      return { packet, compositeScore, novelty };
    });

    // 4. Sort by score (descending)
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // 5. Apply capacity constraint (select top N)
    const selectedCount = Math.min(scored.length, this.config.capacity);
    const selected = scored.slice(0, selectedCount);
    const rejected = scored.slice(selectedCount);

    // 6. Record selection reasons
    const selectionReasons = new Map<string, string>();
    selected.forEach(({ packet, compositeScore, novelty }) => {
      const reason = this.generateSelectionReason(packet, compositeScore, novelty);
      selectionReasons.set(packet.id, reason);
    });

    rejected.forEach(({ packet }) => {
      selectionReasons.set(packet.id, 'LOW_COMPOSITE_SCORE');
    });

    // 7. Log selection
    this.logSelection(selected.map(s => s.packet), rejected.map(r => r.packet));

    return {
      selected: selected.map(s => s.packet),
      rejected: rejected.map(r => r.packet),
      selectionReasons,
      totalUtility: selected.reduce((sum, s) => sum + s.compositeScore, 0)
    };
  }

  /**
   * Calculate composite utility score for selection
   */
  private calculateCompositeScore(packet: InformationPacket, novelty: number): number {
    const {
      taskRelevanceWeight,
      predictionErrorWeight,
      actionUtilityWeight,
      noveltyWeight
    } = this.config;

    // Normalize components to 0-1 range
    const normalizedTaskRelevance = Math.max(0, Math.min(1, packet.taskRelevance));
    const normalizedPredictionError = Math.max(0, Math.min(1, packet.predictionError));
    const normalizedActionUtility = Math.max(0, Math.min(1, packet.actionUtility));
    const normalizedNovelty = Math.max(0, Math.min(1, novelty));

    // Weighted sum (all weights should sum to 1.0)
    return (
      normalizedTaskRelevance * taskRelevanceWeight +
      normalizedPredictionError * predictionErrorWeight +
      normalizedActionUtility * actionUtilityWeight +
      normalizedNovelty * noveltyWeight
    );
  }

  /**
   * Calculate novelty compared to recent history
   */
  private calculateNovelty(packet: InformationPacket): number {
    if (this.recentHistory.size === 0) {
      return 1.0; // First packet is maximally novel
    }

    // Calculate average similarity to recent packets
    let similaritySum = 0;
    let count = 0;

    for (const recentPacket of this.recentHistory.values()) {
      // Only compare with packets from same source
      if (recentPacket.source === packet.source) {
        const similarity = this.calculatePacketSimilarity(packet, recentPacket);
        similaritySum += similarity;
        count++;
      }
    }

    if (count === 0) {
      return 1.0; // No comparable history
    }

    const avgSimilarity = similaritySum / count;

    // Novelty = 1 - similarity (normalized)
    return Math.max(0, Math.min(1, 1 - avgSimilarity));
  }

  /**
   * Calculate similarity between two packets (0-1)
   */
  private calculatePacketSimilarity(p1: InformationPacket, p2: InformationPacket): number {
    // For now, simple heuristic: if same source and similar data → high similarity
    if (p1.source !== p2.source) {
      return 0;
    }

    // Compare data using simple distance metric
    const dist = this.calculateDataDistance(p1.data, p2.data);

    // Convert distance to similarity (0-1)
    return Math.exp(-dist * 2); // Exponential kernel
  }

  /**
   * Calculate distance between data objects (simple implementation)
   */
  private calculateDataDistance(a: any, b: any): number {
    // For numeric values
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b);
    }

    // For arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      const minLength = Math.min(a.length, b.length);
      let sumSq = 0;
      for (let i = 0; i < minLength; i++) {
        const diff = (a[i] || 0) - (b[i] || 0);
        sumSq += diff * diff;
      }
      return Math.sqrt(sumSq / minLength);
    }

    // For objects or other types
    return 0.5; // Neutral distance
  }

  /**
   * Update recent history
   */
  private updateHistory(packets: InformationPacket[]): void {
    // Add all new packets
    for (const packet of packets) {
      this.recentHistory.set(packet.id, packet);
    }

    // Trim history to last 100 items
    if (this.recentHistory.size > 100) {
      const entries = Array.from(this.recentHistory.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);

      this.recentHistory = new Map(entries.slice(0, 100));
    }
  }

  /**
   * Generate human-readable selection reason
   */
  private generateSelectionReason(
    packet: InformationPacket,
    compositeScore: number,
    novelty: number
  ): string {
    const factors: string[] = [];

    if (packet.taskRelevance > 0.7) {
      factors.push(`HIGH_TASK_RELEVANCE(${packet.taskRelevance.toFixed(2)})`);
    }

    if (packet.predictionError > 0.5) {
      factors.push(`HIGH_PREDICTION_ERROR(${packet.predictionError.toFixed(2)})`);
    }

    if (packet.actionUtility > 0.6) {
      factors.push(`HIGH_ACTION_UTILITY(${packet.actionUtility.toFixed(2)})`);
    }

    if (novelty > 0.5) {
      factors.push(`HIGH_NOVELTY(${novelty.toFixed(2)})`);
    }

    if (factors.length === 0) {
      factors.push(`COMPOSITE_SCORE(${compositeScore.toFixed(3)})`);
    }

    return factors.join(', ');
  }

  /**
   * Log selection event
   */
  private logSelection(selected: InformationPacket[], rejected: InformationPacket[]): void {
    this.selectionHistory.push({
      timestamp: Date.now(),
      selectedCount: selected.length,
      rejectedCount: rejected.length,
      selectedSources: selected.map(p => p.source),
      totalUtility: selected.reduce((sum, p) => {
        return sum + this.calculateCompositeScore(p, this.calculateNovelty(p));
      }, 0)
    });

    // Keep only last 100 selections
    if (this.selectionHistory.length > 100) {
      this.selectionHistory = this.selectionHistory.slice(-100);
    }
  }

  /**
   * Get selection statistics
   */
  public getSelectionStats(): SelectionStats {
    const recent = this.selectionHistory.slice(-20);

    if (recent.length === 0) {
      return {
        totalSelections: 0,
        avgSelectedCount: 0,
        avgUtility: 0,
        selectionRate: 0
      };
    }

    const totalSelected = recent.reduce((sum, s) => sum + s.selectedCount, 0);
    const totalUtility = recent.reduce((sum, s) => sum + s.totalUtility, 0);

    return {
      totalSelections: this.selectionHistory.length,
      avgSelectedCount: totalSelected / recent.length,
      avgUtility: totalUtility / recent.length,
      selectionRate: recent.length > 0 ? recent.length / 20 : 0
    };
  }

  /**
   * Clear selection history
   */
  public clearHistory(): void {
    this.selectionHistory = [];
    this.recentHistory.clear();
  }

  /**
   * Reset selector
   */
  public reset(): void {
    this.clearHistory();
  }
}

// Helper types
interface SelectionLog {
  timestamp: number;
  selectedCount: number;
  rejectedCount: number;
  selectedSources: string[];
  totalUtility: number;
}

export interface SelectionStats {
  totalSelections: number;
  avgSelectedCount: number;
  avgUtility: number;
  selectionRate: number;
}
