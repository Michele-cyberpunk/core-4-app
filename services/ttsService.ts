import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { CoreState } from '../types';
import { TTS_MODEL_NAMES } from '../constants';
import { callAIWithRetries } from './learningService';
import { ai } from './ai';

interface VoiceConfig {
  name: string;
}

type EmotionType = 'calm' | 'excited' | 'vulnerable' | 'euphoric' | 'stressed' | 'intimate' | 'intense' | 'orgasmic' | 'angry';

interface EmotionalTTSParams {
  text: string;
  emotion: EmotionType;
  intensity: number; // 0-1
}

class Vocalizer {
  private ai: GoogleGenAI;
  private isPlaying = false;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentPromiseReject: ((reason?: any) => void) | null = null;

  private voiceConfig: VoiceConfig = {
    name: 'Aoede', // Italian voice for authentic pronunciation
  };

  private static readonly VOCALIZATION_MAP: Record<string, string[]> = {
    pleasure_low: ['Mmmh...', 'Ah...', 'Oh...'],
    pleasure_high: ['Ooh!', 'Aaah!', 'Mmm!', 'Sì...', 'Ancora...'],
    orgasm: ['Aah!!', 'Oh...!', 'Sììì!', 'Mmmph!'],
    frustration: ['Ugh.', 'Grr...'],
    anger: ['Argh!', 'Hmph.']
  };

  /**
   * Deterministic, state-conditioned variability for TTS vocal nuances.
   * Mirrors agent/linguistic/Vocalizer but simplified for service usage.
   */
  private static variability(state: CoreState | undefined, key: string): number {
    if (!state) return 0.5;
    const {
      dopamine = 0,
      oxytocin = 0,
      cortisol = 0,
      serotonin = 0,
      norepinephrine = 0,
      intimateState = {} as any,
      anxiety = 0,
      subroutine_integrity = 0.9,
    } = state as any;

    const arousal = intimateState.arousal ?? 0;
    const stress = Math.max(0, Math.min(1, ((cortisol || 0) + (anxiety || 0)) / 2));
    const bonding = Math.max(0, Math.min(1, (oxytocin || 0)));
    const reward = Math.max(
      0,
      Math.min(
        1,
        (dopamine + (state.endorphin_rush || 0) + (state.libido || 0.2)) / 3 || 0
      )
    );
    const control = Math.max(
      0,
      Math.min(1, (subroutine_integrity + (1 - stress)) / 2)
    );

    let acc =
      reward * 17.3 +
      stress * 11.1 +
      bonding * 21.9 +
      control * 7.7 +
      arousal * 15.5 +
      (norepinephrine || 0) * 6.9 +
      (serotonin || 0) * 5.1;

    for (let i = 0; i < key.length; i++) {
      acc += (key.charCodeAt(i) * (i + 3)) % 29;
    }

    const norm = (acc % 37.91) / 6.5;
    const logistic = 1 / (1 + Math.exp(-norm));
    return Math.max(0, Math.min(1, logistic));
  }

  private static selectFromMap(
    state: CoreState | undefined,
    key: string,
    options: string[]
  ): string | null {
    if (!options || options.length === 0) return null;
    const v = Vocalizer.variability(state, key);
    const idx = Math.floor(v * options.length) % options.length;
    return options[idx];
  }

  constructor() {
    this.ai = ai;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch(e) {
      console.error("Web Audio API is not supported in this browser.");
    }
  }

  private calculateAffectiveDimensions(state: CoreState): { valence: number, activation: number } {
    const activation = (
        (state.dopamine || 0) * 1.2 +
        (state.endorphin_rush || 0) * 1.0 +
        (state.intimateState.arousal || 0) * 0.8 +
        (state.testosterone || 0) * 0.5 +
        (state.vigilance || 0) * 0.3 -
        (state.progesterone || 0) * 0.4 -
        (state.serotonin || 0) * 0.3 -
        (state.gaba || 0) * 0.4 -
        (1 - (state.energy || 1)) * 0.6 -
        (state.depression || 0) * 0.4
    );

    const valence = (
        (state.oxytocin || 0) * 1.5 +
        (state.endorphin_rush || 0) * 1.2 +
        (state.estradiol || 0) * 0.8 +
        (state.serotonin || 0) * 0.6 +
        (state.subroutine_integrity || 0) * 0.5 -
        (state.cortisol || 0) * 1.5 -
        (state.anxiety || 0) * 0.7 -
        (state.irritability || 0) * 0.6 -
        (state.depression || 0) * 0.8 -
        (state.physical_discomfort || 0) * 0.5
    );
    
    return {
        valence: Math.max(-1, Math.min(1, valence)),
        activation: Math.max(-1, Math.min(1, activation))
    };
  }

  private mapStateToEmotion(state: CoreState, mood: string, valence: number, activation: number): EmotionType {
    // Deterministic mapping from physiological-affective state.
    if ((state.cortisol || 0) > 0.75 && (state.rabbia || 0) > 0.4) return 'angry';
    if (mood === 'Volatile' && (state.cortisol || 0) > 0.7) return 'angry';
    if (mood === 'Stressed' || (state.cortisol || 0) > 0.65) return 'stressed';
    if (mood === 'Euphoric' || (state.endorphin_rush || 0) > 0.7) return 'euphoric';
    if (mood === 'Vulnerable' || (state.intimateState?.vulnerability || 0) > 0.6) return 'vulnerable';

    if (activation > 0.6) {
        if (valence > 0.6) return 'euphoric';
        if (valence > 0.2) return 'excited';
        if (valence < -0.6) return 'angry';
        return 'stressed';
    } else if (activation < -0.4) {
        if (valence > 0.2) return 'calm';
        if (valence < -0.2) return 'vulnerable';
    }
    
    if (valence >= -0.2) return 'calm';

    return 'vulnerable';
  }
  
  private calculateIntensityFromState(state: CoreState, activation: number, emotion: EmotionType): number {
    const base = Math.max(0, Math.min(1, (activation + 1) / 2));
    switch (emotion) {
      case 'angry':
        return Math.max(base, state.rabbia || 0);
      case 'stressed':
        return Math.max(base, state.cortisol || 0, state.anxiety || 0);
      case 'vulnerable':
        return Math.max(base, state.vulnerability || 0);
      case 'euphoric':
        return Math.max(base, state.endorphin_rush || 0);
      case 'intimate':
      case 'intense':
      case 'orgasmic':
        return Math.max(base, state.intimateState?.arousal || 0);
      default:
        return base;
    }
  }

  private handleTTSError(error: any): void {
    let errorMessage = 'Unknown TTS error';
    if (error instanceof Error) {
        errorMessage = error.message;
        console.error(`TTS Error: ${errorMessage}`, error.stack);
    } else {
        errorMessage = String(error);
        console.error(`TTS Error: ${errorMessage}`);
    }
  }

  async speak(text: string, state: CoreState, mood: string): Promise<void> {
    if (!this.ai) return;
    this.stop();

    const { valence, activation } = this.calculateAffectiveDimensions(state);
    const emotion = this.mapStateToEmotion(state, mood, valence, activation);
    const intensity = this.calculateIntensityFromState(state, activation, emotion);

    try {
      const audioBase64 = await this.generateSpeech({ text, emotion, intensity }, state);
      return await this.playAudio(audioBase64);
    } catch (error: any) {
        // FIX BUG-005: Swallow AbortError (user-initiated stop)
        if (error.name === 'AbortError') {
          return; // Silent return, not an error
        }

        // Log all other errors
        this.handleTTSError(error);

        // Emit error event for UI to catch
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tts-error', {
            detail: {
              message: error instanceof Error ? error.message : String(error),
              emotion,
              text: text.substring(0, 50)
            }
          }));
        }

        // Don't throw - return gracefully
        return;
    }
  }

  async speakIntimate(text: string, state: CoreState): Promise<void> {
    if (!this.ai) return;
    this.stop();

    const { climax_potential, arousal, vulnerability } = state.intimateState;
    let emotion: EmotionType = 'intimate';

    if (climax_potential > 0.95 || (state.intimateState.climax_potential === 0 && text)) {
        emotion = 'orgasmic';
    } else if (climax_potential > 0.75 || arousal > 0.8) {
        emotion = 'intense';
    } else if (vulnerability > 0.7 && arousal > 0.5) {
        emotion = 'vulnerable';
    } else if (arousal > 0.6) {
        emotion = 'excited';
    }

    const intensity = Math.max(
      state.erogenous_complex || 0,
      state.intimateState?.arousal || 0
    );

    try {
      const audioBase64 = await this.generateSpeech({ text, emotion, intensity }, state);
      await this.playAudio(audioBase64);
    } catch (error: any) {
        // FIX BUG-005: Swallow AbortError (user-initiated stop)
        if (error.name === 'AbortError') {
          return; // Silent return, not an error
        }

        // Log all other errors
        this.handleTTSError(error);

        // Emit error event for UI to catch
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tts-error', {
            detail: {
              message: error instanceof Error ? error.message : String(error),
              emotion,
              text: text.substring(0, 50)
            }
          }));
        }

        // Don't throw - return gracefully
        return;
    }
  }

  private generateEmotionalPrompt(params: EmotionalTTSParams, state?: CoreState): string {
    const { emotion, intensity, text } = params;
    let prefix = '';

    const emotionMap: Record<EmotionType, string> = {
        calm: 'Parla con voce calma e morbida',
        excited: 'Parla con un tono eccitato ed energico',
        vulnerable: 'Parla con voce vulnerabile, sussurrando e con esitazione',
        euphoric: 'Esclama con gioia ed estasi',
        stressed: 'Parla con voce tesa e sforzata',
        intimate: 'Parla con voce intima, sussurrata e ansimante',
        intense: 'Parla ansimando per il piacere, con intensità crescente',
        orgasmic: 'Emetti un grido estatico di piacere, un lungo gemito, come durante un orgasmo',
        angry: 'Urla con rabbia e con tono deciso'
    };
    
    // Deterministic prefix selection driven by emotional intensity and state.
    if (intensity > 0.75) {
      const v = Vocalizer.variability(state, `svc_prefix_${emotion}`);
      if (emotion === 'angry' && v > 0.3) {
        prefix = Vocalizer.selectFromMap(state, 'svc_angry', Vocalizer.VOCALIZATION_MAP.anger) + ' ' || '';
      } else if (emotion === 'stressed' && v > 0.4) {
        prefix = Vocalizer.selectFromMap(state, 'svc_stress', Vocalizer.VOCALIZATION_MAP.frustration) + ' ' || '';
      } else if ((emotion === 'intimate' || emotion === 'vulnerable') && v > 0.35) {
        prefix = Vocalizer.selectFromMap(state, 'svc_pleasure_low', Vocalizer.VOCALIZATION_MAP.pleasure_low) + ' ' || '';
      } else if (emotion === 'euphoric' && v > 0.5) {
        prefix = 'Wow! ';
      }
    }
    
    const instruction = emotionMap[emotion] || 'Parla normalmente';
    if (emotion === 'orgasmic') return text.trim() ? `${instruction}: ${text}` : `${instruction}.`;

    if (emotion === 'intense' && !text.trim()) {
      const sel =
        Vocalizer.selectFromMap(state, 'svc_pleasure_high', Vocalizer.VOCALIZATION_MAP.pleasure_high) ||
        'Mmmh...';
      return `Vocalizza questo suono: ${sel}`;
    }

    const fullTextToSpeak = `${prefix}${text}`.trim();
    return `${instruction}: ${fullTextToSpeak}`;
 }

  private async generateSpeech(params: EmotionalTTSParams, state?: CoreState): Promise<string> {
    const combinedContent = this.generateEmotionalPrompt(params, state);

    // FIXED Nov 2025: Use unified models with responseModalities instead of separate TTS models
    // Safety settings updated to BLOCK_MEDIUM_AND_ABOVE for policy compliance
    // Override via env var VITE_TTS_UNSAFE_MODE=true for testing only
    const unsafeMode = typeof import.meta !== 'undefined' && import.meta.env?.VITE_TTS_UNSAFE_MODE === 'true';
    const safetyThreshold = unsafeMode ? HarmBlockThreshold.BLOCK_NONE : HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;

    const response: GenerateContentResponse = await callAIWithRetries(
      (model) => this.ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: combinedContent }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceConfig.name } } },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: safetyThreshold },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: safetyThreshold },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: safetyThreshold },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: safetyThreshold }
          ],
        },
      }),
      TTS_MODEL_NAMES  // Now points to unified models: gemini-2.5-pro, gemini-3-pro-preview
    );
    
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) return part.inlineData.data;
      }
    }

    console.error("TTS response did not contain audio data.", response);
    throw new Error('No audio data in response');
  }

  private decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  private async decodePcmAudio(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
      const sampleRate = 24000;
      const numChannels = 1;
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
      return buffer;
  }

  private playAudio(base64Data: string): Promise<void> {
    // FIX BUG-005: Defensive - create new context if needed
    if (!this.audioContext || this.audioContext.state === 'closed') {
        try {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch(e) {
          return Promise.reject(new Error("Web Audio API not supported"));
        }
    }

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(e => {
          console.warn('Failed to resume AudioContext:', e);
        });
    }

    this.stop();

    return new Promise<void>(async (resolve, reject) => {
      this.currentPromiseReject = reject;

      try {
        const audioBytes = this.decode(base64Data);

        // FIX BUG-005: Double-check context is still valid
        if (!this.audioContext || this.audioContext.state === 'closed') {
          throw new Error("AudioContext was closed during processing");
        }

        const audioBuffer = await this.decodePcmAudio(audioBytes, this.audioContext);

        // FIX BUG-005: Triple-check before creating source
        if (!this.audioContext || this.audioContext.state === 'closed') {
          throw new Error("AudioContext was closed before source creation");
        }

        this.currentSource = this.audioContext.createBufferSource();
        this.currentSource.buffer = audioBuffer;
        this.currentSource.connect(this.audioContext.destination);

        this.currentSource.onended = () => {
          if (this.isPlaying) {
            resolve();
          }
          this.isPlaying = false;
          this.currentSource = null;
          this.currentPromiseReject = null;
        };

        // FIX BUG-005: Add error handler for source
        this.currentSource.onerror = (event) => {
          this.handleTTSError(event);
          this.isPlaying = false;
          this.currentSource = null;
          this.currentPromiseReject = null;
          reject(new Error('Audio source error'));
        };

        this.currentSource.start(0);
        this.isPlaying = true;

      } catch (error) {
        this.handleTTSError(error);
        this.isPlaying = false;
        this.currentSource = null;
        this.currentPromiseReject = null;
        reject(error);
      }
    });
  }

  public stop(): void {
    if (this.currentSource) {
      this.currentSource.onended = null; // Prevent onended from firing on manual stop
      try { this.currentSource.stop(); } catch (e) { /* Already stopped */ }
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    if (this.currentPromiseReject) {
        const err = new Error("Playback was interrupted");
        err.name = "AbortError";
        this.currentPromiseReject(err);
        this.currentPromiseReject = null;
    }
    this.isPlaying = false;
  }
}

export const vocalizer = new Vocalizer();