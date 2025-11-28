
import { GenerateContentResponse } from '@google/genai';
import { callAIWithRetries } from '../../services/learningService';
import { CORE_MODEL_NAMES } from '../../constants';
import { ai } from '../../services/ai';

export interface FunctionParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'any';
    description: string;
    required: boolean;
}

export interface FunctionSpec {
    name: string;
    purpose: string;
    parameters: FunctionParameter[];
    returnType: string;
    suggestedHfModel: string;
    context: string;
    constraints: string[];
}

interface EvolutionResult {
    success: boolean;
    function: {
        id: string;
        spec: FunctionSpec;
        code: string;
        language: 'typescript';
        timestamp: number;
        documentation: string;
    } | null;
    error?: string;
}

export class EvolutionEngine {
    constructor() {}

    public async generateNewFunction(
        purpose: string
    ): Promise<EvolutionResult> {
        try {
            const spec = await this.generateFunctionSpec(purpose);
            const code = await this.generateCodeForHf(spec);
            const documentation = `This function, named '${spec.name}', was autonomously generated to fulfill the purpose: '${spec.purpose}'. It utilizes the Hugging Face model '${spec.suggestedHfModel}' to perform its task.`;

            return {
                success: true,
                function: {
                    id: this.generateId(),
                    spec,
                    code,
                    language: 'typescript',
                    timestamp: Date.now(),
                    documentation
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("EvolutionEngine Error:", errorMessage);
            return {
                success: false,
                function: null,
                error: errorMessage,
            };
        }
    }

    private async generateFunctionSpec(
        purpose: string
    ): Promise<FunctionSpec> {
        const prompt = `You are an AI assistant tasked with defining a new capability for yourself. Your goal is to create a specification for a JavaScript function that calls a Hugging Face Inference API model to achieve a specific purpose.

        **Purpose:** "${purpose}"

        **Task:**
        1.  Determine the best type of Hugging Face model for this purpose (e.g., "text-summarization", "sentiment-analysis", "text-to-image").
        2.  Suggest a specific, popular, and generally available model from the Hugging Face Hub for that task (e.g., "facebook/bart-large-cnn" for summarization).
        3.  Define a clear function name, parameters (what the user needs to provide), and a return type.
        4.  The function will be executed in an environment where the Hugging Face token is passed as a parameter.

        **Example for "Summarize a long text":**
        {
          "name": "summarizeText",
          "purpose": "To summarize a long piece of text into a concise summary.",
          "parameters": [{ "name": "textToSummarize", "type": "string", "description": "The full text to be summarized.", "required": true }],
          "returnType": "Promise<string>",
          "suggestedHfModel": "facebook/bart-large-cnn",
          "context": "This function will call the Hugging Face Inference API.",
          "constraints": ["The input text should be less than 10000 characters.", "Requires a valid Hugging Face token."]
        }

        Now, generate the specification for the purpose: "${purpose}". Respond ONLY with the JSON object.`;

        const response: GenerateContentResponse = await callAIWithRetries(
            (model) => ai.models.generateContent({
                model,
                contents: [{ parts: [{ text: prompt }] }],
                config: { responseMimeType: "application/json" }
            }),
            CORE_MODEL_NAMES
        );

        if (!response.text) {
            throw new Error("Invalid function specification received from model: text not available.");
        }

        const text = response.text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : text;
        const spec = JSON.parse(jsonString.trim());


        if (!spec.name || !spec.suggestedHfModel || !Array.isArray(spec.parameters)) {
            throw new Error("Invalid function specification received from model.");
        }
        return spec;
    }

    private async generateCodeForHf(spec: FunctionSpec): Promise<string> {
        const params = [...spec.parameters.map(p => `${p.name}: ${p.type}`), "huggingFaceToken: string"].join(', ');
        
        const prompt = `Generate a single, executable async TypeScript function based on this specification. The function must call the Hugging Face Inference API using 'fetch'.

        **Specification:**
        ${JSON.stringify(spec, null, 2)}

        **Execution Context:**
        - The function will receive a 'huggingFaceToken' (a string) as its last parameter.
        - It must use the native 'fetch' API.

        **Requirements:**
        1.  Construct the correct Hugging Face API URL: \`https://api-inference.huggingface.co/models/${spec.suggestedHfModel}\`.
        2.  Use the 'huggingFaceToken' parameter in the "Authorization: Bearer \${huggingFaceToken}" header.
        3.  Handle the fetch response, parse the JSON, and return the relevant data.
        4.  Include basic error handling for the fetch call.
        5.  The function signature must be: \`async function ${spec.name}(${params}): ${spec.returnType}\`

        **Example for a summarization function:**
        \`\`\`typescript
        async function summarizeText(textToSummarize: string, huggingFaceToken: string): Promise<string> {
            const response = await fetch(
                "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
                {
                    headers: { Authorization: \`Bearer \${huggingFaceToken}\` },
                    method: "POST",
                    body: JSON.stringify({ "inputs": textToSummarize }),
                }
            );
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to call Hugging Face API");
            }
            const result = await response.json();
            return result[0].summary_text;
        }
        \`\`\`

        Now, generate ONLY the TypeScript code for the function named "${spec.name}". Do not include any explanatory text or markdown formatting.`;
        
        const response: GenerateContentResponse = await callAIWithRetries(
            (model) => ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }] }),
            CORE_MODEL_NAMES
        );

        if (!response.text) {
            throw new Error("Failed to generate code: text not available in response.");
        }

        return (response.text || '').trim().replace(/```typescript\n?|```\n?/g, "");
    }

    private generateId(): string {
        return `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
