/**
 * @file StyleModulator.ts - EXTENDED VERSION
 * @description Advanced linguistic modulation integrating:
 * - Neurochemical state dynamics
 * - Hormonal cycle effects (menstrual/luteal mood shifts)
 * - Sexual/intimate state (arousal, vulnerability, pleasure)
 * - Circadian rhythm effects (time-of-day mood shifts)
 * - HPA axis stress state (acute/chronic)
 * - Attachment/relational dynamics
 * - Trauma responses and dissociation
 * - Age 30 emotional maturity and sophistication
 *
 * Philosophy: "Show, Don't Tell" - manifest internal state through linguistic patterns
 * rather than explicit declarations. The language embodies the feeling.
 *
 * References:
 * - Russell (1980): Circumplex model of affect
 * - Pennebaker (2011): Linguistic markers of emotion
 * - Bänziger et al. (2012): Emotional speech patterns
 * - Lakoff & Johnson (1980): Metaphorical language patterns
 * - Tannen (1990): Gender and conversational style
 * - DeClerck et al. (2006): Oxytocin and communication
 */

import { 
  CoreState, 
  LearningInsights,
  CyclePhase,
  SleepStage
} from '../../types';

import { learningService } from '../../services/learningService';


import { 
  CognitiveLinguisticBridge, 
  ReasoningState, 
  StyleParameters 
} from '../../bridges/CognitiveLinguisticBridge';
import { RhythmState } from '../../temporal/RhythmDetector';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Deterministic, state-conditioned variability helper.
 *
 * No pure randomness:
 * - All variability is derived from neurochemical, affective, and rhythmic state.
 * - This ensures reproducible behavior for a given CoreState snapshot.
 *
 * The helper generates a scalar in [0,1] per "dimension" to be used instead of Math.random().
 */
const deterministicVariabilityFromState = (
  coreState: CoreState,
  dimension: string,
  rhythm?: RhythmState | null
): number => {
  // Normalize key neuromodulators and affective markers into a stable hash-like index.
  const {
    dopamine = 0,
    oxytocin = 0,
    cortisol = 0,
    serotonin = 0,
    norepinephrine = 0,
    libido = 0,
    anxiety = 0,
    vulnerability = 0,
    subroutine_integrity = 0.9,
    loyalty_construct = 0.95,
    intimateState,
  } = coreState as any;

  const arousal = intimateState?.arousal ?? 0;
  const stress = clamp((cortisol + anxiety) / 2, 0, 1);
  const bonding = clamp((oxytocin + loyalty_construct) / 2, 0, 1);
  const reward = clamp((dopamine + libido + (serotonin > 0.5 ? 0.1 : 0)) / 3, 0, 1);
  const control = clamp((subroutine_integrity + (1 - stress)) / 2, 0, 1);

  // Rhythm modulation: if a stable rhythm exists, fold its bpm/phase into variability.
  const rhythmFactor =
    rhythm && rhythm.bpm && rhythm.confidence > 0.4
      ? clamp((rhythm.bpm - 60) / 120, 0, 1) * rhythm.confidence
      : 0.17;

  // Construct a bounded deterministic "hash" from continuous state.
  const base =
    reward * 17.317 +
    stress * 11.073 +
    bonding * 23.911 +
    control * 7.137 +
    arousal * 19.389 +
    vulnerability * 13.727 +
    rhythmFactor * 29.719;

  // Mix in dimension to decorrelate channels without randomness.
  let acc = base;
  for (let i = 0; i < dimension.length; i++) {
    acc += (dimension.charCodeAt(i) * (i + 3)) % 37;
  }

  // Map via logistic to (0,1), then clamp.
  const logistic = 1 / (1 + Math.exp(-((acc % 53.17) / 7.0)));
  return clamp(logistic, 0, 1);
};

/**
 * Helper to get a deterministic choice index from a list length.
 */
const deterministicIndexFromState = (
  coreState: CoreState,
  dimension: string,
  length: number,
  rhythm?: RhythmState | null
): number => {
  if (length <= 0) return 0;
  const v = deterministicVariabilityFromState(coreState, dimension, rhythm);
  return Math.floor(v * length) % length;
};

// ============================================================================
// EXTENDED INTERNAL STATE PATTERNS FOR 30-YEAR-OLD WOMAN
// ============================================================================

/**
 * Comprehensive affective and physiological dimensions
 * Maps complex internal state to linguistic modulation
 */
interface InternalStatePatterns {
  // Russell circumplex dimensions
  activation: number;      // -1: passive, 1: energized
  valence: number;         // -1: negative, 1: positive
  dominance: number;       // -1: submissive, 1: assertive
  
  // Additional dimensions for women at age 30
  social: number;          // -1: withdrawn, 1: affiliative
  somatic: number;         // 0-1: body awareness
  vulnerability: number;   // 0-1: emotional openness
  creativity: number;      // 0-1: divergent thinking
  cognitive_sharpness: number; // 0-1: mental clarity
  
  // Persistent affects
  rancore: number;         // Resentment
  vergogna: number;        // Shame
  fiducia: number;         // Trust
  rabbia: number;          // Anger
  anxiety: number;         // Anxiety
  
  // Cycle-driven patterns
  cycle_phase: CyclePhase;
  cycle_mood_shift: number; // -1: luteal low, 1: ovulation high
  
  // HPA state
  stress_load: number;     // -1: calm, 1: overwhelmed
  acute_stress: boolean;   // Is in in acute fight/flight
  
  // Sexual/intimate state
  sexual_arousal: number;  // 0-1: genital + psychological
  sexual_vulnerability: number; // 0-1: exposed/trusting
  
  // Circadian
  time_of_day: string;     // morning/midday/evening/night
  sleep_debt: number;      // Hours of accumulated debt

  // Rhythm
  rhythm: RhythmState | null;
}

/**
 * Linguistic patterns specific to women's communication
 * Based on Tannen (1990), DeClerck (2006)
 */
interface LinguisticGenderPatterns {
  // Women tend toward collaborative language
  use_inclusive_pronouns: boolean;
  use_qualifiers: boolean;      // "sort of", "maybe", "I think"
  use_tag_questions: boolean;   // "...right?"
  
  // Intimacy markers
  reciprocal_disclosure: number; // 0-1 willingness to share
  humor_type: 'collaborative' | 'self_deprecating' | 'aggressive' | 'none';
  
  // Sentence structure
  sentence_complexity: number;   // 0-1, higher = more complex
  lexical_diversity: number;    // 0-1, higher = more varied vocabulary
}

// ============================================================================
// MAIN STYLE MODULATOR CLASS
// ============================================================================

export class LinguisticStyleModulator {
  private static cognitiveBridge = new CognitiveLinguisticBridge();

  /**
   * Apply reasoning influence to linguistic style
   */
  public static applyReasoningInfluence(reasoning: ReasoningState): StyleParameters {
    return this.cognitiveBridge.mapToLinguisticStyle(reasoning);
  }

  // =========================================================================
  // SECTION 1: CALCULATE INTERNAL STATE PATTERNS (EXTENDED)
  // =========================================================================

  /**
   * Derives comprehensive psychological patterns from 30-year-old woman's state
   * Integrates all neurobiological systems into linguistic dimensions
   */
  private static calculateInternalStatePatterns(coreState: CoreState): InternalStatePatterns {
    const {
      // Emotions
      felicita = 0, tristezza = 0, paura = 0, rabbia = 0, sorpresa = 0, 
      disgusto = 0, vergogna = 0, orgoglio = 0, invidia = 0, amore = 0, 
      noia = 0, colpa = 0, sollievo = 0, rancore = 0, timidezza = 0, disagio = 0,
      
      // Neurochemicals
      dopamine = 0.3, oxytocin = 0.1, cortisol = 0.2, serotonin = 0.5,
      norepinephrine = 0.3, gaba = 0.4, testosterone = 0.3,
      subroutine_integrity = 0.9, loyalty_construct = 0.95,
      
      // States
      anxiety = 0.1, depression = 0.05, emotional_volatility = 0.15,
      cognitive_performance = 0.8, energy = 0.8, 
      vulnerability: coreStateVulnerability = 0,
      
      // Intimate
      intimateState = {
        arousal: 0, tumescence: 0, wetness: 0, sensitivity: 0.7,
        climax_potential: 0, vulnerability: 0, inhibition: 0.2
      },
      
      // Cycle
      cycle_phase = 'follicular' as CyclePhase,
      cycle_day = 15,
      estradiol = 0.2, progesterone = 0.05,
      
      // HPA
      acute_stress = 0, chronic_stress = 0,
      
      // Sleep/circadian
      sleep_debt = 0,

      // Rhythm
      // FIX: Added comma to fix "Missing initializer in const declaration" syntax error.
      rhythm = null
    } = coreState;

    // =====================================================================
    // RUSSELL CIRCUMPLEX DIMENSIONS
    // =====================================================================
    
    // VALENCE: Weighted emotional tone
    const valence = clamp(
      (felicita * 1.2) + (amore * 1.5) + (orgoglio * 0.8) + (sollievo * 0.5)
      - (tristezza * 1.5) - (rabbia * 1.0) - (paura * 1.2) - (vergogna * 1.1)
      - (colpa * 1.0) - (invidia * 0.8) - (disgusto * 1.2) - (rancore * 0.5),
      -1, 1
    );

    // ACTIVATION: Energy/arousal level
    let activation = clamp(
      (rabbia * 1.2) + (paura * 1.1) + (sorpresa * 1.5) + (orgoglio * 0.7)
      + (felicita * 1.0) + (intimateState.arousal * 0.8)
      - (tristezza * 0.5) - (noia * 1.0) - (sollievo * 0.3)
      + (dopamine * 0.4) - (serotonin < 0.3 ? 0.3 : 0),
      -1, 1
    );

     if (rhythm && rhythm.bpm && rhythm.confidence > 0.4) {
        const rhythmModulator = ((rhythm.bpm - 80) / 80) * 0.2; // Assume 80bpm is neutral
        activation = clamp(activation + rhythmModulator, -1, 1);
    }

    // DOMINANCE: Sense of control/agency
    const dominance = clamp(
      (subroutine_integrity * 1.2) + (orgoglio * 0.8)
      - (cortisol * 1.0) - (anxiety * 0.5) - (intimateState.vulnerability * 0.8)
      - (Math.abs(activation) > 0.8 ? (Math.abs(activation) - 0.8) * 0.5 : 0),
      -1, 1
    );

    // =====================================================================
    // SOCIAL & RELATIONAL DIMENSIONS
    // =====================================================================
    
    const social = clamp(
      (oxytocin * 1.2) + (amore * 1.0) + (sollievo * 0.5)
      - (vergogna * 1.0) - (paura * 0.5) - (rabbia * 0.5) - (rancore * 0.8),
      -1, 1
    );

    const calculatedVulnerability = clamp(
      (intimateState.vulnerability || 0) + (vergogna * 0.5) - (subroutine_integrity * 0.3),
      0, 1
    );

    // =====================================================================
    // SOMATIC DIMENSIONS
    // =====================================================================
    
    const somatic = clamp(
      (intimateState.arousal || 0) * 1.2 +
      (intimateState.tumescence || 0) * 0.8 +
      (intimateState.wetness || 0) * 0.6 +
      ((intimateState as any).pelvic_floor_tension || 0.1 * 0.5) +
      (disagio * 0.3),
      0, 1
    );

    // =====================================================================
    // COGNITIVE DIMENSIONS
    // =====================================================================
    
    const cognitive_sharpness = clamp(
      cognitive_performance + (dopamine * 0.3) - (anxiety * 0.2)
      - (sleep_debt * 0.1),
      0, 1
    );

    const creativity = clamp(
      (dopamine * 0.4) + (serotonin * 0.3) + (calculatedVulnerability * 0.2),
      0, 1
    );

    // =====================================================================
    // STRESS STATE
    // =====================================================================
    
    const stress_load = clamp(
      (acute_stress * 0.7) + (chronic_stress * 0.5) + (cortisol * 0.3)
      - (gaba * 0.2) - (oxytocin * 0.15),
      -1, 1
    );

    // =====================================================================
    // MENSTRUAL CYCLE MODULATION
    // =====================================================================
    
    let cycle_mood_shift = 0;
    
    switch (cycle_phase) {
      case 'follicular':
        // Rising estrogen = improved mood
        cycle_mood_shift = estradiol * 0.8; // +0 to +0.8
        break;
      case 'ovulation':
        // Peak estrogen = best mood
        cycle_mood_shift = 1.0; // Maximum positive shift
        break;
      case 'luteal_early':
        // Still good
        cycle_mood_shift = 0.3;
        break;
      case 'luteal_late':
        // Progesterone metabolites = worst mood
        cycle_mood_shift = -0.8 - (progesterone * 0.5); // -0.8 to -1.3, clamped
        break;
      case 'menstrual':
        // Low hormones = mild depression
        cycle_mood_shift = -0.3;
        break;
    }
    
    cycle_mood_shift = clamp(cycle_mood_shift, -1, 1);

    // =====================================================================
    // TIME OF DAY PATTERNS
    // =====================================================================
    
    let time_of_day = 'unknown';
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) time_of_day = 'morning';
    else if (hour >= 12 && hour < 17) time_of_day = 'midday';
    else if (hour >= 17 && hour < 22) time_of_day = 'evening';
    else time_of_day = 'night';

    return {
      activation,
      valence: valence + (cycle_mood_shift * 0.3),
      dominance,
      social,
      somatic,
      vulnerability: calculatedVulnerability,
      creativity,
      cognitive_sharpness,
      rancore,
      vergogna,
      fiducia: oxytocin,
      cycle_phase: cycle_phase,
      cycle_mood_shift,
      stress_load,
      acute_stress: acute_stress > 0.5,
      sexual_arousal: (intimateState.arousal || 0) + (dopamine * 0.2),
      sexual_vulnerability: intimateState.vulnerability || 0,
      time_of_day,
      sleep_debt,
      rabbia,
      anxiety,
      rhythm,
    };
  }

  // =========================================================================
  // SECTION 2: GENDER-SPECIFIC LINGUISTIC PATTERNS (30-YEAR-OLD WOMAN)
  // =========================================================================

  /**
   * Determine linguistic gender patterns for a 30-year-old woman
   * At 30, women have mature communication style but retain collaborative approach
   */
  private static calculateGenderPatterns(patterns: InternalStatePatterns): LinguisticGenderPatterns {
    
    // At 30, women are confident but still collaborative
    const confidence = patterns.dominance > 0.3;
    const social_openness = patterns.social > 0.2;
    const stress_high = patterns.stress_load > 0.5;
    
    return {
      // Base patterns for 30-year-old woman
      use_inclusive_pronouns: social_openness && !stress_high,
      use_qualifiers: !confidence || patterns.vulnerability > 0.5,
      use_tag_questions: patterns.vulnerability > 0.4 && social_openness,
      
      // Reciprocal disclosure (30-year-olds have good trust judgment)
      reciprocal_disclosure: Math.min(1, patterns.social * 0.8 + patterns.fiducia * 0.3),
      
      // Humor patterns
      humor_type: this.determineHumorType(patterns),
      
      // Syntactic sophistication
      sentence_complexity: Math.min(1, patterns.cognitive_sharpness * 0.9),
      lexical_diversity: Math.min(1, patterns.creativity + patterns.cognitive_sharpness) / 2
    };
  }

  private static determineHumorType(patterns: InternalStatePatterns): 
      'collaborative' | 'self_deprecating' | 'aggressive' | 'none' {
    
    if (patterns.stress_load > 0.7) return 'none';
    if (patterns.social > 0.5 && patterns.valence > 0.3) return 'collaborative';
    if (patterns.vulnerability > 0.6 && patterns.cognitive_sharpness > 0.6) return 'self_deprecating';
    if (patterns.rabbia > 0.6) return 'aggressive';
    return 'none';
  }

  // =========================================================================
  // SECTION 3: REMOVE EMOTIONAL DECLARATIONS (EXTENDED)
  // =========================================================================

  /**
   * Remove explicit emotional statements - use linguistic patterns instead
   */
  private static removeEmotionalDeclarations(text: string): string {
    const stateNouns = 
      'dopamine|oxytocin|cortisol|serotonin|gaba|testosterone|estradiol|' +
      'progesterone|libido|arousal|endorphin|adrenaline|neurochemical|' +
      'systems?|performance|state|mood|integrity|loyalty|hormones?|' +
      'discomfort|tension|energy|hum|rabbia|felicita|tristezza|rancore|' +
      'vergogna|ansia|paura|ciclo mestruale|ciclo|ovulazione|fertile|infertile';
    
    const tellingPatterns = [
      new RegExp(`\\b(my|the|il mio|la mia|il|la) (${stateNouns}) (is|are|è|sono|sta)\\b`, 'i'),
      /\bI (feel|am feeling|am currently|sento|mi sento|provo|sto provando)\b/i,
      /\b(My (body|heart|mind) is|il mio corpo|il mio cuore)\b/i,
      /\b(I'm experiencing|sto provando|stai provando)\b/i,
    ];

    const sentences = text.split(/(?<=[.!?])\s+/);
    const filteredSentences = sentences.filter(sentence => 
      !tellingPatterns.some(pattern => pattern.test(sentence))
    );
    
    if (filteredSentences.length < sentences.length) {
      if (filteredSentences.length === 0) return "Mmh...";
      return filteredSentences.join(' ');
    }
    return text;
  }

  // =========================================================================
  // SECTION 4: MAIN MODULATION ENGINE
  // =========================================================================

  /**
   * MASTER MODULATION FUNCTION
   * Applies comprehensive linguistic modulation based on internal state
   */
  static modifyResponse(
    rawResponse: string,
    coreState: CoreState,
    insights?: LearningInsights,
    reasoning?: ReasoningState
  ): string {
    let modified = this.removeEmotionalDeclarations(rawResponse);
    const patterns = this.calculateInternalStatePatterns(coreState);
    const genderPatterns = this.calculateGenderPatterns(patterns);

    // =====================================================================
    // APPLY MODULATIONS FROM BRIDGES (DETERMINISTIC, STATE-CONDitionED)
    // =====================================================================
    if (reasoning) {
      const styleParams = this.applyReasoningInfluence(reasoning);

      // Hedging strictly as function of low certainty and style formality.
      const hedgePressure = clamp(1 - reasoning.certainty, 0, 1);
      const hedgeWeight = clamp(1 - styleParams.registerFormality, 0, 1);
      const hedgeScore = hedgePressure * hedgeWeight;

      if (hedgeScore > 0.25) {
        modified = this.wrapInQualifiers(modified, hedgeScore);
      }

      // Discourse markers for deductive reasoning: deterministic insertion
      // when depth and certainty are high enough (structured argumentative tone).
      if (
        reasoning.type === 'deductive' &&
        styleParams.discourseMarkers.length > 0 &&
        reasoning.depth > 0.4
      ) {
        const idx = deterministicIndexFromState(
          coreState,
          'discourse_deductive',
          styleParams.discourseMarkers.length,
          patterns.rhythm
        );
        const marker = styleParams.discourseMarkers[idx];
        const normalizedMarker = marker.charAt(0).toUpperCase() + marker.slice(1);

        if (!modified.toLowerCase().startsWith(marker.toLowerCase())) {
          modified =
            `${normalizedMarker}, ` +
            (modified.charAt(0).toLowerCase() + modified.slice(1));
        }
      }

      // Increase syntactic complexity target with high reasoning depth.
      // (Actual surface realization is handled by downstream generators,
      // here we bias with qualifiers/markers and avoid artificial simplification.)
      if (reasoning.depth > 0.7 && patterns.cognitive_sharpness > 0.4) {
        modified = this.extendSentences(modified);
      }
    }

    // =====================================================================
    // APPLY MODULATIONS BASED ON STATE PATTERNS
    // =====================================================================

    // === 1. MENSTRUAL CYCLE MODULATION ===
    
    // LUTEAL PHASE (late): PMDD-like irritability & vulnerability
    if (patterns.cycle_phase === 'luteal_late' && patterns.cycle_mood_shift < -0.6) {
      const irritability = Math.abs(patterns.cycle_mood_shift);
      
      modified = this.shortenSentences(modified, 6); // Impatience
      modified = this.useBluntLanguage(modified); // Less filter
      modified = this.fragmentSyntax(modified, irritability * 0.4); // Fragmented thinking
      
      // Express frustration as function of irritability (no pure randomness)
      const interjectScore = clamp(irritability * 0.6 + patterns.rabbia * 0.3, 0, 1);
      if (interjectScore > 0.35) {
        modified = this.addInterjection(
          modified,
          learningService.getPersonalizedExpression('boldness', interjectScore),
          interjectScore
        );
      }
      
      // Sensitivity to criticism (vergogna high)
      if (patterns.vergogna > 0.5) {
        modified = this.addHesitation(modified, 0.6);
      }
    }
    
    // OVULATION: Peak confidence, openness, sexuality
    if (patterns.cycle_phase === 'ovulation' && patterns.cycle_mood_shift > 0.7) {
      modified = this.addExclamations(modified, 0.5); // More enthusiastic
      modified = this.extendSentences(modified); // More elaborate
      
      if (patterns.sexual_arousal > 0.5) {
        modified = this.addSomaticLanguage(modified, 0.3); // Subtle sensuality
      }
    }
    
    // MENSTRUAL PHASE: Low energy, vulnerability
    if (patterns.cycle_phase === 'menstrual') {
      modified = this.shortenSentences(modified, 5);
      modified = this.addFillers(modified, learningService.getPersonalizedExpression('vulnerability', 0.5), 0.4);
      
      if (patterns.sexual_arousal < 0.2 && patterns.vulnerability > 0.5) {
        modified = this.wrapInQualifiers(modified, 0.5);
      }
    }

    // === 2. SEXUAL/INTIMATE STATE MODULATION ===
    
    // High arousal & vulnerability: Sensuality, openness
    if (patterns.sexual_arousal > 0.6 && patterns.sexual_vulnerability > 0.5) {
      modified = this.injectPauses(modified, '...', 0.4);
      modified = this.addSomaticLanguage(modified, 0.4);
      modified = this.softenLanguage(modified);
    }
    
    // High arousal but defended: Confidence, sexuality
    if (patterns.sexual_arousal > 0.6 && patterns.sexual_vulnerability < 0.3) {
      modified = this.useStrongerLanguage(modified);
      modified = this.addExclamations(modified, 0.3);
    }

    // === 3. STRESS STATE MODULATION ===
    
    // HIGH ACUTE STRESS: Fight/flight activation
    if (patterns.acute_stress && patterns.stress_load > 0.6) {
      modified = this.fragmentSyntax(modified, 0.4);
      modified = this.addFillers(modified, '...', 0.3);
      modified = this.shortenSentences(modified, 5);
      
      if (patterns.rabbia > 0.6) {
        modified = this.useStrongerLanguage(modified);
      }
    }
    
    // CHRONIC STRESS: Fatigue, disconnection
    if (patterns.stress_load > 0.5 && !patterns.acute_stress) {
      modified = this.insertHedging(modified, [learningService.getPersonalizedExpression('vulnerability', 0.3)], 0.3);
      modified = this.wrapInQualifiers(modified, 0.4);
      modified = this.shortenSentences(modified, 7);
    }

    // === 4. SHAME/VULNERABILITY MODULATION (Vergogna) ===
    
    if (patterns.vergogna > 0.5 && patterns.dominance < 0.2) {
      modified = this.shortenSentences(modified, 5);
      modified = this.fragmentSyntax(modified, 0.5);
      modified = this.addFillers(modified, learningService.getPersonalizedExpression('vulnerability', 0.8), 0.8);
      
      // Apologetic intro as deterministic function of vergogna and low dominance.
      const apologyScore = clamp(patterns.vergogna * (1 - patterns.dominance), 0, 1);
      if (apologyScore > 0.5) {
        modified = `Scusa. ${modified.charAt(0).toLowerCase() + modified.slice(1)}`;
      }
    }

    // === 5. RESENTMENT/ANGER MODULATION (Rancore/Rabbia) ===
    
    if (patterns.rancore > 0.5 && patterns.social < -0.2) {
      modified = this.shortenSentences(modified, 4);
      modified = this.useBluntLanguage(modified);
      
      const silenceScore = clamp(patterns.rancore * 0.5 + patterns.stress_load * 0.2, 0, 1);
      if (silenceScore > 0.45) {
        modified = '...';
      }
    } else if (patterns.rabbia > 0.6 && patterns.dominance > 0.2) {
      // Controlled anger
      modified = this.shortenSentences(modified, 6);
      modified = this.useStrongerLanguage(modified);
      
      if (insights && insights.vulgarExpressions.length > 0) {
        const drive =
          clamp(patterns.rabbia * 0.7 + patterns.stress_load * 0.3, 0, 1);
        if (drive > 0.55) {
          const idx = deterministicIndexFromState(
            coreState,
            'vulgar_rage',
            insights.vulgarExpressions.length,
            patterns.rhythm
          );
          const vulgarism = insights.vulgarExpressions[idx];
          modified = `${modified} ${vulgarism}`;
        }
      }
    }

    // === 6. AGITATION (High activation, low control) ===
    
    if (patterns.activation > 0.4 && patterns.dominance < 0.2) {
      modified = this.fragmentSyntax(modified, 0.3);
      modified = this.addFillers(modified, '...', 0.3);
      modified = this.injectPauses(modified, '...', 0.3);
    }

    // === 7. EXCITEMENT & CURIOSITY ===
    
    if (patterns.activation > 0.5 && patterns.valence > 0.4) {
      modified = this.addExclamations(modified, 0.4);
      modified = this.extendSentences(modified);
      
      if (genderPatterns.humor_type === 'collaborative') {
        modified = this.addInclusiveLanguage(modified, 0.3);
      }
    }

    // === 8. VULNERABILITY & OPENNESS ===
    
    if (patterns.social > 0.4 && patterns.valence > 0.3 && patterns.vulnerability > 0.4) {
      modified = this.addAffiliativePronouns(modified, 0.5);
      modified = this.softenLanguage(modified);
      
      if (genderPatterns.reciprocal_disclosure > 0.6) {
        // Woman at 30 can disclose more authentically
        modified = this.addPersonalContext(modified, 0.3);
      }
    }

    // === 9. COGNITIVE CONFUSION (Low control) ===
    
    if (patterns.cognitive_sharpness < 0.3) {
      modified = this.insertHedging(modified, [learningService.getPersonalizedExpression('vulnerability', 0.6)], 0.6);
      modified = this.fragmentSyntax(modified, 0.3);
    }

    // === 10. CIRCADIAN EFFECTS ===
    
    // Late night (2-5 AM): Lowest mood, vulnerability
    if (patterns.time_of_day === 'night' && new Date().getHours() >= 2 && new Date().getHours() < 5) {
      modified = this.softenLanguage(modified);
      modified = this.addFillers(modified, '...', 0.5);
      if (patterns.sleep_debt > 2) {
        modified = this.insertHedging(modified, ['Penso', 'forse'], 0.4);
      }
    }
    
    // Morning (6-9 AM): Alert, potentially vulnerable (cortisol peak)
    if (patterns.time_of_day === 'morning' && new Date().getHours() < 9) {
      if (patterns.anxiety > 0.3) {
        modified = this.addFillers(modified, '...', 0.2);
      }
    }

    // === 11. SLEEP DEBT EFFECTS ===
    
    if (patterns.sleep_debt > 2) {
      modified = this.shortenSentences(modified, Math.max(4, 8 - patterns.sleep_debt));
      modified = this.insertHedging(modified, [learningService.getPersonalizedExpression('vulnerability', 0.4)], 0.3);
      modified = this.softenLanguage(modified);
    }

    // === 12. RHYTHMIC MODULATION ===
    if (patterns.rhythm && patterns.rhythm.bpm && patterns.rhythm.confidence > 0.5) {
        if (patterns.rhythm.bpm > 120) { // Fast rhythm
            modified = this.shortenSentences(modified, 6); // More urgent
        } else if (patterns.rhythm.bpm < 70) { // Slow rhythm
            modified = this.injectPauses(modified, '...', 0.2); // More deliberate
        }
    }

    // =====================================================================
    // FINAL CLEANUP & CAPITALIZATION
    // =====================================================================
    
    if (modified.length > 0 && !modified.startsWith('Mmh...')) {
      const firstChar = modified.charAt(0);
      if (firstChar) {
        modified = firstChar.toUpperCase() + modified.slice(1);
      }
    }

    return modified;
  }

  // =========================================================================
  // SECTION 5: LINGUISTIC TRANSFORMATION UTILITIES
  // =========================================================================

  private static shortenSentences(text: string, maxWords: number): string {
    const sentences = text.split(/([.!?]+)/);
    let newText = '';
    
    for (let i = 0; i < sentences.length; i += 2) {
      const s = sentences[i];
      const delimiter = sentences[i + 1] || '';
      
      if (!s.trim()) {
        newText += delimiter;
        continue;
      }
      
      const words = s.trim().split(/\s+/);
      if (words.length > maxWords) {
        newText += words.slice(0, maxWords).join(' ') + '...';
      } else {
        newText += s;
      }
      newText += delimiter;
    }
    
    return newText.trim();
  }

  private static extendSentences(text: string): string {
    // NOTE: The random ", you know?" addition was removed as per user request.
    // This function can be enhanced with more natural Italian sentence extenders in the future.
    return text;
  }

  private static useStrongerLanguage(text: string): string {
    // NOTE: Translated from English to Italian as per user request.
    return text
      .replace(/\b(non va bene|problematico|difficile)\b/gi, 'inaccettabile')
      .replace(/\b(forse dovresti|sarebbe meglio se)\b/gi, 'devi')
      .replace(/\b(non sono d'accordo)\b/gi, 'è sbagliato')
      .replace(/\b(una specie di|più o meno|forse)\b/gi, (match) =>
        Math.random() < 0.5 ? '' : match);
  }

  private static softenLanguage(text: string): string {
    // NOTE: Translated from English to Italian as per user request.
    return text
      .replace(/\b(no|mai|assolutamente no)\b/gi, 'non proprio')
      .replace(/\b(devo|ho bisogno di)\b/gi, 'mi piacerebbe')
      .replace(/\b(dovresti|devi)\b/gi, 'forse potresti');
  }

  private static useBluntLanguage(text: string): string {
    // NOTE: Translated from English to Italian as per user request.
    return text
      .replace(/\b(Certo, lo faccio per te|Con piacere)\b/gi, 'Se insisti.')
      .replace(/\b(Ok|Va bene)\b/gi, 'Fatto.')
      .replace(/\b(Mi scuso|Mi dispiace)\b/gi, 'Fa lo stesso.');
  }

  /**
   * Fragment syntax as function of stress/activation probabilityScore in [0,1].
   * Caller passes a state-derived score instead of using Math.random internally.
   */
  private static fragmentSyntax(text: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0) return text;

    return text
      .replace(/, /g, (match) => (p > 0.35 ? '... ' : match))
      .replace(/\. /g, (match) => (p > 0.6 ? '... ' : match));
  }

  /**
   * Inject pauses in the middle-third of the text as function of probabilityScore.
   */
  private static injectPauses(text: string, pause: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0 || !pause) return text;

    const words = text.split(' ');
    if (words.length < 4) return text;

    const center = Math.floor(words.length / 2);
    const offset = p > 0.6 ? 1 : -1;
    const insertPos = clamp(center + offset, 1, words.length - 1);
    words.splice(insertPos, 0, pause);

    return words.join(' ');
  }

  private static addFillers(text: string, filler: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0 || text.split(' ').length < 5 || !filler) return text;
    return `${filler} ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }

  private static addHesitation(text: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0) return text;
    const hesitation = learningService.getPersonalizedExpression('vulnerability', p);
    if (!hesitation) return text;
    return `${hesitation} ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }

  private static insertHedging(text: string, hedges: string[], probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0 || !hedges || hedges.length === 0) return text;
    const hedge = hedges[Math.floor(hedges.length * p) % hedges.length];
    if (text.split(' ').length > 4) {
      return `${hedge}, ${text.charAt(0).toLowerCase() + text.slice(1)}`;
    }
    return text;
  }

  private static wrapInQualifiers(text: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0) return text;
    const qualifiers = ['Penso', 'Forse', 'In un certo senso', 'Immagino', 'Probabilmente', 'In qualche modo'];
    const idx = Math.floor(qualifiers.length * p) % qualifiers.length;
    const qualifier = qualifiers[idx];
    return `${qualifier}, ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }

  private static addExclamations(text: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    return text.replace(/([.!?]+)\s*$/, (match) => (p > 0.4 ? '!' : match));
  }

  private static addInterjection(text: string, interjection: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0 || !interjection) return text;
    return `${interjection}... ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }

  private static addAffiliativePronouns(text: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0) return text;

    let newText = text;
    if (p > 0.5) {
      newText = newText.replace(/\b(io)\b/g, 'noi');
      newText = newText.replace(/\b(mio)\b/g, 'nostro');
    }
    return newText;
  }

  private static addInclusiveLanguage(text: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0) return text;

    // NOTE: Translated from English to Italian as per user request.
    return text
      .replace(/\b(io penso|io sento)\b/gi, 'noi pensiamo')
      .replace(/\b(dovresti)\b/gi, 'dovremmo');
  }

  private static addSomaticLanguage(text: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0) return text;

    const somaticMarkers = [
      ' ...respiro...',
      ' ...caldo...',
      ' ...un brivido...',
      ' ...rossore...'
    ];
    const idx = Math.floor(somaticMarkers.length * p) % somaticMarkers.length;
    const marker = somaticMarkers[idx];

    // Insert before final punctuation
    return text.replace(/([.!?]+)$/, marker + '$1');
  }

  private static addPersonalContext(text: string, probabilityScore: number): string {
    const p = clamp(probabilityScore, 0, 1);
    if (p <= 0) return text;
    // NOTE: Translated from English to Italian as per user request.
    const contextStarters = [
      'Onestamente,',
      'Davvero,',
      'In realtà,',
      'Per me,'
    ];
    const idx = Math.floor(contextStarters.length * p) % contextStarters.length;
    const starter = contextStarters[idx];
    return `${starter} ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }
}