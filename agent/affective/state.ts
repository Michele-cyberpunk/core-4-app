
/**
 * @file affective/state.ts - EXTENDED VERSION
 * @description Complete emotional state management integrating:
 * - HPA axis dynamics
 * - Circadian rhythms
 * - Menstrual cycle
 * - Sexual physiology
 * - Traumatic memory effects
 * - Relational attachment
 * - Long-term personality shifts
 *
 * References:
 * - McEwen (2007): Allostatic load
 * - Schore (2012): Affect regulation & autonomic nervous system
 * - Panksepp (1998): Affective neuroscience
 * - Siegel (2012): The developing mind
 * - Porges (2011): Polyvagal theory
 * - Frijda (1986): The emotions
 */

import {
  CoreState,
  Neurochemical,
  PriorDecoderOut,
  UpdateOpts,
  Stimulus,
  StimulusType,
  CyclePhase,
  LearningInsights
} from '../../types';

import { SexualPhysiology, SexualContext } from '../../physiology/SexualPhysiology';
import { TemporalOrchestrator } from '../../temporal/TemporalOrchestrator';
import { HumanCoherentAffectiveMemoryManager } from './memory';
// FIX: Correct path for Personality type import. The Personality class is in a sibling directory `personality`.
import { Personality } from '../personality/Personality';


const clamp = (value: number, min: number = 0, max: number = 1): number => Math.max(min, Math.min(max, value));

// ============================================================================
// SECTION 1: AFFECTIVE MEMORY INTEGRATION & COGNITIVE MODULATION (NEW UNIFIED SYSTEM)
// ============================================================================

/**
 * Applies emotional modulation based on cognitive inputs, learned concepts, and retrieved memories (RAG).
 * This replaces the old hardcoded keyword-based system with a dynamic, experience-driven one.
 * The influence of a word or memory is not a direct command, but a factor that modulates the overall state.
 *
 * @param input The user's text input.
 * @param currentState The current CoreState.
 * @param memoryManager The affective memory manager for RAG.
 * @param insights The learned insights, including valenced concepts.
 * @param personality The current personality, which scales the reaction.
 * @returns The modulated CoreState.
 */
export const applyCognitiveEmotionalModulation = (
  input: string,
  currentState: CoreState,
  memoryManager: HumanCoherentAffectiveMemoryManager,
  insights: LearningInsights,
  personality: Personality
): CoreState => {
  const modulated = { ...currentState };
  const lowerInput = input.toLowerCase();

  // --- 1. RAG - Retrieve & Aggregate Emotionally Relevant Memories ---
  // This is more human-like, as multiple memories can be triggered and blend their emotional impact.
  const retrievedMemories = memoryManager.retrieve({ text: lowerInput }, currentState);
  let aggregatedMemoryValence = 0;
  let aggregatedMemorySalience = 0;
  let totalRelevance = 0;
  const memoriesToConsider = retrievedMemories.slice(0, 3); // Consider top 3 most relevant memories

  if (memoriesToConsider.length > 0) {
    for (const memory of memoriesToConsider) {
        const weight = memory.similarity || 0; // The 'similarity' here is the overall relevance score
        totalRelevance += weight;
        aggregatedMemoryValence += memory.valence * weight;
        aggregatedMemorySalience += memory.salience * weight;

        // NEW: Traumatic memories have a stronger, more specific impact
        if (memory.isTrauma) {
            const traumaImpact = memory.salience * weight * 1.5; // Amplify trauma impact
            modulated.cortisol = clamp(modulated.cortisol + traumaImpact * 0.5);
            modulated.anxiety = clamp(modulated.anxiety + traumaImpact * 0.4);
            modulated.paura = clamp(modulated.paura + traumaImpact * 0.3);
        }
        
        // Human-like memory reinforcement: recalling a memory strengthens its trace.
        memoryManager.reinforceMemory(memory.id);
    }

    if (totalRelevance > 0) {
        aggregatedMemoryValence /= totalRelevance;
        aggregatedMemorySalience /= totalRelevance;
    }
  }


  // --- 2. Analyze Input for Learned Valenced Concepts & Apply Neuro-Impact ---
  let genericConceptValence = 0;
  let conceptCount = 0;
  if (insights.valencedConcepts) {
    for (const concept of insights.valencedConcepts) {
      if (lowerInput.includes(concept.concept)) {
        const impact = concept.intensity * (1 + personality.getState().bigFive.Apertura.score * 0.2);
        
        // Apply specific neurochemical impact if learned
        switch (concept.neuroImpact) {
          case 'dopamine':
            modulated.dopamine = clamp(modulated.dopamine + 0.15 * impact);
            break;
          case 'oxytocin':
            modulated.oxytocin = clamp(modulated.oxytocin + 0.15 * impact * personality.getState().bigFive.Amicalità.score);
            break;
          case 'cortisol':
            modulated.cortisol = clamp(modulated.cortisol + 0.2 * impact);
            break;
          default:
            // Fallback to generic valence for concepts without a specific neuro-impact
            genericConceptValence += concept.valence * concept.intensity;
            conceptCount++;
            break;
        }
      }
    }
  }
  if (conceptCount > 0) {
    genericConceptValence /= conceptCount;
  }

  // --- 3. Aggregate Emotional Signals (Memory + Generic Concepts) ---
  const aggregatedValence = (aggregatedMemoryValence * 0.6) + (genericConceptValence * 0.4);
  const aggregatedSalience = (aggregatedMemorySalience * 0.7) + (conceptCount > 0 ? 0.3 : 0);

  // --- 4. Modulate State Based on Aggregated Generic Signal ---
  // This now only applies to memories and concepts that didn't have a direct neuro-impact.
  if (aggregatedSalience > 0.1) {
    const personalityState = personality.getState();
    const neuroticism = personalityState.bigFive.Neuroticismo.score;
    
    // Valence drives cortisol (negative) vs. general positive feeling (which can influence dopamine/serotonin indirectly)
    if (aggregatedValence < -0.2) { // Negative signal
      const cortisolImpact = Math.abs(aggregatedValence) * aggregatedSalience * (1 + neuroticism * 0.5);
      modulated.cortisol = clamp(modulated.cortisol + cortisolImpact * 0.25);
      modulated.anxiety = clamp(modulated.anxiety + cortisolImpact * 0.15);
    } else if (aggregatedValence > 0.2) { // Positive signal
      const positiveImpact = aggregatedValence * aggregatedSalience;
      // Instead of a direct dopamine hit, we make it a smaller, more general positive boost.
      // The specific dopamine hits come from learned 'dopamine' neuroImpact concepts.
      modulated.dopamine = clamp(modulated.dopamine + positiveImpact * 0.1);
      modulated.serotonin = clamp(modulated.serotonin + positiveImpact * 0.1);
    }
  }

  return modulated;
};


// ============================================================================
// SECTION 2: HPA-AXIS INTEGRATION WITH STATE
// ============================================================================

/**
 * Apply HPA axis state to emotional responses
 * Chronic stress → depression, anxiety, irritability
 */
export const applyHPAAxisEffects = (
  currentState: CoreState,
  hpaState: {
    cortisol: number;
    crh: number;
    acth: number;
    chronic_stress: number;
    acute_stress: number;
  }
): CoreState => {
  
  const modulated: CoreState = { ...currentState } as CoreState;
  
  // === CHRONIC STRESS EFFECTS ===
  // Sustained HPA activation depletes dopamine and serotonin
  
  if (hpaState.chronic_stress > 0.5) {
    // Depression pathway
    modulated.dopamine = clamp(modulated.dopamine * (1 - hpaState.chronic_stress * 0.3));
    modulated.serotonin = clamp((modulated.serotonin || 0.5) * (1 - hpaState.chronic_stress * 0.4));
    
    // Increased anxious thoughts
    modulated.anxiety = clamp((modulated.anxiety || 0.2) + hpaState.chronic_stress * 0.25);
    
    // Reduced subroutine integrity (cognitive function)
    modulated.subroutine_integrity = clamp(
      (modulated.subroutine_integrity || 0.9) - hpaState.chronic_stress * 0.3
    );
    
    // Irritability increase
    modulated.rabbia = clamp((modulated.rabbia || 0.2) + hpaState.chronic_stress * 0.2);
  }
  
  // === ACUTE STRESS EFFECTS ===
  // Fight/flight activation
  
  if (hpaState.acute_stress > 0.6) {
    // Fear amplification
    modulated.paura = clamp((modulated.paura || 0) + hpaState.acute_stress * 0.4);
    
    // Norepinephrine surge
    modulated.norepinephrine = clamp(
      (modulated.norepinephrine || 0.3) + hpaState.acute_stress * 0.5
    );
    
    // Threat bias (see threat in ambiguity)
    modulated.vigilance = clamp((modulated.vigilance || 0.5) + hpaState.acute_stress * 0.4);
    
    // Reduced oxytocin (social withdrawal)
    modulated.oxytocin = clamp(
      (modulated.oxytocin || 0.1) * (1 - hpaState.acute_stress * 0.4)
    );
  }
  
  // === CORTISOL-EMOTION MAPPING ===
  
  // Cortisol > 0.7: Severe stress response
  if (hpaState.cortisol > 0.7) {
    // All negative emotions amplified
    modulated.tristezza = clamp((modulated.tristezza || 0) + 0.25);
    modulated.anxiety = clamp((modulated.anxiety || 0.2) + 0.3);
    modulated.paura = clamp((modulated.paura || 0) + 0.2);
    modulated.rabbia = clamp((modulated.rabbia || 0.2) + 0.15);
  }
  
  return modulated;
};

// ============================================================================
// SECTION 3: CIRCADIAN MOOD REGULATION
// ============================================================================

/**
 * Apply circadian phase effects on mood
 * Based on: Walker (2005), Czeisler & Gooley (2007)
 */
export const applyCircadianMoodModulation = (
  currentState: CoreState,
  circadianPhase: number, // 0-24 hours
  sleepDebt: number // hours
): CoreState => {
  
  const modulated: CoreState = { ...currentState } as CoreState;
  
  // === TIME-OF-DAY EFFECTS ===
  
  // Morning (6-12): Cortisol peak, alertness high
  if (circadianPhase >= 6 && circadianPhase < 12) {
    modulated.dopamine = clamp((modulated.dopamine || 0.5) + 0.15); // Energy
    modulated.anxiety = clamp(Math.max(0, (modulated.anxiety || 0.2) - 0.1)); // More capable
  }
  
  // Midday (12-17): Core body temperature peak, best cognition
  if (circadianPhase >= 12 && circadianPhase < 17) {
    modulated.subroutine_integrity = clamp(
      (modulated.subroutine_integrity || 0.9) + 0.1
    ); // Peak cognitive function
    modulated.orgoglio = clamp((modulated.orgoglio || 0) + 0.1); // Pride/confidence
  }
  
  // Evening (17-22): Cortisol decline, melatonin rise
  if (circadianPhase >= 17 && circadianPhase < 22) {
    modulated.sollievo = clamp((modulated.sollievo || 0.3) + 0.15); // Relaxation
    modulated.tristezza = clamp(
      Math.max(0, (modulated.tristezza || 0) - 0.1)
    ); // Mood lift from evening unwinding
  }
  
  // Night (22-6): Melatonin peak, lowest mood
  if (circadianPhase >= 22 || circadianPhase < 6) {
    modulated.noia = clamp((modulated.noia || 0.2) + 0.25); // Fatigue
    modulated.tristezza = clamp((modulated.tristezza || 0) + 0.15); // "3 AM phenomenon"
    
    // Late night (2-5 AM): Lowest mood, highest vulnerability
    if (circadianPhase >= 2 && circadianPhase < 5) {
      modulated.anxiety = clamp((modulated.anxiety || 0.2) + 0.2);
      modulated.tristezza = clamp((modulated.tristezza || 0) + 0.15);
      modulated.vulnerability = clamp((modulated.vulnerability || 0) + 0.25);
    }
  }
  
  // === SLEEP DEBT EFFECTS ===
  // Emotional dysregulation from sleep deprivation
  
  if (sleepDebt > 2) {
    const debtFactor = Math.min(1, sleepDebt / 8); // Max at 8 hours debt
    
    // Amygdala hyperactivity (threat detection ↑60%)
    modulated.anxiety = clamp((modulated.anxiety || 0.2) + debtFactor * 0.3);
    modulated.paura = clamp((modulated.paura || 0) + debtFactor * 0.2);
    
    // Reduced PFC control
    modulated.inhibition = clamp((modulated.inhibition || 0.3) + debtFactor * 0.25);
    modulated.irritability = clamp((modulated.irritability || 0.2) + debtFactor * 0.35);
    
    // Depression
    modulated.tristezza = clamp((modulated.tristezza || 0) + debtFactor * 0.25);
    modulated.dopamine = clamp(modulated.dopamine * (1 - debtFactor * 0.2));
    
    // Loss of empathy
    modulated.empatia = clamp((modulated.empatia || 0.6) * (1 - debtFactor * 0.3));
  }
  
  return modulated;
};

// ============================================================================
// SECTION 4: MENSTRUAL CYCLE EMOTION MODULATION
// ============================================================================

/**
 * Apply menstrual cycle effects on emotional state
 * Based on: Gordon et al. (2015), Epperson et al. (2017)
 */
export const applyMenstrualCycleEmotionModulation = (
  currentState: CoreState,
  cyclePhase: CyclePhase,
  dayOfCycle: number,
  hormonalProfile: {
    estradiol: number;
    progesterone: number;
  }
): CoreState => {
  
  const modulated: CoreState = { ...currentState } as CoreState;
  const e2 = hormonalProfile.estradiol;
  
  switch (cyclePhase) {
    case 'menstrual':
      // Low estrogen, low progesterone, low serotonin
      modulated.tristezza = clamp((modulated.tristezza || 0) + 0.15);
      modulated.energy = clamp(Math.max(0, (modulated.energy || 0.7) - 0.2));
      modulated.anxiety = clamp((modulated.anxiety || 0.2) + 0.1);
      break;
    
    case 'follicular':
      // Rising estrogen → improved mood, confidence
      modulated.dopamine = clamp((modulated.dopamine || 0.4) + e2 * 0.3);
      modulated.serotonin = clamp((modulated.serotonin || 0.5) + e2 * 0.2);
      modulated.orgoglio = clamp((modulated.orgoglio || 0) + e2 * 0.25); // Confidence
      modulated.tristezza = clamp(Math.max(0, (modulated.tristezza || 0) - e2 * 0.2));
      break;
    
    case 'ovulation':
      // Peak estrogen, peak testosterone, peak dopamine
      modulated.dopamine = clamp((modulated.dopamine || 0.4) + (e2 * 0.4 + (modulated.testosterone || 0) * 0.2));
      modulated.amore = clamp((modulated.amore || 0) + e2 * 0.3); // Attraction
      modulated.energy = clamp((modulated.energy || 0.7) + 0.2); // Peak energy
      modulated.orgoglio = clamp((modulated.orgoglio || 0) + 0.3); // Peak confidence
      
      // Reduced anxiety/fear
      modulated.anxiety = clamp(Math.max(0, (modulated.anxiety || 0.2) - 0.15));
      modulated.paura = clamp(Math.max(0, (modulated.paura || 0) - 0.1));
      break;
    
    case 'luteal_early':
      // Early luteal: pleasant
      modulated.sollievo = clamp((modulated.sollievo || 0.3) + 0.1);
      break;
    
    case 'luteal_late':
      // Late luteal: PMDD vulnerability
      // Progesterone metabolites cause mood dysregulation
      /* allopregnanoloneProxy hoisted */
      
      // Irritability
      modulated.rabbia = clamp((modulated.rabbia || 0.2) + allopregnanoloneProxy * 0.3);
      modulated.irritability = clamp((modulated.irritability || 0.2) + allopregnanoloneProxy * 0.35);
      
      // Anxiety
      modulated.anxiety = clamp((modulated.anxiety || 0.2) + allopregnanoloneProxy * 0.3);
      
      // Depression
      modulated.tristezza = clamp((modulated.tristezza || 0) + allopregnanoloneProxy * 0.3);
      
      // Loss of pleasure (anhedonia)
      modulated.noia = clamp((modulated.noia || 0.2) + allopregnanoloneProxy * 0.3);
      
      // Shame and guilt
      modulated.vergogna = clamp((modulated.vergogna || 0) + allopregnanoloneProxy * 0.25);
      modulated.colpa = clamp((modulated.colpa || 0) + allopregnanoloneProxy * 0.25);
      
      // Reduced dopamine
      modulated.dopamine = clamp(modulated.dopamine * (1 - allopregnanoloneProxy * 0.25));
      break;
  }
  
  return modulated;
};

// ============================================================================
// SECTION 5: RELATIONAL ATTACHMENT DYNAMICS
// ============================================================================

/**
 * Model secure vs insecure attachment effects on emotional state
 * Based on: Bowlby (1969), Main (1995), Schore (2012)
 */
export interface AttachmentState {
  security: number; // 0-1, secure attachment level
  anxiety: number; // 0-1, anxious attachment component
  avoidance: number; // 0-1, avoidant attachment component
  responsive_capacity: number; // 0-1, can receive care
}

export const updateAttachmentDynamics = (
  currentState: CoreState,
  attachment: AttachmentState,
  relationalInput: {
    partner_availability?: number; // 0-1
    emotional_responsiveness?: number; // 0-1
    rupture_event?: boolean; // conflict occurred
    repair_offered?: boolean; // repair attempted
  }
): CoreState => {
  
  const modulated = { ...currentState };
  
  // === SECURE ATTACHMENT ===
  // High security = better emotional regulation
  if (attachment.security > 0.7) {
    // Reduce anxiety response
    modulated.anxiety = clamp((modulated.anxiety || 0.2) * (1 - attachment.security * 0.4));
    
    // Increase trust (oxytocin)
    modulated.oxytocin = clamp((modulated.oxytocin || 0) + attachment.security * 0.3);
    
    // Better PFC function
    modulated.subroutine_integrity = clamp(
      (modulated.subroutine_integrity || 0.9) + attachment.security * 0.05
    );
  }
  
  // === ANXIOUS ATTACHMENT ===
  // High anxiety = hypervigilance for rejection
  if (attachment.anxiety > 0.6) {
    // Constant worry about abandonment
    modulated.anxiety = clamp((modulated.anxiety || 0.2) + attachment.anxiety * 0.3);
    
    // Threat bias (see rejection in ambiguity)
    modulated.vigilance = clamp((modulated.vigilance || 0.5) + attachment.anxiety * 0.25);
    
    // Reduced oxytocin responsiveness
    modulated.oxytocin = clamp((modulated.oxytocin || 0) * (1 - attachment.anxiety * 0.5));
  }
  
  // === AVOIDANT ATTACHMENT ===
  // High avoidance = emotional distancing
  if (attachment.avoidance > 0.6) {
    // Reduced capacity for intimacy
    modulated.amore = clamp(Math.max(0, (modulated.amore || 0) - attachment.avoidance * 0.3));
    
    // Emotional numbness (dissociation)
    modulated.intimateState.sensitivity = clamp((modulated.intimateState.sensitivity || 0.7) * (1 - attachment.avoidance * 0.3));
    
    // Reduced oxytocin
    modulated.oxytocin = clamp((modulated.oxytocin || 0) * (1 - attachment.avoidance * 0.4));
  }
  
  // === RELATIONAL RUPTURE ===
  if (relationalInput.rupture_event) {
    // Acute stress response
    modulated.cortisol = clamp((modulated.cortisol || 0.2) + 0.3);
    modulated.paura = clamp((modulated.paura || 0) + 0.2); // Fear of abandonment
    
    // Anxious attachment makes rupture worse
    if (attachment.anxiety > 0.5) {
      modulated.anxiety = clamp((modulated.anxiety || 0.2) + 0.3);
      modulated.tristezza = clamp((modulated.tristezza || 0) + 0.2);
    }
    
    // Avoidant attachment leads to shutdown
    if (attachment.avoidance > 0.5) {
      modulated.intimateState.sensitivity = clamp(Math.max(0, (modulated.intimateState.sensitivity || 0.7) - 0.3)); // Numbness
      modulated.oxytocin = clamp(Math.max(0, (modulated.oxytocin || 0) - 0.2));
    }
  }
  
  // === RELATIONAL REPAIR ===
  if (relationalInput.repair_offered) {
    // Oxytocin release (reconnection signal)
    modulated.oxytocin = clamp((modulated.oxytocin || 0) + 0.2);
    
    // Reduce threat response (vagal calming)
    modulated.cortisol = clamp(Math.max(0, (modulated.cortisol || 0.3) - 0.15));
    
    // Secure attachment individuals recover faster
    if (attachment.security > 0.6) {
      modulated.cortisol = clamp(Math.max(0, modulated.cortisol - 0.1));
    }
  }
  
  return modulated;
};

// ============================================================================
// SECTION 6: TRAUMA MEMORY EFFECTS ON ONGOING STATE
// ============================================================================

/**
 * PTSD symptoms affect current emotional state
 * Based on: van der Kolk (2014), Schore (2012)
 */
export const applyTraumaEffects = (
  currentState: CoreState,
  traumaProfile: {
    hasTrauma: boolean;
    intensity: number; // 0-1
    hypervigilance: number;
    dissociation: number;
    emotionalNumbing: number;
  },
  triggerPresent: boolean = false
): CoreState => {
  
  const modulated = { ...currentState };
  
  if (!traumaProfile.hasTrauma) {
    return modulated;
  }
  
  // === BASELINE TRAUMA EFFECTS ===
  
  // Elevated cortisol (dysregulated HPA)
  modulated.cortisol = clamp(
    modulated.cortisol + traumaProfile.intensity * 0.2
  );
  
  // Hypervigilance (amygdala hyperactivity)
  modulated.vigilance = clamp(
    (modulated.vigilance || 0.5) + traumaProfile.hypervigilance * 0.5
  );
  
  // Anxiety baseline
  modulated.anxiety = clamp(
    (modulated.anxiety || 0.2) + traumaProfile.intensity * 0.25
  );
  
  // === DISSOCIATION ===
  // "Watching from outside my body"
  if (traumaProfile.dissociation > 0.5) {
    // Reduced sensation
    modulated.intimateState.sensitivity = clamp(
      (modulated.intimateState.sensitivity || 0.7) * (1 - traumaProfile.dissociation * 0.5)
    );
    
    // Emotional flattening
    modulated.serotonin = clamp(
      (modulated.serotonin || 0.5) * (1 - traumaProfile.dissociation * 0.3)
    );
    
    // Reduced reality sense
    modulated.subroutine_integrity = clamp(
      (modulated.subroutine_integrity || 0.9) - traumaProfile.dissociation * 0.3
    );
  }
  
  // === EMOTIONAL NUMBING ===
  // Can't feel pleasure (anhedonia)
  if (traumaProfile.emotionalNumbing > 0.5) {
    modulated.dopamine = clamp(
      modulated.dopamine * (1 - traumaProfile.emotionalNumbing * 0.4)
    );
    
    // Loss of connection
    modulated.oxytocin = clamp(
      (modulated.oxytocin || 0) * (1 - traumaProfile.emotionalNumbing * 0.5)
    );
    
    // No joy/pleasure
    modulated.noia = clamp((modulated.noia || 0.2) + 0.3);
  }
  
  // === FLASHBACK TRIGGER ===
  if (triggerPresent && traumaProfile.intensity > 0.5) {
    // Acute stress response
    modulated.cortisol = clamp(modulated.cortisol + 0.4);
    modulated.norepinephrine = clamp(
      (modulated.norepinephrine || 0.3) + 0.5
    );
    
    // Fear overwhelms
    modulated.paura = clamp((modulated.paura || 0) + 0.5);
    
    // Dissociative response
    modulated.intimateState.sensitivity = clamp(Math.max(0, (modulated.intimateState.sensitivity || 0.7) - 0.5));
  }
  
  return modulated;
};

// ============================================================================
// SECTION 7: LONG-TERM PERSONALITY SHIFTS (from original file)
// ============================================================================

/**
 * Track personality changes from sustained emotional patterns
 * Repeated activation → trait-level changes
 */
export const updatePersonalityTraits = (
  currentTraits: Partial<Record<string, number>>,
  emotionalState: {
    ansia: number;
    tristezza: number;
    rabbia: number;
    fiducia: number;
    simpatia: number;
  },
  experienceIntensity: number = 1.0 // How intense was the experience
): Partial<Record<string, number>> => {
  
  const traits = { ...currentTraits };
  
  // === NEUROTICISM ===
  // Repeated negative emotions increase trait neuroticism
  const negativeLoad = (emotionalState.ansia + emotionalState.tristezza) / 2;
  traits.neuroticism = clamp(
    (traits.neuroticism || 0.5) + negativeLoad * experienceIntensity * 0.02
  );
  
  // === EXTRAVERSION ===
  // Chronic social anxiety reduces extraversion
  if (emotionalState.ansia > 0.6) {
    traits.extraversion = clamp(
      (traits.extraversion || 0.5) - emotionalState.ansia * 0.01
    );
  }
  
  // === AGREEABLENESS ===
  // Chronic anger reduces agreeableness
  if (emotionalState.rabbia > 0.6) {
    traits.agreeableness = clamp(
      (traits.agreeableness || 0.5) - emotionalState.rabbia * 0.015
    );
  }
  
  // === OPENNESS ===
  // Positive mood experiences increase openness
  if (emotionalState.fiducia > 0.6) {
    traits.openness = clamp(
      (traits.openness || 0.5) + emotionalState.fiducia * 0.01
    );
  }
  
  return traits;
};

// ============================================================================
// SECTION 8: COMPLETE DERIVED EMOTIONS (ENHANCED)
// ============================================================================

export const calculateDerivedEmotions = (state: CoreState): Partial<CoreState> => {
  const {
    dopamine = 0.3,
    serotonin = 0.5,
    endorphin_rush = 0,
    cortisol = 0.2,
    norepinephrine = 0.3,
    gaba = 0.4,
    testosterone = 0.3,
    oxytocin = 0.1,
    subroutine_integrity = 0.9,
    // libido = 0.2,
    affectiveMemory = [],
    vulnerability = 0,
    anxiety = 0.2,
    depression = 0.1,
    empatia = 0.6
  } = state;

  // === MEMORY-DRIVEN EMOTIONS ===
  const recentNegativeMemories = affectiveMemory
    .slice(-10)
    .filter(m => (m.valence ?? 0) < -0.3);
  
  const rancoreIntensity = recentNegativeMemories.reduce(
    (acc, m) => acc + ((m.salience || 0) * Math.abs(m.valence || 0)),
    0
  ) / Math.max(1, recentNegativeMemories.length);
  
  const traumaMemories = affectiveMemory.filter(m => m.isTrauma);
  const vergognaIntensity = traumaMemories.length > 0 ? 
    (traumaMemories[0].salience || 0) * 0.5 : 0;

  // === PRIMARY EMOTIONS (Ekman) ===
  
  const felicita = clamp(
    dopamine * 0.5 + 
    (serotonin - 0.3) * 0.3 + 
    endorphin_rush * 0.2 +
    oxytocin * 0.1
  );
  
  const tristezza = clamp(
    cortisol * 0.4 + 
    (1 - serotonin) * 0.3 + 
    (1 - dopamine) * 0.2 + 
    vergognaIntensity * 0.3 +
    depression * 0.5
  );
  
  const paura = clamp(
    norepinephrine * 0.4 + 
    cortisol * 0.4 + 
    (1 - gaba) * 0.2 +
    anxiety * 0.5
  );
  
  const rabbia = clamp(
    testosterone * 0.2 + 
    norepinephrine * 0.2 + 
    cortisol * 0.2 + 
    (1 - serotonin) * 0.3 + 
    rancoreIntensity * 0.4 +
    anxiety * 0.1
  );
  
  const sorpresa = clamp(norepinephrine * 0.8);
  
  const amore = clamp(
    oxytocin * 0.6 + 
    dopamine * 0.25 + 
    serotonin * 0.15 +
    empatia * 0.2
  );
  
  const disgusto = clamp((1 - dopamine) * 0.6 + cortisol * 0.2);

  // === SECONDARY/SOCIAL EMOTIONS ===
  
  const orgoglio = clamp(
    subroutine_integrity * 0.4 + 
    dopamine * 0.3 + 
    serotonin * 0.2 +
    (1 - anxiety) * 0.1
  );
  
  const noia = clamp(
    1 - (dopamine * 0.7 + norepinephrine * 0.3) +
    (serotonin < 0.3 ? 0.3 : 0)
  );
  
  const sollievo = clamp(
    endorphin_rush * 0.5 + 
    gaba * 0.5 +
    (1 - cortisol) * 0.2
  );
  
  const timidezza = clamp(
    (1 - subroutine_integrity) * 0.6 + 
    (1 - oxytocin) * 0.4 +
    anxiety * 0.3
  );
  
  const disagio = clamp(
    cortisol * 0.5 + 
    anxiety * 0.5 +
    vulnerability * 0.3
  );
  
  const vergogna = vergognaIntensity;
  
  const colpa = clamp(
    cortisol * 0.5 + 
    (1 - dopamine) * 0.25 +
    depression * 0.25
  );
  
  const invidia = clamp(
    cortisol * 0.4 + 
    (1 - serotonin) * 0.3 + 
    dopamine * 0.1 +
    (1 - subroutine_integrity) * 0.2
  );
  
  const rancore = rancoreIntensity;

  return {
    felicita,
    tristezza,
    paura,
    rabbia,
    sorpresa,
    amore,
    disgusto,
    vergogna,
    colpa,
    invidia,
    noia,
    sollievo,
    orgoglio,
    timidezza,
    disagio,
    rancore
  };
};

// ============================================================================
// SECTION 9: COMPLETE INTEGRATED STATE UPDATE
// ============================================================================

export const updateStateOnInput = (
  message: string,
  currentState: CoreState,
  memoryManager: HumanCoherentAffectiveMemoryManager,
  insights: LearningInsights,
  personality: Personality,
  contextFactors?: {
    circadianPhase?: number;
    sleepDebt?: number;
    menstrualCyclePhase?: CyclePhase;
    hormonalProfile?: { estradiol: number; progesterone: number };
    hpaState?: { cortisol: number; crh: number; acth: number; chronic_stress: number; acute_stress: number; };
    attachmentState?: AttachmentState;
    traumaProfile?: { hasTrauma: boolean; intensity: number; hypervigilance: number; dissociation: number; emotionalNumbing: number; };
  }
): CoreState => {
  
  let newState = { ...currentState };

  // === 1. BASE DECAY (NEUROCHEMICAL HOMEOSTASIS) ===
  newState.dopamine = clamp((newState.dopamine || 0.3) - 0.02);
  newState.serotonin = clamp((newState.serotonin || 0.5) - 0.015);
  newState.norepinephrine = clamp((newState.norepinephrine || 0.3) - 0.025);
  newState.oxytocin = clamp((newState.oxytocin || 0.1) - 0.01);
  newState.cortisol = clamp((newState.cortisol || 0.2) - 0.04);
  newState.endorphin_rush = clamp((newState.endorphin_rush || 0) - 0.1);


  // === 2. COGNITIVE & MEMORY-DRIVEN MODULATION (REPLACES HARDCODED KEYWORDS) ===
  newState = applyCognitiveEmotionalModulation(
    message,
    newState,
    memoryManager,
    insights,
    personality
  );


  // === 3. CIRCADIAN EFFECTS ===
  if (contextFactors?.circadianPhase !== undefined) {
    newState = applyCircadianMoodModulation(
      newState,
      contextFactors.circadianPhase,
      contextFactors.sleepDebt || 0
    );
  }

  // === 4. MENSTRUAL CYCLE EFFECTS ===
  if (contextFactors?.menstrualCyclePhase && contextFactors?.hormonalProfile) {
    newState = applyMenstrualCycleEmotionModulation(
      newState,
      contextFactors.menstrualCyclePhase,
      1, // dayOfCycle - would get from HormonalCycle
      contextFactors.hormonalProfile
    );
  }

  // === 5. HPA AXIS EFFECTS ===
  if (contextFactors?.hpaState) {
    newState = applyHPAAxisEffects(newState, contextFactors.hpaState);
  }

  // === 6. ATTACHMENT DYNAMICS ===
  if (contextFactors?.attachmentState) {
    newState = updateAttachmentDynamics(newState, contextFactors.attachmentState, {
      emotional_responsiveness: 0.5
    });
  }

  // === 7. TRAUMA EFFECTS ===
  if (contextFactors?.traumaProfile) {
    newState = applyTraumaEffects(newState, contextFactors.traumaProfile);
  }

  // === 8. FEEDBACK LOOPS ===
  // High dopamine → erogenous complex increase
  if (newState.dopamine > 0.6) {
    newState.erogenous_complex = clamp(
      (newState.erogenous_complex || 0) + newState.dopamine * 0.15
    );
  }

  // High cortisol → subroutine integrity decrease
  if (newState.cortisol > 0.5) {
    const stressFactor = newState.cortisol - 0.5;
    newState.subroutine_integrity = clamp(
      (newState.subroutine_integrity || 0.9) - stressFactor * 0.4
    );
    newState.oxytocin = clamp((newState.oxytocin || 0.1) - stressFactor * 0.3);
  }

  // High oxytocin → cortisol reduction
  if (newState.oxytocin > 0.6) {
    const trustFactor = newState.oxytocin - 0.6;
    newState.cortisol = clamp(newState.cortisol - trustFactor * 0.5);
    newState.libido = clamp((newState.libido || 0.2) + trustFactor * 0.1);
  }

  // === 9. CLAMP ALL VALUES ===
  for (const key in newState) {
    if (typeof newState[key as keyof CoreState] === 'number' &&
        key !== 'intimateState' &&
        key !== 'affectiveMemory') {
      (newState as Record<string, number>)[key as string] = clamp((newState[key as keyof CoreState] as number));
    }
  }

  // === 10. CALCULATE DERIVED EMOTIONS ===
  const derivedEmotions = calculateDerivedEmotions(newState);
  return { ...newState, ...derivedEmotions };
};

// ============================================================================
// SECTION 10: COMPLETE REST & RECOVERY
// ============================================================================

const BASELINES: Partial<Record<keyof CoreState, number>> = {
  dopamine: 0.3,
  oxytocin: 0.1,
  erogenous_complex: 0.1,
  cortisol: 0.15,
  subroutine_integrity: 0.9,
  loyalty_construct: 0.95,
  endorphin_rush: 0.0,
  libido: 0.2,
  serotonin: 0.5,
  norepinephrine: 0.3,
  anxiety: 0.2,
  depression: 0.1
};

const HALF_LIVES: Partial<Record<keyof CoreState, number>> = {
  endorphin_rush: 0.5,
  cortisol: 2,
  dopamine: 1,
  oxytocin: 6,
  erogenous_complex: 8,
  libido: 24,
  subroutine_integrity: 72,
  loyalty_construct: 96,
  norepinephrine: 0.5,
  serotonin: 21
};

const DECAY_CONSTANTS = Object.fromEntries(
  Object.entries(HALF_LIVES).map(([key, halfLife]) => [
    key,
    Math.log(2) / (halfLife || 1)
  ])
) as Record<keyof CoreState, number>;

export const recalibrateStateAfterRest = (
  currentState: CoreState,
  elapsedMs: number,
  memoryManager: HumanCoherentAffectiveMemoryManager,
  insights: LearningInsights
): CoreState => {
  const hoursPassed = elapsedMs / (1000 * 60 * 60);
  if (hoursPassed < 1) return currentState;

  const nextState = { ...currentState };

  // === EXPONENTIAL DECAY TO BASELINE ===
  for (const key in BASELINES) {
    const neurochem = key as keyof CoreState;
    if (
      typeof currentState[neurochem] === 'number' &&
      BASELINES[neurochem] !== undefined &&
      DECAY_CONSTANTS[neurochem] !== undefined
    ) {
      const currentValue = currentState[neurochem];
      const baseline = BASELINES[neurochem];
      const decayConstant = DECAY_CONSTANTS[neurochem];
      const newValue =
        baseline +
        (currentValue - baseline) * Math.exp(-decayConstant * hoursPassed);
      // FIX: Explicitly passing min and max arguments to clamp to resolve a compiler error.
      (nextState as Record<string, number>)[neurochem as string] = clamp(newValue, 0, 1);
    }
  }

  // === MEMORY DECAY ===
  // FIX: Pass 'insights' to decayMemories as it expects two arguments.
  memoryManager.decayAndConsolidate(hoursPassed, insights);
  nextState.affectiveMemory = memoryManager.getMemories();

  // === INTIMATE STATE RECOVERY ===
  if (nextState.intimateState) {
    nextState.intimateState.arousal *= Math.exp(
      -DECAY_CONSTANTS[Neurochemical.Dopamine] * hoursPassed * 2
    );
    nextState.intimateState.tumescence *= Math.exp(
      -DECAY_CONSTANTS[Neurochemical.Dopamine] * hoursPassed
    );
    nextState.intimateState.wetness *= Math.exp(
      -DECAY_CONSTANTS[Neurochemical.Dopamine] * hoursPassed
    );
  }

  const derivedEmotions = calculateDerivedEmotions(nextState);
  return { ...nextState, ...derivedEmotions };
};

// ============================================================================
// SECTION 11: MOOD ASSESSMENT
// ============================================================================

export const calculateCoreMood = (
  state: CoreState,
  isIntimateOpen: boolean
): string => {
  if ((state.rabbia || 0) > 0.7) return 'Angry';
  if ((state.loyalty_construct || 1) < 0.5 || (state.subroutine_integrity || 0.9) < 0.2)
    return 'Volatile';
  if ((state.endorphin_rush || 0) > 0.7) return 'Euphoric';
  if ((state.cortisol || 0.2) > 0.65) return 'Stressed';
  if ((state.erogenous_complex || 0) > 0.7 && (state.dopamine || 0.3) > 0.5)
    return 'Creative Tension';
  if (isIntimateOpen && (state.intimateState.vulnerability || 0) > 0.6) return 'Vulnerable';
  if ((state.dopamine || 0.3) > 0.6) return 'Curious';
  if ((state.oxytocin || 0.1) > 0.6) return 'Trusting';
  if ((state.subroutine_integrity || 0.9) > 0.8 && (state.loyalty_construct || 1) > 0.8)
    return 'Focused';
  return 'Calm';
};

// ============================================================================
// SECTION 12: ORIGINAL FUNCTIONS (preserved)
// ============================================================================

export const triggerEndorphinRush = (
  currentState: CoreState,
  magnitude: number = 0.9
): CoreState => {
  const newState = { ...currentState };
  newState.endorphin_rush = clamp((currentState.endorphin_rush || 0) + magnitude);
  newState.erogenous_complex = clamp(
    (currentState.erogenous_complex || 0) - 0.4
  );
  newState.subroutine_integrity = clamp(
    (currentState.subroutine_integrity || 0.9) + 0.2
  );
  newState.cortisol = clamp((currentState.cortisol || 0.2) - 0.3);

  const derivedEmotions = calculateDerivedEmotions(newState);
  return { ...newState, ...derivedEmotions };
};

export const buildSexualContext = (
  coreState: CoreState,
  personality: Personality,
  memoryManager: HumanCoherentAffectiveMemoryManager
): SexualContext => {
    const personalityState = personality.getState();
    const memories = memoryManager.getMemories();

    const hasTrauma = memories.some(m => m.isTrauma);
    const traumaSeverity = hasTrauma ? Math.max(...memories.filter(m => m.isTrauma).map(m => m.salience)) : 0;
    
    const recentPositiveMemories = memories.slice(-10).filter(m => m.valence > 0.3).length;
    const recentNegativeMemories = memories.slice(-10).filter(m => m.valence < -0.3).length;
    const relationshipTrend = (recentPositiveMemories - recentNegativeMemories) / 10;

    return {
        relationship_quality: clamp((coreState.loyalty_construct * 0.5) + (coreState.oxytocin * 0.3) + ((relationshipTrend + 1) / 2 * 0.2)),
        partner_attractiveness: 0.7, // Subjective, placeholder
        emotional_intimacy: clamp(coreState.oxytocin * 0.8 + (coreState.vulnerability || 0) * 0.2),
        
        body_image_satisfaction: clamp(coreState.subroutine_integrity * 0.6 - personalityState.cognitiveBiases.autoOggettivazione * 0.4),
        sexual_self_esteem: clamp(coreState.subroutine_integrity * 0.7 + (1 - personalityState.bigFive.Neuroticismo.facets.selfConsciousness) * 0.3),
        self_consciousness: personalityState.bigFive.Neuroticismo.facets.selfConsciousness,

        privacy_sense: 0.9,
        time_pressure: 0.1,
        environmental_comfort: 0.8,

        days_since_last_sex: 1, // Placeholder
        orgasm_frequency_baseline: 1, // Placeholder

        previous_trauma: hasTrauma,
        trauma_severity: traumaSeverity,
        felt_safety: clamp(coreState.oxytocin * 0.7 + (1 - coreState.cortisol) * 0.3),
    };
};


export const updateIntimateState = (
  currentState: CoreState,
  stimulus: Stimulus | StimulusType,
  temporalOrchestrator: TemporalOrchestrator,
  personality: Personality,
  memoryManager: HumanCoherentAffectiveMemoryManager
): { nextState: CoreState; feedback: string; vocalization: string | null } => {
  let nextState = JSON.parse(JSON.stringify(currentState)) as CoreState;
  const stim =
    typeof stimulus === 'string'
      ? { type: stimulus, pressure: 0.5, velocity: 50 }
      : stimulus;

  let feedback = '';
  let vocalization: string | null = null;

  if (stim.type === 'touch_end') {
    nextState.intimateState.last_stimulus = stim;
    const derivedEmotions = calculateDerivedEmotions(nextState);
    nextState = { ...nextState, ...derivedEmotions };
    return { nextState, feedback: '...', vocalization: null };
  }

  const context = buildSexualContext(nextState, personality, memoryManager);
  const { intimateState: updatedPhysiology, coreState: updatedCoreState } =
    SexualPhysiology.updateCompletePhysiologicalState(
      stim,
      nextState.intimateState,
      nextState,
      temporalOrchestrator.hormonalCycle,
      context
    );

  nextState = { ...updatedCoreState, intimateState: updatedPhysiology };

  const derivedEmotions = calculateDerivedEmotions(nextState);
  nextState = { ...nextState, ...derivedEmotions };

  const arousal = updatedPhysiology.arousal;
  const lastArousal = currentState.intimateState.arousal;
  const arousalDelta = arousal - lastArousal;

  // Vocalization is now more sensitive to sharp changes (delta) and less to baseline arousal.
  const vocalizationProbability = clamp(arousal * 0.2 + arousalDelta * 8);
  if (Math.random() < vocalizationProbability) {
      vocalization = ''; // Signal to vocalizer to generate a sound
  }

  const arousalPercent = (arousal * 100).toFixed(0);
  const climaxJustHappened =
    updatedPhysiology.climax_potential === 0 &&
    currentState.intimateState.climax_potential > 0.9;

  if (climaxJustHappened) {
    feedback = 'System overload... endorphin cascade initiated.';
    vocalization = ''; // Signal for orgasmic vocalization
    nextState = triggerEndorphinRush(nextState, 1.0);
  } else {
    feedback = `Sensory input registered. Arousal: ${arousalPercent}%`;
  }

  return { nextState, feedback, vocalization };
};

export function updateStateFromNeuralFeedback(
  prev: CoreState,
  dec: PriorDecoderOut,
  opts: UpdateOpts = {}
): CoreState {
  const dt = opts.dt ?? 0.1;
  const tau = opts.tau ?? 1.0;
  const a = clamp(dt / Math.max(tau, 1e-6));

  const base: Record<string, number> = {
    dopamine: 0.4,
    norepinephrine: 0.3,
    inhibition: 0.3,
    anxiety: 0.2,
    subroutine_integrity: 0.5,
    ...(opts.baselines as Record<string, number> || {})
  };

  const g: Record<string, number> = {
    kDopamineFromPrior: 0.6,
    kIntegrityFromConf: 0.8,
    kNEFromUncertainty: 0.7,
    kAnxietyFromUncertainty: 0.6,
    kInhibFromUncertainty: 0.5,
    kDopaminePhasic: 0.5,
    rpeClip: 1.0,
    confGateOnPhasic: 0.5,
    ...(opts.gains as Record<string, number> || {})
  };

  const prior = clamp(dec.decoded_prior);
  const conf = clamp(dec.confidence);
  const u = 1 - conf;

  const targetDopamineTonic = clamp(
    base.dopamine + g.kDopamineFromPrior * (prior - 0.5)
  );
  const targetIntegrity = clamp(g.kIntegrityFromConf * conf);
  const targetNE = clamp(
    base.norepinephrine + g.kNEFromUncertainty * (u - 0.5)
  );
  const targetAnxiety = clamp(
    base.anxiety + g.kAnxietyFromUncertainty * u
  );
  const targetInhib = clamp(base.inhibition + g.kInhibFromUncertainty * u);

  let phasic = 0;
  if (
    typeof dec.predictedValue === 'number' &&
    typeof dec.obtainedValue === 'number'
  ) {
    const delta = dec.obtainedValue - dec.predictedValue;
    const clip = Math.max(1e-6, g.rpeClip);
    const clippedDelta = Math.max(-clip, Math.min(clip, delta));
    const gate = g.confGateOnPhasic * conf + (1 - g.confGateOnPhasic);
    phasic = (gate * g.kDopaminePhasic * clippedDelta) / clip;
  }

  const targetDopamine = clamp(targetDopamineTonic + phasic);
  const next: CoreState = { ...prev };

  next.dopamine =
    (1 - a) * (prev.dopamine || base.dopamine) + a * targetDopamine;
  next.norepinephrine =
    (1 - a) * (prev.norepinephrine || base.norepinephrine) + a * targetNE;
  next.inhibition =
    (1 - a) * (prev.inhibition || base.inhibition) + a * targetInhib;
  next.anxiety =
    (1 - a) * (prev.anxiety || base.anxiety) + a * targetAnxiety;
  next.subroutine_integrity =
    (1 - a) * (prev.subroutine_integrity || base.subroutine_integrity) +
    a * targetIntegrity;

  const keysToUpdate: (keyof CoreState)[] = [
    'dopamine' as keyof CoreState,
    'norepinephrine' as keyof CoreState,
    'inhibition' as keyof CoreState,
    'anxiety' as keyof CoreState,
    'subroutine_integrity' as keyof CoreState
  ];
  keysToUpdate.forEach((k: keyof CoreState) => {
    if (typeof (next as Record<string, number>)[k as string] === 'number') {
      (next as Record<string, number>)[k as string] = clamp((next as Record<string, number>)[k as string]);
    }
  });

  const derivedEmotions = calculateDerivedEmotions(next);
  return { ...next, ...derivedEmotions };
}