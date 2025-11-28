/**
 * HuggingFace Inference API Service
 * Provides access to ALL HuggingFace models via Inference API
 * NO placeholders, NO mocks, REAL API calls only
 */

interface HFInferenceOptions {
  model: string;
  inputs: string | Record<string, any> | Blob;
  parameters?: Record<string, any>;
  options?: {
    use_cache?: boolean;
    wait_for_model?: boolean;
    provider?: string; // Added for multi-provider support
  };
}

export interface HFInferenceResult {
  success: boolean;
  data?: any;
  error?: string;
  blob?: Blob;
  text?: string;
}

export class HuggingFaceInferenceService {
  private static readonly API_BASE = 'https://router.huggingface.co/v1'; // Updated to unified proxy (HF Docs 2025)

  /**
   * Generic inference call to any HuggingFace model
   */
  static async inference(
    token: string,
    options: HFInferenceOptions
  ): Promise<HFInferenceResult> {
    const url = `${this.API_BASE}/${this.getTaskEndpoint(options.model)}`; // Dynamic endpoint based on task/model
    const body = new FormData(); // Use FormData for flexibility with binary/text

    // Append inputs and parameters
    if (options.inputs instanceof Blob) {
      body.append('inputs', options.inputs);
    } else {
      body.append('inputs', JSON.stringify(options.inputs));
    }
    if (options.parameters) {
      body.append('parameters', JSON.stringify(options.parameters));
    }
    if (options.options) {
      body.append('options', JSON.stringify(options.options));
    }

    // Append provider to model if specified
    if (options.options?.provider && options.options.provider !== 'auto') {
      options.model = `${options.model}:${options.options.provider}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body
      });

      const contentType = response.headers.get('content-type');

      // Handle different response types
      if (response.ok) {
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          return { success: true, data };
        } else if (contentType?.includes('image/') || contentType?.includes('audio/')) {
          const blob = await response.blob();
          return { success: true, blob };
        } else {
          const text = await response.text();
          return { success: true, text };
        }
      }

      // Handle errors
      const errorText = await response.text();
      let errorMessage = errorText;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorText;
      } catch {
        // Not JSON, use text as-is
      }

      if (response.status === 402) {
        errorMessage = 'HuggingFace credits exhausted. Upgrade to PRO or wait for monthly reset.';
      } else if (response.status === 503) {
        errorMessage = 'Model or provider is unavailable/loading. Please retry or use another provider.';
      }

      return {
        success: false,
        error: errorMessage
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper to map model/task to endpoint (based on HF Docs 2025)
  private static getTaskEndpoint(model: string): string {
    // For chat/text gen: 'chat/completions'
    // For others: use model-specific, but proxy handles
    if (model.includes('Llama-3') || model.includes('chat') || model.includes('instruct')) {
      return 'chat/completions';
    }
    // Older models like gpt2 use the direct model endpoint
    return `models/${model}`;
  }

  /**
   * TEXT-TO-IMAGE generation
   */
  static async textToImage(
    token: string,
    prompt: string,
    model: string = 'black-forest-labs/FLUX.1-schnell', // Updated default (popular 2025)
    parameters?: {
      negative_prompt?: string;
      num_inference_steps?: number;
      guidance_scale?: number;
      width?: number;
      height?: number;
    },
    provider?: string // Added for provider selection
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: prompt,
      parameters,
      options: { wait_for_model: true, provider: provider || 'auto' }
    });
  }

  /**
   * TEXT GENERATION / Chat Completion
   */
  static async textGeneration(
    token: string,
    prompt: string,
    model: string = 'meta-llama/Meta-Llama-3-8B-Instruct', // Updated to modern LLM
    parameters?: {
      max_new_tokens?: number;
      temperature?: number;
      top_k?: number;
      top_p?: number;
      do_sample?: boolean;
    },
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: { messages: [{ role: 'user', content: prompt }] }, // OpenAI-compatible format
      parameters,
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * TEXT-TO-SPEECH
   */
  static async textToSpeech(
    token: string,
    text: string,
    model: string = 'espnet/kan-bayashi_ljspeech_vits', // Updated default
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: text,
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * SPEECH-TO-TEXT (Audio transcription)
   */
  static async speechToText(
    token: string,
    audioBlob: Blob,
    model: string = 'openai/whisper-large-v3',
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: audioBlob,
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * IMAGE-TO-TEXT (Image captioning)
   */
  static async imageToText(
    token: string,
    imageBlob: Blob,
    model: string = 'Salesforce/blip-image-captioning-large',
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: imageBlob,
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * QUESTION ANSWERING
   */
  static async questionAnswering(
    token: string,
    question: string,
    context: string,
    model: string = 'deepset/roberta-base-squad2',
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: { question, context },
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * SUMMARIZATION
   */
  static async summarization(
    token: string,
    text: string,
    model: string = 'facebook/bart-large-cnn',
    parameters?: {
      max_length?: number;
      min_length?: number;
    },
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: text,
      parameters,
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * TRANSLATION
   */
  static async translation(
    token: string,
    text: string,
    model: string = 'Helsinki-NLP/opus-mt-en-it',
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: text,
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * SENTIMENT ANALYSIS
   */
  static async sentimentAnalysis(
    token: string,
    text: string,
    model: string = 'distilbert-base-uncased-finetuned-sst-2-english',
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: text,
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * EMBEDDINGS / Feature Extraction
   */
  static async featureExtraction(
    token: string,
    text: string,
    model: string = 'sentence-transformers/all-MiniLM-L6-v2',
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: text,
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * ZERO-SHOT CLASSIFICATION
   */
  static async zeroShotClassification(
    token: string,
    text: string,
    candidateLabels: string[],
    model: string = 'facebook/bart-large-mnli',
    provider?: string
  ): Promise<HFInferenceResult> {
    return await this.inference(token, {
      model,
      inputs: text,
      parameters: { candidate_labels: candidateLabels },
      options: { provider: provider || 'auto' }
    });
  }

  /**
   * List available models by task (public endpoint, no auth needed)
   */
  static async listModelsByTask(
    task: string
  ): Promise<{ success: boolean; models?: any[]; error?: string }> {
    try {
      const response = await fetch(
        `${this.API_BASE}/models?filter=${task}&sort=downloads&direction=-1&limit=20` // Updated public endpoint
      );

      if (response.ok) {
        const models = await response.json();
        return { success: true, models };
      }

      return {
        success: false,
        error: `Failed to fetch models: ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
