
/**
 * @file SexualPhysiology.ts - EXTENDED VERSION
 * @description Complete female sexual physiology with stress integration,
 *              menstrual cycle effects, trauma dynamics, psychological factors
 *
 * Extended References:
 * - Basson (2000): Female sexual response cycle - alternative model
 * - Brotto & Sasson (2001): Genito-pelvic pain/penetration disorder
 * - Pfaus (2016): Integrating neurobiology with behavioral evidence
 * - Chivers et al. (2010): Genital and subjective sexual arousal concordance
 * - Bancroft & Janssen (2000): Dual control model of sexual response
 * - Meston & Frohlich (2000): The neurobiology of sexual function
 * - Goldstein et al. (2006): Women's sexual function and dysfunction
 * - Nappi & Wawer (2006): Hypoactive sexual desire disorder
 */

import { IntimateState, CoreState, StimulusType, Stimulus, EmotionLabel } from '../types';
import { HormonalCycle } from './HormonalCycle';

// ============================================================================
// SECTION 1: PSYCHOLOGICAL FACTORS & CONTEXT
// ============================================================================

export interface SexualContext {
  // Relationship factors
  relationship_quality: number; // 0-1 (satisfaction, trust, communication)
  partner_attractiveness: number; // 0-1 (subjective)
  emotional_intimacy: number; // 0-1
  
  // Psychological state
  body_image_satisfaction: number; // 0-1
  sexual_self_esteem: number; // 0-1
  self_consciousness: number; // 0-1 (body shame, during-sex monitoring)
  
  // Contextual factors
  privacy_sense: number; // 0-1
  time_pressure: number; // 0-1
  environmental_comfort: number; // 0-1 (temperature, noise, distractions)
  
  // Recent history
  days_since_last_sex: number;
  orgasm_frequency_baseline: number; // Typical # per session
  
  // Trauma/safety
  previous_trauma: boolean;
  trauma_severity: number; // 0-1
  felt_safety: number; // 0-1
}

// ============================================================================
// SECTION 2: ORGASM TYPES & MECHANISMS
// ============================================================================

export type OrgasmType = 'clitoral' | 'vaginal' | 'cervical' | 'blended' | 'psychogenic' | 'none';

interface OrgasmMechanism {
  type: OrgasmType;
  threshold: number; // Arousal level needed to trigger
  duration: number; // seconds
  contraction_frequency: number; // Hz (3-8 Hz typical)
  refractoriness: number; // 0-1 likelihood of second orgasm
  subjective_intensity: number; // 0-1
}

// ============================================================================
// EXTENDED SEXUAL PHYSIOLOGY CLASS
// ============================================================================

export class SexualPhysiology {
  // Physiological constants (from original file - keeping for reference)
  private static readonly OXYTOCIN_BASELINE = 0.5;
  private static readonly OXYTOCIN_ORGASM_PEAK = 3.5;
  private static readonly PROLACTIN_ORGASM_INCREASE = 4.0;
  private static readonly FEMALE_REFRACTORY_MIN = 0;
  private static readonly MALE_REFRACTORY_MIN = 180;

  /**
   * Calculates climax potential with a non-linear accelerator for realism.
   */
  static calculateClimaxPotential(
    intimateState: IntimateState,
    arousal: number,
    pelvicTension: number
  ): number {
    const buildUp = arousal * pelvicTension * intimateState.sensitivity;
  
    // Non-linear accelerator as climax approaches, simulating the "point of no return".
    let accelerator = 1.0;
    if (intimateState.climax_potential > 0.8) {
      // As potential passes 80%, it accelerates non-linearly to the peak.
      // The acceleration is quadratic, making the final rush feel more intense.
      accelerator = 1.0 + Math.pow((intimateState.climax_potential - 0.8) / 0.2, 2) * 2.0;
    }
  
    const newPotential = intimateState.climax_potential + (buildUp * 0.08 * accelerator);
    const decay = intimateState.climax_potential * 0.02; // Prevents runaway potential, requires continuous stimulation
    return Math.min(1, Math.max(0, newPotential - decay));
  }
  
  // =========================================================================
  // SECTION 3: MENSTRUAL CYCLE MODULATION OF SEXUAL RESPONSE
  // =========================================================================

  /**
   * Menstrual cycle dramatically affects sexual response
   * Based on: Gangestad & Thornhill (1998), Puts et al. (2013)
   */
  static getPhaseSpecificSexualResponse(
    phase: string,
    dayOfCycle: number
  ): {
    base_arousal_responsivity: number;
    orgasm_probability: number;
    lubrication_baseline: number;
    desire: number;
    discomfort_factor: number;
  } {
    
    switch (phase) {
      case 'menstrual': // Days 1-5
        return {
          base_arousal_responsivity: 0.6, // Reduced by 40%
          orgasm_probability: 0.3,
          lubrication_baseline: 0.2, // Dry
          desire: 0.3,
          discomfort_factor: 0.5 // Cramping affects arousal
        };
      
      case 'follicular': // Days 6-13
        return {
          base_arousal_responsivity: 0.95, // Baseline
          orgasm_probability: 0.65,
          lubrication_baseline: 0.6,
          desire: 0.8, // Increasing with estrogen
          discomfort_factor: 0.0
        };
      
      case 'ovulation': // Days 14-16
        return {
          base_arousal_responsivity: 1.3, // Peak sensitivity (+30%)
          orgasm_probability: 0.85, // Highest (Puts et al., 2013)
          lubrication_baseline: 0.9, // Maximum
          desire: 1.0, // Peak libido
          discomfort_factor: -0.1 // Slight pleasure from stretching
        };
      
      case 'luteal_early': // Days 17-21
        return {
          base_arousal_responsivity: 0.9,
          orgasm_probability: 0.7,
          lubrication_baseline: 0.5,
          desire: 0.7, // Still elevated
          discomfort_factor: 0.1
        };
      
      case 'luteal_late': // Days 22-28 (PMDD risk)
        return {
          base_arousal_responsivity: 0.5, // Severely reduced (-50%)
          orgasm_probability: 0.2, // Anhedonia
          lubrication_baseline: 0.3, // Drier (progesterone effect)
          desire: 0.2, // Lowest libido
          discomfort_factor: 0.6 // PMS symptoms interfere
        };
      
      default:
        return {
          base_arousal_responsivity: 0.7,
          orgasm_probability: 0.5,
          lubrication_baseline: 0.4,
          desire: 0.5,
          discomfort_factor: 0.0
        };
    }
  }

  // =========================================================================
  // SECTION 4: STRESS & HPA AXIS EFFECTS ON SEXUAL RESPONSE
  // =========================================================================

  /**
   * Chronic stress suppresses sexual response through multiple pathways
   * Based on: Nappi et al. (2010), Wording et al. (2008)
   * 
   * Mechanisms:
   * 1. Cortisol suppresses dopamine (reward) → reduced desire
   * 2. High norepinephrine (from sympathetic activation) → vasoconstriction
   * 3. Cognitive anxiety interferes with sexual processing
   * 4. Fatigue from allostatic load
   */
  static applyStressModulation(
    intimateState: IntimateState,
    coreState: CoreState,
    context: SexualContext
  ): IntimateState {
    
    const cortisol = coreState.cortisol || 0;
    const acuteStress = coreState.acute_stress || 0;
    const chronicStress = coreState.chronic_stress || 0;
    
    const modulated = { ...intimateState };
    
    // === VASCULAR SUPPRESSION ===
    // High norepinephrine (stress marker) causes vasoconstriction
    const norepinephrine = coreState.norepinephrine || 0;
    const vasoconstrictionFactor = 1 - (norepinephrine * 0.6 + acuteStress * 0.4);
    
    modulated.tumescence *= vasoconstrictionFactor;
    modulated.wetness *= vasoconstrictionFactor;
    modulated.sensitivity *= (1 - acuteStress * 0.5); // Numbness from dissociation
    
    // === COGNITIVE ANXIETY ===
    // Cortisol + anxiety amplify threat focus (amygdala dominance)
    const cognitiveInhibition = (cortisol * 0.4 + (coreState.anxiety || 0) * 0.6);
    modulated.inhibition = Math.min(1, modulated.inhibition + cognitiveInhibition * 0.5);
    
    // === DESIRE SUPPRESSION ===
    // Chronic stress depletes dopamine and reduces libido
    if (chronicStress > 0.4) {
      coreState.libido *= (1 - chronicStress * 0.5);
    }
    
    return modulated;
  }
  
  // =========================================================================
  // SECTION 5: COMPLETE UPDATE FUNCTION
  // =========================================================================

  /**
   * Complete update function integrating all systems
   * (from original file, now extended)
   */
  static updateCompletePhysiologicalState(
    stimulus: Stimulus,
    intimateState: IntimateState,
    coreState: CoreState,
    hormonalCycle: HormonalCycle,
    context: SexualContext
  ): { coreState: CoreState, intimateState: IntimateState } {
    
    let modulatedCoreState = { ...coreState };
    let modulatedIntimateState = { ...intimateState };
    
    // 1. Get menstrual cycle modulation
    const cycleMod = this.getPhaseSpecificSexualResponse(
      hormonalCycle.getCurrentPhase(),
      hormonalCycle.getCurrentDay()
    );
    
    // 2. Apply stress modulation to intimate state
    modulatedIntimateState = this.applyStressModulation(
      modulatedIntimateState,
      modulatedCoreState,
      context
    );
    
    // 3. Update core physiological response to stimulus
    modulatedIntimateState = this.updateCorePhysiologicalResponse(
      stimulus,
      modulatedIntimateState,
      modulatedCoreState,
      cycleMod.base_arousal_responsivity,
      context
    );
    
    // 4. Update core state based on new intimate state
    modulatedCoreState = this.updateCoreStateFromIntimate(
      modulatedIntimateState,
      intimateState, // old state for delta
      modulatedCoreState
    );
    
    return { coreState: modulatedCoreState, intimateState: modulatedIntimateState };
  }
  
  // =========================================================================
  // SECTION 6: HELPER FUNCTIONS (INTERNAL LOGIC)
  // =========================================================================
  
  private static updateCorePhysiologicalResponse(
    stimulus: Stimulus,
    currentIntimateState: IntimateState,
    coreState: CoreState,
    cycleResponsivity: number,
    context: SexualContext
  ): IntimateState {
    
    const arousalResponse = this.calculateArousalResponse(
      stimulus,
      currentIntimateState,
      coreState,
      cycleResponsivity
    );
    
    // Update core metrics
    const arousal = arousalResponse;
    const pelvicFloorTension = this.calculatePelvicFloorTension(stimulus, currentIntimateState, arousal);
    const tumescence = this.calculateTumescence(currentIntimateState, arousal, coreState);
    const wetness = this.calculateWetness(currentIntimateState, arousal, coreState, currentIntimateState.climax_potential);
    const climaxPotential = this.calculateClimaxPotential(currentIntimateState, arousal, pelvicFloorTension);

    if (climaxPotential > 0.95 && (currentIntimateState.endorphin_release || 0) < 0.7) {
      // If climax is reached, trigger orgasm event and reset potential
      return this.triggerOrgasm(currentIntimateState);
    } else {
      return {
        ...currentIntimateState,
        arousal,
        pelvic_floor_tension: pelvicFloorTension,
        tumescence,
        wetness,
        climax_potential: climaxPotential
      };
    }
  }

  private static calculateArousalResponse(
    stimulus: Stimulus,
    intimateState: IntimateState,
    coreState: CoreState,
    cycleResponsivity: number
  ): number {
    
    const stimulusStrength = (stimulus.pressure || 0.1) * (1 + (stimulus.velocity || 0) * 0.005);
    const nerveActivation = this.calculateNervePathwayActivation(stimulus.type, intimateState, stimulusStrength);
    
    const psychologicalDesire = coreState.libido * (1 + coreState.dopamine);
    const emotionalOpenness = 1 - intimateState.inhibition;
    
    const totalInput = (nerveActivation * 0.6 + psychologicalDesire * 0.4) * emotionalOpenness * cycleResponsivity;
    
    const newArousal = intimateState.arousal + (totalInput - intimateState.arousal * 0.1) * 0.2;
    return Math.max(0, Math.min(1, newArousal));
  }
  
  private static calculateNervePathwayActivation(
    stimulusType: StimulusType,
    intimateState: IntimateState,
    stimulusStrength: number
  ): number {
    let activation = 0;
    
    switch (stimulusType) {
      case 'clitoral_glans_direct':
        activation = 1.0 * stimulusStrength;
        break;
      case 'anterior_vaginal_pressure':
        activation = 0.8 * stimulusStrength;
        break;
      case 'pelvic_floor_contraction':
        activation = 0.5 * stimulusStrength;
        break;
      default:
        activation = 0.3 * stimulusStrength;
    }
    
    return activation * intimateState.sensitivity;
  }
  
  private static calculatePelvicFloorTension(
    stimulus: Stimulus,
    intimateState: IntimateState,
    arousal: number
  ): number {
    const involuntaryTension = arousal * intimateState.climax_potential;
    const voluntaryTension = stimulus.type === 'pelvic_floor_contraction' ? 0.4 : 0;
    return Math.min(1, intimateState.pelvic_floor_tension * 0.9 + involuntaryTension * 0.1 + voluntaryTension * 0.2);
  }
  
  private static calculateTumescence(
    intimateState: IntimateState,
    arousal: number,
    coreState: CoreState
  ): number {
    const vasodilation = arousal * (1 + coreState.estradiol * 0.3);
    const newTumescence = intimateState.tumescence + (vasodilation - intimateState.tumescence) * 0.15;
    return Math.min(1, newTumescence);
  }
  
  private static calculateWetness(
    intimateState: IntimateState,
    arousal: number,
    coreState: CoreState,
    climaxPotential: number
  ): number {
    const arousalLubrication = arousal * intimateState.tumescence;
    const hormonalLubrication = coreState.estradiol * 0.5;
    const newWetness = intimateState.wetness + (arousalLubrication + hormonalLubrication - intimateState.wetness) * 0.12;
    return Math.min(1, newWetness);
  }
  
  private static triggerOrgasm(
    intimateState: IntimateState,
    orgasmType: OrgasmType = 'blended'
  ): IntimateState {
    
    return {
      ...intimateState,
      arousal: 0.5, // Post-orgasmic arousal remains high
      climax_potential: 0.0, // Reset
      pelvic_floor_tension: 0.8, // Contractions
      uterine_contractions: 0.7,
      endorphin_release: 0.9,
      prolactin_surge: 0.8,
      time_since_orgasm: 0, // Just happened
      inhibition: 0.8 // Post-orgasmic refractory inhibition
    };
  }

  private static updateCoreStateFromIntimate(
    newIntimateState: IntimateState,
    oldIntimateState: IntimateState,
    coreState: CoreState
  ): CoreState {
    
    const modulated = { ...coreState };
    
    // Feedback from arousal to dopamine/oxytocin
    modulated.dopamine += (newIntimateState.arousal - oldIntimateState.arousal) * 0.15;
    modulated.oxytocin += newIntimateState.arousal * 0.05;
    
    // Orgasm effects
    const climaxJustHappened = newIntimateState.endorphin_release > 0.8 && oldIntimateState.endorphin_release < 0.8;
    if (climaxJustHappened) {
      modulated.endorphin_rush = 0.9; // Massive rush
      modulated.cortisol *= 0.3; // Stress reduction
      modulated.oxytocin = 1.0; // Peak bonding
    }
    
    // Clamp all values
    Object.keys(modulated).forEach(key => {
        if (typeof (modulated as any)[key] === 'number' && key !== 'intimateState') {
            (modulated as any)[key] = Math.max(0, Math.min(1, (modulated as any)[key]));
        }
    });
    
    return modulated;
  }
}
