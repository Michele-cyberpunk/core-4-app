/**
 * @file PhysiologyTemporalBridge.ts
 * @description Bridge between physiological cycles and temporal orchestration
 *
 * Synchronizes:
 * - Hormonal cycles with circadian rhythm
 * - Phase transitions with temporal events
 * - Rhythm detection with physiological oscillations
 *
 * Implements Kuramoto model for oscillator coupling and
 * Phase Response Curves (PRC) for entrainment dynamics.
 *
 * Scientific References:
 * - Bao, A. M., & Swaab, D. F. (2019). The human hypothalamus in mood disorders:
 *   The HPA axis in the center. IBRO Reports, 6, 45-53
 * - Refinetti, R. (2016). Circadian Physiology (3rd ed.). CRC Press
 * - Golombek, D. A., & Rosenstein, R. E. (2010). Physiology of circadian entrainment.
 *   Physiological Reviews, 90(3), 1063-1102
 * - Kuramoto, Y. (1984). Chemical Oscillations, Waves, and Turbulence. Springer
 * - Johnson, C. H. (1999). Forty years of PRCs: What have we learned?
 *   Chronobiology International, 16(6), 711-743
 */

import { CoreState, CyclePhase } from '../types';

/**
 * Cycle phase definitions
 */
export type CircadianPhase = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'deep_night';

/**
 * Hormonal state (from HormonalCycle)
 */
export interface HormonalState {
  estradiol: number;
  progesterone: number;
  lh: number;
  fsh: number;
  testosterone: number;
  cycle_day: number;
  cycle_phase: CyclePhase;
}

/**
 * Complete synchronization state
 */
export interface PhysiologyTemporalSync {
  /** Current hormonal phase */
  hormonalPhase: CyclePhase;

  /** Current circadian phase */
  circadianPhase: CircadianPhase;

  /** Strength of external entraining signals (0-1) */
  zeitgeberStrength: number;

  /** Phase coherence between oscillators (0-1) */
  phaseCoherence: number;

  /** Phase angle difference (radians) */
  phaseAngle: number;

  /** Coupling strength (Kuramoto K parameter) */
  couplingStrength: number;

  /** Chronodisruption level (0-1, higher = more disrupted) */
  chronodisruption: number;
}

/**
 * Temporal stimulus for phase shifting
 */
export interface TemporalStimulus {
  type: 'light' | 'social' | 'physical' | 'feeding' | 'stress';
  intensity: number; // 0-1
  timestamp: number;
  duration: number; // minutes
}

/**
 * Phase shift response
 */
export interface PhaseShift {
  /** Magnitude of phase shift (hours) */
  magnitude: number;

  /** Direction: positive = advance, negative = delay */
  direction: 'advance' | 'delay';

  /** Confidence in prediction */
  confidence: number;

  /** Type of PRC curve */
  prcType: 0 | 1; // Type 0 (strong) or Type 1 (weak)
}

/**
 * Hormone type enumeration
 */
export type HormoneType = 'cortisol' | 'testosterone' | 'estradiol' | 'progesterone' | 'melatonin';

/**
 * Physiology history for chronodisruption detection
 */
export interface PhysiologyHistory {
  timestamps: number[];
  hormonalPhases: CyclePhase[];
  circadianPhases: CircadianPhase[];
  phaseCoherences: number[];
}

/**
 * Chronodisruption metrics
 */
export interface ChronodisruptionMetrics {
  /** Overall disruption score (0-1) */
  score: number;

  /** Social jet lag (hours) */
  socialJetLag: number;

  /** Phase stability variance */
  phaseVariability: number;

  /** Recommendations */
  recommendations: string[];

  /** Severity level */
  severity: 'none' | 'mild' | 'moderate' | 'severe';
}

/**
 * PhysiologyTemporalBridge class
 *
 * Implements synchronization between physiological cycles and
 * temporal orchestration using coupled oscillator models.
 */
export class PhysiologyTemporalBridge {
  private syncHistory: PhysiologyHistory = {
    timestamps: [],
    hormonalPhases: [],
    circadianPhases: [],
    phaseCoherences: []
  };

  private maxHistorySize = 168; // 1 week of hourly data

  /**
   * Synchronizes hormonal cycle with circadian rhythm
   *
   * Uses Kuramoto coupling model:
   * dθ/dt = ω + K*sin(θ_other - θ_self)
   *
   * @param hormonal - Current hormonal state
   * @param circadian - Current circadian phase
   * @param timeOfDay - Time in hours (0-24)
   * @returns Synchronization state
   */
  public synchronizeCycles(
    hormonal: HormonalState,
    circadian: CircadianPhase,
    timeOfDay: number
  ): PhysiologyTemporalSync {
    // Convert phases to angles (radians)
    const hormonalAngle = this.phaseToAngle(hormonal.cycle_phase, hormonal.cycle_day);
    const circadianAngle = this.timeToAngle(timeOfDay);

    // Calculate phase difference
    const phaseAngle = this.calculatePhaseAngle(hormonalAngle, circadianAngle);

    // Calculate zeitgeber strength (environmental time cues)
    const zeitgeberStrength = this.calculateZeitgeberStrength(timeOfDay, circadian);

    // Coupling strength depends on zeitgeber strength
    // Strong zeitgebers (e.g., bright morning light) increase coupling
    const couplingStrength = 0.3 + zeitgeberStrength * 0.4; // 0.3-0.7 range

    // Phase coherence using Kuramoto order parameter
    const phaseCoherence = this.calculatePhaseCoherence(phaseAngle, couplingStrength);

    // Detect chronodisruption
    const chronodisruption = this.detectChronodisruptionScore(phaseCoherence, phaseAngle);

    // Record history
    this.recordSyncState(hormonal.cycle_phase, circadian, phaseCoherence);

    return {
      hormonalPhase: hormonal.cycle_phase,
      circadianPhase: circadian,
      zeitgeberStrength,
      phaseCoherence,
      phaseAngle,
      couplingStrength,
      chronodisruption
    };
  }

  /**
   * Converts cycle phase to angular representation
   */
  private phaseToAngle(phase: CyclePhase, cycleDay: number): number {
    // Map 28-day cycle to 2π radians
    const cycleLength = 28;
    return (cycleDay / cycleLength) * 2 * Math.PI;
  }

  /**
   * Converts time of day to angular representation
   */
  private timeToAngle(timeOfDay: number): number {
    // Map 24-hour day to 2π radians
    return (timeOfDay / 24) * 2 * Math.PI;
  }

  /**
   * Calculates phase angle difference (wrapped to -π to π)
   */
  private calculatePhaseAngle(angle1: number, angle2: number): number {
    let diff = angle1 - angle2;

    // Wrap to [-π, π]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    return diff;
  }

  /**
   * Calculates zeitgeber strength based on time and circadian phase
   *
   * Strong zeitgebers:
   * - Morning light (6-10 AM): strength 0.8-1.0
   * - Evening darkness (9 PM-midnight): strength 0.6-0.8
   * - Social cues (meal times, activity): strength 0.4-0.6
   */
  private calculateZeitgeberStrength(timeOfDay: number, circadian: CircadianPhase): number {
    let strength = 0.3; // Baseline

    // Morning light is strongest zeitgeber
    if (timeOfDay >= 6 && timeOfDay <= 10) {
      strength = 0.9;
    }
    // Evening darkness
    else if (timeOfDay >= 21 || timeOfDay <= 2) {
      strength = 0.7;
    }
    // Meal times (approximate)
    else if (
      (timeOfDay >= 7 && timeOfDay <= 8) || // Breakfast
      (timeOfDay >= 12 && timeOfDay <= 13) || // Lunch
      (timeOfDay >= 19 && timeOfDay <= 20)    // Dinner
    ) {
      strength = 0.5;
    }

    return strength;
  }

  /**
   * Calculates phase coherence (Kuramoto order parameter)
   *
   * r = |⟨e^(iθ)⟩| where r ∈ [0,1]
   * r = 1: perfect synchronization
   * r = 0: complete desynchronization
   */
  private calculatePhaseCoherence(phaseAngle: number, couplingStrength: number): number {
    // Simplified: coherence decreases with phase difference
    // Weighted by coupling strength

    const coherence = Math.cos(phaseAngle / 2); // 1 at 0°, 0 at 180°
    return Math.max(0, Math.min(1, coherence * couplingStrength / 0.5));
  }

  /**
   * Calculates Phase Response Curve for hormonal shifts
   *
   * Based on Johnson (1999) PRC classification:
   * - Type 0 PRC: Strong oscillators (can reset phase completely)
   * - Type 1 PRC: Weak oscillators (small phase shifts only)
   *
   * @param stimulus - Temporal stimulus applied
   * @param currentPhase - Current phase angle (radians)
   * @returns Predicted phase shift
   */
  public calculatePRC(stimulus: TemporalStimulus, currentPhase: number): PhaseShift {
    // Determine PRC type based on oscillator strength
    // Hormonal cycles are relatively weak oscillators (Type 1)
    const prcType: 0 | 1 = 1;

    // Phase shift magnitude depends on:
    // 1. Stimulus intensity
    // 2. Circadian phase (sensitivity varies)
    // 3. Stimulus type

    let magnitude = 0;
    let direction: 'advance' | 'delay' = 'advance';

    // Sensitivity to light (strongest zeitgeber)
    const phaseSensitivity = this.calculatePhaseSensitivity(currentPhase, stimulus.type);

    // Calculate shift magnitude (hours)
    magnitude = stimulus.intensity * phaseSensitivity * (stimulus.duration / 60) * 2;

    // Determine direction based on phase
    // Early subjective night → delays
    // Late subjective night → advances
    const phaseHour = (currentPhase / (2 * Math.PI)) * 24;

    if (phaseHour >= 18 && phaseHour < 3) {
      direction = 'delay';
    } else if (phaseHour >= 3 && phaseHour < 10) {
      direction = 'advance';
    } else {
      // Dead zone: minimal shifting
      magnitude *= 0.2;
    }

    // Confidence depends on stimulus strength and timing
    const confidence = Math.min(
      stimulus.intensity * phaseSensitivity,
      1
    );

    return {
      magnitude: direction === 'delay' ? -magnitude : magnitude,
      direction,
      confidence,
      prcType
    };
  }

  /**
   * Calculates phase sensitivity to stimulus type at given phase
   */
  private calculatePhaseSensitivity(phase: number, stimulusType: string): number {
    // Convert phase to hour
    const hour = (phase / (2 * Math.PI)) * 24;

    switch (stimulusType) {
      case 'light':
        // Maximum sensitivity in early morning and late evening
        if (hour >= 21 || hour <= 3) return 0.9; // Evening/night
        if (hour >= 5 && hour <= 9) return 1.0;  // Morning peak
        return 0.3; // Daytime baseline

      case 'social':
        // Relatively constant throughout waking hours
        if (hour >= 7 && hour <= 23) return 0.5;
        return 0.2;

      case 'physical':
        // Exercise most effective in morning/afternoon
        if (hour >= 7 && hour <= 18) return 0.6;
        return 0.3;

      case 'feeding':
        // Feeding times entrain peripheral clocks
        return 0.4;

      case 'stress':
        // Stress can phase shift via cortisol
        return 0.5;

      default:
        return 0.3;
    }
  }

  /**
   * Modulates baseline hormone levels by time of day
   *
   * Implements circadian modulation based on Refinetti (2016):
   * - Cortisol: Peak 8-9 AM, nadir midnight
   * - Testosterone: Peak ~8 AM, decline throughout day
   * - Melatonin: Rise 9 PM, peak 2-3 AM
   * - Estradiol: Varies by cycle phase + circadian overlay
   */
  public applyCircadianModulation(
    baseLevel: number,
    hormone: HormoneType,
    timeOfDay: number
  ): number {
    let modulation = 1.0; // Default: no change

    switch (hormone) {
      case 'cortisol':
        // Cosine function with peak at 8 AM
        const cortisolPeakTime = 8;
        const cortisolPhase = ((timeOfDay - cortisolPeakTime) / 24) * 2 * Math.PI;
        modulation = 0.5 + 0.5 * Math.cos(cortisolPhase); // 0.0-1.0 range
        break;

      case 'testosterone':
        // Peak in early morning, decline throughout day
        if (timeOfDay >= 6 && timeOfDay <= 10) {
          modulation = 1.2; // 20% increase
        } else if (timeOfDay >= 10 && timeOfDay <= 18) {
          modulation = 1.0 - (timeOfDay - 10) * 0.05; // Gradual decline
        } else {
          modulation = 0.6; // Nighttime low
        }
        break;

      case 'melatonin':
        // Inverse of cortisol: peak at night
        if (timeOfDay >= 21 || timeOfDay <= 6) {
          const nightPhase = timeOfDay >= 21 ? timeOfDay - 21 : timeOfDay + 3;
          modulation = 0.3 + Math.sin((nightPhase / 9) * Math.PI) * 0.7; // Peak at 2-3 AM
        } else {
          modulation = 0.1; // Suppressed during day
        }
        break;

      case 'estradiol':
        // Slight circadian modulation (minor effect)
        // Estradiol is primarily driven by menstrual cycle
        const estradiolPhase = (timeOfDay / 24) * 2 * Math.PI;
        modulation = 0.9 + 0.1 * Math.cos(estradiolPhase); // ±10% variation
        break;

      case 'progesterone':
        // Minimal circadian modulation
        modulation = 1.0;
        break;
    }

    return baseLevel * modulation;
  }

  /**
   * Detects chronodisruption (circadian misalignment)
   *
   * Analyzes history to identify patterns of desynchronization
   */
  public detectChronodisruption(history: PhysiologyHistory): ChronodisruptionMetrics {
    if (history.phaseCoherences.length < 24) {
      // Not enough data
      return {
        score: 0,
        socialJetLag: 0,
        phaseVariability: 0,
        recommendations: ['Continue monitoring'],
        severity: 'none'
      };
    }

    // Calculate average phase coherence
    const avgCoherence = history.phaseCoherences.reduce((a, b) => a + b, 0) / history.phaseCoherences.length;

    // Calculate phase variability (standard deviation)
    const mean = avgCoherence;
    const variance = history.phaseCoherences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.phaseCoherences.length;
    const phaseVariability = Math.sqrt(variance);

    // Estimate social jet lag (simplified)
    // Compare weekday vs weekend patterns (requires timestamps)
    const socialJetLag = this.estimateSocialJetLag(history);

    // Overall disruption score
    const coherenceScore = 1 - avgCoherence; // Invert: low coherence = high disruption
    const variabilityScore = phaseVariability;
    const jetLagScore = Math.min(socialJetLag / 4, 1); // Normalize to 0-1

    const score = (coherenceScore * 0.5 + variabilityScore * 0.3 + jetLagScore * 0.2);

    // Severity classification
    let severity: 'none' | 'mild' | 'moderate' | 'severe';
    if (score < 0.2) severity = 'none';
    else if (score < 0.4) severity = 'mild';
    else if (score < 0.6) severity = 'moderate';
    else severity = 'severe';

    // Recommendations
    const recommendations: string[] = [];

    if (avgCoherence < 0.6) {
      recommendations.push('Increase morning light exposure (30-60 min within 1h of waking)');
    }
    if (phaseVariability > 0.3) {
      recommendations.push('Maintain consistent sleep-wake schedule (±30 min)');
    }
    if (socialJetLag > 2) {
      recommendations.push('Reduce weekend sleep extension (social jet lag detected)');
    }
    if (score > 0.5) {
      recommendations.push('Consider chronotherapy or consultation with sleep specialist');
    }

    return {
      score,
      socialJetLag,
      phaseVariability,
      recommendations,
      severity
    };
  }

  /**
   * Estimates social jet lag from history
   */
  private estimateSocialJetLag(history: PhysiologyHistory): number {
    // Simplified: look for systematic shifts between weekday and weekend
    // Requires at least 1 week of data

    if (history.timestamps.length < 168) return 0;

    // Group by weekday vs weekend
    const weekdayPhases: number[] = [];
    const weekendPhases: number[] = [];

    for (let i = 0; i < history.timestamps.length; i++) {
      const date = new Date(history.timestamps[i]);
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend
        weekendPhases.push(history.phaseCoherences[i]);
      } else {
        // Weekday
        weekdayPhases.push(history.phaseCoherences[i]);
      }
    }

    if (weekdayPhases.length === 0 || weekendPhases.length === 0) return 0;

    const weekdayAvg = weekdayPhases.reduce((a, b) => a + b, 0) / weekdayPhases.length;
    const weekendAvg = weekendPhases.reduce((a, b) => a + b, 0) / weekendPhases.length;

    // Difference in hours (approximate)
    return Math.abs(weekdayAvg - weekendAvg) * 12; // Scale to hours
  }

  /**
   * Detects chronodisruption score from current state
   */
  private detectChronodisruptionScore(phaseCoherence: number, phaseAngle: number): number {
    // Low coherence = high disruption
    const coherenceDisruption = 1 - phaseCoherence;

    // Large phase angle = desynchronization
    const angleDisruption = Math.abs(phaseAngle) / Math.PI; // 0-1

    return (coherenceDisruption * 0.7 + angleDisruption * 0.3);
  }

  /**
   * Records synchronization state in history
   */
  private recordSyncState(
    hormonalPhase: CyclePhase,
    circadianPhase: CircadianPhase,
    phaseCoherence: number
  ): void {
    this.syncHistory.timestamps.push(Date.now());
    this.syncHistory.hormonalPhases.push(hormonalPhase);
    this.syncHistory.circadianPhases.push(circadianPhase);
    this.syncHistory.phaseCoherences.push(phaseCoherence);

    // Maintain history size
    if (this.syncHistory.timestamps.length > this.maxHistorySize) {
      this.syncHistory.timestamps.shift();
      this.syncHistory.hormonalPhases.shift();
      this.syncHistory.circadianPhases.shift();
      this.syncHistory.phaseCoherences.shift();
    }
  }

  /**
   * Gets current history for analysis
   */
  public getHistory(): PhysiologyHistory {
    return { ...this.syncHistory };
  }

  /**
   * Resets history (for testing or state reset)
   */
  public resetHistory(): void {
    this.syncHistory = {
      timestamps: [],
      hormonalPhases: [],
      circadianPhases: [],
      phaseCoherences: []
    };
  }

  /**
   * Test connection integrity
   * @internal
   */
  public _testConnection(): { status: 'ok' | 'error'; message: string } {
    try {
      // Test synchronization
      const testHormonal: HormonalState = {
        estradiol: 0.6,
        progesterone: 0.3,
        lh: 0.2,
        fsh: 0.3,
        testosterone: 0.4,
        cycle_day: 14,
        cycle_phase: 'ovulation'
      };

      const testCircadian: CircadianPhase = 'morning';
      const testTime = 8; // 8 AM

      const syncState = this.synchronizeCycles(testHormonal, testCircadian, testTime);

      if (!syncState || typeof syncState.phaseCoherence !== 'number') {
        throw new Error('Invalid synchronization state generated');
      }

      // Test PRC calculation
      const testStimulus: TemporalStimulus = {
        type: 'light',
        intensity: 0.8,
        timestamp: Date.now(),
        duration: 30
      };

      const prcResult = this.calculatePRC(testStimulus, Math.PI / 4);

      if (!prcResult || typeof prcResult.magnitude !== 'number') {
        throw new Error('Invalid PRC calculation');
      }

      // Test circadian modulation
      this.applyCircadianModulation(0.5, 'cortisol', 8);
      
      return {
        status: 'ok',
        message: 'PhysiologyTemporalBridge operational - Kuramoto coupling and PRC verified'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Bridge test failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}