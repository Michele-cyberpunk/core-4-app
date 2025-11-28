
/**
 * ConstraintChecker.ts
 *
 * Enforce biophysical and computational constraints
 * Prevents illegal state transitions and ensures system stability
 */

export interface Constraint {
  name: string;
  check: (state: CoreState, action?: ComputedAction) => boolean;
  violationPenalty?: number;
  description: string;
}

export interface ConstraintResult {
  satisfied: boolean;
  violations: Constraint[];
  totalPenalty: number;
  violatedNames: string[];
}

export class ConstraintChecker {
  private staticConstraints: Constraint[];
  private customConstraints: Constraint[];

  constructor() {
    this.staticConstraints = this.initializeStaticConstraints();
    this.customConstraints = [];
  }

  /**
   * Check if state and action satisfy all constraints
   */
  public check(
    state: CoreState,
    action?: ComputedAction,
    additionalConstraints: Constraint[] = []
  ): ConstraintResult {
    const allConstraints = [
      ...this.staticConstraints,
      ...this.customConstraints,
      ...additionalConstraints
    ];

    const violations = allConstraints.filter(constraint => {
      try {
        return !constraint.check(state, action);
      } catch (error) {
        // If check throws, treat as violation
        return true;
      }
    });

    const totalPenalty = violations.reduce((sum, v) => sum + (v.violationPenalty ?? 1), 0);

    return {
      satisfied: violations.length === 0,
      violations,
      totalPenalty,
      violatedNames: violations.map(v => v.name)
    };
  }

  /**
   * Add custom constraint
   */
  public addConstraint(constraint: Constraint): void {
    this.customConstraints.push(constraint);
  }

  /**
   * Remove custom constraint by name
   */
  public removeConstraint(name: string): boolean {
    const index = this.customConstraints.findIndex(c => c.name === name);
    if (index >= 0) {
      this.customConstraints.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Initialize biophysical constraints
   */
  private initializeStaticConstraints(): Constraint[] {
    return [
      // Neurotransmitter ranges
      {
        name: 'DOPAMINE_RANGE',
        check: (state: CoreState) => state.dopamine >= 0 && state.dopamine <= 1,
        violationPenalty: 10,
        description: 'Dopamine must be in [0, 1] range'
      },
      {
        name: 'CORTISOL_RANGE',
        check: (state: CoreState) => state.cortisol >= 0 && state.cortisol <= 1,
        violationPenalty: 10,
        description: 'Cortisol must be in [0, 1] range'
      },
      {
        name: 'SUBROUTINE_INTEGRITY_RANGE',
        check: (state: CoreState) => state.subroutineIntegrity >= 0 && state.subroutineIntegrity <= 1,
        violationPenalty: 5,
        description: 'Subroutine integrity must be in [0, 1] range'
      },

      // HPA axis constraint (high cortisol reduces dopamine)
      {
        name: 'HPA_AXIS_FEEDBACK',
        check: (state: CoreState) => {
          if (state.cortisol > 0.7) {
            // High stress should correspond to reduced reward processing
            // This is a soft constraint - check correlation over time
            return state.dopamine < 0.6;
          }
          return true;
        },
        violationPenalty: 5,
        description: 'High cortisol (> 0.7) should reduce dopamine signaling'
      },

      // Stability constraint (rapid changes limited)
      {
        name: 'STATE_CHANGE_RATE_LIMIT',
        check: (state: CoreState, action?: ComputedAction) => {
          if (!action) return true;

          // Limit on total influence magnitude
          const totalInfluence = Object.values(action.influence)
            .reduce((sum, val) => sum + Math.abs(val), 0);

          return totalInfluence <= 0.8; // Max 80% change
        },
        violationPenalty: 15,
        description: 'State changes cannot exceed 80% magnitude in single step'
      },

      // Estrogen-progesterone balance
      {
        name: 'HORMONAL_BALANCE',
        check: (state: CoreState) => {
          // Estrogen and progesterone should be roughly inversely correlated
          // during menstrual cycle (not exact, but within bounds)
          const sum = state.estrogen + state.progesterone;
          return sum >= 0.3 && sum <= 1.2;
        },
        violationPenalty: 8,
        description: 'Estrogen and progesterone must maintain physiological balance'
      },

      // Energy constraint
      {
        name: 'SUFFICIENT_ENERGY',
        check: (state: CoreState, action?: ComputedAction) => {
          if (!action) return true;
          return action.energyCost <= 200; // Max single action cost
        },
        violationPenalty: 20,
        description: 'Single action cannot exceed energy budget'
      },

      // Minimum subroutine integrity for complex operations
      {
        name: 'INTEGRITY_THRESHOLD',
        check: (state: CoreState, action?: ComputedAction) => {
          if (!action) return true;

          // Complex operations require minimum integrity
          const isComplex = action.energyCost > 50;
          if (isComplex) {
            return state.subroutineIntegrity > 0.4;
          }
          return true;
        },
        violationPenalty: 12,
        description: 'Complex operations require subroutine integrity > 0.4'
      }
    ];
  }

  /**
   * Validate state transition
   */
  public validateTransition(
    fromState: CoreState,
    toState: CoreState,
    action?: ComputedAction
  ): { valid: boolean; reasons: string[] } {
    const fromCheck = this.check(fromState, action);
    const toCheck = this.check(toState, action);

    const reasons: string[] = [];

    if (!fromCheck.satisfied) {
      reasons.push('INITIAL_STATE_INVALID');
    }

    if (!toCheck.satisfied) {
      reasons.push(...toCheck.violatedNames);
    }

    // Additional transition-specific checks
    if (action) {
      // Check if action is feasible given state
      const stateDistance = this.calculateStateDistance(fromState, toState);
      if (stateDistance > 0.8) {
        reasons.push('STATE_JUMP_TOO_LARGE');
      }
    }

    return {
      valid: reasons.length === 0,
      reasons
    };
  }

  /**
   * Calculate distance between states (0-1)
   */
  private calculateStateDistance(a: CoreState, b: CoreState): number {
    const keys = Object.keys(a) as (keyof CoreState)[];
    const sumSquares = keys.reduce((sum, key) => {
      const valA = a[key] ?? 0;
      const valB = b[key] ?? 0;
      const diff = valA - valB;
      return sum + (diff * diff);
    }, 0);

    return Math.min(1, Math.sqrt(sumSquares / keys.length));
  }

  /**
   * Get all active constraints
   */
  public getConstraints(): Constraint[] {
    return [...this.staticConstraints, ...this.customConstraints];
  }

  /**
   * Reset custom constraints
   */
  public reset(): void {
    this.customConstraints = [];
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
  [key: string]: number;
}

export interface ComputedAction {
  influence: Record<string, number>;
  energyCost: number;
  expectedValue: number;
}
