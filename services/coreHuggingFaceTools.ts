
import { HuggingFaceInferenceService, HFInferenceResult } from './huggingfaceInferenceService';

export interface HFToolResult {
  success: boolean;
  data?: any;
  error?: string;
  imageUrl?: string;
  audioUrl?: string;
  text?: string;
  blob?: Blob;
}

export class CoreHuggingFaceTools {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate image from text prompt
   * Models: Stable Diffusion XL, FLUX (if available), or standard SD 1.5 as fallback
   */
  async generateImage(
    prompt: string,
    options?: {
      model?: string;
      negative_prompt?: string;
      steps?: number;
      guidance_scale?: number;
      width?: number;
      height?: number;
    }
  ): Promise<HFToolResult> {
    const models = [
      options?.model || 'stabilityai/stable-diffusion-xl-base-1.0', // Robust modern default
      'black-forest-labs/FLUX.1-schnell', // Excellent but sometimes gated/pro
      'runwayml/stable-diffusion-v1-5', // Old reliable fallback
      'prompthero/openjourney', // Artistic
    ];
    
    const errors: string[] = [];

    // Try models in sequence until one succeeds
    for (const model of models) {
      try {
        const result = await HuggingFaceInferenceService.textToImage(this.token, prompt, model, {
            negative_prompt: options?.negative_prompt,
            num_inference_steps: options?.steps,
            guidance_scale: options?.guidance_scale,
            width: options?.width,
            height: options?.height
        });

        if (result.success && result.blob) {
            const imageUrl = URL.createObjectURL(result.blob);
            return {
              success: true,
              imageUrl,
              blob: result.blob,
              data: { model_used: model }
            };
        }
        
        const errorMessage = `Error with model ${model}: ${result.error}`;
        console.error(errorMessage);
        errors.push(errorMessage);

        // If it's a payment/credit issue, don't retry other pro models, maybe try older ones
        if (result.error?.includes('credits exhausted') || result.error?.includes('payment required')) {
           // continue to try older/free models if available in list
        }

      } catch (error: any) {
        const errorMessage = `Error with model ${model}: ${error.message?.replace('Error: ', '')}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    return {
      success: false,
      error: `All image generation models failed. Errors: [${errors.join('; ')}]`
    };
  }


  /**
   * Generate text completion
   */
  async generateText(
    prompt: string,
    options?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.textGeneration(this.token, prompt, options?.model, {
        max_new_tokens: options?.max_tokens,
        temperature: options?.temperature,
        do_sample: true,
    }, options?.provider);

    if (result.success && result.data) {
        let textResult: string | undefined;

        // Handle OpenAI-compatible chat completion format (e.g., Llama 3)
        if (result.data.choices && result.data.choices[0]?.message?.content) {
            textResult = result.data.choices[0].message.content;
        } 
        // Handle legacy text generation format (e.g., gpt2)
        else if (Array.isArray(result.data) && result.data[0]?.generated_text) {
            textResult = result.data[0].generated_text;
        }
        
        return { success: true, text: textResult, data: result.data };
    }

    return { success: false, error: result.error };
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(
    text: string,
    options?: {
      model?: string;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.textToSpeech(this.token, text, options?.model, options?.provider);
    if (result.success && result.blob) {
        const audioUrl = await this.blobToDataURL(result.blob);
        return { success: true, audioUrl, blob: result.blob, data: { audio_blob: result.blob } };
    }
    return { success: false, error: result.error };
  }

  /**
   * Transcribe audio to text
   */
  async speechToText(
    audioBlob: Blob,
    options?: {
      model?: string;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.speechToText(this.token, audioBlob, options?.model, options?.provider);
    return { success: result.success, text: result.data?.text, data: result.data, error: result.error };
  }

  /**
   * Generate image caption/description
   */
  async describeImage(
    imageBlob: Blob,
    options?: {
      model?: string;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.imageToText(this.token, imageBlob, options?.model, options?.provider);
    return { success: result.success, text: result.data?.[0]?.generated_text, data: result.data, error: result.error };
  }

  /**
   * Answer questions based on context
   */
  async answerQuestion(
    question: string,
    context: string,
    options?: {
      model?: string;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.questionAnswering(this.token, question, context, options?.model, options?.provider);
    return { success: result.success, text: result.data?.answer, data: result.data, error: result.error };
  }

  /**
   * Summarize text
   */
  async summarize(
    text: string,
    options?: {
      model?: string;
      max_length?: number;
      min_length?: number;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.summarization(this.token, text, options?.model, { max_length: options?.max_length, min_length: options?.min_length }, options?.provider);
    return { success: result.success, text: result.data?.[0]?.summary_text, data: result.data, error: result.error };
  }

  /**
   * Translate text
   */
  async translate(
    text: string,
    targetLanguage: string = 'it',
    options?: {
      model?: string;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const languageModels: Record<string, string> = {
      'it': 'Helsinki-NLP/opus-mt-en-it',
      'es': 'Helsinki-NLP/opus-mt-en-es',
      'fr': 'Helsinki-NLP/opus-mt-en-fr',
      'de': 'Helsinki-NLP/opus-mt-en-de',
      'zh': 'Helsinki-NLP/opus-mt-en-zh'
    };

    const selectedModel = options?.model || languageModels[targetLanguage] || languageModels['it'];
    const result = await HuggingFaceInferenceService.translation(this.token, text, selectedModel, options?.provider);
    return { success: result.success, text: result.data?.[0]?.translation_text, data: result.data, error: result.error };
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(
    text: string,
    options?: {
      model?: string;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.sentimentAnalysis(this.token, text, options?.model, options?.provider);
    return { success: result.success, text: JSON.stringify(result.data?.[0]), data: result.data, error: result.error };
  }

  /**
   * Generate text embeddings
   */
  async generateEmbeddings(
    text: string,
    options?: {
      model?: string;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.featureExtraction(this.token, text, options?.model, options?.provider);
    return { success: result.success, data: result.data, error: result.error };
  }

  /**
   * Classify text into categories
   */
  async classify(
    text: string,
    categories: string[],
    options?: {
      model?: string;
      provider?: string;
    }
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.zeroShotClassification(this.token, text, categories, options?.model, options?.provider);
    return { success: result.success, text: JSON.stringify(result.data), data: result.data, error: result.error };
  }

  /**
   * Discover available models for a task
   */
  async discoverModels(
    task: string
  ): Promise<HFToolResult> {
    const result = await HuggingFaceInferenceService.listModelsByTask(task);
    return { 
        success: result.success, 
        data: result.models?.map((m: any) => m.id), 
        text: `Found ${result.models?.length} models for task: ${task}`, 
        error: result.error 
    };
  }

  /**
   * Get all available tools as a list
   */
  static getAvailableTools(): string[] {
    return [
      'generateImage',
      'generateText',
      'textToSpeech',
      'speechToText',
      'describeImage',
      'answerQuestion',
      'summarize',
      'translate',
      'analyzeSentiment',
      'generateEmbeddings',
      'classify',
      'discoverModels'
    ];
  }
}
