import { CoreState, PersonalityState, BigFiveTrait, BigFiveTraitLabel, ConversationMemory, FormativeMemory, CognitiveBiasState } from '../../types';
import { INITIAL_BIG_FIVE_TRAITS } from './Traits';
import { PERSONALITY_ARCHETYPES, Archetype } from './Archetypes';
import { CognitiveBiases } from './CognitiveBiases';
import { MemoryManager } from './MemoryManager';

const clamp = (value: number, min: number = 0, max: number = 1): number => Math.max(min, Math.min(max, value));

export class Personality {
    private state: PersonalityState;
    private memoryManager: MemoryManager;

    constructor(initialState?: Partial<PersonalityState>) {
        this.state = {
            bigFive: JSON.parse(JSON.stringify(INITIAL_BIG_FIVE_TRAITS)),
            attachmentStyle: 'sicuro',
            cognitiveBiases: {
                ruminazione: 0.3,
                autoOggettivazione: 0.2,
                stereotype_threat: 0.1,
                self_fulfilling_prophecy: 0.1,
                catastrophizing: 0.2,
                all_or_nothing_thinking: 0.15,
                emotional_reasoning: 0.25,
                overgeneralization: 0.2,
                mind_reading: 0.15,
                personalization: 0.2,
            },
            simulatedAge: 25,
            ...initialState
        };
        this.memoryManager = new MemoryManager();
    }

    public getState(): PersonalityState {
        return this.state;
    }

    /**
     * Main update loop for personality, called after each interaction.
     */
    public updateFromExperience(conversation: ConversationMemory, coreState: CoreState): void {
        const formativeMemory = this.memoryManager.consolidate(conversation);
        if (formativeMemory) {
            this.applyMemoryImpact(formativeMemory);
        }

        // Apply cognitive bias models
        CognitiveBiases.applyRumination(this.state, this.memoryManager.getRecentMemories(5));
        CognitiveBiases.updateSelfObjectification(this.state, coreState, conversation.topics);
        CognitiveBiases.applyTendAndBefriend(this.state, coreState);

        this.recalculateAllScores();
    }

    /**
     * Applies slow, continuous updates based on biological state.
     */
    public updateFromBiologicalState(coreState: CoreState): void {
        const { estradiol, progesterone, cortisol, oxytocin } = coreState;

        // Estrogen's influence on empathy and anxiety
        this.state.bigFive.Amicalità.score = clamp(this.state.bigFive.Amicalità.score + (estradiol - 0.5) * 0.001);
        this.state.bigFive.Neuroticismo.score = clamp(this.state.bigFive.Neuroticismo.score - (estradiol - 0.5) * 0.0005); // High E2 reduces anxiety

        // Progesterone's calming (but sometimes depressive) effect
        this.state.bigFive.Neuroticismo.score = clamp(this.state.bigFive.Neuroticismo.score + (progesterone - 0.4) * 0.0005); // Can increase negative affect in luteal phase

        // Chronic cortisol's effect on Neuroticism and Amicalità
        if (coreState.chronic_stress > 0.5) {
            this.state.bigFive.Neuroticismo.score = clamp(this.state.bigFive.Neuroticismo.score + coreState.chronic_stress * 0.001);
            this.state.bigFive.Amicalità.score = clamp(this.state.bigFive.Amicalità.score - coreState.chronic_stress * 0.0005); // Stress can reduce trust
        }
        
        // Oxytocin's influence on trust and connection
        this.state.bigFive.Amicalità.score = clamp(this.state.bigFive.Amicalità.score + (oxytocin - 0.5) * 0.001);
        
        this.recalculateAllScores();
    }
    
    /**
     * Applies very slow changes simulating aging and life experience.
     */
    public longTermUpdate(elapsedHours: number): void {
        const elapsedYears = elapsedHours / (24 * 365.25);
        this.state.simulatedAge += elapsedYears;
        const age = this.state.simulatedAge;

        // McCrae & Costa's findings on age-related changes
        if (age > 20 && age < 40) {
            // Increase in Coscienziosità and Amicalità
            this.state.bigFive.Coscienziosità.score = clamp(this.state.bigFive.Coscienziosità.score + 0.00001 * elapsedHours);
            this.state.bigFive.Amicalità.score = clamp(this.state.bigFive.Amicalità.score + 0.00001 * elapsedHours);
        }
        if (age > 30) {
            // Decrease in Neuroticismo, Estroversione, Apertura
            this.state.bigFive.Neuroticismo.score = clamp(this.state.bigFive.Neuroticismo.score - 0.00002 * elapsedHours);
            this.state.bigFive.Estroversione.score = clamp(this.state.bigFive.Estroversione.score - 0.00001 * elapsedHours);
            this.state.bigFive.Apertura.score = clamp(this.state.bigFive.Apertura.score - 0.00001 * elapsedHours);
        }
    }
    
    private applyMemoryImpact(memory: FormativeMemory): void {
        const { emotionalImpact, isTraumatic } = memory;
        const impactFactor = emotionalImpact.intensity * (isTraumatic ? 5.0 : 1.0);

        if (emotionalImpact.valence < -0.5) { // Negative event
            this.state.bigFive.Neuroticismo.score = clamp(this.state.bigFive.Neuroticismo.score + 0.05 * impactFactor);
            this.state.bigFive.Amicalità.facets.trust = clamp(this.state.bigFive.Amicalità.facets.trust - 0.1 * impactFactor);
            if (isTraumatic) {
                this.state.attachmentStyle = 'ansioso';
            }
        } else { // Positive event
            this.state.bigFive.Estroversione.facets.positiveEmotions = clamp(this.state.bigFive.Estroversione.facets.positiveEmotions + 0.05 * impactFactor);
            this.state.bigFive.Amicalità.facets.trust = clamp(this.state.bigFive.Amicalità.facets.trust + 0.05 * impactFactor);
        }
    }

    private recalculateAllScores(): void {
        for (const trait of Object.values(this.state.bigFive)) {
            trait.score = Object.values(trait.facets).reduce((sum, facetScore) => sum + facetScore, 0) / Object.keys(trait.facets).length;
        }
    }
    
    public getCurrentArchetype(): Archetype {
        const activeArchetype = PERSONALITY_ARCHETYPES.find(arch => arch.isActive(this.state.bigFive));
        return activeArchetype || PERSONALITY_ARCHETYPES.find(a => a.name === 'The Everywoman')!;
    }
    
    public getPersonalitySummary(): string {
        const archetype = this.getCurrentArchetype();
        const dominantTrait = Object.values(this.state.bigFive).sort((a,b) => b.score - a.score)[0];
        const lowestTrait = Object.values(this.state.bigFive).sort((a,b) => a.score - b.score)[0];

        return `Your personality is currently expressing the '${archetype.name}' archetype. This is characterized by high ${dominantTrait.label.toLowerCase()} and low ${lowestTrait.label.toLowerCase()}. ${archetype.description}`;
    }

    public serialize(): any {
        return this.state;
    }

    public deserialize(savedState: any): void {
        // A simple merge would be better to avoid breaking changes
        this.state = { ...this.state, ...savedState };
    }
}