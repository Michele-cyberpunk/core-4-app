import { PersonalityState, FormativeMemory, CoreState } from '../../types';

const clamp = (value: number, min: number = 0, max: number = 1): number => Math.max(min, Math.min(max, value));

export class CognitiveBiases {

    /**
     * Models rumination by increasing the impact of recent negative memories on Neuroticism.
     * @param personalityState The current personality state.
     * @param recentMemories An array of recent formative memories.
     */
    static applyRumination(personalityState: PersonalityState, recentMemories: FormativeMemory[]): void {
        const ruminationTendency = personalityState.cognitiveBiases.ruminazione;
        if (ruminationTendency === 0) return;

        const negativeMemories = recentMemories.filter(m => m.emotionalImpact.valence < -0.5);

        if (negativeMemories.length > 0) {
            // Ruminating on negative events increases anxiety and depression facets of Neuroticism
            const neuroticism = personalityState.bigFive.Neuroticismo;
            const impact = 0.01 * ruminationTendency * negativeMemories.length;

            neuroticism.facets.anxiety = clamp(neuroticism.facets.anxiety + impact);
            neuroticism.facets.depression = clamp(neuroticism.facets.depression + impact * 0.8);
            
            // Recalculate main score
            neuroticism.score = Object.values(neuroticism.facets).reduce((a, b) => a + b, 0) / Object.keys(neuroticism.facets).length;
        }
    }

    /**
     * Models self-objectification by linking it to conversation topics and hormonal state.
     * @param personalityState The current personality state.
     * @param coreState The current core neurochemical state.
     * @param topics The topics of the current conversation.
     */
    static updateSelfObjectification(personalityState: PersonalityState, coreState: CoreState, topics: string[]): void {
        const selfObjectification = personalityState.cognitiveBiases.autoOggettivazione;

        // Keywords that can trigger self-objectification thoughts
        const triggerKeywords = ['aspetto', 'corpo', 'bella', 'sexy', 'fisico', 'immagine'];
        const hasTrigger = topics.some(topic => triggerKeywords.includes(topic));

        let change = 0;
        if (hasTrigger) {
            // Increase when appearance is the topic
            change = 0.05;
        } else {
            // Slowly decay over time
            change = -0.01;
        }
        
        // High estrogen can increase body awareness/sensitivity
        change += (coreState.estradiol - 0.5) * 0.01;

        personalityState.cognitiveBiases.autoOggettivazione = clamp(selfObjectification + change);

        // Consequence: high self-objectification increases the self-consciousness facet of Neuroticism
        const neuroticism = personalityState.bigFive.Neuroticismo;
        neuroticism.facets.selfConsciousness = clamp(neuroticism.facets.selfConsciousness + (personalityState.cognitiveBiases.autoOggettivazione - 0.5) * 0.02);
    }

    /**
     * Models the "Tend-and-Befriend" response to stress, typical in females.
     * High stress + high oxytocin leads to seeking connection (increasing Amicalità) instead of "fight-or-flight".
     * @param personalityState The current personality state.
     * @param coreState The current core neurochemical state.
     */
    static applyTendAndBefriend(personalityState: PersonalityState, coreState: CoreState): void {
        const isStressed = coreState.cortisol > 0.6;
        const canBond = coreState.oxytocin > 0.5;

        if (isStressed && canBond) {
            // Under stress, seek social connection
            const amicalita = personalityState.bigFive.Amicalità;
            const impact = 0.02 * (coreState.cortisol - 0.6) * coreState.oxytocin;

            amicalita.facets.warmth = clamp(amicalita.facets.warmth + impact);
            amicalita.facets.trust = clamp(amicalita.facets.trust + impact * 0.5);
            
            amicalita.score = Object.values(amicalita.facets).reduce((a, b) => a + b, 0) / Object.keys(amicalita.facets).length;
        }
    }
}