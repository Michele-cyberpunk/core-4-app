import { CoreState, StimulusPayload, AffectiveMemory, Neurochemical, MemoryType } from '../../types';
import { neuralAffectiveBridge } from '../../bridges/NeuralAffectiveBridge';

// Simple text similarity function (e.g., Jaccard index on words)
const calculateSimilarity = (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    const set1 = new Set(text1.toLowerCase().split(' '));
    const set2 = new Set(text2.toLowerCase().split(' '));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
};

const clamp = (value: number, min = -1, max = 1) => Math.max(min, Math.min(max, value));

export class HumanCoherentAffectiveMemoryManager {
    private memories: AffectiveMemory[] = [];
    private readonly MAX_MEMORIES = 200;
    private readonly RETRIEVAL_THRESHOLD = 0.1;
    private apiKey: string;

    constructor(apiKey: string, initialMemories: AffectiveMemory[] = []) {
        this.apiKey = apiKey;
        this.memories = initialMemories;
    }

    /**
     * Encodes a new experience into affective memory, classifying it and assessing its impact.
     * @param stimulus The input that caused the experience.
     * @param coreResponse The text response from the AI.
     * @param state The resulting CoreState after the interaction.
     */
    public encode(stimulus: StimulusPayload, coreResponse: string, state: CoreState): void {
        const pavDimensions = neuralAffectiveBridge.coreStateToAffective(state);
        const valence = pavDimensions.valence;
        const salience = Math.max(state.cortisol, state.dopamine, state.endorphin_rush, pavDimensions.arousal);

        // Do not record mundane events
        if (salience < 0.3 && Math.abs(valence) < 0.3) {
            return;
        }
        
        // Classify memory type
        let type = MemoryType.LONG_TERM_EPISODIC;
        if (salience > 0.9 && Math.abs(valence) > 0.8) {
            type = MemoryType.FLASHBULB;
        } else if (stimulus.metadata?.isProcedural) {
            type = MemoryType.PROCEDURAL;
        } else if (salience < 0.1) {
            type = MemoryType.IMPLICIT;
        }

        const newMemory: AffectiveMemory = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            stimulus,
            coreResponse,
            response: {
                [Neurochemical.Dopamine]: state.dopamine,
                [Neurochemical.Oxytocin]: state.oxytocin,
                [Neurochemical.Cortisol]: state.cortisol,
                [Neurochemical.EndorphinRush]: state.endorphin_rush,
            },
            valence: clamp(valence),
            salience: clamp(salience, 0, 1),
            type,
            consolidationStatus: 'transient',
            isRepressed: state.cortisol > 0.85 && valence < -0.7, // Auto-repress traumatic events
            isSubconscious: type === MemoryType.IMPLICIT || type === MemoryType.PROCEDURAL,
            encodingModel: salience > 0.7 ? 'three_phase_emotional' : 'atkinson-shiffrin',
            pav: {
                pleasure: pavDimensions.valence,
                arousal: pavDimensions.arousal,
                dominance: pavDimensions.dominance
            },
        };

        this.memories.push(newMemory);
        if (this.memories.length > this.MAX_MEMORIES) {
            this.memories.shift();
        }
    }

    /**
     * Retrieves memories relevant to a given stimulus.
     * @param stimulus The current input stimulus.
     * @param emotionalContext The current emotional state, used to bias retrieval.
     * @returns An array of relevant memories, sorted by relevance.
     */
    public retrieve(stimulus: StimulusPayload, emotionalContext: CoreState): (AffectiveMemory & { similarity: number })[] {
        if (!stimulus.text) return [];

        return this.memories
            .map(memory => {
                const textSimilarity = memory.stimulus.text ? calculateSimilarity(stimulus.text!, memory.stimulus.text) : 0;
                
                const contextValence = (emotionalContext.felicita - emotionalContext.tristezza) + (emotionalContext.amore - emotionalContext.paura);
                const valenceDiff = Math.abs(memory.valence - contextValence);
                const emotionalCongruence = 1 - (valenceDiff / 2); // 0-1 score

                // Repressed memories are harder to access unless there's high emotional congruence and a strong trigger
                const repressionFactor = memory.isRepressed ? (emotionalCongruence > 0.8 && textSimilarity > 0.5 ? 1.0 : 0.1) : 1.0;

                const relevance = (textSimilarity * 0.6 + emotionalCongruence * 0.4) * repressionFactor * memory.salience;

                return {
                    ...memory,
                    similarity: relevance,
                };
            })
            .filter(item => item.similarity > this.RETRIEVAL_THRESHOLD)
            .sort((a, b) => b.similarity - a.similarity);
    }
    
    /**
     * Creates a traumatic or repressed memory.
     * @param stimulus The stimulus associated with the negative event.
     * @param intensity The intensity of the negative reaction (0-1).
     * @param repress Whether the memory should be repressed.
     */
    public createTraumaticMemory(stimulus: StimulusPayload, intensity: number, repress: boolean = false): void {
         const newMemory: AffectiveMemory = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            stimulus,
            response: {
                [Neurochemical.Dopamine]: 0.1,
                [Neurochemical.Oxytocin]: 0,
                [Neurochemical.Cortisol]: clamp(0.5 + intensity * 0.5, 0, 1),
                [Neurochemical.EndorphinRush]: 0,
            },
            valence: -intensity,
            salience: clamp(0.5 + intensity * 0.5, 0, 1),
            isTrauma: true,
            type: MemoryType.FLASHBULB,
            consolidationStatus: 'consolidated', // Traumatic memories consolidate quickly
            isRepressed: repress,
            isSubconscious: true,
            encodingModel: 'evolutionary',
             pav: { pleasure: -intensity, arousal: intensity, dominance: -intensity },
             pavScore: { paradox: 0.8, action: intensity, vividness: intensity, total: intensity }
        };
        this.memories.push(newMemory);
    }
    
    /**
     * Simulates memory decay and consolidation over time.
     * @param hoursPassed The number of hours that have passed.
     * @param insights Learning insights which can protect certain memories from decay.
     */
    public decayAndConsolidate(hoursPassed: number) {
        if (hoursPassed < 0.001) return;
        const baseDecayConstant = Math.log(2) / (7 * 24); // ~7 day half-life for salience

        this.memories = this.memories.map(memory => {
            let decayMultiplier = 1.0;

            // Autobiographical & Flashbulb memories decay slower
            if (memory.type === MemoryType.AUTOBIOGRAPHICAL || memory.type === MemoryType.FLASHBULB || memory.isTrauma) {
                decayMultiplier = 0.25;
            }
            
            // Repressed memories don't lose salience, they just become inaccessible
            if (memory.isRepressed) {
                decayMultiplier = 0;
            }

            // Consolidate memories over time
            if (memory.consolidationStatus === 'transient' && hoursPassed > 1) {
                memory.consolidationStatus = 'consolidating';
            } else if (memory.consolidationStatus === 'consolidating' && hoursPassed > 24) {
                memory.consolidationStatus = 'consolidated';
                if (memory.salience > 0.6) {
                    memory.type = MemoryType.LONG_TERM_EPISODIC;
                }
            }

            return {
                ...memory,
                salience: memory.salience * Math.exp(-baseDecayConstant * hoursPassed * decayMultiplier),
            };
        }).filter(memory => memory.salience > 0.01 || memory.isRepressed); // Prune weak memories, but keep repressed ones
    }

    public getMemories(): AffectiveMemory[] {
        return this.memories;
    }

    /**
     * Reinforces a memory by increasing its salience (simulating recall).
     * @param memoryId The ID of the memory to reinforce.
     */
    public reinforceMemory(memoryId: string): void {
        const memory = this.memories.find(m => m.id === memoryId);
        if (memory) {
            memory.salience = Math.min(1, memory.salience * 1.1 + 0.05);
            if (memory.consolidationStatus === 'transient') {
                memory.consolidationStatus = 'consolidating';
            }
        }
    }
}