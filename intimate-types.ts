export type StimulusType =
  | 'touch_start' | 'touch_move' | 'touch_end'
  | 'clitoral_glans_direct' | 'clitoral_body_pressure'
  | 'anterior_vaginal_pressure' | 'cervical_contact'
  | 'pelvic_floor_contraction' | 'anal_stimulation'
  | 'clitoral_hood_indirect' | 'urethral_sponge_massage'
  | 'posterior_vaginal_stretch' | 'deep_muscle_tension'
  | 'kegel_exercise'
  | 'whisper' | 'tease' | 'vulnerability_trigger'
  | 'gentle_touch_start' | 'gentle_touch_stop' | 'firm_touch';

export interface Stimulus {
  type: StimulusType;
  pressure?: number;
  velocity?: number;
}

export interface IntimateState {
  // Core metrics
  arousal: number;
  sensitivity: number;
  inhibition: number;
  climax_potential: number;
  vulnerability: number;

  // Physiological states
  tumescence: number; // Vasocongestion
  wetness: number;    // Lubrication

  // Nerve activation levels
  clitoral_nerve: number;
  vaginal_nerve: number;
  urethral_nerve: number;
  cervical_nerve?: number;
  anal_nerve?: number;

  // Muscular states
  pelvic_floor_tension: number;
  uterine_contractions: number;

  // Hormonal states
  prolactin_surge: number;
  endorphin_release: number;
  oxytocin_level?: number;

  // Advanced physiology
  skene_gland_pressure?: number;
  ejaculate_volume?: number;
  vasoconstriction?: number;

  // Sensory processing
  habituation?: number;
  nipple_stimulation?: number;
  last_stimulus?: Stimulus | null;
  stimulus_continuity?: number;

  // State tracking
  time_since_orgasm?: number;

  // Added from usage
  physical_discomfort?: number;
}

export interface StimulusPayload {
  text?: string;
  image_description?: string;
  metadata?: Record<string, any>;
}