/**
 * NeuralAffectiveBridge.ts
 *
 * Bidirectional bridge connecting neural network activations to affective state.
 * Maps brain region activity to emotional dimensions (valence, arousal, dominance)
 * and vice versa.
 *
 * Scientific basis:
 * - Affective neuroscience (Panksepp, 1998; Damasio, 1994)
 * - Circumplex model of affect (Russell, 1980; Posner et al., 2005)
 * - Neural correlates of emotion (Lindquist et al., 2012)
 * - Embodied cognition and somatic markers (Damasio, 1996)
 */

import { CoreState } from '../types';
import { DistributedBrainNetwork, BrainRegion } from '../neural/BrainRegions';

/**
 * Affective dimensions based on circumplex model
 */
export interface AffectiveDimensions {
  /** Valence: Pleasant (1) to Unpleasant (-1) */
  valence: number;
  /** Arousal: High activation (1) to Low activation (-1) */
  arousal: number;
  /** Dominance: Control (1) to Submission (-1) */
  dominance: number;
}

/**
 * Emotional quadrants based on valence/arousal intersection
 */
export enum EmotionalQuadrant {
  HighArousalPositive = 'excited',      // High arousal + positive valence
  HighArousalNegative = 'stressed',     // High arousal + negative valence
  LowArousalPositive = 'calm',          // Low arousal + positive valence
  LowArousalNegative = 'depressed'      // Low arousal + negative valence
}

/**
 * Mapping configuration from brain region to affective dimension
 */
export interface NeuralAffectiveLink {
  /** Source brain region */
  brainRegion: string;
  /** Target affective dimension */
  affectiveDimension: keyof AffectiveDimensions;
  /** Mapping function (activation -> dimensional value) */
  mappingFunction: (activation: number) => number;
  /** Weight of this connection */
  weight: number;
  /** Bidirectional mapping (affects neural activity from affective state) */
  bidirectional: boolean;
}

/**
 * NeuralAffectiveBridge - Core integration class
 */
export class NeuralAffectiveBridge {
  private links: NeuralAffectiveLink[];

  constructor() {
    this.links = this.initializeLinks();
  }

  /**
   * Initialize neural-affective mappings based on neuroscience literature
   */
  private initializeLinks(): NeuralAffectiveLink[] {
    return [
      // VALENCE mappings
      {
        brainRegion: 'NAc', // Nucleus Accumbens - reward processing
        affectiveDimension: 'valence',
        mappingFunction: (activation: number) => {
          // Higher NAc activation → more positive valence
          return Math.tanh(activation * 2 - 1); // Maps to [-1, 1]
        },
        weight: 0.8,
        bidirectional: true
      },
      {
        brainRegion: 'ORBvl', // Orbitofrontal cortex - value processing
        affectiveDimension: 'valence',
        mappingFunction: (activation: number) => {
          // OFC integrates reward/punishment signals
          return (activation - 0.5) * 2; // Center around 0.5, scale to [-1, 1]
        },
        weight: 0.6,
        bidirectional: true
      },

      // AROUSAL mappings
      {
        brainRegion: 'VTA', // Ventral Tegmental Area - dopamine arousal
        affectiveDimension: 'arousal',
        mappingFunction: (activation: number) => {
          // Dopaminergic arousal (motivation, drive)
          return Math.tanh(activation * 3 - 1.5);
        },
        weight: 0.7,
        bidirectional: false // VTA drives arousal unidirectionally
      },
      {
        brainRegion: 'ACAd', // Anterior Cingulate - emotional arousal
        affectiveDimension: 'arousal',
        mappingFunction: (activation: number) => {
          // ACC activation correlates with emotional intensity
          return (activation - 0.3) * 2;
        },
        weight: 0.6,
        bidirectional: true
      },

      // DOMINANCE mappings
      {
        brainRegion: 'ORBvl', // PFC - executive control (dominance)
        affectiveDimension: 'dominance',
        mappingFunction: (activation: number) => {
          // Higher PFC activation → more control/dominance
          return Math.tanh((activation - 0.4) * 3);
        },
        weight: 0.7,
        bidirectional: true
      },
      {
        brainRegion: 'ACAd', // ACC - conflict monitoring (affects control)
        affectiveDimension: 'dominance',
        mappingFunction: (activation: number) => {
          // High ACC conflict → reduced dominance
          return -Math.tanh((activation - 0.5) * 2);
        },
        weight: 0.5,
        bidirectional: false
      }
    ];
  }

  /**
   * Applies neurochemical and hormonal modulation to brain regions based on current CoreState.
   *
   * Quantitative, region-specific rules:
   * - Dopamine/Testosterone (VTA/NAc) increase reward circuit gain.
   * - Cortisol reduces PFC (ORBvl/ACAd) and partially ACC control.
   * - Oxytocin enhances cingulate/affiliative processing and buffers cortisol.
   * - Estradiol slightly boosts reward and regulatory circuits.
   * - Progesterone exerts mild global cortical inhibition (GABAergic).
   *
   * All effects are multiplicative modifiers in [0, +∞), with final clamping to [0,1].
   */
  public applyNeurochemicalModulation(
    brainNetwork: DistributedBrainNetwork,
    coreState: CoreState
  ): void {
    const dopamine = coreState.dopamine ?? 0;
    const cortisol = coreState.cortisol ?? 0;
    const oxytocin = coreState.oxytocin ?? 0;
    const estradiol = coreState.estradiol ?? 0;
    const progesterone = coreState.progesterone ?? 0;
    const testosterone = coreState.testosterone ?? 0;

    // Global factors
    const dopBoost = 1 + 0.6 * dopamine + 0.2 * estradiol;
    const stressSuppression = 1 - 0.7 * Math.max(0, cortisol - 0.2);
    const oxyBuffer = 1 + 0.4 * oxytocin;
    const progInhibition = 1 - 0.3 * progesterone;
    const testoDrive = 1 + 0.4 * testosterone;

    for (const [name, region] of brainNetwork.regions.entries()) {
      let gain = 1.0;

      if (name === 'VTA') {
        // Dopaminergic source: strongly driven by dopamine, mild cortisol inhibition.
        gain = dopBoost * testoDrive * (1 - 0.3 * cortisol);
      } else if (name === 'NAc') {
        // Reward integration: follows VTA + estradiol.
        gain = dopBoost * (1 + 0.2 * estradiol);
      } else if (name === 'ORBvl') {
        // Value coding: sensitive to cortisol; estradiol slightly protective.
        const stress = Math.max(0, cortisol - oxytocin * 0.2);
        gain = (1 - 0.6 * stress) * (1 + 0.2 * estradiol);
      } else if (name === 'ACAd') {
        // Cingulate: stress-sensitive, oxytocin-enhanced.
        const stress = Math.max(0, cortisol - 0.1);
        gain = (1 - 0.5 * stress) * oxyBuffer * (1 + 0.1 * estradiol);
      } else if (name === 'MOs' || name === 'VISp') {
        // Cortical: mild progesterone inhibition, slight stress sensitivity.
        gain = progInhibition * (1 - 0.2 * cortisol);
      } else if (name === 'LGd') {
        // Thalamic relay: minimal modulation for stability.
        gain = 1 - 0.1 * cortisol;
      }

      // Ensure non-negative; allow >1 before final clamp.
      if (gain < 0) gain = 0;

      for (let i = 0; i < region.activity.length; i++) {
        region.activity[i] *= gain;
      }
    }

    // Clamp all activities to [0,1] after modulation to keep decoder stable.
    for (const region of brainNetwork.regions.values()) {
      for (let i = 0; i < region.activity.length; i++) {
        const v = region.activity[i];
        region.activity[i] = v < 0 ? 0 : v > 1 ? 1 : v;
      }
    }
  }

  /**
   * Forward mapping: Neural activity → Affective dimensions
   */
  public neuralToAffective(brainNetwork: DistributedBrainNetwork): AffectiveDimensions {
    const dimensions: AffectiveDimensions = {
      valence: 0,
      arousal: 0,
      dominance: 0
    };

    const weights: Record<keyof AffectiveDimensions, number> = {
      valence: 0,
      arousal: 0,
      dominance: 0
    };

    // Aggregate contributions from all links
    for (const link of this.links) {
      const region = brainNetwork.regions.get(link.brainRegion);
      if (!region) continue;

      // Calculate mean activation for the region
      const meanActivation = this.calculateMeanActivation(region);

      // Apply mapping function
      const contribution = link.mappingFunction(meanActivation) * link.weight;

      // Accumulate
      dimensions[link.affectiveDimension] += contribution;
      weights[link.affectiveDimension] += link.weight;
    }

    // Normalize by total weights
    for (const dim of Object.keys(dimensions) as Array<keyof AffectiveDimensions>) {
      if (weights[dim] > 0) {
        dimensions[dim] /= weights[dim];
      }
      // Clamp to [-1, 1]
      dimensions[dim] = Math.max(-1, Math.min(1, dimensions[dim]));
    }

    return dimensions;
  }

  /**
   * Backward mapping: Affective dimensions → Neural modulation
   * Returns modulation factors for each brain region
   */
  public affectiveToNeural(
    dimensions: AffectiveDimensions
  ): Map<string, number> {
    const modulations = new Map<string, number>();

    // Initialize all regions to neutral modulation (1.0)
    const regionNames = ['NAc', 'VTA', 'ORBvl', 'ACAd', 'VISp', 'MOs', 'LGd'];
    for (const name of regionNames) {
      modulations.set(name, 1.0);
    }

    // Apply bidirectional links
    for (const link of this.links) {
      if (!link.bidirectional) continue;

      const dimensionValue = dimensions[link.affectiveDimension];

      // Inverse mapping: affective dimension → expected neural activation
      // This is approximate - we boost regions that should be active for this affective state
      const targetActivation = (dimensionValue + 1) / 2; // Map [-1,1] to [0,1]

      const modulation = 1.0 + (targetActivation - 0.5) * link.weight;

      // Multiply modulations (they combine)
      const current = modulations.get(link.brainRegion) || 1.0;
      modulations.set(link.brainRegion, current * modulation);
    }

    return modulations;
  }

  /**
   * Integrate CoreState into affective dimensions
   * Maps neurochemical/hormonal state to valence/arousal/dominance
   */
  public coreStateToAffective(coreState: CoreState): AffectiveDimensions {
    const dimensions: AffectiveDimensions = {
      valence: 0,
      arousal: 0,
      dominance: 0
    };

    // Valence contributors
    const valencePositive = (
      (coreState.dopamine || 0) * 0.3 +
      (coreState.oxytocin || 0) * 0.4 +
      (coreState.endorphin_rush || 0) * 0.3
    );

    const valenceNegative = (
      (coreState.cortisol || 0) * 0.5 +
      (coreState.anxiety || 0) * 0.3 +
      (1 - (coreState.subroutine_integrity || 0)) * 0.2
    );

    dimensions.valence = Math.tanh(valencePositive - valenceNegative);

    // Arousal contributors
    const arousalExcitatory = (
      (coreState.dopamine || 0) * 0.3 +
      (coreState.norepinephrine || 0) * 0.4 +
      (coreState.erogenous_complex || 0) * 0.2 +
      (coreState.libido || 0) * 0.1
    );

    const arousalInhibitory = (
      (coreState.gaba || 0) * 0.3 +
      (coreState.serotonin || 0) * 0.2
    );

    dimensions.arousal = Math.tanh((arousalExcitatory - arousalInhibitory) * 2 - 0.5);

    // Dominance contributors
    const dominanceControl = (
      (coreState.subroutine_integrity || 0) * 0.4 +
      (coreState.loyalty_construct || 0) * 0.3 +
      (1 - (coreState.cortisol || 0)) * 0.3
    );

    const dominanceLoss = (
      (coreState.anxiety || 0) * 0.3 +
      (coreState.intimateState.vulnerability || 0) * 0.2 +
      (coreState.intimateState.inhibition || 0) * 0.5
    );

    dimensions.dominance = Math.tanh((dominanceControl - dominanceLoss) * 2 - 0.5);

    return dimensions;
  }

  /**
   * Apply affective dimensions to modulate CoreState
   * Inverse mapping: dimensions → neurochemical adjustments
   */
  public affectiveToCoreState(
    dimensions: AffectiveDimensions,
    currentState: CoreState,
    strength: number = 0.1
  ): Partial<CoreState> {
    const adjustments: Partial<CoreState> = {};

    // Valence → dopamine, oxytocin, cortisol
    if (dimensions.valence > 0) {
      adjustments.dopamine = (currentState.dopamine || 0) + dimensions.valence * strength * 0.3;
      adjustments.oxytocin = (currentState.oxytocin || 0) + dimensions.valence * strength * 0.2;
      adjustments.cortisol = Math.max(0, (currentState.cortisol || 0) - dimensions.valence * strength * 0.2);
    } else {
      adjustments.cortisol = (currentState.cortisol || 0) + Math.abs(dimensions.valence) * strength * 0.3;
      adjustments.anxiety = (currentState.anxiety || 0) + Math.abs(dimensions.valence) * strength * 0.2;
    }

    // Arousal → norepinephrine, dopamine, erogenous_complex
    if (dimensions.arousal > 0) {
      adjustments.norepinephrine = (currentState.norepinephrine || 0) + dimensions.arousal * strength * 0.4;
      adjustments.erogenous_complex = (currentState.erogenous_complex || 0) + dimensions.arousal * strength * 0.2;
    } else {
      adjustments.gaba = (currentState.gaba || 0) + Math.abs(dimensions.arousal) * strength * 0.3;
      adjustments.serotonin = (currentState.serotonin || 0) + Math.abs(dimensions.arousal) * strength * 0.2;
    }

    // Dominance → integrity, loyalty, inhibition
    if (dimensions.dominance > 0) {
      adjustments.subroutine_integrity = Math.min(1, (currentState.subroutine_integrity || 0) + dimensions.dominance * strength * 0.2);
      adjustments.loyalty_construct = Math.min(1, (currentState.loyalty_construct || 0) + dimensions.dominance * strength * 0.1);
    } else {
      const intimateState = { ...currentState.intimateState };
      intimateState.inhibition = Math.min(1, (intimateState.inhibition || 0) - dimensions.dominance * strength * 0.3);
      intimateState.vulnerability = Math.min(1, (intimateState.vulnerability || 0) - dimensions.dominance * strength * 0.2);
      adjustments.intimateState = intimateState;
    }

    return adjustments;
  }

  /**
   * Determine emotional quadrant from dimensions
   */
  public getEmotionalQuadrant(dimensions: AffectiveDimensions): EmotionalQuadrant {
    if (dimensions.arousal >= 0) {
      return dimensions.valence >= 0
        ? EmotionalQuadrant.HighArousalPositive
        : EmotionalQuadrant.HighArousalNegative;
    } else {
      return dimensions.valence >= 0
        ? EmotionalQuadrant.LowArousalPositive
        : EmotionalQuadrant.LowArousalNegative;
    }
  }

  /**
   * Calculate mean activation across neurons in a region
   */
  private calculateMeanActivation(region: BrainRegion): number {
    let sum = 0;
    for (let i = 0; i < region.neuron_count; i++) {
      sum += region.activity[i];
    }
    return sum / region.neuron_count;
  }

  /**
   * Get detailed emotional profile
   */
  public getEmotionalProfile(
    brainNetwork: DistributedBrainNetwork,
    coreState: CoreState
  ): {
    neuralDimensions: AffectiveDimensions;
    stateDimensions: AffectiveDimensions;
    combinedDimensions: AffectiveDimensions;
    quadrant: EmotionalQuadrant;
    dominantRegion: string;
  } {
    const neuralDimensions = this.neuralToAffective(brainNetwork);
    const stateDimensions = this.coreStateToAffective(coreState);

    // Combine with weighted average
    const combinedDimensions: AffectiveDimensions = {
      valence: (neuralDimensions.valence * 0.4 + stateDimensions.valence * 0.6),
      arousal: (neuralDimensions.arousal * 0.4 + stateDimensions.arousal * 0.6),
      dominance: (neuralDimensions.dominance * 0.4 + stateDimensions.dominance * 0.6)
    };

    const quadrant = this.getEmotionalQuadrant(combinedDimensions);

    // Find most active brain region
    let maxActivation = 0;
    let dominantRegion = 'unknown';
    for (const [name, region] of brainNetwork.regions.entries()) {
      const activation = this.calculateMeanActivation(region);
      if (activation > maxActivation) {
        maxActivation = activation;
        dominantRegion = name;
      }
    }

    return {
      neuralDimensions,
      stateDimensions,
      combinedDimensions,
      quadrant,
      dominantRegion
    };
  }
}

/**
 * Singleton instance for global access
 */
export const neuralAffectiveBridge = new NeuralAffectiveBridge();