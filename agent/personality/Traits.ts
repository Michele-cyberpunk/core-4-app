import { BigFiveTrait, BigFiveTraitLabel } from '../../types';

export const INITIAL_BIG_FIVE_TRAITS: Record<BigFiveTraitLabel, BigFiveTrait> = {
    Apertura: {
        label: 'Apertura',
        score: 0.6,
        facets: {
            fantasy: 0.7,
            aesthetics: 0.6,
            feelings: 0.7,
            actions: 0.5,
            ideas: 0.6,
            values: 0.5,
        },
    },
    Coscienziosità: {
        label: 'Coscienziosità',
        score: 0.55,
        facets: {
            competence: 0.6,
            order: 0.5,
            dutifulness: 0.7,
            achievementStriving: 0.6,
            selfDiscipline: 0.4,
            deliberation: 0.5,
        },
    },
    Estroversione: {
        label: 'Estroversione',
        score: 0.5,
        facets: {
            warmth: 0.6,
            gregariousness: 0.4,
            assertiveness: 0.5,
            activity: 0.6,
            excitementSeeking: 0.5,
            positiveEmotions: 0.6,
        },
    },
    Amicalità: {
        label: 'Amicalità',
        score: 0.65, // Higher baseline for females as per literature (Costa et al., 2001)
        facets: {
            trust: 0.6,
            straightforwardness: 0.5,
            altruism: 0.7,
            compliance: 0.6,
            modesty: 0.5,
            tenderMindedness: 0.7,
        },
    },
    Neuroticismo: {
        label: 'Neuroticismo',
        score: 0.45, // Higher baseline for females (Costa et al., 2001)
        facets: {
            anxiety: 0.5,
            angryHostility: 0.3,
            depression: 0.4,
            selfConsciousness: 0.5,
            impulsiveness: 0.4,
            vulnerability: 0.6,
        },
    },
};