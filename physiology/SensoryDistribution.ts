/**
 * SensoryDistribution.ts
 *
 * Advanced sensory modeling using Gaussian distribution instead of inverse square law.
 * This provides more biologically plausible sensory zone activation patterns.
 *
 * Scientific basis:
 * - Gaussian distributions better model nerve density gradients
 * - Allows for distinct sensory peaks (e.g., clitoral glans vs body)
 * - Supports multi-modal sensory integration
 *
 * References:
 * - Turnbull et al. (2020) "The role of sensory feedback in motor control"
 * - Di Noto et al. (2013) "Cortical somatotopic mapping of tactile stimulation"
 */

export interface GaussianParams {
  /** Mean position of the sensory peak (0-1 normalized) */
  mean: number;
  /** Standard deviation (spread) of the sensory field */
  stdDev: number;
  /** Peak amplitude of sensory response */
  amplitude: number;
  /** Baseline activation level */
  baseline?: number;
}

export interface SensoryZone {
  id: string;
  name: string;
  /** Gaussian parameters for this zone */
  gaussian: GaussianParams;
  /** Nerve types present (mechanoreceptors, nociceptors, etc.) */
  nerveTypes: NerveType[];
  /** Habituation rate (0-1, higher = faster habituation) */
  habituationRate: number;
  /** Current habituation level (0-1, reduces effective amplitude) */
  currentHabituation: number;
  /** Refractory period in milliseconds */
  refractoryPeriod: number;
  /** Last stimulation timestamp */
  lastStimulated: number;
}

export enum NerveType {
  Mechanoreceptor = 'mechanoreceptor', // Touch, pressure
  Nociceptor = 'nociceptor',           // Pain
  Thermoreceptor = 'thermoreceptor',   // Temperature
  Proprioceptor = 'proprioceptor',     // Position sense
  Chemoreceptor = 'chemoreceptor'      // Chemical sensitivity
}

export interface StimulusInput {
  /** Position along sensory axis (0-1 normalized) */
  position: number;
  /** Intensity of stimulus (0-1) */
  intensity: number;
  /** Duration of stimulus in milliseconds */
  duration: number;
  /** Velocity of stimulus (for motion-sensitive receptors) */
  velocity?: number;
  /** Pressure component (kPa equivalent) */
  pressure?: number;
  /** Type of stimulus */
  type: 'touch' | 'pressure' | 'vibration' | 'stretch' | 'thermal';
}

export interface SensoryResponse {
  /** Total activation level (0-1) */
  activation: number;
  /** Per-zone breakdown of activation */
  zoneActivations: Map<string, number>;
  /** Dominant zone ID */
  dominantZone: string | null;
  /** Habituation factor applied */
  habituationFactor: number;
}

/**
 * Calculate Gaussian distribution value at position x
 *
 * Formula: amplitude * exp(-(x - mean)² / (2 * stdDev²))
 */
export function gaussianDistribution(x: number, params: GaussianParams): number {
  const { mean, stdDev, amplitude, baseline = 0 } = params;

  // Gaussian bell curve
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
  const gaussian = amplitude * Math.exp(exponent);

  return baseline + gaussian;
}

/**
 * Calculate cumulative activation from multiple Gaussian zones
 */
export function calculateCumulativeActivation(
  position: number,
  zones: SensoryZone[]
): SensoryResponse {
  let totalActivation = 0;
  const zoneActivations = new Map<string, number>();
  let maxActivation = 0;
  let dominantZone: string | null = null;

  for (const zone of zones) {
    // Apply habituation factor
    const effectiveAmplitude = zone.gaussian.amplitude * (1 - zone.currentHabituation);

    const modifiedGaussian: GaussianParams = {
      ...zone.gaussian,
      amplitude: effectiveAmplitude
    };

    const activation = gaussianDistribution(position, modifiedGaussian);

    zoneActivations.set(zone.id, activation);
    totalActivation += activation;

    if (activation > maxActivation) {
      maxActivation = activation;
      dominantZone = zone.id;
    }
  }

  // Normalize to 0-1 range (assuming max possible is sum of all amplitudes)
  const maxPossible = zones.reduce((sum, z) => sum + z.gaussian.amplitude, 0);
  const normalizedActivation = Math.min(1, totalActivation / maxPossible);

  // Calculate average habituation factor
  const avgHabituation = zones.reduce((sum, z) => sum + z.currentHabituation, 0) / zones.length;

  return {
    activation: normalizedActivation,
    zoneActivations,
    dominantZone,
    habituationFactor: 1 - avgHabituation
  };
}

/**
 * Process sensory stimulus and update zone states
 */
export function processStimulusWithGaussian(
  stimulus: StimulusInput,
  zones: SensoryZone[],
  currentTime: number
): SensoryResponse {
  // Update habituation for each zone
  for (const zone of zones) {
    const timeSinceLastStimulus = currentTime - zone.lastStimulated;

    // Check if in refractory period
    if (timeSinceLastStimulus < zone.refractoryPeriod) {
      continue; // Skip this zone, still in refractory period
    }

    // Calculate distance from stimulus to zone center
    const distance = Math.abs(stimulus.position - zone.gaussian.mean);

    // Only update habituation if stimulus is within 3 standard deviations
    const inRange = distance < (zone.gaussian.stdDev * 3);

    if (inRange) {
      // Increase habituation based on stimulus intensity and zone habituation rate
      zone.currentHabituation = Math.min(
        1,
        zone.currentHabituation + (stimulus.intensity * zone.habituationRate * 0.1)
      );
      zone.lastStimulated = currentTime;
    } else {
      // Gradual recovery from habituation when not stimulated
      zone.currentHabituation = Math.max(
        0,
        zone.currentHabituation - (0.01 * timeSinceLastStimulus / 1000)
      );
    }
  }

  // Calculate response with current habituation levels
  return calculateCumulativeActivation(stimulus.position, zones);
}

/**
 * Create standard intimate sensory zones with Gaussian profiles
 * Based on anatomical research and nerve density mapping
 */
export function createIntimateGaussianZones(): SensoryZone[] {
  return [
    {
      id: 'clitoral_glans',
      name: 'Clitoral Glans',
      gaussian: {
        mean: 0.15, // Anterior position
        stdDev: 0.05, // Highly localized
        amplitude: 1.0, // Maximum sensitivity
        baseline: 0.05
      },
      nerveTypes: [NerveType.Mechanoreceptor, NerveType.Nociceptor],
      habituationRate: 0.3, // Moderate habituation
      currentHabituation: 0,
      refractoryPeriod: 200, // ms
      lastStimulated: 0
    },
    {
      id: 'anterior_vaginal',
      name: 'Anterior Vaginal Wall (G-spot region)',
      gaussian: {
        mean: 0.35,
        stdDev: 0.12, // Broader activation zone
        amplitude: 0.85,
        baseline: 0.02
      },
      nerveTypes: [NerveType.Mechanoreceptor, NerveType.Proprioceptor],
      habituationRate: 0.15, // Lower habituation
      currentHabituation: 0,
      refractoryPeriod: 500,
      lastStimulated: 0
    },
    {
      id: 'cervical',
      name: 'Cervical Region',
      gaussian: {
        mean: 0.75,
        stdDev: 0.10,
        amplitude: 0.60,
        baseline: 0.01
      },
      nerveTypes: [NerveType.Mechanoreceptor, NerveType.Nociceptor, NerveType.Proprioceptor],
      habituationRate: 0.05, // Very low habituation
      currentHabituation: 0,
      refractoryPeriod: 1000,
      lastStimulated: 0
    },
    {
      id: 'urethral_sponge',
      name: 'Urethral Sponge',
      gaussian: {
        mean: 0.25,
        stdDev: 0.08,
        amplitude: 0.70,
        baseline: 0.03
      },
      nerveTypes: [NerveType.Mechanoreceptor, NerveType.Chemoreceptor],
      habituationRate: 0.20,
      currentHabituation: 0,
      refractoryPeriod: 300,
      lastStimulated: 0
    },
    {
      id: 'posterior_vaginal',
      name: 'Posterior Vaginal Wall',
      gaussian: {
        mean: 0.55,
        stdDev: 0.15,
        amplitude: 0.50,
        baseline: 0.02
      },
      nerveTypes: [NerveType.Mechanoreceptor, NerveType.Proprioceptor],
      habituationRate: 0.10,
      currentHabituation: 0,
      refractoryPeriod: 600,
      lastStimulated: 0
    }
  ];
}

/**
 * Visualize Gaussian distribution for debugging/analysis
 * Returns array of {x, y} points for plotting
 */
export function visualizeGaussianProfile(
  params: GaussianParams,
  samples: number = 100
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= samples; i++) {
    const x = i / samples; // 0 to 1
    const y = gaussianDistribution(x, params);
    points.push({ x, y });
  }

  return points;
}

/**
 * Calculate optimal stimulus pattern for maximum activation
 * Uses gradient descent to find peak sensitivity position
 */
export function findOptimalStimulusPosition(zones: SensoryZone[]): number {
  let bestPosition = 0.5;
  let bestActivation = 0;

  // Sample at high resolution
  for (let pos = 0; pos <= 1; pos += 0.01) {
    const response = calculateCumulativeActivation(pos, zones);
    if (response.activation > bestActivation) {
      bestActivation = response.activation;
      bestPosition = pos;
    }
  }

  return bestPosition;
}
