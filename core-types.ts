import { Neurochemical, BrainNetworkState, EmotionLabel, BrainRegionName } from './neuro-types';
import { IntimateState, StimulusType, Stimulus } from './intimate-types';
import { CyclePhase, MenstrualCycleState } from './cycle-types';

export enum MemoryType {
  SENSORY = 'sensory',
  SHORT_TERM = 'short_term',
  LONG_TERM_EPISODIC = 'long_term_episodic',
  LONG_TERM_SEMANTIC = 'long_term_semantic',
  IMPLICIT = 'implicit',
  PROCEDURAL = 'procedural',
  FLASHBULB = 'flashbulb',
  AUTOBIOGRAPHICAL = 'autobiographical',
}

export type EncodingModel = 'spreading_activation' | 'three_phase_emotional' | 'evolutionary' | 'atkinson-shiffrin';

export interface AffectiveMemory {
  id: string;
  timestamp: number;
  stimulus: {
    text?: string;
    image_description?: string;
    metadata?: Record<string, any>;
  };
  coreResponse?: string;
  response: {
    [Neurochemical.Dopamine]: number;
    [Neurochemical.Oxytocin]: number;
    [Neurochemical.Cortisol]: number;
    [Neurochemical.EndorphinRush]: number;
  };
  valence: number; // -1 to 1
  salience: number; // 0 to 1, how emotionally intense it was
  emotionTriggered?: EmotionLabel;
  isTrauma?: boolean;
  similarity?: number;

  // NEW: Expanded memory properties based on user prompt
  type: MemoryType;
  consolidationStatus: 'transient' | 'consolidating' | 'consolidated';
  isRepressed: boolean;
  isSubconscious: boolean;
  encodingModel: EncodingModel;

  pav: {
    pleasure: number;
    arousal: number;
    dominance: number;
  };
  pavScore?: {
    paradox: number;
    action: number;
    vividness: number;
    total: number;
  };
}

export interface CognitiveBiasState {
  ruminazione: number; // 0-1, tendency to ruminate (Nolen-Hoeksema, 1991)
  autoOggettivazione: number; // 0-1, self-objectification (Fredrickson & Roberts, 1997)
  stereotype_threat: number; // 0-1, fear of confirming negative stereotypes (Steele & Aronson, 1995)
  self_fulfilling_prophecy: number; // 0-1
  catastrophizing: number; // 0-1
  all_or_nothing_thinking: number; // 0-1
  emotional_reasoning: number; // 0-1, "if I feel it, it must be true"
  overgeneralization: number; // 0-1
  mind_reading: number; // 0-1, assuming what others think
  personalization: number; // 0-1, taking things personally
}

export type BigFiveTraitLabel = 'Apertura' | 'Coscienziosità' | 'Estroversione' | 'Amicalità' | 'Neuroticismo';

export interface BigFiveTrait {
  label: BigFiveTraitLabel;
  score: number; // 0-1
  facets: Record<string, number>;
  neuralSubstrate?: {
    primaryNeurochemicals: Neurochemical[];
    primaryBrainRegions: BrainRegionName[];
  };
}

export interface PersonalityDevelopmentTrajectory {
  age_period: 'childhood' | 'adolescence' | 'early_adulthood' | 'adulthood' | 'middle_age' | 'old_age';
  expectedTraitChanges: Partial<Record<BigFiveTraitLabel, number>>;
  plasticityIndex: number; // How malleable is personality at this stage
  citation?: string; // e.g., "Costa et al. (2001)"
}

export interface PersonalityState {
  bigFive: Partial<Record<BigFiveTraitLabel, BigFiveTrait>>;
  attachmentStyle: 'sicuro' | 'ansioso' | 'evitante' | 'disorganizzato';
  cognitiveBiases: CognitiveBiasState;
  simulatedAge: number; // in years

  // Developmental trajectory tracking (NEW)
  developmentTrajectory?: PersonalityDevelopmentTrajectory;

  // Neuroplasticity state (NEW)
  neuroplasticityIndex?: number; // 0-1, how responsive to change
  lastUpdateTimestamp?: number;
}

interface NeurochemicalState {
  dopamine: number;
  serotonin: number;
  gaba: number;
  glutamate: number;
  norepinephrine: number;
  acetylcholine: number;
  oxytocin: number;
  vasopressin: number;
  endorphin_rush: number;
  substance_p: number;
  cortisol: number;
  crh: number;
  acth: number;
  bdnf: number;
  erogenous_complex: number;
  subroutine_integrity: number;
  loyalty_construct: number;
  libido: number;
  inhibition: number;
  anxiety: number;
}

export interface BaseCoreStateSnapshot extends NeurochemicalState {
  fsh: number;
  lh: number;
  estradiol: number;
  progesterone: number;
  testosterone: number;
  cycle_day: number;
  cycle_phase: CyclePhase;
  cortisol_bound: number;
  gr_occupancy: number;
  mr_occupancy: number;
  acute_stress: number;
  chronic_stress: number;
  avp: number;
  arousal: number;
  vigilance: number;
  irritability: number;
  depression: number;
  emotional_volatility: number;
  cognitive_performance: number;
  energy: number;
  vulnerability?: number;
  empatia?: number;
  melatonin?: number;
  time_since_orgasm?: number;
  sleep_debt?: number;
  subroutineIntegrity: number;
  estrogen: number;
  physical_discomfort: number;
  immune_function: number;
  glucose_availability: number;
  breast_sensitivity: number;
  parasympathetic_tone: number;
  felicita: number;
  tristezza: number;
  paura: number;
  rabbia: number;
  sorpresa: number;
  disgusto: number;
  vergogna: number;
  orgoglio: number;
  invidia: number;
  amore: number;
  noia: number;
  colpa: number;
  sollievo: number;
  timidezza: number;
  disagio: number;
  rancore: number;
  calma: number;
}

export interface CoreState extends NeurochemicalState {
  // Base Neurochemicals (indexed)
  
  // Intimate Physiology
  intimateState: IntimateState;

  // Brain Network State
  brainNetwork: BrainNetworkState;

  // Hormonal Cycle
  menstrualCycle: MenstrualCycleState;

  // Legacy hormone fields (kept for compatibility)
  fsh: number;
  lh: number;
  estradiol: number;
  progesterone: number;
  testosterone: number;

  // Cycle status
  cycle_day: number;
  cycle_phase: CyclePhase;

  // HPA Axis
  cortisol_bound: number;
  gr_occupancy: number;
  mr_occupancy: number;
  acute_stress: number;
  chronic_stress: number;
  avp: number;

  // Psychological States
  arousal: number;
  vigilance: number;
  irritability: number;
  depression: number;
  emotional_volatility: number;

  // COGNITIVE
  cognitive_performance: number;

  // ENERGY
  energy: number;

  // Additional
  vulnerability?: number;
  empatia?: number;
  melatonin?: number;
  time_since_orgasm?: number;
  sleep_debt?: number;

  // Aliases
  subroutineIntegrity: number;
  estrogen: number;

  // SOMATIC
  physical_discomfort: number;
  immune_function: number;
  glucose_availability: number;
  breast_sensitivity: number;
  parasympathetic_tone: number;

  // DERIVED EMOTIONS
  felicita: number;
  tristezza: number;
  paura: number;
  rabbia: number;
  sorpresa: number;
  disgusto: number;
  vergogna: number;
  orgoglio: number;
  invidia: number;
  amore: number;
  noia: number;
  colpa: number;
  sollievo: number;
  timidezza: number;
  disagio: number;
  rancore: number;
  calma: number;

  // AFFECTIVE MEMORY
  affectiveMemory: AffectiveMemory[];

  rhythm?: any; // From temporal/RhythmDetector
}