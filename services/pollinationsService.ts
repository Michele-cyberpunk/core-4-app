
/**
 * @file services/pollinationsService.ts
 * @description Service to interact with Pollinations.AI for free, uncensored image generation.
 *              Constructs direct URLs for browser rendering using the latest API standards.
 */

export type PollinationsModel = 
  | 'flux' 
  | 'flux-realism' 
  | 'flux-anime' 
  | 'flux-3d' 
  | 'flux-coda' 
  | 'turbo';

export interface PollinationsOptions {
  width?: number;
  height?: number;
  seed?: number;
  model?: PollinationsModel;
  enhance?: boolean;
  safe?: boolean; // If true, filters NSFW. If false, allows it.
  noStore?: boolean; // Prevents storing in public feed (replaces nologo/private)
}

export interface PollinationsResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  generationTime?: number;
  metadata?: {
    model: string;
    seed: number;
    width: number;
    height: number;
  };
}

export class PollinationsService {
  // CORRECTED: Updated base URL to current Pollinations API endpoint
  private static readonly BASE_URL = 'https://image.pollinations.ai/prompt';

  /**
   * Constructs the Pollinations.AI URL.
   * This operation is synchronous but wrapped in a Promise to match the application's async patterns.
   */
  private static buildUrl(prompt: string, options: PollinationsOptions = {}): string {
    // Validate prompt
    if (!prompt || prompt.trim().length < 3) {
      throw new Error('Prompt must be at least 3 characters long');
    }

    // Sanitize prompt: remove excessive whitespace, keep it clean
    const cleanPrompt = prompt.trim().replace(/\s+/g, ' ');
    const encodedPrompt = encodeURIComponent(cleanPrompt);

    const params = new URLSearchParams();

    // Default to high resolution square
    const width = options.width || 1024;
    const height = options.height || 1024;
    params.append('width', width.toString());
    params.append('height', height.toString());

    // Seed is critical for variations. If not provided, generate a large random integer.
    const seed = options.seed ?? Math.floor(Math.random() * 1e9);
    params.append('seed', seed.toString());

    // Model selection
    const model = options.model || 'flux';
    params.append('model', model);

    // Flags - Updated for current API
    if (options.enhance) {
      params.append('enhance', 'true');
    }
    
    // 'safe' toggles content filtering - Pollinations is uncensored by default
    if (options.safe) {
      params.append('safe', 'true');
    }
    
    // 'noStore' prevents the image from appearing in the public feed
    // This replaces the old 'nologo' and 'private' parameters
    if (options.noStore) {
      params.append('noStore', 'true');
    }

    // CORRECTED: Proper URL format for current API
    return `${this.BASE_URL}/${encodedPrompt}?${params.toString()}`;
  }

  /**
   * Core generation method. 
   * Returns a result object with the constructed URL.
   */
  static async generateImage(
    prompt: string,
    options: PollinationsOptions = {}
  ): Promise<PollinationsResult> {
    const startTime = Date.now();

    try {
      const imageUrl = this.buildUrl(prompt, options);
      
      // Extract metadata from URL for accuracy
      const url = new URL(imageUrl);
      const urlParams = url.searchParams;
      
      const seed = parseInt(urlParams.get('seed') || '0', 10);
      const model = urlParams.get('model') || 'flux';
      const width = parseInt(urlParams.get('width') || '1024', 10);
      const height = parseInt(urlParams.get('height') || '1024', 10);

      return {
        success: true,
        imageUrl,
        generationTime: Date.now() - startTime,
        metadata: {
          model,
          seed,
          width,
          height
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error constructing Pollinations URL',
        generationTime: Date.now() - startTime
      };
    }
  }

  // === SPECIALIZED PRESETS ===

  /**
   * Uncensored generation using the base Flux model.
   * Explicitly disables safety filters and prompt enhancement for raw adherence.
   */
  static async generateUncensored(prompt: string): Promise<PollinationsResult> {
    return this.generateImage(prompt, {
      model: 'flux',
      safe: false,
      enhance: false,
      noStore: true
    });
  }

  /**
   * Photorealistic generation using 'flux-realism'.
   * Enables enhancement to add detail.
   */
  static async generateRealistic(prompt: string): Promise<PollinationsResult> {
    return this.generateImage(prompt, {
      model: 'flux-realism',
      enhance: true,
      safe: false,
      noStore: true
    });
  }

  /**
   * Anime style generation using 'flux-anime'.
   */
  static async generateAnime(prompt: string): Promise<PollinationsResult> {
    return this.generateImage(prompt, {
      model: 'flux-anime',
      enhance: false, // Anime specific prompts usually shouldn't be enhanced generically
      safe: false,
      noStore: true
    });
  }

  /**
   * 3D render style generation.
   */
  static async generate3D(prompt: string): Promise<PollinationsResult> {
    return this.generateImage(prompt, {
      model: 'flux-3d',
      safe: false,
      noStore: true
    });
  }

  /**
   * General creative/artistic generation.
   * Good balance of style and prompt adherence.
   */
  static async generateCreative(prompt: string): Promise<PollinationsResult> {
    return this.generateImage(prompt, {
      model: 'flux',
      enhance: true,
      safe: false,
      noStore: true
    });
  }

  /**
   * Alias for creative generation (backwards compatibility).
   */
  static async generateArtistic(prompt: string): Promise<PollinationsResult> {
    return this.generateCreative(prompt);
  }

  /**
   * Helper method to validate if a model is supported
   */
  static isModelSupported(model: string): boolean {
    const supportedModels: PollinationsModel[] = [
      'flux', 'flux-realism', 'flux-anime', 'flux-3d', 'flux-coda', 'turbo'
    ];
    return supportedModels.includes(model as PollinationsModel);
  }

  /**
   * Get available models
   */
  static getAvailableModels(): PollinationsModel[] {
    return ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'flux-coda', 'turbo'];
  }
}
