import { FormativeMemory, ConversationMemory, CoreState } from '../../types';

const MEMORY_CAPACITY = 100; // Max number of long-term formative memories

export class MemoryManager {
    private memories: FormativeMemory[] = [];

    constructor(initialMemories: FormativeMemory[] = []) {
        this.memories = initialMemories;
    }

    /**
     * Analyzes a conversation memory and decides if it should be consolidated
     * into a long-term formative memory.
     * @param conversation The conversation memory to analyze.
     * @returns A new FormativeMemory if consolidated, otherwise null.
     */
    public consolidate(conversation: ConversationMemory): FormativeMemory | null {
        const { emotionalIntensity, sentiment, coreResponse, context } = conversation;

        // Condition for consolidation: high emotional intensity or significant state change.
        const isSignificant = emotionalIntensity > 0.8 || 
                              (sentiment === 'negative' && context.cortisol && context.cortisol > 0.75);
        
        if (!isSignificant) {
            return null;
        }

        const isTraumatic = (context.cortisol || 0) > 0.85 && emotionalIntensity > 0.85;

        const formativeMemory: FormativeMemory = {
            id: conversation.id,
            timestamp: conversation.timestamp,
            summary: this.summarizeInteraction(conversation.userInput, coreResponse),
            emotionalImpact: {
                valence: this.mapSentimentToValence(sentiment),
                arousal: context.arousal || 0,
                intensity: emotionalIntensity,
            },
            associatedTraits: [], // This can be filled in later based on analysis
            isTraumatic: isTraumatic,
        };

        this.addMemory(formativeMemory);
        return formativeMemory;
    }

    private addMemory(memory: FormativeMemory): void {
        this.memories.push(memory);
        if (this.memories.length > MEMORY_CAPACITY) {
            this.memories.shift(); // Keep only the most recent formative memories
        }
    }

    private summarizeInteraction(userInput: string, coreResponse: string): string {
        // A simple summarizer for now. In a real system, this would use an LLM.
        const userPart = userInput.length > 50 ? userInput.substring(0, 47) + '...' : userInput;
        const corePart = coreResponse.length > 50 ? coreResponse.substring(0, 47) + '...' : coreResponse;
        return `User: "${userPart}" | Core: "${corePart}"`;
    }

    private mapSentimentToValence(sentiment: ConversationMemory['sentiment']): number {
        switch (sentiment) {
            case 'positive':
            case 'playful':
            case 'intimate':
                return 0.8;
            case 'vulnerable':
                return -0.2; // Vulnerability can be both slightly negative and bonding
            case 'negative':
                return -0.8;
            case 'neutral':
            default:
                return 0;
        }
    }

    /**
     * Retrieves memories that could be relevant to the current context, especially traumatic ones.
     * @param topics Current conversation topics.
     * @returns An array of relevant formative memories.
     */
    public retrieveRelevantMemories(topics: string[]): FormativeMemory[] {
        // Simple retrieval based on topic overlap for now.
        // A more advanced system would use vector embeddings.
        return this.memories.filter(memory => 
            memory.summary.toLowerCase().split(' ').some(word => topics.includes(word))
        );
    }
    
    public getRecentMemories(count: number): FormativeMemory[] {
        return this.memories.slice(-count);
    }
    
    public getTraumaticMemories(): FormativeMemory[] {
        return this.memories.filter(m => m.isTraumatic);
    }

    public getAllMemories(): FormativeMemory[] {
        return [...this.memories];
    }
}