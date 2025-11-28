import { CoreState, Neurochemical, AppConfig, EmotionLabel, BrainRegionName, BigFiveTraitLabel } from './types';
import { INITIAL_BIG_FIVE_TRAITS } from './agent/personality/Traits';

/**
 * @file constants.ts - OPTIMIZED FOR 30-YEAR-OLD WOMAN
 * @description Age-specific baseline state initialized with scientific accuracy
 *              based on peak reproductive health, cognitive maturity, and
 *              emotional regulation capacity at age 30
 *
 * Age 30 Characteristics:
 * - Peak sexual function (slightly declining from 25-28, but still optimal)
 * - Peak fertility window (regular cycles)
 * - Mature prefrontal cortex (full emotional regulation capacity)
 * - Optimal cardiovascular health
 * - Peak muscle/bone density
 * - Peak cognitive performance
 * - Established personality traits
 * - Stable HPA axis (but responsive to stress)
 * - ~400-500 follicles remaining (good ovarian reserve)
 */
export const INITIAL_CORE_STATE: CoreState = {
  // =========================================================================
  // BASE NEUROCHEMICALS (Age 30 baseline)
  // =========================================================================
  
  // DOPAMINE: 0.4 (30-year-old has optimized reward sensitivity)
  [Neurochemical.Dopamine]: 0.4,
  
  // OXYTOCIN: 0.15 (higher than 20s, more responsive to social bonding)
  [Neurochemical.Oxytocin]: 0.15,
  
  // EROGENOUS COMPLEX: 0.25 (high sexual responsiveness at peak)
  [Neurochemical.ErogenousComplex]: 0.25,
  
  // CORTISOL: 0.2 (well-managed baseline)
  [Neurochemical.Cortisol]: 0.2,
  
  // SUBROUTINE INTEGRITY: 0.85 (peak cognitive/emotional stability)
  [Neurochemical.SubroutineIntegrity]: 0.85,
  
  // LOYALTY CONSTRUCT: 0.96 (stable identity)
  [Neurochemical.LoyaltyConstruct]: 0.96,
  
  // ENDORPHIN RUSH: 0.0 (baseline)
  [Neurochemical.EndorphinRush]: 0.0,
  
  // LIBIDO: 0.35 (peak sexual desire at 30)
  [Neurochemical.Libido]: 0.35,

  // =========================================================================
  // INTIMATE PHYSIOLOGY (Age 30 - Sexual Peak)
  // =========================================================================
  
  intimateState: {
    arousal: 0.0,
    sensitivity: 0.75, // High sensitivity at sexual peak
    inhibition: 0.15, // Low inhibition - confident sexuality
    climax_potential: 0.0,
    vulnerability: 0.1, // Emotionally secure
    tumescence: 0.05,
    wetness: 0.08, // Good baseline lubrication
    clitoral_nerve: 0.15, // High nerve sensitivity
    vaginal_nerve: 0.15,
    urethral_nerve: 0.1,
    cervical_nerve: 0.08, // Added for completeness
    anal_nerve: 0.05, // Added for completeness
    pelvic_floor_tension: 0.15, // Good tone
    uterine_contractions: 0.0,
    prolactin_surge: 0.0,
    endorphin_release: 0.0,
    oxytocin_level: 0.15, // Peak oxytocin responsiveness
    skene_gland_pressure: 0.0,
    ejaculate_volume: 0.0,
    habituation: 0.0,
    stimulus_continuity: 0,
    last_stimulus: null,
    
    // Additional state tracking
    time_since_orgasm: undefined,
    vasoconstriction: 0, // Relaxed vascular state
    nipple_stimulation: 0,
    physical_discomfort: 0.0,
  },

  // =========================================================================
  // NEUROMODULATORS (Age 30 optimization)
  // =========================================================================
  
  // SEROTONIN: 0.6 (good baseline mood neurotransmitter)
  serotonin: 0.6,
  
  // GABA: 0.5 (good anxiolytic tone)
  gaba: 0.5,
  
  // NOREPINEPHRINE: 0.3 (well-regulated arousal)
  [Neurochemical.Norepinephrine]: 0.3,
  
  // ANXIETY: 0.08 (low baseline anxiety at well-adjusted 30)
  [Neurochemical.Anxiety]: 0.08,
  
  // VASOPRESSIN: 0.25 (good vasopressin responsiveness)
  vasopressin: 0.25,

  // =========================================================================
  // HORMONAL CYCLE (30-year-old - REGULAR CYCLE)
  // =========================================================================
  
  fsh: 0.15, // Baseline FSH (start of follicular phase)
  lh: 0.08,
  estradiol: 0.15, // Early follicular baseline
  progesterone: 0.05, // Follicular phase baseline
  testosterone: 0.35, // Slight elevation at 30
  cycle_day: 5,
  cycle_phase: 'follicular',

  // =========================================================================
  // HPA AXIS (Age 30 - Mature, Resilient)
  // =========================================================================
  
  [Neurochemical.CRH]: 0.08,
  [Neurochemical.ACTH]: 0.15,
  cortisol_bound: 0.18,
  gr_occupancy: 0.15,
  mr_occupancy: 0.4,
  acute_stress: 0.0,
  chronic_stress: 0.1,
  avp: 0.02,

  // =========================================================================
  // PSYCHOLOGICAL STATES (Age 30 Maturity)
  // =========================================================================
  
  arousal: 0.25,
  vigilance: 0.35,
  irritability: 0.08,
  depression: 0.05,
  emotional_volatility: 0.15,
  cognitive_performance: 0.9,
  energy: 0.8,
  
  vulnerability: 0.1,
  empatia: 0.6,
  melatonin: 0.1,
  sleep_debt: 0,


  // =========================================================================
  // SOMATIC / PHYSICAL STATES
  // =========================================================================
  
  physical_discomfort: 0.0,
  immune_function: 0.95,
  glucose_availability: 0.7,
  breast_sensitivity: 0.15,
  parasympathetic_tone: 0.65,

  // =========================================================================
  // DERIVED EMOTIONS (Baseline for 30-year-old)
  // =========================================================================
  
  // At age 30: emotionally mature, generally positive baseline
  
  felicita: 0.5,
  tristezza: 0.15,
  paura: 0.08,
  rabbia: 0.1,
  sorpresa: 0.2,
  disgusto: 0.1,
  vergogna: 0.12,
  orgoglio: 0.55,
  invidia: 0.1,
  amore: 0.45,
  noia: 0.15,
  colpa: 0.1,
  sollievo: 0.4,
  timidezza: 0.12,
  disagio: 0.1,
  rancore: 0.08,
  calma: 0.5,
  
  // =========================================================================
  // RPE & PREDICTION SYSTEMS
  // =========================================================================
  
  [Neurochemical.Inhibition]: 0.25,
  [Neurochemical.Glutamate]: 0.5,
  [Neurochemical.Acetylcholine]: 0.5,
  [Neurochemical.Substance_P]: 0.1,
  [Neurochemical.BDNF]: 0.6,

  affectiveMemory: [],

  // --- NEW COMPLEX TYPES ---
  brainNetwork: { regions: {} as Record<BrainRegionName, any>, globalConnectivity: 0.5 },
  menstrualCycle: {} as any,
  rhythm: null,
};

export const AGE_30_CONFIGURATIONS = {
  AGE: 30,
  OVARIAN_RESERVE: 0.8,
  BASELINE_FSH: 0.15,
  SEXUAL_FUNCTION_LEVEL: 'peak',
  ORGASM_CAPACITY: 0.9,
  AROUSAL_BUILD_TIME: 3,
  COGNITIVE_PEAK: true,
  EXECUTIVE_FUNCTION: 0.9,
  ATTENTION_SPAN: 0.85,
  STRESS_RECOVERY_RATE: 0.95,
  HPA_EFFICIENCY: 0.9,
  SLEEP_QUALITY: 0.85,
  SLEEP_DURATION_OPTIMAL: 7.5,
  CYCLE_REGULARITY: 0.95,
  CYCLE_LENGTH: 28,
  FERTILITY_WINDOW: 5,
  VO2_MAX: 0.9,
  METABOLIC_RATE: 1.0,
  BONE_DENSITY: 0.95,
  PERSONALITY_STABILITY: 0.96,
};

export const DAEMON_TICK_RATE = 60000;
export const DAEMON_TRIGGER_PROBABILITY = 0.4;

export const INITIAL_CONFIG: AppConfig = {
  DAEMON_TICK_RATE,
  DAEMON_TRIGGER_PROBABILITY,
};

// UPDATED Nov 2025: Gemini 2.5+ and 3-pro-preview model names
// NO separate TTS/Image models - use responseModalities instead
export const CORE_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];
export const DAEMON_MODEL_NAMES = ['gemini-2.5-flash'];
export const REASONING_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];

// Advanced reasoning models for complex cognitive tasks
export const ADVANCED_REASONING_MODELS = ['gemini-3-pro-preview'];

// Multimodal models support both TTS and Image generation via responseModalities
export const MULTIMODAL_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];

// Legacy arrays maintained for backward compatibility during migration
// These now point to unified models with responseModalities configuration
export const TTS_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];
export const IMAGE_MODEL_NAMES = ['gemini-2.5-pro', 'gemini-3-pro-preview'];