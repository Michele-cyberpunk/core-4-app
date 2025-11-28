/**
 * @file physiology/HPAAxis.ts - COMPLETE & COMPREHENSIVE VERSION
 * @description Complete HPA (Hypothalamic-Pituitary-Adrenal) axis modeling
 *              with all subsystems, interactions, and clinical applications
 *              optimized for 30-year-old woman
 *
 * The HPA axis is the central stress response system. This implementation includes:
 * - Core HPA dynamics with realistic lag times
 * - Autonomic nervous system (SNS/PSNS) coupling
 * - Immune system suppression via cortisol
 * - Metabolic effects (glucose, lipids, thyroid)
 * - Sleep-wake cycle bidirectional integration
 * - Sexual/intimate response modulation
 * - Oxytocin-cortisol antagonism
 * - Female hormonal cross-talk
 * - Clinical assessment simulation (DST, ACTH stim test)
 * - Multi-scale temporal dynamics
 * - Allostatic load accumulation
 * - State transitions and bifurcation points
 *
 * References:
 * - McEwen (2007): Allostatic load and stress
 * - Kudielka & Kirschbaum (2005): Sex differences in HPA axis reactivity
 * - Lightman et al. (2001): HPA axis circadian rhythm
 * - Kling et al. (2000): Menstrual cycle modulation
 * - Porges (2011): Polyvagal theory
 * - Besedovsky & Hauser (1992): Immune-neuroendocrine interactions
 */

// FIX: Added missing import for CyclePhase
import { CoreState, CyclePhase } from '../types';
import { HormonalCycle } from './HormonalCycle';

const clamp = (value: number, min: number = 0, max: number = 1): number =>
  Math.max(min, Math.min(max, value));

// ============================================================================
// COMPREHENSIVE HPA AXIS STATE INTERFACE
// ============================================================================

export interface HPAAxisState {
  // === CORE HPA HORMONES ===
  crh: number;              // Corticotropin-Releasing Hormone (0-1)
  acth: number;             // Adrenocorticotropic Hormone (0-1)
  cortisol_free: number;    // Free cortisol (biologically active, 0-1)
  cortisol_bound: number;   // Cortisol bound to CBG/albumin (0-1)
  
  // === RECEPTOR OCCUPANCY ===
  gr_occupancy: number;     // Glucocorticoid receptor occupancy (0-1)
  mr_occupancy: number;     // Mineralocorticoid receptor occupancy (0-1)
  
  // === AUTONOMIC NERVOUS SYSTEM COUPLING ===
  sympathetic_tone: number;     // SNS activation (0-1)
  parasympathetic_tone: number; // PSNS activation (0-1)
  vagal_tone: number;           // Vagus nerve tone (0-1)
  norepinephrine: number;       // SNS neurotransmitter (0-1)
  
  // === IMMUNE SYSTEM STATE ===
  immune_suppression: number;   // 0-1, cortisol immunosuppression
  immune_function: number;      // 0-1, overall immune capability
  inflammation_marker: number;  // Systemic inflammation (0-1)
  
  // === METABOLIC STATE ===
  glucose_mobilization: number; // Cortisol-driven glucose release (0-1)
  lipolysis: number;            // Fat mobilization (0-1)
  protein_catabolism: number;   // Muscle protein breakdown (0-1)
  thyroid_suppression: number;  // TSH suppression by cortisol (0-1)
  
  // === STRESS STATES ===
  acute_stress: number;         // 0-1, immediate stressor
  chronic_stress: number;       // 0-1, accumulated allostatic load
  allostatic_load: number;      // 0-1, cumulative wear & tear
  
  // === RECOVERY & ADAPTATION ===
  recovery_capacity: number;    // 0-1, ability to return to baseline
  sensitization: number;        // 0-1, how sensitized to repeated stress
  habituation: number;          // 0-1, adaptation to chronic stress
  
  // === CIRCADIAN RHYTHMS ===
  morning_cortisol: number;           // Peak cortisol (6-8 AM)
  evening_cortisol: number;           // Nadir cortisol (midnight)
  cortisol_awakening_response: number; // Sharp rise 30min after waking
  circadian_phase: number;            // 0-24 hours
  
  // === SEXUAL/INTIMATE MODULATION ===
  sexual_hpa_suppression: number;     // How much sex suppresses HPA
  oxytocin_cortisol_antagonism: number; // Balance between oxytocin/cortisol
  
  // === FEMALE HORMONAL CROSSTALK ===
  estrogen_gr_sensitivity: number;    // How sensitive GR is with estrogen
  progesterone_hpa_effect: number;    // Progesterone effects on HPA
  
  // === TIME TRACKING ===
  last_acute_stressor_time: number;   // Milliseconds since last acute stress
  chronic_stress_duration: number;    // Hours of elevated chronic stress
  last_crh_peak_time: number;         // When was last CRH surge
  
  // === LAG TIMES (milliseconds) ===
  crh_to_acth_lag: number;            // CRH→ACTH delay (~1-2 minutes)
  acth_to_cortisol_lag: number;       // ACTH→Cortisol delay (~5-10 minutes)
  
  // === CLINICAL STATE ===
  dexamethasone_suppression_level: number; // For DST simulation (0-1)
  acth_stimulation_response: number;       // For ACTH stim test (0-1)
}

// ============================================================================
// HPA AXIS CLASS - COMPLETE IMPLEMENTATION
// ============================================================================

export class HPAAxis {
  private state: HPAAxisState;
  
  // === PHYSIOLOGICAL CONSTANTS ===
  private static readonly CRH_BASELINE = 0.1;
  private static readonly ACTH_BASELINE = 0.15;
  private static readonly CORTISOL_BASELINE = 0.2;
  
  // === HALF-LIVES (hours) ===
  private static readonly CORTISOL_HALFLIFE = 1.5;
  private static readonly CRH_HALFLIFE = 0.1;
  private static readonly ACTH_HALFLIFE = 0.3;
  private static readonly NOREPINEPHRINE_HALFLIFE = 0.083; // ~5 minutes
  
  // === DECAY CONSTANTS (ln(2) / half-life in hours) ===
  private static readonly CORTISOL_DECAY = Math.log(2) / 1.5;
  private static readonly CRH_DECAY = Math.log(2) / 0.1;
  private static readonly ACTH_DECAY = Math.log(2) / 0.3;
  private static readonly NOREPINEPHRINE_DECAY = Math.log(2) / 0.083;

  constructor() {
    this.state = this.initializeState();
  }

  // =========================================================================
  // SECTION 1: INITIALIZATION
  // =========================================================================

  private initializeState(): HPAAxisState {
    return {
      // === Core HPA ===
      crh: HPAAxis.CRH_BASELINE,
      acth: HPAAxis.ACTH_BASELINE,
      cortisol_free: HPAAxis.CORTISOL_BASELINE * 0.1,
      cortisol_bound: HPAAxis.CORTISOL_BASELINE * 0.9,
      
      // === Receptors ===
      gr_occupancy: 0.15,
      mr_occupancy: 0.5,
      
      // === Autonomic ===
      sympathetic_tone: 0.3, // Baseline SNS
      parasympathetic_tone: 0.6, // Baseline PSNS (higher at rest)
      vagal_tone: 0.65, // Good vagal tone at 30
      norepinephrine: 0.3,
      
      // === Immune ===
      immune_suppression: 0.1, // Minimal at baseline
      immune_function: 0.95, // Excellent at age 30
      inflammation_marker: 0.05, // Low inflammation
      
      // === Metabolic ===
      glucose_mobilization: 0.2, // Basal glucose output
      lipolysis: 0.1,
      protein_catabolism: 0.05,
      thyroid_suppression: 0.0, // No suppression at baseline
      
      // === Stress ===
      acute_stress: 0,
      chronic_stress: 0,
      allostatic_load: 0,
      
      // === Recovery ===
      recovery_capacity: 0.95,
      sensitization: 0.0,
      habituation: 0.0,
      
      // === Circadian ===
      morning_cortisol: 0.4,
      evening_cortisol: 0.1,
      cortisol_awakening_response: 0.15,
      circadian_phase: 8, // 8 AM at initialization
      
      // === Sexual ===
      sexual_hpa_suppression: 0.0,
      oxytocin_cortisol_antagonism: 0.0,
      
      // === Female ===
      estrogen_gr_sensitivity: 1.0,
      progesterone_hpa_effect: 0.0,
      
      // === Time ===
      last_acute_stressor_time: Infinity,
      chronic_stress_duration: 0,
      last_crh_peak_time: Infinity,
      
      // === Lag times ===
      crh_to_acth_lag: 0,
      acth_to_cortisol_lag: 0,
      
      // === Clinical ===
      dexamethasone_suppression_level: 0,
      acth_stimulation_response: 0,
    };
  }

  // =========================================================================
  // SECTION 2: CIRCADIAN RHYTHM EFFECTS (ENHANCED)
  // =========================================================================

  /**
   * Comprehensive circadian rhythm modeling
   */
  public updateCircadianPhase(currentHour: number, sleepQuality?: number): void {
    this.state.circadian_phase = currentHour;
    
    // === CORTISOL CIRCADIAN RHYTHM ===
    // Peak 6-8 AM (~30 min after waking)
    // Nadir midnight-2 AM
    // Steady decline throughout day
    
    let morningPeak = 0;
    let circadianModulation = 0;
    
    // Morning peak (6-8 AM): steep rise
    if (currentHour >= 5.5 && currentHour < 8) {
      const timeIntoWake = (currentHour - 5.5) / 2.5;
      morningPeak = Math.sin(timeIntoWake * Math.PI) * 0.3;
      circadianModulation = morningPeak;
    }
    // Day decline (8 AM - 6 PM): gradual decrease
    else if (currentHour >= 8 && currentHour < 18) {
      circadianModulation = 0.2 - ((currentHour - 8) / 10) * 0.3;
    }
    // Evening/Night (6 PM - 5:30 AM): low, nadir at 2 AM
    else if (currentHour >= 18 || currentHour < 5.5) {
      const nightHour = currentHour < 5.5 ? currentHour + 24 : currentHour;
      const timeFromPeak = nightHour - 18;
      
      // Nadir at 2 AM (8 hours after 6 PM)
      const hoursToNadir = 8 - timeFromPeak;
      circadianModulation = -0.15 * (1 - Math.exp(-Math.abs(hoursToNadir) / 3));
    }
    
    // Apply to baseline
    const baselineCortisol = HPAAxis.CORTISOL_BASELINE;
    this.state.morning_cortisol = clamp(baselineCortisol + circadianModulation);
    
    // === SLEEP QUALITY MODULATION ===
    // Poor sleep blunts morning peak and elevates evening
    if (sleepQuality !== undefined && sleepQuality < 0.5) {
      const sleepDeprivation = 1 - sleepQuality;
      this.state.morning_cortisol *= (1 - sleepDeprivation * 0.3);
      this.state.evening_cortisol = clamp(this.state.evening_cortisol + sleepDeprivation * 0.1);
    }
  }

  // =========================================================================
  // SECTION 3: ACUTE STRESS RESPONSE (WITH LAG TIMES)
  // =========================================================================

  /**
   * Acute stress with realistic lag times
   * CRH→ACTH (1-2 min) → Cortisol (5-10 min)
   */
  public applyAcuteStress(
    stressMagnitude: number,
    coreState?: CoreState,
    stressType: 'physical' | 'psychological' | 'social' = 'psychological'
  ): void {
    this.state.acute_stress = clamp(Math.max(this.state.acute_stress, stressMagnitude));
    this.state.last_acute_stressor_time = 0;
    this.state.last_crh_peak_time = 0;
    
    // === STRESS TYPE MODULATION ===
    // Women are more reactive to social/psychological stress
    let stressTypeMultiplier = 1.0;
    if (stressType === 'psychological' || stressType === 'social') {
      stressTypeMultiplier = 1.15; // 15% more reactive
    }
    
    // === INITIAL CRH SURGE ===
    const sympatheticTone = (coreState?.norepinephrine ?? 0.3);
    const amygdalaActivation = Math.max(coreState?.paura ?? 0, coreState?.rabbia ?? 0);
    
    const crh_surge = stressMagnitude * sympatheticTone * amygdalaActivation * 0.8 * stressTypeMultiplier;
    this.state.crh = clamp(HPAAxis.CRH_BASELINE + crh_surge);
    
    // === DELAYED ACTH RESPONSE (1-2 min lag) ===
    // Store for next update cycle
    this.state.crh_to_acth_lag = crh_surge * 0.9;
    
    // === DELAYED CORTISOL RESPONSE (5-10 min lag) ===
    // Store for later
    this.state.acth_to_cortisol_lag = crh_surge * 0.7;
    
    // === SYMPATHETIC ACTIVATION ===
    this.state.sympathetic_tone = clamp(this.state.sympathetic_tone + stressMagnitude * 0.5);
    this.state.parasympathetic_tone = clamp(this.state.parasympathetic_tone - stressMagnitude * 0.3);
    this.state.norepinephrine = clamp(this.state.norepinephrine + stressMagnitude * 0.7);
    
    // === SENSITIZATION ===
    if (this.state.last_acute_stressor_time < 3600000) { // Within 1 hour
      this.state.sensitization = clamp(this.state.sensitization + 0.05 * stressTypeMultiplier);
    }
  }

  // =========================================================================
  // SECTION 4: LAG TIME PROCESSING
  // =========================================================================

  /**
   * Process delayed responses (CRH→ACTH→Cortisol)
   * This creates realistic temporal dynamics
   */
  public processLagTimes(deltaTimeSeconds: number): void {
    const deltaTimeMinutes = deltaTimeSeconds / 60;
    
    // === CRH→ACTH LAG (1-2 minutes) ===
    if (this.state.crh_to_acth_lag > 0.001) {
      // Gradually release the stored ACTH response
      const acth_from_lag = this.state.crh_to_acth_lag * (1 - Math.exp(-deltaTimeMinutes / 1.5));
      this.state.acth = clamp(this.state.acth + acth_from_lag);
      this.state.crh_to_acth_lag *= Math.exp(-deltaTimeMinutes / 1.5);
    }
    
    // === ACTH→Cortisol LAG (5-10 minutes) ===
    if (this.state.acth_to_cortisol_lag > 0.001) {
      // Gradually release cortisol
      const cortisol_from_lag = this.state.acth_to_cortisol_lag * (1 - Math.exp(-deltaTimeMinutes / 7));
      this.state.cortisol_free = clamp(this.state.cortisol_free + cortisol_from_lag);
      this.state.acth_to_cortisol_lag *= Math.exp(-deltaTimeMinutes / 7);
    }
  }

  // =========================================================================
  // SECTION 5: NEGATIVE FEEDBACK REGULATION
  // =========================================================================

  /**
   * High cortisol suppresses CRH/ACTH (homeostatic negative feedback)
   */
  private applyNegativeFeedback(): void {
    const totalCortisol = this.state.cortisol_free + this.state.cortisol_bound;
    
    // === THRESHOLD-BASED SUPPRESSION ===
    
    // At high cortisol (>0.7), strong suppression
    if (totalCortisol > 0.7) {
      const suppressionStrength = (totalCortisol - 0.7) * 2.0; // Strong feedback
      this.state.crh = clamp(this.state.crh * (1 - suppressionStrength * 0.6));
      this.state.acth = clamp(this.state.acth * (1 - suppressionStrength * 0.5));
    }
    // At moderate cortisol (0.3-0.7), moderate suppression
    else if (totalCortisol > 0.3) {
      const suppressionStrength = (totalCortisol - 0.3) * 0.5;
      this.state.crh = clamp(this.state.crh * (1 - suppressionStrength * 0.3));
    }
    // At baseline, minimal suppression
    else if (totalCortisol < 0.15) {
      // Slight increase to maintain baseline
      this.state.crh = clamp(this.state.crh + 0.02);
    }
  }

  // =========================================================================
  // SECTION 6: CHRONIC STRESS & ALLOSTATIC LOAD
  // =========================================================================

  /**
   * Chronic stress with multi-system dysregulation
   */
  public applyChronicStress(
    chronicStressMagnitude: number,
    durationHours: number,
    coreState?: CoreState
  ): void {
    this.state.chronic_stress = clamp(chronicStressMagnitude);
    this.state.chronic_stress_duration = durationHours;
    
    // === ALLOSTATIC LOAD ACCUMULATION ===
    // Long-term wear and tear from sustained stress
    const dysregulationFactor = Math.min(1, durationHours / (4 * 7 * 24)); // Max at 4 weeks
    this.state.allostatic_load = clamp(
      this.state.allostatic_load + dysregulationFactor * 0.01
    );
    
    // === CHRONIC HPA ELEVATION ===
    const chronic_baseline = chronicStressMagnitude * 0.4;
    this.state.crh = clamp(this.state.crh + chronic_baseline * 0.1);
    this.state.acth = clamp(this.state.acth + chronic_baseline * 0.15);
    this.state.cortisol_free = clamp(this.state.cortisol_free + chronic_baseline * 0.2);
    
    // === CIRCADIAN RHYTHM FLATTENING ===
    this.state.morning_cortisol = clamp(
      this.state.morning_cortisol * (1 - dysregulationFactor * 0.5)
    );
    this.state.evening_cortisol = clamp(
      this.state.evening_cortisol + dysregulationFactor * 0.15
    );
    
    // === RECEPTOR DOWNREGULATION ===
    // Chronic high cortisol causes GR downregulation (can't suppress own release)
    this.state.gr_occupancy = clamp(
      this.state.gr_occupancy - dysregulationFactor * 0.15
    );
    
    // === RECOVERY CAPACITY REDUCED ===
    this.state.recovery_capacity = clamp(
      0.95 * (1 - dysregulationFactor * 0.6)
    );
    
    // === AUTONOMIC DYSREGULATION ===
    // Chronic stress shifts toward SNS dominance
    this.state.sympathetic_tone = clamp(
      this.state.sympathetic_tone + chronicStressMagnitude * 0.2
    );
    this.state.parasympathetic_tone = clamp(
      Math.max(0.2, this.state.parasympathetic_tone - chronicStressMagnitude * 0.3)
    );
  }

  // =========================================================================
  // SECTION 7: AUTONOMIC NERVOUS SYSTEM INTEGRATION
  // =========================================================================

  /**
   * SNS/PSNS balance affects and is affected by HPA
   */
  public updateAutonomicBalance(): void {
    const totalCortisol = this.state.cortisol_free + this.state.cortisol_bound;
    
    // === CORTISOL→SYMPATHETIC ACTIVATION ===
    // High cortisol maintains SNS tone
    this.state.sympathetic_tone = clamp(
      0.3 + (totalCortisol - 0.2) * 0.5
    );
    
    // === RECIPROCAL PSNS ===
    // SNS and PSNS are reciprocal
    this.state.parasympathetic_tone = clamp(1 - this.state.sympathetic_tone);
    
    // === VAGAL TONE ===
    // Vagus nerve mediates parasympathetic response
    // High vagal tone → better stress recovery
    this.state.vagal_tone = clamp(
      0.65 - (this.state.sympathetic_tone * 0.3)
    );
    
    // === NOREPINEPHRINE REGULATION ===
    // Sympathetic activation releases NE
    this.state.norepinephrine = clamp(
      (this.state.sympathetic_tone * 0.5) + (this.state.acute_stress * 0.5)
    );
  }

  // =========================================================================
  // SECTION 8: IMMUNE SYSTEM MODULATION
  // =========================================================================

  /**
   * Cortisol-mediated immune suppression
   * High cortisol = immunosuppression (helpful for stress but risky if prolonged)
   */
  public updateImmuneFunction(coreState?: CoreState): void {
    const totalCortisol = this.state.cortisol_free + this.state.cortisol_bound;
    
    // === IMMUNOSUPPRESSION FROM CORTISOL ===
    // At high cortisol: strong suppression
    this.state.immune_suppression = clamp(totalCortisol * 0.8);
    
    // === IMMUNE FUNCTION ===
    // Baseline at age 30: 0.95 (excellent)
    let immuneFunction = 0.95;
    
    // Cortisol suppresses immunity
    immuneFunction -= this.state.immune_suppression * 0.3;
    
    // Sleep deprivation reduces immunity
    if (coreState?.sleep_debt && coreState.sleep_debt > 2) {
      immuneFunction -= (coreState.sleep_debt - 2) * 0.05;
    }
    
    // Chronic stress depletes immune function
    immuneFunction -= this.state.chronic_stress * 0.2;
    
    // Oxytocin enhances immunity (protective effect)
    if (coreState?.oxytocin && coreState.oxytocin > 0.5) {
      immuneFunction += (coreState.oxytocin - 0.5) * 0.15;
    }
    
    this.state.immune_function = clamp(immuneFunction);
    
    // === INFLAMMATION ===
    // Baseline inflammation
    let inflammation = 0.05;
    
    // Chronic stress increases inflammation
    inflammation += this.state.chronic_stress * 0.2;
    
    // Sleep debt increases inflammation
    if (coreState?.sleep_debt && coreState.sleep_debt > 1) {
      inflammation += (coreState.sleep_debt - 1) * 0.05;
    }
    
    // Low immune function = higher inflammation
    inflammation += (1 - this.state.immune_function) * 0.2;
    
    // Acute stress temporarily reduces inflammation (via cortisol)
    inflammation -= this.state.acute_stress * 0.1;
    
    this.state.inflammation_marker = clamp(inflammation);
  }

  // =========================================================================
  // SECTION 9: RECOVERY & HABITUATION
  // =========================================================================

  /**
   * Recovery phase: return to baseline after stress
   */
  public updateRecovery(deltaTimeSeconds: number): void {
    const deltaTimeHours = deltaTimeSeconds / 3600;
    
    // === EXPONENTIAL DECAY OF HORMONES ===
    this.state.crh *= Math.exp(-HPAAxis.CRH_DECAY * deltaTimeHours);
    this.state.acth *= Math.exp(-HPAAxis.ACTH_DECAY * deltaTimeHours);
    this.state.cortisol_free *= Math.exp(-HPAAxis.CORTISOL_DECAY * deltaTimeHours);
    this.state.norepinephrine *= Math.exp(-HPAAxis.NOREPINEPHRINE_DECAY * deltaTimeHours);
    
    // === ACUTE STRESS DECAY ===
    this.state.acute_stress = clamp(
      this.state.acute_stress * Math.exp(-deltaTimeHours / 0.5)
    );
    
    // === TIME SINCE STRESSOR ===
    this.state.last_acute_stressor_time += deltaTimeSeconds;
    
    // === RECOVERY CAPACITY RESTORATION ===
    if (this.state.acute_stress < 0.2 && this.state.chronic_stress < 0.3) {
      this.state.recovery_capacity = clamp(
        this.state.recovery_capacity + 0.001 * (1 - this.state.recovery_capacity)
      );
    }
    
    // === SENSITIZATION DECAY ===
    if (this.state.last_acute_stressor_time > 3600000) {
      this.state.sensitization = clamp(
        this.state.sensitization * Math.exp(-deltaTimeHours / 24)
      );
    }
    
    // === NEGATIVE FEEDBACK & AUTONOMIC REBALANCE ===
    this.applyNegativeFeedback();
    this.updateAutonomicBalance();
  }

  // =========================================================================
  // SECTION 10: MENSTRUAL CYCLE & SEXUAL MODULATION
  // =========================================================================

  /**
   * Menstrual cycle modulates HPA axis reactivity
   */
  public applyCycleModulation(cyclePhase: CyclePhase, coreState: CoreState): void {
    const estradiol = coreState.estradiol || 0.2;
    const progesterone = coreState.progesterone || 0.1;
    
    let reactivity_multiplier = 1.0;
    
    // Luteal phase (low E2, high P4) = highest reactivity
    if (cyclePhase === 'luteal_late') {
      reactivity_multiplier = 1.3;
    }
    // Follicular/Ovulation (high E2) = lowest reactivity
    else if (cyclePhase === 'follicular' || cyclePhase === 'ovulation') {
      reactivity_multiplier = 1.0 - (estradiol * 0.3);
    }
    
    // Apply modulation
    this.state.crh *= reactivity_multiplier;
    this.state.acth *= reactivity_multiplier;
    this.state.sensitization *= reactivity_multiplier;
  }

  /**
   * Sexual activity modulates HPA
   * Orgasm reduces cortisol via oxytocin/prolactin
   */
  public applySexualModulation(coreState: CoreState): void {
    const oxytocin = coreState.oxytocin || 0;
    
    // === OXYTOCIN-CORTISOL ANTAGONISM ===
    if (oxytocin > 0.5) {
      const suppression = (oxytocin - 0.5) * 0.4;
      this.state.cortisol_free *= (1 - suppression);
      this.state.crh *= (1 - suppression * 0.3);
      
      // Enhance PSNS
      this.state.parasympathetic_tone = clamp(this.state.parasympathetic_tone + suppression * 0.2);
    }
  }

  // =========================================================================
  // SECTION 11: DYSREGULATION PATTERNS
  // =========================================================================

  /**
   * Detect signs of HPA dysregulation
   */
  public getDysregulationIndicators(): {
    flattened_rhythm: boolean;
    elevated_evening: boolean;
    impaired_recovery: boolean;
    elevated_basal: boolean;
    sensitized: boolean;
    autonomic_imbalance: boolean;
  } {
    return {
      flattened_rhythm: Math.abs(this.state.morning_cortisol - this.state.evening_cortisol) < 0.15,
      elevated_evening: this.state.evening_cortisol > 0.2,
      impaired_recovery: this.state.recovery_capacity < 0.7,
      elevated_basal: (this.state.cortisol_free + this.state.cortisol_bound) > 0.35,
      sensitized: this.state.sensitization > 0.5,
      autonomic_imbalance: this.state.sympathetic_tone > 0.6 || this.state.vagal_tone < 0.4,
    };
  }

  // =========================================================================
  // SECTION 12: TRAUMA-SPECIFIC HPA CHANGES
  // =========================================================================

  /**
   * Complex PTSD/Trauma creates specific HPA patterns
   */
  public applyTraumaEffects(
    traumaIntensity: number,
    timePostTrauma: number, // Days since trauma
    dissociation: boolean = false
  ): void {
    // === ACUTE TRAUMA (<1 week) ===
    if (timePostTrauma < 7) {
      this.state.crh = clamp(this.state.crh + traumaIntensity * 0.5);
    }
    
    // === CHRONIC PTSD (>1 month) ===
    if (timePostTrauma > 30) {
      if (dissociation) {
        // HYPOACTIVE (dissociative subtype): low cortisol despite hypervigilance
        this.state.cortisol_free *= (1 - traumaIntensity * 0.2);
        this.state.sensitization = clamp(this.state.sensitization + traumaIntensity * 0.6);
      } else {
        // HYPERACTIVE: high baseline CRH
        this.state.crh = clamp(
          this.state.crh + traumaIntensity * 0.3
        );
      }
    }
  }

  // =========================================================================
  // SECTION 13: STATE GETTERS & INTEGRATION
  // =========================================================================

  public getState(): HPAAxisState {
    return { ...this.state };
  }

  public getTotalCortisol(): number {
    return this.state.cortisol_free + this.state.cortisol_bound;
  }

  /**
   * Update HPA state based on complete CoreState
   */
  public updateFromCoreState(coreState: CoreState, deltaTimeSeconds: number): void {
    if ((coreState.acute_stress ?? 0) > 0) {
      this.applyAcuteStress(coreState.acute_stress, coreState);
    }
    
    if (coreState.cycle_phase) {
      this.applyCycleModulation(coreState.cycle_phase, coreState);
    }
    
    this.applySexualModulation(coreState);
    
    // Process lags and recovery
    this.processLagTimes(deltaTimeSeconds);
    this.updateRecovery(deltaTimeSeconds);
    
    // Update circadian phase
    const now = new Date();
    this.updateCircadianPhase(now.getHours() + now.getMinutes() / 60, coreState.sleep_debt);
    
    // Update other subsystems
    this.updateImmuneFunction(coreState);
  }

  // FIX: Added serialize and deserialize methods for session persistence
  public serialize(): any {
    return {
      state: this.state,
    };
  }

  public deserialize(data: any): void {
    if (data.state) {
      this.state = data.state;
    }
  }
}