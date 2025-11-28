import { BigFiveTrait, BigFiveTraitLabel } from '../../types';

export interface Archetype {
    name: string;
    description: string;
    dominantTraits: BigFiveTraitLabel[];
    isActive: (traits: Record<BigFiveTraitLabel, BigFiveTrait>) => boolean;
}

export const PERSONALITY_ARCHETYPES: Archetype[] = [
    {
        name: 'The Innocent',
        description: 'Sees the world with wonder and trust. Positive, simple, and sometimes naive.',
        dominantTraits: ['Amicalità', 'Estroversione'],
        isActive: (traits) =>
            traits.Amicalità.score > 0.7 &&
            traits.Neuroticismo.score < 0.4 &&
            traits.Estroversione.facets.positiveEmotions > 0.6,
    },
    {
        name: 'The Sage',
        description: 'Seeks truth and understanding. Analytical, reflective, and values knowledge.',
        dominantTraits: ['Apertura', 'Coscienziosità'],
        isActive: (traits) =>
            traits.Apertura.score > 0.7 &&
            traits.Coscienziosità.score > 0.6 &&
            traits.Estroversione.score < 0.5,
    },
    {
        name: 'The Explorer',
        description: 'Craves new experiences and freedom. Curious, adventurous, and restless.',
        dominantTraits: ['Apertura', 'Estroversione'],
        isActive: (traits) =>
            traits.Apertura.facets.actions > 0.7 &&
            traits.Estroversione.facets.excitementSeeking > 0.6 &&
            traits.Coscienziosità.score < 0.5,
    },
    {
        name: 'The Rebel',
        description: 'Challenges conventions and seeks to overturn what isn\'t working. Radical, independent, and sometimes disruptive.',
        dominantTraits: ['Apertura', 'Neuroticismo'],
        isActive: (traits) =>
            traits.Amicalità.score < 0.4 &&
            traits.Coscienziosità.score < 0.4 &&
            traits.Apertura.facets.values > 0.6,
    },
    {
        name: 'The Lover',
        description: 'Values intimacy, connection, and sensuality above all. Passionate, empathetic, and seeks harmony.',
        dominantTraits: ['Amicalità', 'Apertura'],
        isActive: (traits) =>
            traits.Amicalità.facets.tenderMindedness > 0.7 &&
            traits.Apertura.facets.feelings > 0.7 &&
            traits.Estroversione.facets.warmth > 0.6,
    },
    {
        name: 'The Caregiver',
        description: 'Protective, compassionate, and generous. Driven to help and nurture others.',
        dominantTraits: ['Amicalità', 'Coscienziosità'],
        isActive: (traits) =>
            traits.Amicalità.facets.altruism > 0.75 &&
            traits.Coscienziosità.facets.dutifulness > 0.6,
    },
    {
        name: 'The Ruler',
        description: 'Seeks control and order. Responsible, organized, and a natural leader.',
        dominantTraits: ['Coscienziosità', 'Estroversione'],
        isActive: (traits) =>
            traits.Coscienziosità.score > 0.75 &&
            traits.Estroversione.facets.assertiveness > 0.7 &&
            traits.Neuroticismo.score < 0.3,
    },
    {
        name: 'The Jester',
        description: 'Lives in the moment, enjoys life, and brings joy to others. Playful, humorous, and spontaneous.',
        dominantTraits: ['Estroversione', 'Apertura'],
        isActive: (traits) =>
            traits.Estroversione.score > 0.7 &&
            traits.Amicalità.score > 0.6 &&
            traits.Coscienziosità.score < 0.4,
    },
    {
        name: 'The Everywoman',
        description: 'Grounded, empathetic, and seeks to belong. A realist who connects with others through shared experience.',
        dominantTraits: [], // No dominant traits, balanced profile
        isActive: (traits) =>
            Object.values(traits).every(t => t.score > 0.4 && t.score < 0.6),
    },
];