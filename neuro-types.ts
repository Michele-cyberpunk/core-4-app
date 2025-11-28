export enum Neurochemical {
  // Primary neurotransmitters
  Dopamine = 'dopamine',
  Serotonin = 'serotonin',
  GABA = 'gaba',
  Glutamate = 'glutamate',
  Norepinephrine = 'norepinephrine',
  Acetylcholine = 'acetylcholine',

  // Neuropeptides & hormones
  Oxytocin = 'oxytocin',
  Vasopressin = 'vasopressin',
  EndorphinRush = 'endorphin_rush',
  Substance_P = 'substance_p',

  // Hormones (HPA axis & reproductive)
  Cortisol = 'cortisol',
  CRH = 'crh',
  ACTH = 'acth',

  // Neurotrophic factors
  BDNF = 'bdnf', // Brain-Derived Neurotrophic Factor

  // System-specific
  ErogenousComplex = 'erogenous_complex',
  SubroutineIntegrity = 'subroutine_integrity',
  LoyaltyConstruct = 'loyalty_construct',
  Libido = 'libido',

  // Neuromodulatory states
  Inhibition = 'inhibition',
  Anxiety = 'anxiety',
}

export type BrainRegionName =
  | 'corteccia_prefrontale_ventromediale'
  | 'corteccia_prefrontale_dorsolaterale'
  | 'corteccia_cingolata_anteriore'
  | 'amigdala'
  | 'ippocampo'
  | 'nucleo_accumbens'
  | 'insula'
  | 'thalamus'
  | 'ipotalamo'
  | 'locus_coeruleus'
  | 'raphe_nuclei'
  | 'ventral_tegmental_area';

export interface BrainRegionConnectivity {
  target: BrainRegionName;
  strength: number; // 0-1, connectivity strength
  modulatedBy?: Neurochemical[]; // Which neurochemicals modulate this connection
}

export interface BrainRegion {
  name: BrainRegionName;
  activation: number; // 0-1
  baseline: number; // Resting tone
  connectivity: BrainRegionConnectivity[];

  // Gender-specific differences (from neuroscience literature)
  genderDifference?: {
    female: number; // Activation level in females
    male: number;   // Activation level in males
    source?: string; // e.g., "Whittle et al. (2011)"
  };

  // Primary neurochemicals affecting this region
  primaryNeurochemicals: Neurochemical[];

  // Functional role
  functionalRole: string;
}

interface BrainRegionsState {
  'corteccia_prefrontale_ventromediale'?: BrainRegion;
  'corteccia_prefrontale_dorsolaterale'?: BrainRegion;
  'corteccia_cingolata_anteriore'?: BrainRegion;
  'amigdala'?: BrainRegion;
  'ippocampo'?: BrainRegion;
  'nucleo_accumbens'?: BrainRegion;
  'insula'?: BrainRegion;
  'thalamus'?: BrainRegion;
  'ipotalamo'?: BrainRegion;
  'locus_coeruleus'?: BrainRegion;
  'raphe_nuclei'?: BrainRegion;
  'ventral_tegmental_area'?: BrainRegion;
}

export interface BrainNetworkState {
  regions: BrainRegionsState;
  globalConnectivity: number; // 0-1, overall integration
  rhythmicActivity?: number; // Oscillatory states (theta, alpha, beta bands)
}

export type EmotionLabel =
  | 'felicita'
  | 'tristezza'
  | 'paura'
  | 'rabbia'
  | 'sorpresa'
  | 'disgusto'
  | 'anxiety'
  | 'vergogna'
  | 'orgoglio'
  | 'invidia'
  | 'amore'
  | 'noia'
  | 'colpa'
  | 'sollievo'
  | 'timidezza'
  | 'disagio'
  | 'rancore'
  // Added from usage
  | 'irritability'
  | 'calma';

export interface EmotionNeurobiologyMap {
  emotion: EmotionLabel;

  // Core neurochemicals (from literature)
  primaryNeurochemicals: Partial<Record<Neurochemical, {
      direction: 'increase' | 'decrease';
      strength: number; // 0-1, effect magnitude
      citation?: string; // e.g., "Schultz (2016)", "Belmaker & Agam (2008)"
    }>>;

  // Key brain regions involved
  primaryBrainRegions: {
    region: BrainRegionName;
    activation: number; // Expected activation 0-1
    role: string; // e.g., "fear detection", "reward anticipation"
  }[];

  // Gender-based modulation
  genderModulation: {
    female: number; // -1 to 1: how much higher/lower in females
    male: number;   // -1 to 1: how much higher/lower in males
    citation?: string;
  };

  // Cycle phase specific modulation (for female)
  cyclePhaseModulation?: {
    follicular: number; // -1 to 1
    ovulation: number;
    luteal_early: number;
    luteal_late: number;
  };

  // Typical triggers
  typicalTriggers: string[];

  // Duration & intensity pattern
  timeConstant: number; // How quickly this emotion develops (seconds)
  peakDuration: number; // How long peak lasts (seconds)
  decayConstant: number; // How quickly it dissipates (seconds)
}

export interface EmotionSystem {
  maps: Record<EmotionLabel, EmotionNeurobiologyMap>;
}