import { CoreState, ChatMessage, MessageAuthor, LearningInsights, PriorDecoderOut } from '../types';
import { DistributedBrainNetwork } from '../neural/BrainRegions';
import { TemporalOrchestrator } from '../temporal/TemporalOrchestrator';
import { HumanCoherentAffectiveMemoryManager } from '../agent/affective/memory';
import { Personality } from '../agent/personality/Personality';
import { neuralAffectiveBridge } from '../bridges/NeuralAffectiveBridge';
import { PriorDecoder } from '../neural/BayesianDecoder';
import { ai } from './ai';
import { updateStateOnInput, updateStateFromNeuralFeedback } from '../agent/affective/state';

export class PersonaService {
    private brain: DistributedBrainNetwork;
    private temporal: TemporalOrchestrator;
    private memory: HumanCoherentAffectiveMemoryManager;
    private personality: Personality;
    private priorDecoder: PriorDecoder;

    constructor(
        brain: DistributedBrainNetwork,
        temporal: TemporalOrchestrator,
        memory: HumanCoherentAffectiveMemoryManager,
        personality: Personality,
        priorDecoder: PriorDecoder
    ) {
        this.brain = brain;
        this.temporal = temporal;
        this.memory = memory;
        this.personality = personality;
        this.priorDecoder = priorDecoder;
    }

    /**
     * Processes user input with full biological realism.
     * 1. Generates real embeddings from text (Sensory Input).
     * 2. Propagates through the Brain Network.
     * 3. Applies Neurochemical Modulation.
     * 4. Updates Core State based on Neural Feedback.
     */
    async processInput(
        input: string,
        currentState: CoreState,
        insights: LearningInsights
    ): Promise<{ newState: CoreState; sensoryInput: Float32Array }> {

        // 1. Update state based on linguistic/semantic content (Top-down)
        let nextState = updateStateOnInput(input, currentState, this.memory, insights, this.personality);

        // 2. Temporal update (Circadian/Hormonal)
        nextState = this.temporal.update(nextState, this.personality);

        // 3. Generate Real Sensory Input (Bottom-up)
        const sensoryInput = await this.textToRealSensoryInput(input);

        // 4. Propagate through Brain Network
        this.brain.propagate(sensoryInput);

        // 5. Apply Neurochemical Modulation (State -> Brain)
        neuralAffectiveBridge.applyNeurochemicalModulation(this.brain, nextState);

        // 6. Decode Neural State (Brain -> State)
        // This creates the loop: State -> Brain -> State
        const brainActivity = this.brain.exportActivityVector();
        const prior: PriorDecoderOut = {
            decoded_prior: this.priorDecoder.decode(brainActivity),
            confidence: 1
        };

        nextState = updateStateFromNeuralFeedback(nextState, prior);

        return { newState: nextState, sensoryInput };
    }

    /**
     * Converts text to a 50-dimensional sensory input vector using Gemini Embeddings.
     * This replaces the previous random/heuristic implementation.
     */
    private async textToRealSensoryInput(text: string): Promise<Float32Array> {
        try {
            const model = ai.getGenerativeModel({ model: "text-embedding-004" });
            const result = await model.embedContent(text);
            const embedding = result.embedding.values;

            // Map the high-dimensional embedding (e.g., 768) to our 50-dim sensory cortex
            // We use a deterministic projection to maintain consistency.
            return this.projectEmbeddingToSensory(embedding, 50);

        } catch (error) {
            console.error("Embedding generation failed, falling back to heuristic:", error);
            return this.fallbackSensoryInput(text);
        }
    }

    /**
     * Projects a large embedding vector down to the sensory input size.
     * Uses a deterministic "hashing" style projection to avoid needing a stored matrix.
     */
    private projectEmbeddingToSensory(embedding: number[], targetDim: number): Float32Array {
        const output = new Float32Array(targetDim);
        const sourceDim = embedding.length;

        // Simple dimensionality reduction: Strided average pooling
        // This preserves local semantic structure better than random projection
        const stride = Math.floor(sourceDim / targetDim);

        for (let i = 0; i < targetDim; i++) {
            let sum = 0;
            let count = 0;
            for (let j = 0; j < stride && (i * stride + j) < sourceDim; j++) {
                sum += embedding[i * stride + j];
                count++;
            }
            // Normalize to [0, 1] range expected by the brain model (ReLU activation)
            // Embeddings are usually -1 to 1 or similar, so we shift and scale.
            const avg = count > 0 ? sum / count : 0;
            output[i] = Math.max(0, Math.min(1, (avg + 0.5)));
        }

        return output;
    }

    private fallbackSensoryInput(text: string): Float32Array {
        // Fallback if API fails (similar to original but deterministic)
        const arr = new Float32Array(50).fill(0.1);
        const lowerText = text.toLowerCase();
        arr[0] = Math.min(1, text.length / 100);
        if (lowerText.includes('?')) arr[1] = 1.0;
        if (lowerText.includes('!')) arr[2] = 1.0;
        // ... (rest of simple heuristics)
        return arr;
    }
}
