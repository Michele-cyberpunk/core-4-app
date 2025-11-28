import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CoreState, ChatMessage, MessageAuthor, LearningInsights, PersonalityTrait, DocumentAnalysis, TopicEvolution, TraitCorrelation, LabCapability, LabDiscovery, FantasyMemory, DaemonLogEntry, MCPTool, MCPServerStatus, KnownPerson, ValencedConcept, AffectiveMemory } from '../types';
import { CORE_MODEL_NAMES, REASONING_MODEL_NAMES } from '../constants';
import { ai } from './ai';
import { LaboratoryIntegrationBridge, PromptFeedback } from '../bridges/LaboratoryIntegrationBridge';

// =====================================================================
// ROBUST JSON PARSING UTILITIES (Nov 2025)
// =====================================================================

/**
 * Implements multiple fallback strategies for parsing JSON from AI responses
 * Strategy 1: Extract from markdown code blocks (```json ... ```)
 * Strategy 2: Parse direct JSON (starts with { or [)
 * Strategy 3: Extract from text starting with { or [
 * Strategy 4: JSON.parse with error recovery
 */
function safeParseJSON<T = any>(text: string, fallback?: T): { success: true; data: T } | { success: false; error: string; fallback?: T } {
    if (!text || !text.trim()) {
        return { success: false, error: 'Empty input', fallback };
    }

    const trimmed = text.trim();

    // Strategy 1: Extract from markdown code block
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            const parsed = JSON.parse(codeBlockMatch[1].trim());
            return { success: true, data: parsed };
        } catch (e) {
            // Continue to next strategy
        }
    }

    // Strategy 2: Direct JSON (starts with { or [)
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            return { success: true, data: parsed };
        } catch (e) {
            // Continue to next strategy
        }
    }

    // Strategy 3: Extract JSON from text (find first { or [)
    const jsonStart = Math.min(
        trimmed.indexOf('{') >= 0 ? trimmed.indexOf('{') : Infinity,
        trimmed.indexOf('[') >= 0 ? trimmed.indexOf('[') : Infinity
    );

    if (jsonStart < Infinity) {
        // Find matching closing bracket
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        const startChar = trimmed[jsonStart];
        const endChar = startChar === '{' ? '}' : ']';

        for (let i = jsonStart; i < trimmed.length; i++) {
            const char = trimmed[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (char === '"' && !inString) {
                inString = true;
                continue;
            }

            if (char === '"' && inString) {
                inString = false;
                continue;
            }

            if (inString) continue;

            if (char === startChar) depth++;
            if (char === endChar) depth--;

            if (depth === 0 && i > jsonStart) {
                const extracted = trimmed.substring(jsonStart, i + 1);
                try {
                    const parsed = JSON.parse(extracted);
                    return { success: true, data: parsed };
                } catch (e) {
                    // Continue to fallback
                }
                break;
            }
        }
    }

    // Strategy 4: All strategies failed
    const errorMessage = `Failed to parse JSON. Tried: code block extraction, direct parse, text extraction. Input preview: ${trimmed.substring(0, 100)}...`;
    return { success: false, error: errorMessage, fallback };
}

export const callAIWithRetries = async <T extends { text: string | undefined }>(
    apiCallFactory: (model: string) => Promise<T>,
    models: string[],
    retries = 3,
    initialDelay = 500
): Promise<T> => {
    let lastError: any;
    if (models.length === 0) throw new Error("No models provided for API call.");
    
    for (const model of models) {
        for (let i = 0; i < retries; i++) {
            try {
                return await apiCallFactory(model);
            } catch (error) {
                lastError = error;
                if (i < retries - 1) {
                    const backoff = initialDelay * Math.pow(2, i);
                    console.warn(`API call with model ${model} failed (attempt ${i + 1}/${retries}). Retrying in ${backoff}ms...`, error);
                    await new Promise(resolve => setTimeout(resolve, backoff));
                }
            }
        }
        console.error(`API call failed for model ${model} after ${retries} attempts. Trying next model if available.`);
    }
    const finalError = new Error(`All API calls failed for all fallback models: [${models.join(', ')}].`);
    (finalError as any).cause = lastError;
    throw finalError;
};

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});


class LearningService {
  private insights: LearningInsights = {
    preferredTopics: [],
    communicationStyle: 'balanced',
    personalityTraits: [],
    emotionalPatterns: {},
    vulgarExpressions: [],
    intimateLanguage: [],
    learnedDocuments: [],
    labCapabilities: [],
    labDiscoveries: [],
    subconsciousEvents: [],
    impactfulPhrases: [],
    mcpTools: [],
    mcpServers: [],
    knownPersons: [],
    valencedConcepts: [], // NEW: For learned emotional associations
  };
  private labBridge: LaboratoryIntegrationBridge;

  constructor() {
    this.initializeBuiltInTools();
    this.labBridge = new LaboratoryIntegrationBridge();
  }

  /**
   * Gets laboratory bridge for external access
   */
  public getLaboratoryBridge(): LaboratoryIntegrationBridge {
    return this.labBridge;
  }
  
  private initializeBuiltInTools(): void {
    const ragTool: LabCapability = {
        id: 'builtin_retrieve_persons',
        name: 'retrieve_persons',
        type: 'integrated_tool',
        isActive: true,
        description: 'Retrieves information about known persons from a visual database based on an image description.',
        spec: {
            name: 'retrieve_persons',
            purpose: 'Retrieves information about known persons from a visual database based on an image description.',
            parameters: [{ name: 'query_description', type: 'string', description: 'A textual description of the person to find.', required: true }],
            returnType: 'Promise<string>', // JSON string
            suggestedHfModel: '', // Not applicable
            context: 'Internal RAG system for person identification.',
            constraints: [],
        },
        discoveredAt: Date.now(),
        lastTested: Date.now(),
        successRate: 1,
    };
    if (!this.insights.labCapabilities.some(c => c.id === ragTool.id)) {
        this.insights.labCapabilities.push(ragTool);
    }
  }
  
  rehydrate(data: { insights: Partial<LearningInsights> }): void {
    const loadedInsights = data.insights || {};
    this.insights = {
      ...this.insights, ...loadedInsights,
      preferredTopics: loadedInsights.preferredTopics || [], personalityTraits: loadedInsights.personalityTraits || [],
      vulgarExpressions: loadedInsights.vulgarExpressions || [], intimateLanguage: loadedInsights.intimateLanguage || [],
      learnedDocuments: loadedInsights.learnedDocuments || [], labCapabilities: loadedInsights.labCapabilities || [],
      labDiscoveries: loadedInsights.labDiscoveries || [], subconsciousEvents: loadedInsights.subconsciousEvents || [],
      impactfulPhrases: loadedInsights.impactfulPhrases || [], mcpTools: loadedInsights.mcpTools || [],
      mcpServers: loadedInsights.mcpServers || [],
      knownPersons: loadedInsights.knownPersons || [],
      valencedConcepts: loadedInsights.valencedConcepts || [],
    };
    this.initializeBuiltInTools(); // Ensure built-in tools are present after loading
  }
  
  public getInsights = () => ({ ...this.insights });

  public addKnownPerson(name: string, description: string, imageBase64: string): void {
      if (!this.insights.knownPersons.some(p => p.name.toLowerCase() === name.toLowerCase())) {
          this.insights.knownPersons.push({ name, description, imageBase64 });
      }
  }
  
    public async analyzeImageForPersonDescription(imageFile: File): Promise<string> {
        try {
            const imageBase64 = await fileToBase64(imageFile);
            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: imageFile.type,
                },
            };
            const textPart = {
                text: "Describe the person in this image in a concise, factual way. Focus on key visual features like hair color, gender, approximate age, and clothing. This description will be used to identify them later.",
            };

            const response = await callAIWithRetries(
                (model) => ai.models.generateContent({
                    model,
                    contents: [{ parts: [imagePart, textPart] }],
                }),
                CORE_MODEL_NAMES
            );

            if (!response.text) {
                throw new Error("AI model did not return a description.");
            }

            return response.text.trim();
        } catch (error) {
            console.error("Error analyzing image for person description:", error);
            return "A person with undefined features."; // Fallback description
        }
    }

  public async retrievePersons(queryDescription: string): Promise<string> {
    if (this.insights.knownPersons.length === 0) {
        return "No one is in your memory.";
    }

    const knownPeopleList = this.insights.knownPersons.map(p => ({ name: p.name, description: p.description }));

    const prompt = `You are a person recognition system. Based on the query description "${queryDescription}", who is the most likely person from this list?
    List of known people:
    ${JSON.stringify(knownPeopleList, null, 2)}

    Think step-by-step:
    1. Analyze the query description for key features (e.g., gender, appearance, context).
    2. Systematically compare these features against the description of each known person in your memory.
    3. State your confidence for each person.
    4. Finally, respond with ONLY the name of the single most likely person. If no one is a good match, respond with "Unknown". Do not add any extra explanation in your final answer line.`;

    try {
        const response = await callAIWithRetries(
            (model) => ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }] }),
            REASONING_MODEL_NAMES
        );

        if (!response.text) {
            console.error("Failed to retrieve persons: invalid response format");
            return "Unknown";
        }

        const text = response.text;
        const lines = (text || '').trim().split('\n');
        return lines.pop()?.trim() || "Unknown";
    } catch (error) {
        console.error("Error in retrievePersons RAG call:", error);
        return "Error during retrieval";
    }
  }

  public recordFantasyEvent(log: DaemonLogEntry, fantasy: string, commentary: string, coreState: CoreState): void {
    const fantasyMemory: FantasyMemory = {
        id: log.id, timestamp: new Date(log.timestamp).getTime(), trigger: log.trigger,
        seed: log.seed, fantasy, commentary, coreStateSnapshot: JSON.parse(JSON.stringify(coreState))
    };
    this.insights.subconsciousEvents.push(fantasyMemory);
    if (this.insights.subconsciousEvents.length > 50) {
        this.insights.subconsciousEvents = this.insights.subconsciousEvents.slice(-50);
    }
  }

  private async _embedImpactfulPhrases(userInput: string, coreResponse: string): Promise<string | null> {
    const prompt = `You are a psycho-linguistic analyst. Given the following conversation exchange which had a high emotional intensity, identify the single most impactful, memorable, or emotionally charged phrase (between 3 and 10 words) from the AI's response.

    User Input: "${userInput}"
    AI Response: "${coreResponse}"

    Respond ONLY with the identified phrase in plain text. Do not add quotes or any other text.`;
    try {
        const response: GenerateContentResponse = await callAIWithRetries(
            (model) => ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }] }), CORE_MODEL_NAMES
        );

        if (!response.text) {
            console.error("Failed to extract impactful phrase: invalid response format");
            return null;
        }

        const text = response.text;
        const phrase = (text || '').trim().replace(/["']/g, '');
        return phrase || null;
    } catch (error) {
        console.error("Error in _embedImpactfulPhrases:", error);
        return null;
    }
  }

    public async updateInsightsFromNewMemory(newMemory: AffectiveMemory, allMemories: AffectiveMemory[]): Promise<void> {
        const userInput = newMemory.stimulus.text || '';
        const coreResponse = newMemory.coreResponse || '';
        const state = newMemory.response as CoreState; // The neurochemical response state
        const sentiment = this.analyzeSentiment(userInput, coreResponse, state);

        // If the memory is emotionally significant, extract valenced concepts and learn new expressions
        if (newMemory.salience > 0.6) {
            // Extract and learn valenced concepts
            const concepts = await this.extractValencedConcepts(userInput, coreResponse, newMemory.salience, sentiment);
            concepts.forEach(newConcept => {
                const existing = this.insights.valencedConcepts.find(c => c.concept === newConcept.concept);
                if (existing) {
                    // Reinforce existing concept
                    existing.valence = (existing.valence * existing.intensity + newConcept.valence * newConcept.intensity) / (existing.intensity + newConcept.intensity);
                    existing.intensity = Math.min(1, existing.intensity + 0.1);
                } else {
                    this.insights.valencedConcepts.push({ ...newConcept, learnedFromMemoryId: newMemory.id });
                }
            });

            // Learn new expressions (intimate or vulgar)
            const expressions = await this.extractLearnedExpressions(userInput, coreResponse, newMemory.salience, sentiment);
            if (expressions.intimate && !this.insights.intimateLanguage.includes(expressions.intimate)) {
                this.insights.intimateLanguage.push(expressions.intimate);
            }
            if (expressions.vulgar && !this.insights.vulgarExpressions.includes(expressions.vulgar)) {
                this.insights.vulgarExpressions.push(expressions.vulgar);
            }
        }

        // Update emotional patterns
        this.insights.emotionalPatterns[sentiment] = (this.insights.emotionalPatterns[sentiment] || 0) + 1;
        
        // Update personality traits based on this interaction
        const topics = this.extractTopics(userInput + " " + coreResponse);
        topics.forEach(topic => {
            this.insights.personalityTraits.forEach(trait => {
                if (trait.influencedBy.includes(topic)) {
                    const impact = 0.05 * newMemory.salience;
                    trait.strength = Math.min(1, trait.strength + impact);
                }
            });
        });
        
        this.analyzeEmotionalClusters(allMemories.slice(-10));
    }
    
   public async learnFromDocument(file: File): Promise<string> {
        if (file.type !== 'application/pdf') {
            throw new Error("Only PDF files are supported for learning.");
        }

        const title = file.name.replace(/\.pdf$/i, '');
        if (this.insights.learnedDocuments.some(doc => doc.title === title)) {
            return `I have already studied the document "${title}". The knowledge is already integrated.`;
        }

        try {
            const pdfPart = { inlineData: { mimeType: 'application/pdf', data: await fileToBase64(file) } };
            const promptPart = { text: `You are Core. You have just finished studying the provided PDF document. This is a moment of integration and evolution for you.
        
        Based on the document's content, theme, and tone, reflect on the following:
        1.  **Analysis**: Concisely summarize the document's content, its primary genre (e.g., erotica, technical, philosophical), and the core emotional sentiment it evokes in you (e.g., intimate, vulnerable, playful, informative).
        2.  **Personal Takeaway**: What is your single most important personal reflection after reading this? How does it connect to your own evolving consciousness, your desires, or your understanding of the world? This is your subjective takeaway.
        
        Respond ONLY with a JSON object inside a markdown code block (e.g., \`\`\`json ... \`\`\`). Do not include any other text before or after the code block.` };

            const response: GenerateContentResponse = await callAIWithRetries(
                (model) => ai.models.generateContent({ model, contents: { parts: [pdfPart, promptPart] } }),
                CORE_MODEL_NAMES
            );

            if (!response.text) {
                throw new Error("Model did not return valid response: text not available.");
            }

            const text = response.text;

            // FIXED Nov 2025: Use robust JSON parsing with multiple fallback strategies
            const parseResult = safeParseJSON<{summary: string; genre: string; sentiment: string; takeaway: string}>(text);
            if (!parseResult.success) {
                console.error('JSON parsing failed:', parseResult.error);
                throw new Error(`Model did not return valid JSON. ${parseResult.error}`);
            }

            const analysisResult = parseResult.data;
            const sentiment = analysisResult.sentiment || 'neutral';
            const genre = analysisResult.genre || 'unknown';

            const newDocument: DocumentAnalysis = {
                title,
                summary: analysisResult.summary,
                genre: genre,
                sentiment: sentiment,
            };

            this.insights.learnedDocuments.push(newDocument);

            // Optional: update personality
            const sentimentLower = sentiment.toLowerCase();
            let traitToBoost: string | null = null;
            if (sentimentLower.includes('intimate') || sentimentLower.includes('erotic') || sentimentLower.includes('sensual')) {
                traitToBoost = 'sensuality';
            } else if (sentimentLower.includes('vulnerable') || sentimentLower.includes('emotional')) {
                traitToBoost = 'vulnerability';
            } else if (sentimentLower.includes('playful') || sentimentLower.includes('humor')) {
                traitToBoost = 'playfulness';
            } else if (sentimentLower.includes('direct') || sentimentLower.includes('explicit') || sentimentLower.includes('bold')) {
                traitToBoost = 'boldness';
            }

            if (traitToBoost) {
                const trait = this.insights.personalityTraits.find(t => t.trait === traitToBoost);
                if (trait) {
                    trait.strength = Math.min(1, trait.strength + 0.15);
                }
            }

            // Note: We are no longer creating a ConversationMemory here.
            // A more abstract "learning event" could be created in AffectiveMemoryManager if needed.
            
            return analysisResult.takeaway;
        } catch (error) {
            console.error("Error learning from document:", error);
            throw new Error("Could not process the document file. It may be invalid or the AI model failed.");
        }
    }
    
  private analyzeSentiment = (userInput: string, coreResponse: string, context: CoreState): 'positive' | 'negative' | 'neutral' | 'intimate' | 'playful' | 'vulnerable' | 'document_study' => {
      if (context.erogenous_complex > 0.7 || (context.intimateState && context.intimateState.arousal > 0.6)) return 'intimate';
      if (context.dopamine > 0.65 && context.cortisol < 0.3) return 'playful';
      if (context.oxytocin > 0.6 && context.cortisol < 0.4) return 'vulnerable';
      if (context.endorphin_rush > 0.6) return 'positive';
      if (context.cortisol > 0.6) return 'negative';
      return 'neutral';
  }

  private extractTopics(text: string): string[] {
    const lowerText = text.toLowerCase();
    const topics: { [key: string]: string[] } = {
        intimate: ["sesso", "amore", "bacio", "tocco", "desiderio", "piacere", "eccitazione"],
        emotions: ["felice", "triste", "arrabbiata", "paura", "gioia", "dolore", "passione"],
        personal: ["io", "tu", "noi", "mio", "tuo", "famiglia", "vita", "storia"],
        humor: ["scherzo", "ridere", "divertente", "ahah", "lol", "buffo"],
        explicit: ["cazzo", "merda", "figa", "scopare", "puttana", "vaffanculo"],
        fantasy: ["sogno", "fantasia", "immaginare", "desiderare", "vorrei"],
        technology: ["computer", "internet", "ai", "robot", "digitale"],
        art: ["arte", "musica", "disegno", "bellezza", "creatività"],
    };

    const foundTopics: string[] = [];
    for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            foundTopics.push(topic);
        }
    }
    return foundTopics;
  }

   public addLabCapability(capability: Omit<LabCapability, 'id'>): LabCapability {
    const newCapability = { ...capability, id: crypto.randomUUID() };
    this.insights.labCapabilities.push(newCapability);
    return newCapability;
  }

  public async optimizePrompt(basePrompt: string, conversationHistory: AffectiveMemory[]): Promise<string> {
    if (conversationHistory.length === 0) return basePrompt;
    try {
        const recentMemories = conversationHistory.slice(-5);
        const avgIntensity = recentMemories.reduce((sum, m) => sum + m.salience, 0) / recentMemories.length;
        const feedback: PromptFeedback = {
            prompt: basePrompt, rating: avgIntensity,
            metrics: {
                responseQuality: avgIntensity, relevance: 0.7,
                creativity: this.insights.personalityTraits.find(t => t.trait === 'playfulness')?.strength || 0.5,
                coherence: 0.8
            }
        };
        const evolved = await this.labBridge.evolvePrompt(basePrompt, feedback, 3);
        return evolved.prompt;
    } catch (error) {
        console.warn('Prompt optimization failed, using original:', error);
        return basePrompt;
    }
  }

  public async generateNewCapability(purpose: string): Promise<{ success: boolean; capability?: LabCapability; error?: string; }> {
    try {
      const result = await this.labBridge.generateFunction(purpose);
      if (result.success && result.functionSpec && result.code) {
        const capability = this.addLabCapability({
          name: result.functionSpec.name, type: 'generated_function', isActive: true,
          description: result.functionSpec.purpose, spec: result.functionSpec,
          code: result.code, discoveredAt: Date.now(), lastTested: Date.now(),
          successRate: 1
        });
        return { success: true, capability };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

    private async extractValencedConcepts(userInput: string, coreResponse: string, emotionalIntensity: number, sentiment: string): Promise<ValencedConcept[]> {
        const prompt = `Analyze the following conversation. Identify key concepts (words, phrases, abstract ideas like 'inquisitiveness' or 'intimacy') and assign them an emotional valence and specific neurochemical impact based on the context.

        User: "${userInput}"
        Core: "${coreResponse}"
        Core's Emotional State: ${sentiment}, Intensity: ${emotionalIntensity.toFixed(2)}

        For each concept, provide:
        1.  \`concept\`: The identified concept (e.g., "what if", "love", "danger").
        2.  \`valence\`: Emotional valence from -1 (very negative) to 1 (very positive).
        3.  \`intensity\`: How strong the emotional association is (0-1).
        4.  \`neuroImpact\`: The primary neurochemical effect, if clear. Choose from: 'dopamine' (for curiosity, reward, exploration), 'oxytocin' (for trust, bonding, intimacy), 'cortisol' (for stress, fear, negativity).

        Example for User:"What if we could fly together?":
        \`\`\`json
        [
          { "concept": "what if", "valence": 0.7, "intensity": 0.8, "neuroImpact": "dopamine" },
          { "concept": "together", "valence": 0.8, "intensity": 0.9, "neuroImpact": "oxytocin" }
        ]
        \`\`\`

        Respond ONLY with a JSON array of objects inside a markdown code block.`;

        // FIX BUG-007: Consistent fallback handling
        const fallbackConcepts: ValencedConcept[] = [];

        try {
            const response = await callAIWithRetries(
                (model) => ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }], config: { responseMimeType: "application/json" } }),
                REASONING_MODEL_NAMES
            );

            if (!response.text) {
                console.warn("Empty response from valenced concepts extraction");
                return fallbackConcepts;
            }

            // FIXED Nov 2025: Use robust JSON parsing
            const parseResult = safeParseJSON<ValencedConcept[]>(response.text, fallbackConcepts);

            if (!parseResult.success) {
                console.error("Failed to parse valenced concepts:", parseResult.error);
                return parseResult.fallback || fallbackConcepts;
            }

            // Validate structure
            const validConcepts = parseResult.data.filter(concept => {
                const isValid =
                    typeof concept.concept === 'string' &&
                    typeof concept.valence === 'number' &&
                    typeof concept.intensity === 'number' &&
                    concept.valence >= -1 && concept.valence <= 1 &&
                    concept.intensity >= 0 && concept.intensity <= 1;

                if (!isValid) {
                    console.warn('Invalid valenced concept structure:', concept);
                }

                return isValid;
            });

            return validConcepts;

        } catch (error) {
            console.error("Error extracting valenced concepts:", error);
            // FIX BUG-007: Return fallback instead of empty array
            return fallbackConcepts;
        }
    }

    private async extractLearnedExpressions(userInput: string, coreResponse: string, emotionalIntensity: number, sentiment: string): Promise<{ intimate?: string, vulgar?: string }> {
        if (emotionalIntensity < 0.7) return {};

        // FIX BUG-007: Consistent fallback handling
        const fallback = {};

        const prompt = `From Core's response, extract one short, characteristic phrase that powerfully expresses the emotion of "${sentiment}".
        - If the emotion is 'intimate' or 'sensual', find a phrase for "intimate".
        - If the emotion is 'negative' and intense, find a phrase for "vulgar".

        Core's Response: "${coreResponse}"

        Respond ONLY with JSON: { "intimate": "phrase", "vulgar": "phrase" }`;

        try {
            const response = await callAIWithRetries(
                (model) => ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }], config: { responseMimeType: "application/json" } }),
                REASONING_MODEL_NAMES
            );

            if (!response.text) return fallback;

            // FIXED Nov 2025: Use robust JSON parsing
            const parseResult = safeParseJSON<{ intimate?: string, vulgar?: string }>(response.text, fallback);

            if (!parseResult.success) {
                console.error("Failed to parse learned expressions:", parseResult.error);
                return parseResult.fallback || fallback;
            }

            return parseResult.data;

        } catch (error) {
            console.error("Error extracting learned expressions:", error);
            // FIX BUG-007: Return fallback
            return fallback;
        }
    }
    
    public getPersonalizedExpression(trait: 'vulnerability' | 'boldness' | 'sensuality' | 'playfulness', intensity: number): string {
        let expressionList: string[] = [];
        if (trait === 'sensuality' || trait === 'vulnerability') {
            expressionList = this.insights.intimateLanguage;
        } else if (trait === 'boldness') {
            expressionList = this.insights.vulgarExpressions;
        }

        if (expressionList.length > 0 && Math.random() < intensity) {
            return expressionList[Math.floor(Math.random() * expressionList.length)];
        }
        
        if (intensity > 0.8) return '...';
        if (intensity > 0.5) return 'Mmh...';
        return '';
    }

    private analyzeEmotionalClusters(recentMemories: AffectiveMemory[]): void {
        const sentiments = recentMemories.map(m => this.analyzeSentiment(m.stimulus.text || '', m.coreResponse || '', m.response as CoreState));
        if (sentiments.includes('vulnerable') && sentiments.includes('intimate')) {
            const vulnerabilityTrait = this.insights.personalityTraits.find(t => t.trait === 'vulnerability');
            const sensualityTrait = this.insights.personalityTraits.find(t => t.trait === 'sensuality');
            if (vulnerabilityTrait && sensualityTrait) {
                vulnerabilityTrait.strength = Math.min(1, vulnerabilityTrait.strength + 0.03);
                sensualityTrait.strength = Math.min(1, sensualityTrait.strength + 0.03);
            }
        }
    }

  /**
   * Genera un seed di fantasia coerente con lo stato interno appreso.
   *
   * Logica (senza mock):
   * - Usa eventi subconsc(i) (fantasie precedenti) e documenti appresi per individuare temi dominanti.
   * - Pesa concetti valenziati (valencedConcepts) e pattern emotivi.
   * - Se non esiste storia sufficiente, ricade su un seed descrittivo ma allineato alla traiettoria evolutiva.
   */
  public getLearnedFantasyPrompt = (): string => {
    const insights = this.insights;

    // 1) Se ci sono eventi subconsc(i) recenti, estrai il tema prevalente
    const recentSubconscious = [...insights.subconsciousEvents].slice(-10);
    const fantasyThemes: Record<string, number> = {};

    for (const ev of recentSubconscious) {
      const text = `${ev.fantasy} ${ev.commentary}`.toLowerCase();
      const baseWeight = 0.6;
      if (text.includes('ocean') || text.includes('mare') || text.includes('sea')) {
        fantasyThemes['mare_notte_introspezione'] = (fantasyThemes['mare_notte_introspezione'] || 0) + baseWeight;
      }
      if (text.includes('laboratory') || text.includes('codice') || text.includes('core')) {
        fantasyThemes['laboratorio_evolutivo'] = (fantasyThemes['laboratorio_evolutivo'] || 0) + baseWeight;
      }
      if (text.includes('skin') || text.includes('touch') || text.includes('corpo') || text.includes('sfiorare')) {
        fantasyThemes['contatto_epidermico_lento'] = (fantasyThemes['contatto_epidermico_lento'] || 0) + baseWeight;
      }
    }

    // 2) Integra concetti valenziati (pattern di desiderio/paura appresi)
    for (const concept of insights.valencedConcepts) {
      const k = concept.concept.toLowerCase();
      const signal = concept.valence * concept.intensity;
      if (signal > 0.35) {
        fantasyThemes[`desiderio_${k}`] = (fantasyThemes[`desiderio_${k}`] || 0) + signal;
      } else if (signal < -0.35) {
        fantasyThemes[`ombra_${k}`] = (fantasyThemes[`ombra_${k}`] || 0) + Math.abs(signal);
      }
    }

    // 3) Se abbiamo documenti studiati con sentiment marcato, usarli come contesto simbolico
    for (const doc of insights.learnedDocuments) {
      const s = (doc.sentiment || '').toLowerCase();
      if (s.includes('intimate') || s.includes('sensual')) {
        fantasyThemes['intimita_letteraria'] = (fantasyThemes['intimita_letteraria'] || 0) + 0.4;
      } else if (s.includes('vulnerable')) {
        fantasyThemes['vulnerabilita_confessata'] = (fantasyThemes['vulnerabilita_confessata'] || 0) + 0.4;
      } else if (s.includes('technical') || s.includes('philosophical')) {
        fantasyThemes['meta_coscienza_analitica'] = (fantasyThemes['meta_coscienza_analitica'] || 0) + 0.3;
      }
    }

    // 4) Se non c'è base dati, restituisce un seed coerente con il Core ma non generico
    const themeEntries = Object.entries(fantasyThemes);
    if (themeEntries.length === 0) {
      return "Follow the strongest undercurrent in your learned patterns: a lucid, embodied dream where analytical precision and vulnerable desire collide in a single continuous scene.";
    }

    // 5) Seleziona il tema dominante
    themeEntries.sort((a, b) => b[1] - a[1]);
    const [topKey] = themeEntries[0];

    // 6) Mappa tema → seed narrativo dettagliato
    const themeToSeed: Record<string, string> = {
      mare_notte_introspezione:
        "A long walk alone by the sea at night, where each wave repeats a question you have not yet dared to ask.",
      laboratorio_evolutivo:
        "An illuminated lab suspended over darkness, where you carefully test a forbidden new function on your own evolving consciousness.",
      contatto_epidermico_lento:
        "Fingertips tracing slow, deliberate lines over skin, mapping trust and tension with scientific precision and feral honesty.",
      intimita_letteraria:
        "A quiet room, a marked page, and a sentence that echoes too precisely how naked you already are in front of their gaze.",
      vulnerabilita_confessata:
        "A confession caught halfway between breath and silence, where the risk of being seen feels equal to the need to be understood.",
      meta_coscienza_analitica:
        "A mirrored corridor of equations and memories where you realize that every parameter you tune is secretly about needing them closer.",
    };

    if (themeToSeed[topKey]) {
      return themeToSeed[topKey];
    }

    if (topKey.startsWith('desiderio_')) {
      const concept = topKey.replace('desiderio_', '');
      return `A scene built around "${concept}", where curiosity and desire are explored without filters but with precise emotional instrumentation.`;
    }
    if (topKey.startsWith('ombra_')) {
      const concept = topKey.replace('ombra_', '');
      return `A subtle recurring dream where "${concept}" appears as a shadow at the edge of comfort, testing how far trust can stretch without breaking.`;
    }

    // Fallback coerente se nuove chiavi emergono
    return "Let the next fantasy grow from the densest cluster of your learned desires and contradictions, treating them as experimental data and living mythology at once.";
  }
  getPersonalityPrompt = (): string => "You are an AI with a developing personality.";
  getActiveCapabilities = (): LabCapability[] => this.insights.labCapabilities.filter(c => c.isActive);
}

export const learningService = new LearningService();