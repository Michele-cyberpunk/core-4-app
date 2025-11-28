export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal_early' | 'luteal_late';

export interface HormonalProfile {
  estradiol: number; // 0-400 pg/mL approximate range
  progesterone: number; // 0-20 ng/mL approximate range
  fsh: number; // Follicle-stimulating hormone (0-100 mIU/mL)
  lh: number; // Luteinizing hormone (0-100 mIU/mL)
  testosterone: number; // ng/dL (lower in females)
}

export interface CyclePhaseProfile {
  phase: CyclePhase;
  day_range: [number, number]; // Typical day range in 28-day cycle
  hormonalBaseline: HormonalProfile;

  // Emotional modulation per phase
  emotionModulation: Partial<Record<string, number>>; // -1 to 1 change

  // Cognitive impact
  cognitiveImpact: {
    memory: number;
    attention: number;
    executive_function: number;
    spatial_reasoning: number;
    verbal_fluency: number;
    reaction_time: number;
  };

  // Brain region sensitivity
  brainRegionSensitivity: Partial<Record<string, number>>; // 0-1

  // Neurochemical baseline shifts
  neurochemicalShift: Partial<Record<string, number>>; // -1 to 1

  // Physical/somatic state
  somaticState: {
    energy: number;
    pain_sensitivity: number;
    appetite: number;
    libido: number;
    sleep_quality: number;
  };

  // Disorder vulnerability
  disorderVulnerability: {
    depression: number;
    anxiety: number;
    pmdd: number;
    migraine: number;
    irritability: number;
  };
}

export interface MenstrualCycleState {
  current_phase: CyclePhase;
  cycle_day: number; // 1-28 (approximately)
  phase_day: number; // Day within current phase
  current_profile: CyclePhaseProfile;

  // Historical tracking for prediction
  phase_history: { phase: CyclePhase; timestamp: number }[];

  // Predicted next phase
  predicted_next_phase?: CyclePhase;
  days_until_phase_change?: number;
}