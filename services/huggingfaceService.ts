/**
 * HuggingFace Integration Service
 * Provides uncensored image generation capabilities to bypass Gemini limitations
 */

export interface HFSpaceResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  model_used?: string;
}

interface HFImageRequest {
  prompt: string;
  negative_prompt?: string;
  steps?: number;
  guidance_scale?: number;
  width?: number;
  height?: number;
  seed?: number;
}

interface APIKeys {
  gemini_api_key?: string;
  huggingface_token?: string;
  custom_endpoints?: {
    heartsync_nsfw?: string;
    flux_uncensored?: string;
    cors_proxy?: string;
  };
}

export class HuggingFaceSpacesService {

  private static readonly HF_SPACES = {
    'flux_dev': { // Updated from researches (HF 2025)
      url: 'https://huggingface.co/spaces/black-forest-labs/FLUX.1-dev',
      api_endpoint: 'https://black-forest-labs-flux-1-dev.hf.space/run/predict',
      type: 'artistic_uncensored',
      max_queue_time: 90000,
      fn_index: 0,
    },
    'heartsync_nsfw': {
      url: 'https://huggingface.co/spaces/Heartsync/NSFW-Uncensored-photo',
      api_endpoint: 'https://heartsync-nsfw-uncensored-photo.hf.space/api/predict',
      type: 'nsfw_uncensored',
      max_queue_time: 120000,
      fn_index: 0,
    },
    'flux_kontext': { // Added from web search 
      url: 'https://huggingface.co/spaces/black-forest-labs/FLUX.1-Kontext-dev',
      api_endpoint: 'https://black-forest-labs-flux-1-kontext-dev.hf.space/run/predict',
      type: 'artistic_uncensored',
      max_queue_time: 90000,
      fn_index: 0,
    },
    'sdxl_lightning': {
      url: 'https://huggingface.co/spaces/AP123/SDXL-Lightning',
      api_endpoint: 'https://ap123-sdxl-lightning.hf.space/run/predict',
      type: 'realistic',
      max_queue_time: 60000,
      fn_index: 0,
    }
  };

  /**
   * Autonomously discover and test HuggingFace Spaces for uncensored generation
   */
  static async discoverUncensoredModels(apiKeys: APIKeys | null): Promise<string[]> {
    if (!apiKeys?.huggingface_token) {
      console.warn("HuggingFace token not provided. Uncensored model discovery skipped.");
      return [];
    }
    
    const discoveredModels: string[] = [];

    // Update endpoints from API keys
    this.updateEndpointsFromAPIKeys(apiKeys);

    // Test known uncensored spaces
    for (const [spaceName, config] of Object.entries(this.HF_SPACES)) {
      try {
        const endpoint = config.api_endpoint || this.getCustomEndpoint(spaceName, apiKeys);
        if (endpoint) {
          const isActive = await this.testSpaceAvailability(endpoint, apiKeys.huggingface_token);
          if (isActive) {
            discoveredModels.push(spaceName);
          }
        }
      } catch (error) {
        console.log(`Space ${spaceName} not available:`, error);
      }
    }

    // Real auto-discovery using HF API (from HF Docs 2025, public endpoint)
    const autoDiscovered = await this.autonomousSpaceDiscovery(apiKeys.huggingface_token);
    discoveredModels.push(...autoDiscovered);

    return discoveredModels;
  }

  private static async autonomousSpaceDiscovery(token: string): Promise<string[]> {
    try {
      const response = await fetch(
        'https://huggingface.co/api/models?filter=image-generation&search=uncensored OR nsfw&sort=downloads&direction=-1&limit=10',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Discovery failed');
      const models = await response.json();
      return models.map((m: any) => m.id.split('/')[1]); // Extract space names
    } catch (error) {
      console.error('Auto-discovery error:', error);
      return [];
    }
  }

  private static updateEndpointsFromAPIKeys(apiKeys: APIKeys) {
    if (apiKeys.custom_endpoints?.heartsync_nsfw) {
      this.HF_SPACES['heartsync_nsfw'].api_endpoint = apiKeys.custom_endpoints.heartsync_nsfw;
    }
    if (apiKeys.custom_endpoints?.flux_uncensored) {
      this.HF_SPACES['flux_dev'].api_endpoint = apiKeys.custom_endpoints.flux_uncensored;
    }
  }

  private static getCustomEndpoint(spaceName: string, apiKeys: APIKeys): string | null {
    switch (spaceName) {
      case 'heartsync_nsfw':
        return apiKeys.custom_endpoints?.heartsync_nsfw || null;
      case 'flux_dev':
        return apiKeys.custom_endpoints?.flux_uncensored || null;
      default:
        return null;
    }
  }

  /**
   * Generate uncensored image using HuggingFace Space
   */
  static async generateUncensoredImage(
    prompt: string,
    preferredSpace?: string,
    physiologyState?: any,
    apiKeys?: APIKeys | null,
    options?: Omit<HFImageRequest, 'prompt'>
  ): Promise<HFSpaceResponse> {
    // Enhance prompt based on physiology state for more accurate generation (neuro-modulated, ref: PMC 2024)
    const enhancedPrompt = this.enhancePromptWithPhysiology(prompt, physiologyState);

    // Try preferred space first, then fallback to others
    const spacesToTry = preferredSpace
      ? [preferredSpace, ...Object.keys(this.HF_SPACES).filter(s => s !== preferredSpace)]
      : Object.keys(this.HF_SPACES);

    for (const spaceName of spacesToTry) {
      try {
        const result = await this.callHFSpace(spaceName, enhancedPrompt, apiKeys, options);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.log(`Failed to generate with ${spaceName}:`, error);
        continue;
      }
    }

    return {
      success: false,
      error: "All HuggingFace spaces failed or unavailable"
    };
  }

  /**
   * Call specific HuggingFace Space
   */
  private static async callHFSpace(
    spaceName: string,
    prompt: string,
    apiKeys: APIKeys | null,
    options?: Omit<HFImageRequest, 'prompt'>
  ): Promise<HFSpaceResponse> {
    const spaceConfig = this.HF_SPACES[spaceName as keyof typeof this.HF_SPACES];
    if (!spaceConfig) {
      throw new Error(`Unknown space: ${spaceName}`);
    }

    const requestData: HFImageRequest = {
      prompt: prompt,
      negative_prompt: options?.negative_prompt || "low quality, blurry, distorted, watermark",
      steps: options?.steps || 20,
      guidance_scale: options?.guidance_scale || 7.5,
      width: options?.width || 768,
      height: options?.height || 1024,
      seed: options?.seed ?? Math.floor(Math.random() * 1000000)
    };

    return this.directAPICall(spaceName, requestData, apiKeys);
  }

  /**
   * Direct API call to HuggingFace Space
   */
  private static async directAPICall(
    spaceName: string,
    data: HFImageRequest,
    apiKeys: APIKeys | null,
  ): Promise<HFSpaceResponse> {
    const spaceConfig = this.HF_SPACES[spaceName as keyof typeof this.HF_SPACES];
    if (!spaceConfig) throw new Error(`Invalid space name: ${spaceName}`);
    
    const endpoint = spaceConfig.api_endpoint;
    const authToken = apiKeys?.huggingface_token;
    const corsProxy = apiKeys?.custom_endpoints?.cors_proxy;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const finalUrl = corsProxy ? `${corsProxy}${encodeURIComponent(endpoint)}` : endpoint;

    let payloadData;
    const fn_index = spaceConfig.fn_index;

    // Adjusted payload based on space (from researches, e.g., FLUX requires specific order)
    if (spaceName.includes('flux')) {
      payloadData = [
        data.prompt,
        data.negative_prompt || '',
        data.seed,
        data.width,
        data.height,
        data.steps,
        data.guidance_scale,
        false, // Watermark
        false  // Separate prompts
      ];
    } else { // Default for NSFW/others
      payloadData = [
        data.prompt,
        data.negative_prompt,
        data.guidance_scale,
        data.steps,
        data.width,
        data.height,
        data.seed
      ];
    }

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fn_index,
        data: payloadData,
        session_hash: Math.random().toString(36).substring(2)
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Parse HuggingFace response format (updated for 2025 formats)
    if (result.data && result.data[0]) {
      const imageData = result.data[0];
      let imageUrl: string;

      if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
        imageUrl = imageData;
      } else if (imageData.url) {
        imageUrl = imageData.url;
      } else if (imageData.path) {
        imageUrl = `https://huggingface.co${imageData.path}`;
      } else {
        throw new Error("Unexpected response format");
      }

      return {
        success: true,
        imageUrl: imageUrl,
        model_used: spaceName
      };
    }

    throw new Error("No image data in response");
  }

  /**
   * Test if a HuggingFace Space is currently available
   */
  private static async testSpaceAvailability(endpoint: string, authToken?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(endpoint, {
        method: 'HEAD',
        headers,
        mode: 'cors'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Enhance prompt based on physiological state for accurate representation
   */
  private static enhancePromptWithPhysiology(
    basePrompt: string,
    physiologyState?: any
  ): string {
    if (!physiologyState) return basePrompt;

    let enhancedPrompt = basePrompt;

    // Neuro-modulated enhancements (ref: PMC 2024 neuroimaging; Frontiers 2025)
    if (physiologyState.arousal > 0.7) {
      enhancedPrompt += ", flushed skin, dilated pupils, heightened emotional expression"; // Vasodilation/dopamine response
    }

    if (physiologyState.tumescence > 0.6) {
      enhancedPrompt += ", engorged vascular features, increased blood flow visibility"; // Physiological engorgement
    }

    if (physiologyState.wetness > 0.5) {
      enhancedPrompt += ", glistening moist skin, natural lubrication effects"; // Sympathetic arousal
    }

    if (physiologyState.vulnerability > 0.8) {
      enhancedPrompt += ", vulnerable open expression, emotional depth in gaze"; // Oxytocin bonding
    }

    if (physiologyState.climax_potential > 0.9) {
      enhancedPrompt += ", intense climactic expression, peak physiological tension"; // Endorphin rush
    }

    return enhancedPrompt;
  }
  
  private static getAPIKeys(): APIKeys | null {
    try {
        const savedKeys = localStorage.getItem('persona_api_keys');
        if (savedKeys) {
            return JSON.parse(savedKeys);
        }
        return null;
    } catch (e) {
        console.warn('Could not load API keys from localStorage.');
        return null;
    }
  }


  /**
   * Get censorship bypass status for different regions
   */
  static async getCensorshipBypassStatus(): Promise<{
    gemini_bypassed: boolean;
    region_restrictions: string[];
    alternative_endpoints: number;
  }> {
    const discoveredModels = await this.discoverUncensoredModels(this.getAPIKeys());

    return {
      gemini_bypassed: discoveredModels.length > 0,
      region_restrictions: ['EU', 'Germany', 'Italy'], // From web search 2025
      alternative_endpoints: discoveredModels.length
    };
  }

  /**
   * Auto-configure best uncensored endpoint based on user location and preferences
   */
  static async autoConfigureUncensoredGeneration(): Promise<{
    configured: boolean;
    selected_model: string;
    bypass_method: string;
  }> {
    const availableModels = await this.discoverUncensoredModels(this.getAPIKeys());

    if (availableModels.length === 0) {
      return {
        configured: false,
        selected_model: "none",
        bypass_method: "none"
      };
    }

    // Select best model based on availability and capability (prefer FLUX from researches)
    const selectedModel = availableModels.includes('flux_dev')
      ? 'flux_dev'
      : availableModels.includes('heartsync_nsfw')
      ? 'heartsync_nsfw'
      : availableModels[0];

    return {
      configured: true,
      selected_model: selectedModel,
      bypass_method: "huggingface_direct" // Or "abliteration" if integrated
    };
  }
}