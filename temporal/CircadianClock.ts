/**
 * @file CircadianClock.ts
 * @description Comprehensive circadian rhythm model with gender-specific dynamics,
 *              menstrual cycle integration, sleep stages, chronotypes, and seasonal effects
 *
 * References:
 * - Lightman (2008): Ultradian and circadian rhythms of neuroendocrine function
 * - Walker et al. (2017): Mathematical modeling of HPA axis with circadian input
 * - Saper et al. (2005): The hypothalamic integrator for circadian rhythms
 * - Czeisler & Gooley (2007): Sleep and circadian rhythms in humans
 * - Klerman et al. (2002): Biological Rhythms and Sleep Deprivation in Human Performance
 * - Cain et al. (2010): Sex differences in phase angle of entrainment and melatonin amplitude
 * - Refinetti (2006): Circadian Physiology
 * - Mistlberger (1994): Circadian food-anticipatory activity: Formal models and physiological mechanisms
 * - Scheer et al. (2009): Impact of circadian misalignment on health
 * - Smarr et al. (2014): The circadian system: a physiological and regulatory interface
 */

import { 
  CoreState, 
  EmotionLabel,
  CyclePhase,
  Neurochemical,
  BrainRegionName
} from '../types';

// ============================================================================
// CIRCADIAN REFERENCE RANGES (from literature)
// ============================================================================

const CIRCADIAN_REFERENCE_RANGES = {
  cortisol: {
    peak_time: 6.5,  // 6:30 AM (Weitzman et al., 1971)
    peak_value: 1.5, // 15-25 µg/dL
    trough_time: 2.5, // 2:30 AM
    trough_value: 0.3, // 3-5 µg/dL
    amplitude: 1.2
  },
  melatonin: {
    onset_time: 20.5, // 8:30 PM (Czeisler & Gooley, 2007)
    peak_time: 2.0,   // 2:00 AM
    peak_value: 0.8,
    offset_time: 7.0  // 7:00 AM
  },
  dopamine: {
    ultradian_period: 90, // minutes (Mistlberger, 1994)
    circadian_peak: 12.0, // Noon
    circadian_trough: 23.0 // 11 PM
  },
  testosterone: {
    peak_time: 6.0, // 6:00 AM (early morning)
    peak_value: 1.3,
    trough_time: 18.0, // 6:00 PM
    trough_value: 0.7
  },
  heart_rate: {
    daytime_avg: 70,
    nighttime_low: 55,
    peak_time: 15.0 // 3:00 PM
  },
  body_temperature: {
    peak_time: 17.0, // 5:00 PM
    peak_value: 37.2, // °C
    trough_time: 4.0, // 4:00 AM
    trough_value: 36.4
  }
};

// ============================================================================
// SLEEP STAGES DEFINITION
// ============================================================================

export type SleepStage = 'awake' | 'nrem1' | 'nrem2' | 'nrem3' | 'rem';

interface SleepArchitecture {
  stage: SleepStage;
  duration: number; // minutes
  eeg_frequency: number; // Hz (simplified)
  emg_tone: number; // muscle tone 0-1
  eye_movement: number; // 0-1
}

// ============================================================================
// CHRONOTYPE DEFINITION
// ============================================================================

export type Chronotype = 'early_bird' | 'intermediate' | 'night_owl';

interface ChronotypeProfile {
  type: Chronotype;
  sleep_onset: number; // hours (0-24)
  sleep_duration: number; // hours
  peak_alertness: number; // hours
  circadian_period: number; // hours (~24.2 natural)
  light_sensitivity: number; // 0-1 (how sensitive to light)
}

// ============================================================================
// MAIN CIRCADIAN CLOCK CLASS
// ============================================================================

export class CircadianClock {
  private currentTime: Date;
  private ultradianPhase: number = 0; // 0-1, for 90-min cycle
  private ultradianPhaseNorepinephrine: number = 0; // Separate ultradian
  private cycleDurationMin: number = 90; // Ultradian cycle for dopamine
  private norepinephrineCycleDurationMin: number = 120; // Separate for NE
  
  // Circadian parameters
  private circadianPhase: number = 0; // 0-24 hours, represents phase within 24h cycle
  private circadianAmplitude: number = 1.0; // Reduced by stress/desynchronization
  
  // Gender and chronotype
  private gender: 'female' | 'male' | 'other' = 'female';
  private chronotype: ChronotypeProfile;
  private age: number = 25;
  
  // Menstrual cycle integration
  private cyclePhase?: CyclePhase;
  private menstrualCycleDay: number = 1;
  
  // Sleep tracking
  private currentSleepStage: SleepStage = 'awake';
  private sleepOnsetTime: number = 23; // 11 PM
  private sleepDuration: number = 7; // hours
  private timeSinceWakeup: number = 0;
  private sleep_debt: number = 0; // cumulative hours
  
  // Seasonal effects
  private dayOfYear: number = 1;
  private latitude: number = 40; // degrees (affects photoperiod)
  private photoperiod: number = 12; // hours of daylight
  
  // Stress and desynchronization
  private stress_level: number = 0;
  private jet_lag_phase_shift: number = 0; // hours
  private shift_work_active: boolean = false;
  private circadian_robustness: number = 1.0; // 0-1, how well entrained
  
  // Environmental inputs
  private light_intensity: number = 0; // lux
  private last_light_exposure: number = 0; // minutes ago
  private meal_time_offset: number = 0; // hours from typical

  constructor(
    initialTime?: Date, 
    gender?: 'female' | 'male' | 'other',
    chronotype?: Chronotype,
    latitude?: number
  ) {
    this.currentTime = initialTime || new Date();
    this.gender = gender || 'female';
    this.latitude = latitude || 40;
    
    // Initialize chronotype profile
    this.chronotype = this.initializeChronotype(chronotype || 'intermediate');
    
    // Set circadian phase based on current time
    this.updateCircadianPhase();
    
    // Calculate photoperiod based on latitude and day of year
    this.updatePhotoperiod();
  }

  // =========================================================================
  // INITIALIZATION & CONFIGURATION
  // =========================================================================

  private initializeChronotype(type: Chronotype): ChronotypeProfile {
    const profiles: Record<Chronotype, ChronotypeProfile> = {
      early_bird: {
        type: 'early_bird',
        sleep_onset: 21, // 9 PM
        sleep_duration: 7,
        peak_alertness: 8, // 8 AM
        circadian_period: 24.0,
        light_sensitivity: 0.8 // More sensitive to light
      },
      intermediate: {
        type: 'intermediate',
        sleep_onset: 23, // 11 PM
        sleep_duration: 7.5,
        peak_alertness: 10, // 10 AM
        circadian_period: 24.2, // Slightly longer natural period
        light_sensitivity: 0.6
      },
      night_owl: {
        type: 'night_owl',
        sleep_onset: 1, // 1 AM
        sleep_duration: 7,
        peak_alertness: 13, // 1 PM
        circadian_period: 24.4, // Even longer natural period
        light_sensitivity: 0.4
      }
    };
    
    return profiles[type];
  }

  private updateCircadianPhase(): void {
    // Calculate position in 24-hour cycle
    const hours = this.currentTime.getHours();
    const minutes = this.currentTime.getMinutes();
    this.circadianPhase = hours + minutes / 60;
  }

  private updatePhotoperiod(): void {
    // Simplified photoperiod calculation based on day of year and latitude
    // Using Spencer (1971) formula for solar declination
    const dayOfYear = this.dayOfYear;
    const absLatitude = Math.abs(this.latitude) * (Math.PI / 180); // Convert to radians
    
    // Solar declination (simplified)
    const solarDeclination = 23.45 * Math.sin((dayOfYear - 81) * (2 * Math.PI / 365));
    const cosHourAngle = -Math.tan(absLatitude) * Math.tan(solarDeclination * (Math.PI / 180));
    
    // Clamp to valid range [-1, 1]
    const clamped = Math.max(-1, Math.min(1, cosHourAngle));
    const dayLength = 24 * Math.acos(clamped) / Math.PI;
    
    this.photoperiod = dayLength;
  }

  // =========================================================================
  // MAIN UPDATE FUNCTION
  // =========================================================================

  /**
   * Updates clock based on elapsed time
   * @param elapsedMs Milliseconds since last update
   */
  public tick(elapsedMs: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + elapsedMs);
    
    // Update ultradian phases
    const elapsedMin = elapsedMs / (1000 * 60);
    this.ultradianPhase = (this.ultradianPhase + elapsedMin / this.cycleDurationMin) % 1;
    this.ultradianPhaseNorepinephrine = (this.ultradianPhaseNorepinephrine + 
                                         elapsedMin / this.norepinephrineCycleDurationMin) % 1;
    
    // Update circadian phase (should advance ~24h per day)
    this.updateCircadianPhase();
    
    // Track sleep debt
    if (this.currentSleepStage !== 'awake') {
      this.sleep_debt = Math.max(0, this.sleep_debt - elapsedMs / (1000 * 3600)); // Reduce debt while sleeping
    } else {
      // Wake time increases sleep pressure
      this.timeSinceWakeup += elapsedMin;
    }
    
    // Update day of year (for seasonal effects)
    if (this.currentTime.getHours() === 0 && this.currentTime.getMinutes() === 0) {
      this.dayOfYear = Math.floor(this.currentTime.getTime() / (1000 * 60 * 60 * 24)) % 365 + 1;
      this.updatePhotoperiod();
    }
    
    // Circadian robustness: chronic stress reduces entrainment
    this.circadian_robustness = Math.max(0.3, 1.0 - this.stress_level * 0.4);
    
    // Apply phase shift from jet lag
    this.circadianPhase += this.jet_lag_phase_shift / 24; // Gradual recovery
  }

  // =========================================================================
  // HORMONE MULTIPLIERS - GENDER SPECIFIC
  // =========================================================================

  /**
   * Gets cortisol multiplier based on time of day
   * Gender differences: Women have ~20% higher morning cortisol, earlier peak
   * Based on: Cain et al. (2010), Kudielka & Kirschbaum (2005)
   */
  public getCortisolMultiplier(): number {
    const hour = this.currentTime.getHours();
    
    // Gender-specific peak times
    let peakTime = CIRCADIAN_REFERENCE_RANGES.cortisol.peak_time;
    let peakValue = CIRCADIAN_REFERENCE_RANGES.cortisol.peak_value;
    
    if (this.gender === 'female') {
      peakTime -= 0.5; // Peak 30 min earlier in women (Cain et al., 2010)
      peakValue *= 1.2; // 20% higher in women (Kudielka & Kirschbaum, 2005)
    }
    
    // Menstrual cycle modulation (from HormonalCycle integration)
    if (this.cyclePhase === 'luteal_early' || this.cyclePhase === 'luteal_late') {
      peakValue *= 1.15; // Slightly elevated in luteal phase
    }
    
    // Gaussian peak (simplified)
    const hoursFromPeak = Math.abs(hour - peakTime);
    const peakWidth = 3; // hours
    const cortisol = peakValue * Math.exp(-Math.pow(hoursFromPeak, 2) / (2 * Math.pow(peakWidth, 2)));
    
    // Nighttime trough
    if (hour >= 22 || hour < 5) {
      return CIRCADIAN_REFERENCE_RANGES.cortisol.trough_value;
    }
    
    // Stress flattens cortisol rhythm (allostatic load)
    const flatteningFactor = 1 - this.stress_level * 0.3;
    
    return Math.max(0.3, Math.min(1.5, cortisol * flatteningFactor * this.circadian_robustness));
  }

  /**
   * Gets melatonin level [0,1]
   * Inverse to cortisol; higher at night
   * Gender differences: Women have 15-20% higher melatonin (Cain et al., 2010)
   */
  public getMelatoninLevel(): number {
    const hour = this.currentTime.getHours();
    
    const onsetTime = CIRCADIAN_REFERENCE_RANGES.melatonin.onset_time;
    const offsetTime = CIRCADIAN_REFERENCE_RANGES.melatonin.offset_time;
    let peakValue = CIRCADIAN_REFERENCE_RANGES.melatonin.peak_value;
    
    if (this.gender === 'female') {
      peakValue *= 1.18; // Higher melatonin in women
    }
    
    // Light intensity suppresses melatonin (photopic suppression)
    const lightSuppression = Math.min(1, this.light_intensity / 500); // Saturates at 500 lux
    const suppressedPeakValue = peakValue * (1 - lightSuppression * 0.8);
    
    // Melatonin rise (evening)
    if (hour >= onsetTime && hour < onsetTime + 6) {
      const relativeHour = hour - onsetTime;
      return suppressedPeakValue * (relativeHour / 3); // Gradual rise over 3h
    }
    
    // Melatonin peak (midnight - early morning)
    if (hour >= onsetTime + 6 || hour < offsetTime) {
      return suppressedPeakValue;
    }
    
    // Melatonin decline (morning)
    if (hour >= offsetTime && hour < offsetTime + 2) {
      const relativeHour = hour - offsetTime;
      return suppressedPeakValue * (1 - relativeHour / 2);
    }
    
    // Daytime baseline
    return Math.max(0, suppressedPeakValue * 0.1);
  }

  /**
   * Gets ultradian dopamine multiplier
   * ~90 min oscillation with circadian modulation
   */
  public getDopamineUltradianMultiplier(): number {
    const ultradian = 1 + 0.25 * Math.sin(2 * Math.PI * this.ultradianPhase);
    const circadianMod = this.getDopamineCircadianModulation();
    
    return ultradian * circadianMod;
  }

  private getDopamineCircadianModulation(): number {
    const hour = this.circadianPhase;
    const peakHour = CIRCADIAN_REFERENCE_RANGES.dopamine.circadian_peak;
    const troughHour = CIRCADIAN_REFERENCE_RANGES.dopamine.circadian_trough;
    
    // Cosine wave with peak at noon
    const hourFromPeak = Math.abs(hour - peakHour);
    if (hourFromPeak > 12) {
      // Wrap around 24h
      return 0.8 + 0.2 * Math.cos((hourFromPeak - 12) * (Math.PI / 12));
    } else {
      return 0.8 + 0.2 * Math.cos(hourFromPeak * (Math.PI / 12));
    }
  }

  /**
   * Gets testosterone multiplier
   * Early morning peak (gender specific)
   * Males: 5-7 AM peak
   * Females: More subtle, ~20% lower amplitude
   */
  public getTestosteroneMultiplier(): number {
    const hour = this.currentTime.getHours();
    
    const peakTime = CIRCADIAN_REFERENCE_RANGES.testosterone.peak_time;
    let peakValue = CIRCADIAN_REFERENCE_RANGES.testosterone.peak_value;
    
    if (this.gender === 'female') {
      peakValue *= 0.8; // ~20% lower amplitude in women
    }
    
    const hoursFromPeak = Math.abs(hour - peakTime);
    const peakWidth = 4;
    const testosterone = peakValue * Math.exp(-Math.pow(hoursFromPeak, 2) / (2 * Math.pow(peakWidth, 2)));
    
    return Math.max(0.7, Math.min(1.3, testosterone));
  }

  // =========================================================================
  // CORE STATE MODULATION
  // =========================================================================

  public modulateAffectiveState(state: CoreState): CoreState {
    let modulated = { ...state };
    
    // Apply multipliers to neurochemicals
    modulated.cortisol = (modulated.cortisol || 0.2) * this.getCortisolMultiplier();
    modulated.dopamine = (modulated.dopamine || 0.4) * this.getDopamineUltradianMultiplier();
    modulated.testosterone = (modulated.testosterone || 0.3) * this.getTestosteroneMultiplier();
    
    // Apply direct state effects
    modulated.melatonin = this.getMelatoninLevel();
    modulated.sleep_debt = this.sleep_debt;
    
    // Modulate emotions based on circadian phase
    modulated = this.modulateEmotionsByCircadianPhase(modulated);
    
    return modulated;
  }
  
  private modulateEmotionsByCircadianPhase(
    state: CoreState
  ): CoreState {
      const hour = this.circadianPhase;
      const modulated: CoreState = { ...state };

      const updateEmotion = (label: EmotionLabel, change: number) => {
          const baseIntensity = (modulated as any)[label] as number || 0;
          (modulated as any)[label] = Math.max(0, Math.min(1, baseIntensity + change));
      };
  
      if (hour >= 6 && hour < 12) { // Morning
          updateEmotion('felicita', 0.1);
          updateEmotion('anxiety', -0.05);
      } else if (hour >= 22 || hour < 4) { // Night
          updateEmotion('tristezza', 0.15);
          updateEmotion('anxiety', 0.1);
      }
  
      return modulated;
  }
  

  // =========================================================================
  // SETTERS & GETTERS
  // =========================================================================

  public setMenstrualCycle(phase: CyclePhase, day: number): void {
    this.cyclePhase = phase;
    this.menstrualCycleDay = day;
  }

  public setStressLevel(level: number): void {
    this.stress_level = Math.max(0, Math.min(1, level));
  }
  
  public getCurrentHour(): number {
    return this.circadianPhase;
  }
  
  public getSleepDebt(): number {
    return this.sleep_debt;
  }
  
  // Serialize/deserialize for state persistence
  public serialize(): any {
    return {
      currentTime: this.currentTime.toISOString(),
      sleepDebt: this.sleep_debt,
      stressLevel: this.stress_level,
      // Add other important state variables
    };
  }
  
  public deserialize(data: any): void {
    if (data.currentTime) this.currentTime = new Date(data.currentTime);
    if (data.sleepDebt) this.sleep_debt = data.sleepDebt;
    if (data.stressLevel) this.stress_level = data.stressLevel;
    // ...
  }
}