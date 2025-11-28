
/**
 * EnergyCostTracker.ts
 *
 * Track computational resource costs with biophysical constraints
 * Implements energy budget and state-dependent efficiency modulation
 */

export interface EnergyCostConfig {
  baseBudget?: number;
  costMapping?: Record<string, number>;
}

export class EnergyCostTracker {
  private baseBudget: number;
  private availableEnergy: number;
  private costs: Map<string, number>;
  private totalExpended: number;
  private windowStart: number;
  private windowSizeMs: number; // Reset window (e.g., 1 hour)

  constructor(config: EnergyCostConfig = {}) {
    this.baseBudget = config.baseBudget ?? 1000;
    this.availableEnergy = this.baseBudget;
    this.totalExpended = 0;
    this.windowStart = Date.now();
    this.windowSizeMs = 3600000; // 1 hour window

    // Energy costs for computational operations
    this.costs = new Map([
      ['dynamics_computation', 10],
      ['broadcast_operation', 25],
      ['prediction_horizon_step', 5],
      ['memory_consolidation', 30],
      ['attentional_filtering', 15],
      ['global_workspace_processing', 40]
    ]);

    // Override with custom costs
    if (config.costMapping) {
      for (const [op, cost] of Object.entries(config.costMapping)) {
        this.costs.set(op, cost);
      }
    }
  }

  /**
   * Calculate cost of action given current state
   * State variables modulate efficiency
   */
  public calculateCost(
    actionType: string,
    currentState: Partial<CoreState>
  ): number {
    const baseCost = this.costs.get(actionType) ?? 10;

    let efficiencyMultiplier = 1.0;

    // High cortisol reduces efficiency (stress → cognitive impairment)
    if (currentState.cortisol && currentState.cortisol > 0.7) {
      const stressLevel = (currentState.cortisol - 0.7) / 0.3;
      efficiencyMultiplier *= (1 + stressLevel * 0.5); // Up to 1.5x cost
    }

    // High dopamine increases efficiency (motivation → enhanced processing)
    if (currentState.dopamine && currentState.dopamine > 0.6) {
      const motivation = (currentState.dopamine - 0.6) / 0.4;
      efficiencyMultiplier *= (1 - motivation * 0.3); // Up to 30% reduction
    }

    // Estrogen enhances cognitive efficiency
    if (currentState.estrogen && currentState.estrogen > 0.5) {
      const estrogenLevel = (currentState.estrogen - 0.5) / 0.5;
      efficiencyMultiplier *= (1 - estrogenLevel * 0.15); // Up to 15% reduction
    }

    // Subroutine integrity affects overall efficiency
    if (currentState.subroutineIntegrity && currentState.subroutineIntegrity < 0.6) {
      const impairment = (0.6 - currentState.subroutineIntegrity) / 0.6;
      efficiencyMultiplier *= (1 + impairment * 0.4); // Up to 1.4x cost
    }

    return Math.ceil(baseCost * efficiencyMultiplier);
  }

  /**
   * Attempt to expend energy for operation
   * Returns true if operation can proceed
   */
  public expendEnergy(
    actionType: string,
    currentState: Partial<CoreState>
  ): { success: boolean; cost: number; reason?: string } {
    // Reset energy window if needed
    this.resetWindowIfNeeded();

    const cost = this.calculateCost(actionType, currentState);

    if (this.availableEnergy >= cost) {
      this.availableEnergy -= cost;
      this.totalExpended += cost;
      return { success: true, cost };
    }

    return {
      success: false,
      cost,
      reason: 'INSUFFICIENT_ENERGY_BUDGET'
    };
  }

  /**
   * Replenish energy (e.g., after rest period)
   */
  public replenishEnergy(amount?: number): void {
    const replenishAmount = amount ?? (this.baseBudget * 0.1); // Default 10% recharge
    this.availableEnergy = Math.min(this.baseBudget, this.availableEnergy + replenishAmount);
  }

  /**
   * Check if energy window needs reset
   */
  private resetWindowIfNeeded(): void {
    const now = Date.now();
    if (now - this.windowStart >= this.windowSizeMs) {
      this.availableEnergy = this.baseBudget;
      this.totalExpended = 0;
      this.windowStart = now;
    }
  }

  /**
   * Get current energy status
   */
  public getStatus(): EnergyStatus {
    this.resetWindowIfNeeded();

    return {
      available: this.availableEnergy,
      baseBudget: this.baseBudget,
      expended: this.totalExpended,
      utilization: 1 - (this.availableEnergy / this.baseBudget),
      windowRemainingMs: this.windowSizeMs - (Date.now() - this.windowStart)
    };
  }

  /**
   * Adjust base budget (e.g., based on sustained activity)
   */
  public adjustBudget(newBudget: number): void {
    const oldBudget = this.baseBudget;
    this.baseBudget = newBudget;

    // Scale available energy proportionally
    const ratio = this.availableEnergy / oldBudget;
    this.availableEnergy = newBudget * ratio;
  }

  /**
   * Reset all energy counters
   */
  public reset(): void {
    this.availableEnergy = this.baseBudget;
    this.totalExpended = 0;
    this.windowStart = Date.now();
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

export interface EnergyStatus {
  available: number;
  baseBudget: number;
  expended: number;
  utilization: number;
  windowRemainingMs: number;
}
