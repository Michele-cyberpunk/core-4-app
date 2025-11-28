/**
 * @file CognitiveLinguisticBridge.ts
 * @description Bridge between cognitive reasoning and linguistic expression
 *
 * Maps reasoning depth/complexity to linguistic parameters:
 * - Chain depth → Syntactic complexity
 * - Certainty level → Register formality
 * - Reasoning type → Discourse structure
 *
 * Scientific References:
 * - Bloom, B. S. (1956). Taxonomy of educational objectives: Handbook I - Cognitive domain
 * - Halliday, M. A. K., & Hasan, R. (1976). Cohesion in English
 * - van Dijk, T. A., & Kintsch, W. (1983). Strategies of discourse comprehension
 * - Graesser, A. C., et al. (2004). Coh-Metrix: Analysis of text on cohesion and language
 * - Hyland, K., & Tse, P. (2004). Metadiscourse in academic writing: A reappraisal
 *
 * Implements bidirectional mapping:
 * - Forward: Reasoning state → Linguistic style parameters
 * - Reverse: Linguistic output → Inferred reasoning depth (for analysis)
 */

import { CoreState } from '../types';

/**
 * Reasoning state structure (subset from agent/cognitive/reasoning.ts)
 */
export interface ReasoningState {
  /** Depth of reasoning: 0-1 (shallow to deep) */
  depth: number;
  /** Number of reasoning steps in chain */
  chainLength: number;
  /** Confidence/certainty: 0-1 (uncertain to certain) */
  certainty: number;
  /** Type of reasoning being performed */
  type: 'deductive' | 'inductive' | 'abductive' | 'analogical' | 'default';
  /** Current cognitive load (affects expression) */
  cognitiveLoad: number;
}

/**
 * Complete mapping between reasoning and linguistic features
 */
export interface CognitiveLinguisticMapping {
  // === Input: Reasoning dimensions ===
  reasoningDepth: number;
  chainLength: number;
  certaintyLevel: number;
  reasoningType: 'deductive' | 'inductive' | 'abductive' | 'analogical' | 'default';

  // === Output: Linguistic parameters ===

  /** Syntactic complexity: 0-1 (simple to complex) */
  syntacticComplexity: number;

  /** Discourse markers appropriate for reasoning type */
  discourseMarkers: string[];

  /** Register level based on certainty */
  registerLevel: 'casual' | 'informal' | 'formal' | 'academic';

  /** Average clauses per sentence */
  clauseDensity: number;

  /** Readability score (Flesch-Kincaid approximation) */
  readabilityGrade: number;

  /** Hedging intensity: 0-1 (direct to heavily hedged) */
  hedgingIntensity: number;

  /** Epistemic stance markers */
  epistemicMarkers: string[];
}

/**
 * Discourse structure extracted from reasoning chain
 */
export interface DiscourseStructure {
  /** Logical connectors identified */
  connectors: Array<{ type: string; marker: string; position: number }>;

  /** Argumentative structure (claim, evidence, warrant) */
  argumentStructure: Array<{ role: 'claim' | 'evidence' | 'warrant'; text: string }>;

  /** Cohesion metrics */
  cohesion: {
    referentialCohesion: number; // Pronoun usage, anaphora
    lexicalCohesion: number;     // Semantic field consistency
    conjunctiveCohesion: number; // Logical connectors
  };
}

/**
 * Complexity profile for linguistic modulation
 */
export interface ComplexityProfile {
  /** Average sentence length (words) */
  avgSentenceLength: number;

  /** Lexical diversity (type-token ratio) */
  lexicalDiversity: number;

  /** Subordination index (dependent clauses per sentence) */
  subordinationIndex: number;

  /** Nominalization frequency */
  nominalizationRate: number;
}

/**
 * Inferred reasoning characteristics from linguistic analysis
 */
export interface ReasoningInference {
  /** Estimated reasoning depth */
  inferredDepth: number;

  /** Detected reasoning type */
  inferredType: 'deductive' | 'inductive' | 'abductive' | 'analogical' | 'unclear';

  /** Confidence in inference */
  confidence: number;

  /** Supporting evidence */
  evidence: string[];
}

/**
 * Style parameters matching StyleModulator expectations
 */
export interface StyleParameters {
  /** Overall activation level: -1 to 1 */
  activation: number;

  /** Valence (emotional tone): -1 to 1 */
  valence: number;

  /** Cognitive control: -1 to 1 */
  control: number;

  /** Social dimension: 0 to 1 */
  social: number;

  /** Syntactic complexity target: 0 to 1 */
  syntacticComplexity: number;

  /** Discourse markers to inject */
  discourseMarkers: string[];

  /** Register formality: 0 to 1 (casual to academic) */
  registerFormality: number;
}

/**
 * CognitiveLinguisticBridge class
 *
 * Implements the mapping between cognitive reasoning processes and
 * linguistic expression patterns.
 */
export class CognitiveLinguisticBridge {

  /**
   * Maps reasoning state to linguistic style parameters
   *
   * @param reasoning - Current reasoning state
   * @returns StyleParameters for linguistic modulation
   */
  public mapToLinguisticStyle(reasoning: ReasoningState): StyleParameters {
    const mapping = this.createMapping(reasoning);

    // Convert mapping to StyleParameters format
    return {
      activation: this.calculateActivationFromReasoning(reasoning),
      valence: 0, // Reasoning is emotionally neutral
      control: this.calculateControlFromReasoning(reasoning),
      social: 0.5, // Neutral social dimension for reasoning
      syntacticComplexity: mapping.syntacticComplexity,
      discourseMarkers: mapping.discourseMarkers,
      registerFormality: this.registerToFormality(mapping.registerLevel)
    };
  }

  /**
   * Creates complete cognitive-linguistic mapping
   */
  private createMapping(reasoning: ReasoningState): CognitiveLinguisticMapping {
    const syntacticComplexity = this.mapDepthToComplexity(reasoning.depth);
    const registerLevel = this.mapCertaintyToRegister(reasoning.certainty);
    const discourseMarkers = this.selectDiscourseMarkers(reasoning.type);
    const clauseDensity = this.calculateClauseDensity(reasoning.depth, reasoning.chainLength);
    const readabilityGrade = this.estimateReadability(syntacticComplexity, clauseDensity);
    const hedgingIntensity = this.calculateHedging(reasoning.certainty);
    const epistemicMarkers = this.selectEpistemicMarkers(reasoning.certainty, reasoning.type);

    return {
      reasoningDepth: reasoning.depth,
      chainLength: reasoning.chainLength,
      certaintyLevel: reasoning.certainty,
      reasoningType: reasoning.type,
      syntacticComplexity,
      discourseMarkers,
      registerLevel,
      clauseDensity,
      readabilityGrade,
      hedgingIntensity,
      epistemicMarkers
    };
  }

  /**
   * Maps reasoning depth to syntactic complexity
   *
   * Based on Bloom's Taxonomy (1956):
   * - Low depth (0-0.3): Simple sentences (knowledge/comprehension)
   * - Medium depth (0.3-0.7): Compound sentences (application/analysis)
   * - High depth (0.7-1.0): Complex nested structures (synthesis/evaluation)
   */
  private mapDepthToComplexity(depth: number): number {
    // Non-linear mapping: complexity increases exponentially with depth
    return Math.pow(depth, 1.5);
  }

  /**
   * Maps certainty level to linguistic register
   *
   * Following Hyland & Tse (2004) on metadiscourse:
   * - Low certainty: Heavy hedging, cautious language
   * - High certainty: Assertive, declarative statements
   */
  private mapCertaintyToRegister(certainty: number): 'casual' | 'informal' | 'formal' | 'academic' {
    if (certainty < 0.3) {
      return 'casual'; // Tentative, exploratory
    } else if (certainty < 0.6) {
      return 'informal'; // Conversational but structured
    } else if (certainty < 0.85) {
      return 'formal'; // Professional, confident
    } else {
      return 'academic'; // Authoritative, definitive
    }
  }

  /**
   * Selects appropriate discourse markers based on reasoning type
   *
   * Reference: Halliday & Hasan (1976) on cohesive devices
   */
  private selectDiscourseMarkers(type: 'deductive' | 'inductive' | 'abductive' | 'analogical' | 'default'): string[] {
    const markerMap: Record<string, string[]> = {
      deductive: [
        'therefore', 'thus', 'consequently', 'hence',
        'it follows that', 'as a result', 'accordingly'
      ],
      inductive: [
        'for example', 'for instance', 'in general', 'typically',
        'usually', 'often', 'in most cases', 'generally speaking'
      ],
      abductive: [
        'likely', 'probably', 'suggests', 'indicates',
        'appears to be', 'seems to', 'may explain', 'could be'
      ],
      analogical: [
        'similarly', 'likewise', 'in the same way', 'by analogy',
        'correspondingly', 'in contrast', 'on the other hand', 'whereas'
      ],
      default: [
        'moreover', 'furthermore', 'additionally', 'in addition',
        'also', 'besides', 'what is more'
      ]
    };

    return markerMap[type] || markerMap.default;
  }

  /**
   * Calculates clause density based on reasoning complexity
   *
   * Shallow reasoning: 1-1.5 clauses/sentence
   * Deep reasoning: 2-4 clauses/sentence
   */
  private calculateClauseDensity(depth: number, chainLength: number): number {
    const baseClauseDensity = 1 + depth * 2; // 1-3 range
    const chainFactor = Math.min(chainLength / 5, 1); // Cap at 5 steps
    return baseClauseDensity + chainFactor * 1; // Max 4 clauses/sentence
  }

  /**
   * Estimates Flesch-Kincaid reading grade level
   *
   * Approximation based on syntactic complexity and clause density
   */
  private estimateReadability(syntacticComplexity: number, clauseDensity: number): number {
    // Simplified Flesch-Kincaid approximation
    // Grade 6-8: Easy reading
    // Grade 9-12: Standard
    // Grade 13+: Advanced

    const baseGrade = 6;
    const complexityContribution = syntacticComplexity * 8; // 0-8 grades
    const densityContribution = (clauseDensity - 1) * 2; // 0-6 grades

    return baseGrade + complexityContribution + densityContribution;
  }

  /**
   * Calculates hedging intensity based on certainty
   *
   * Low certainty → High hedging (using modal verbs, epistemic markers)
   */
  private calculateHedging(certainty: number): number {
    return 1 - certainty; // Inverse relationship
  }

  /**
   * Selects epistemic stance markers
   *
   * Based on certainty and reasoning type
   */
  private selectEpistemicMarkers(certainty: number, type: string): string[] {
    if (certainty < 0.4) {
      // High uncertainty: strong hedging
      return ['might', 'may', 'could', 'possibly', 'perhaps', 'it seems', 'arguably'];
    } else if (certainty < 0.7) {
      // Medium certainty: moderate hedging
      return ['likely', 'probably', 'appears to', 'tends to', 'suggests'];
    } else {
      // High certainty: boosters
      return ['clearly', 'obviously', 'definitely', 'certainly', 'undoubtedly', 'evidently'];
    }
  }

  /**
   * Converts register level to formality score
   */
  private registerToFormality(register: 'casual' | 'informal' | 'formal' | 'academic'): number {
    const formalityMap: Record<string, number> = {
      casual: 0.2,
      informal: 0.4,
      formal: 0.7,
      academic: 0.95
    };
    return formalityMap[register] || 0.5;
  }

  /**
   * Calculates activation from reasoning intensity
   */
  private calculateActivationFromReasoning(reasoning: ReasoningState): number {
    // Higher cognitive load and chain length increase activation
    const loadFactor = reasoning.cognitiveLoad || 0;
    const chainFactor = Math.min(reasoning.chainLength / 10, 1);
    const depthFactor = reasoning.depth;

    return (loadFactor * 0.4 + chainFactor * 0.3 + depthFactor * 0.3) * 2 - 1; // Scale to -1..1
  }

  /**
   * Calculates cognitive control from reasoning state
   */
  private calculateControlFromReasoning(reasoning: ReasoningState): number {
    // Higher certainty and lower cognitive load = higher control
    const certaintyFactor = reasoning.certainty;
    const loadFactor = 1 - (reasoning.cognitiveLoad || 0);

    return (certaintyFactor * 0.6 + loadFactor * 0.4) * 2 - 1; // Scale to -1..1
  }

  /**
   * Extracts discourse structure from reasoning chain
   *
   * @param chainText - Text representation of reasoning chain
   * @returns DiscourseStructure analysis
   */
  public extractDiscourseStructure(chainText: string): DiscourseStructure {
    const connectors = this.identifyConnectors(chainText);
    const argumentStructure = this.parseArgumentStructure(chainText);
    const cohesion = this.analyzeCohesion(chainText);

    return {
      connectors,
      argumentStructure,
      cohesion
    };
  }

  /**
   * Identifies logical connectors in text
   */
  private identifyConnectors(text: string): Array<{ type: string; marker: string; position: number }> {
    const connectorPatterns: Record<string, RegExp[]> = {
      causal: [/therefore|thus|consequently|hence|because|since/gi],
      additive: [/moreover|furthermore|also|additionally|besides/gi],
      adversative: [/however|nevertheless|yet|but|although/gi],
      temporal: [/then|next|subsequently|meanwhile|finally/gi]
    };

    const found: Array<{ type: string; marker: string; position: number }> = [];

    for (const [type, patterns] of Object.entries(connectorPatterns)) {
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          found.push({
            type,
            marker: match[0],
            position: match.index
          });
        }
      }
    }

    return found.sort((a, b) => a.position - b.position);
  }

  /**
   * Parses argumentative structure (simplified Toulmin model)
   */
  private parseArgumentStructure(text: string): Array<{ role: 'claim' | 'evidence' | 'warrant'; text: string }> {
    // Simplified heuristic-based parsing
    // In production, this would use NLP models

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const structure: Array<{ role: 'claim' | 'evidence' | 'warrant'; text: string }> = [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Heuristics for role identification
      if (/^(therefore|thus|consequently|hence)/i.test(trimmed)) {
        structure.push({ role: 'claim', text: trimmed });
      } else if (/^(for example|because|since|given that)/i.test(trimmed)) {
        structure.push({ role: 'evidence', text: trimmed });
      } else if (/^(this (shows|suggests|indicates|implies))/i.test(trimmed)) {
        structure.push({ role: 'warrant', text: trimmed });
      }
    }

    return structure;
  }

  /**
   * Analyzes cohesion metrics (Coh-Metrix inspired)
   *
   * Reference: Graesser et al. (2004)
   */
  private analyzeCohesion(text: string): {
    referentialCohesion: number;
    lexicalCohesion: number;
    conjunctiveCohesion: number;
  } {
    // Simplified cohesion metrics

    const words = text.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Referential cohesion: pronoun density
    const pronouns = words.filter(w => /^(he|she|it|they|this|that|these|those|which)$/.test(w)).length;
    const referentialCohesion = Math.min(pronouns / words.length * 10, 1); // Normalize

    // Lexical cohesion: content word overlap between adjacent sentences
    let lexicalOverlap = 0;
    for (let i = 1; i < sentences.length; i++) {
      const prevWords = new Set(sentences[i - 1].toLowerCase().split(/\s+/));
      const currWords = sentences[i].toLowerCase().split(/\s+/);
      const overlap = currWords.filter(w => prevWords.has(w) && w.length > 3).length;
      lexicalOverlap += overlap;
    }
    const lexicalCohesion = sentences.length > 1 ? lexicalOverlap / (sentences.length - 1) / 5 : 0;

    // Conjunctive cohesion: logical connector density
    const connectors = this.identifyConnectors(text);
    const conjunctiveCohesion = Math.min(connectors.length / sentences.length, 1);

    return {
      referentialCohesion: Math.min(Math.max(referentialCohesion, 0), 1),
      lexicalCohesion: Math.min(Math.max(lexicalCohesion, 0), 1),
      conjunctiveCohesion: Math.min(Math.max(conjunctiveCohesion, 0), 1)
    };
  }

  /**
   * Modulates complexity based on reasoning depth
   *
   * Uses Flesch-Kincaid readability principles
   */
  public modulateComplexity(depth: number): ComplexityProfile {
    // Map depth to target metrics

    const avgSentenceLength = 10 + depth * 15; // 10-25 words
    const lexicalDiversity = 0.5 + depth * 0.3; // 0.5-0.8 TTR
    const subordinationIndex = depth * 2; // 0-2 dependent clauses
    const nominalizationRate = depth * 0.3; // 0-30% of verbs nominalized

    return {
      avgSentenceLength,
      lexicalDiversity,
      subordinationIndex,
      nominalizationRate
    };
  }

  /**
   * Bidirectional: Infers reasoning depth from linguistic output
   *
   * Reverse mapping for analysis/debugging
   */
  public inferReasoningFromLanguage(text: string): ReasoningInference {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);

    // Calculate linguistic complexity indicators
    const avgSentenceLength = words.length / sentences.length;
    const connectors = this.identifyConnectors(text);
    const cohesion = this.analyzeCohesion(text);

    // Estimate depth from complexity
    let inferredDepth = 0;

    // Long sentences suggest deeper reasoning
    if (avgSentenceLength > 20) inferredDepth += 0.3;
    else if (avgSentenceLength > 15) inferredDepth += 0.2;

    // High connector density suggests structured reasoning
    if (connectors.length / sentences.length > 0.5) inferredDepth += 0.3;

    // Strong cohesion suggests coherent reasoning
    const avgCohesion = (cohesion.referentialCohesion + cohesion.lexicalCohesion + cohesion.conjunctiveCohesion) / 3;
    inferredDepth += avgCohesion * 0.4;

    inferredDepth = Math.min(inferredDepth, 1);

    // Infer reasoning type from dominant connectors
    const connectorTypes = connectors.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let inferredType: 'deductive' | 'inductive' | 'abductive' | 'analogical' | 'unclear' = 'unclear';

    if (connectorTypes.causal > (connectorTypes.additive || 0)) {
      inferredType = 'deductive';
    } else if ((connectorTypes.additive || 0) > 2) {
      inferredType = 'inductive';
    }

    // Confidence based on clarity of indicators
    const confidence = Math.min(
      (connectors.length / sentences.length + avgCohesion) / 2,
      1
    );

    const evidence: string[] = [];
    if (avgSentenceLength > 15) evidence.push('Complex sentence structure');
    if (connectors.length > 0) evidence.push(`${connectors.length} logical connectors`);
    if (avgCohesion > 0.5) evidence.push('High textual cohesion');

    return {
      inferredDepth,
      inferredType,
      confidence,
      evidence
    };
  }

  /**
   * Test connection integrity
   * @internal
   */
  public _testConnection(): { status: 'ok' | 'error'; message: string } {
    try {
      // Test forward mapping
      const testReasoning: ReasoningState = {
        depth: 0.7,
        chainLength: 5,
        certainty: 0.8,
        type: 'deductive',
        cognitiveLoad: 0.5
      };

      const styleParams = this.mapToLinguisticStyle(testReasoning);

      if (!styleParams || typeof styleParams.syntacticComplexity !== 'number') {
        throw new Error('Invalid style parameters generated');
      }

      // Test reverse mapping
      const testText = "Therefore, it follows that complex reasoning requires structured discourse. However, clarity remains essential.";
      const inference = this.inferReasoningFromLanguage(testText);

      if (!inference || typeof inference.inferredDepth !== 'number') {
        throw new Error('Invalid reasoning inference generated');
      }

      return {
        status: 'ok',
        message: 'CognitiveLinguisticBridge operational - bidirectional mapping verified'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Bridge test failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}