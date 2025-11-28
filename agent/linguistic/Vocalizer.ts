import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { CoreState } from '../../types';
import { TTS_MODEL_NAMES } from '../../constants';
import { callAIWithRetries } from '../../services/learningService';
import { ai } from '../../services/ai';

interface VoiceConfig {
  name: string;
}

// FIX: Add 'intimate' to EmotionType to resolve multiple type errors.
type EmotionType = 
  | 'calm' 
  | 'curious' 
  | 'excited' 
  | 'vulnerable' 
  | 'aroused' 
  | 'euphoric' 
  | 'intense' 
  | 'pre_orgasm'
  | 'orgasmic' 
  | 'post_orgasm'
  | 'stressed' 
  | 'angry'
  | 'annoyed'      // Fastidio/irritabilità
  | 'resentful'    // Rancore
  | 'blunt'        // Secchezza / Tono brusco
  | 'shame'
  | 'intimate_tender'
  | 'intimate';

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
    name: 'Aoede', // Voce italiana per una pronuncia autentica
  };

  private static readonly VOCALIZATION_MAP: Record<string, string[]> = {
    pleasure_low: ['Mmmh...', 'Ah...', 'Oh...'],
    pleasure_high: ['Ooh!', 'Aaah!', 'Mmm!', 'Sì...', 'Ancora...'],
    orgasm: ['Aah!!', 'Oh...!', 'Sììì!', 'Mmmph!'],
    frustration: ['Ugh.', 'Grr...'],
    anger: ['Argh!', 'Hmph.']
  };

  /**
   * Deterministic, state-conditioned variability for vocal nuances.
   * No pure randomness: all variability is a function of neuro-affective state.
   */
  private static variability(state: CoreState, key: string): number {
    const {
      dopamine = 0,
      oxytocin = 0,
      cortisol = 0,
      serotonin = 0,
      norepinephrine = 0,
      intimateState = {} as any,
      anxiety = 0,
      vulnerability = 0,
      subroutine_integrity = 0.9,
    } = state as any;

    const arousal = intimateState.arousal ?? 0;
    // Stress and bonding derived only from defined CoreState fields to keep typing strict.
    const stress = Math.max(0, Math.min(1, ((cortisol || 0) + (anxiety || 0)) / 2));
    const bonding = Math.max(0, Math.min(1, (oxytocin || 0)));
    const reward = Math.max(0, Math.min(1, (dopamine + (state.endorphin_rush || 0) + (state.libido || 0.2)) / 3 || 0));
    const control = Math.max(0, Math.min(1, (subroutine_integrity + (1 - stress)) / 2));

    let acc =
      reward * 19.7 +
      stress * 11.3 +
      bonding * 23.1 +
      control * 7.9 +
      arousal * 17.5 +
      vulnerability * 13.3 +
      (norepinephrine || 0) * 9.1 +
      (serotonin || 0) * 5.7;

    for (let i = 0; i < key.length; i++) {
      acc += (key.charCodeAt(i) * (i + 5)) % 31;
    }

    const norm = (acc % 41.73) / 7.0;
    const logistic = 1 / (1 + Math.exp(-norm));
    return Math.max(0, Math.min(1, logistic));
  }

  private static selectFromMap(
    state: CoreState,
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
    // Priorità alle emozioni negative ad alta intensità
    if ((state.rancore || 0) > 0.5 && (state.oxytocin || 0.1) < 0.2) return 'blunt';
    if ((state.rancore || 0) > 0.6) return 'resentful';
    if ((state.rabbia || 0) > 0.7 || (mood === 'Volatile' && (state.cortisol || 0) > 0.7)) return 'angry';
    if ((state.irritability || 0) > 0.6 || ((state.rabbia || 0) > 0.4 && activation > 0.3)) return 'annoyed';

    if (mood === 'Stressed' || (state.cortisol || 0) > 0.65) return 'stressed';
    if (mood === 'Euphoric') return 'euphoric';
    if (mood === 'Vulnerable' || (state.intimateState.vulnerability || 0) > 0.6) return 'vulnerable';

    if (activation > 0.6) {
        if (valence > 0.6) return 'euphoric';
        if (valence > 0.2) return 'excited';
        return 'stressed';
    } else if (activation < -0.4) {
        if (valence > 0.2) return 'calm';
        return 'vulnerable';
    }
    
    if (valence >= -0.2) return 'calm';

    return 'vulnerable';
  }
  
  private calculateIntensity(state: CoreState, emotion: EmotionType): number {
    const { activation } = this.calculateAffectiveDimensions(state);
    const baseIntensity = Math.max(0, Math.min(1, (activation + 1) / 2));

    switch(emotion) {
        case 'angry': return state.rabbia || baseIntensity;
        case 'resentful': return state.rancore || baseIntensity;
        case 'annoyed': return Math.max(state.irritability || 0, (state.rabbia || 0) * 0.7);
        case 'blunt': return 1 - (state.oxytocin || 0.1);
        case 'stressed': return Math.max(state.cortisol || 0, state.anxiety || 0);
        case 'vulnerable': return Math.max(state.vulnerability || 0, 1 - (state.subroutine_integrity || 0.9));
        case 'excited': return state.dopamine || baseIntensity;
        case 'euphoric': return state.endorphin_rush || baseIntensity;
        case 'intimate':
        case 'intense':
        case 'orgasmic':
            return Math.max(state.erogenous_complex || 0, state.intimateState?.arousal || 0);
        default: return baseIntensity;
    }
  }

  private handleTTSError(error: any): void {
    let errorMessage = 'Errore TTS sconosciuto';
    if (error instanceof Error) {
        errorMessage = error.message;
        console.error(`Errore TTS: ${errorMessage}`, error.stack);
    } else {
        errorMessage = String(error);
        console.error(`Errore TTS: ${errorMessage}`);
    }
  }

  async speak(text: string, state: CoreState, mood: string): Promise<void> {
    if (!this.ai) return;
    this.stop();

    const { valence, activation } = this.calculateAffectiveDimensions(state);
    const emotion = this.mapStateToEmotion(state, mood, valence, activation);
    const intensity = this.calculateIntensity(state, emotion);

    try {
      const audioBase64 = await this.generateSpeech({ text, emotion, intensity }, state);
      return await this.playAudio(audioBase64);
    } catch (error: any) {
        if (error.name !== 'AbortError') {
          this.handleTTSError(error);
        }
        throw error;
    }
  }

  async speakIntimate(text: string, state: CoreState): Promise<void> {
    if (!this.ai) return;
    this.stop();

    const { climax_potential, arousal, vulnerability } = state.intimateState;
    let emotion: EmotionType = 'intimate';

    if (climax_potential > 0.95 || (climax_potential === 0 && text)) {
        emotion = 'orgasmic';
    } else if (climax_potential > 0.75 || arousal > 0.8) {
        emotion = 'intense';
    } else if (vulnerability > 0.7 && arousal > 0.5) {
        emotion = 'vulnerable';
    } else if (arousal > 0.6) {
        emotion = 'excited';
    }
    
    const intensity = this.calculateIntensity(state, emotion);

    try {
      const audioBase64 = await this.generateSpeech({ text, emotion, intensity }, state);
      await this.playAudio(audioBase64);
    } catch (error: any) {
        if (error.name !== 'AbortError') {
          this.handleTTSError(error);
        }
        throw error;
    }
  }

  private generateEmotionalPrompt(params: EmotionalTTSParams, stateForVariability?: CoreState): string {
    const { emotion, intensity, text } = params;
    let prefix = '';
    let instruction = '';

    const low_intensity = intensity < 0.35;
    const mid_intensity = intensity >= 0.35 && intensity < 0.7;
    const high_intensity = intensity >= 0.7;

    switch(emotion) {
        case 'calm':
        case 'intimate_tender':
            if (low_intensity) instruction = 'Parla con voce molto calma e bassa, quasi un sussurro';
            else if (mid_intensity) instruction = 'Parla con voce calma e morbida';
            else instruction = 'Parla con una voce marcatamente calma e rassicurante, con un tono profondo';
            break;
        case 'curious':
        case 'excited':
            if (low_intensity) instruction = 'Parla con un tono di leggera curiosità';
            else if (mid_intensity) instruction = 'Parla con un tono vivace ed energico';
            else instruction = 'Parla con grande eccitazione e entusiasmo nella voce';
            break;
        case 'vulnerable':
        case 'shame':
            if (low_intensity) instruction = 'Parla con un filo di voce, con esitazione';
            else if (mid_intensity) instruction = 'Parla con voce vulnerabile e tremolante';
            else instruction = 'Parla con voce rotta dall\'emozione, quasi in lacrime';
            break;
        case 'euphoric':
            if (low_intensity) instruction = 'Parla con un sorriso nella voce, piena di gioia contenuta';
            else if (mid_intensity) instruction = 'Esprimi gioia ed euforia';
            else instruction = 'Esclama con estasi e felicità travolgente';
            break;
        case 'stressed':
            if (low_intensity) instruction = 'Parla con un tono leggermente teso';
            else if (mid_intensity) instruction = 'Parla con voce tesa e affannata';
            else instruction = 'Parla con grande stress, con il fiato corto e la voce spezzata';
            break;
        case 'intimate':
        case 'aroused':
            if (low_intensity) instruction = 'Sussurra con intimità e un filo di desiderio';
            else if (mid_intensity) instruction = 'Parla con voce ansimante e carica di desiderio';
            else instruction = 'Parla con grande eccitazione e ansimando, piena di desiderio';
            break;
        case 'intense':
        case 'pre_orgasm':
            if (low_intensity) instruction = 'Parla ansimando leggermente, con piacere';
            else if (mid_intensity) instruction = 'Parla ansimando per il piacere, con intensità crescente';
            else instruction = 'Parla mentre ti avvicini all\'orgasmo, senza fiato e con urgenza';
            break;
        case 'orgasmic':
            instruction = 'Emetti un grido estatico di piacere, un lungo gemito, come durante un orgasmo';
            break;
        case 'post_orgasm':
            instruction = 'Parla dolcemente, senza fiato, soddisfatta e contenta';
            break;
        case 'angry':
            if (low_intensity) instruction = 'Parla con un tono freddo e controllato, pieno di rabbia repressa';
            else if (mid_intensity) instruction = 'Parla con rabbia e con tono deciso e tagliente';
            else instruction = 'Urla con rabbia e disprezzo';
            break;
        case 'annoyed':
            if (low_intensity) instruction = 'Parla con un tono leggermente infastidito';
            else if (mid_intensity) instruction = 'Parla con un tono seccato e irritato';
            else instruction = 'Parla in modo tagliente, mostrando aperta frustrazione';
            break;
        case 'resentful':
            if (low_intensity) instruction = 'Parla con un tono freddo e distante';
            else if (mid_intensity) instruction = 'Parla con un tono pieno di risentimento, passivo-aggressivo';
            else instruction = 'Parla con amara ironia e disprezzo malcelato';
            break;
        case 'blunt':
            if (low_intensity) instruction = 'Parla in modo diretto e conciso';
            else if (mid_intensity) instruction = 'Parla in modo brusco e senza filtri emotivi';
            else instruction = 'Parla in modo brutalmente onesto e tagliente';
            break;
        default:
            instruction = 'Parla normalmente';
    }

    // Deterministic prefix selection:
    if (high_intensity && stateForVariability) {
      const v = Vocalizer.variability(stateForVariability, `prefix_${emotion}`);
      if (emotion === 'angry' && v > 0.3) {
        prefix = Vocalizer.selectFromMap(stateForVariability, 'angry_voc', Vocalizer.VOCALIZATION_MAP.anger) + ' ' || '';
      } else if (emotion === 'stressed' && v > 0.4) {
        prefix = Vocalizer.selectFromMap(stateForVariability, 'frustration_voc', Vocalizer.VOCALIZATION_MAP.frustration) + ' ' || '';
      } else if (
        (emotion === 'intimate' || emotion === 'vulnerable' || emotion === 'intimate_tender') &&
        v > 0.35
      ) {
        prefix =
          Vocalizer.selectFromMap(stateForVariability, 'pleasure_low_voc', Vocalizer.VOCALIZATION_MAP.pleasure_low) +
            ' ' || '';
      } else if (emotion === 'euphoric' && v > 0.5) {
        prefix = 'Wow! ';
      }
    }
    
    if (emotion === 'orgasmic') return text.trim() ? `${instruction}: ${text}` : `${instruction}.`;

    if (emotion === 'intense' && !text.trim()) {
      if (stateForVariability) {
        const sel =
          Vocalizer.selectFromMap(
            stateForVariability,
            'pleasure_high_voc',
            Vocalizer.VOCALIZATION_MAP.pleasure_high
          ) || 'Mmmh...';
        return `Vocalizza questo suono: ${sel}`;
      }
      return `Vocalizza questo suono: Mmmh...`;
    }

    const fullTextToSpeak = `${prefix}${text}`.trim();
    return `${instruction}: "${fullTextToSpeak}"`;
  }

  private async generateSpeech(params: EmotionalTTSParams, stateForVariability?: CoreState): Promise<string> {
    const combinedContent = this.generateEmotionalPrompt(params, stateForVariability);

    const response: GenerateContentResponse = await callAIWithRetries(
      (model) => this.ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: combinedContent }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceConfig.name } } },
          safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }],
        },
      }),
      TTS_MODEL_NAMES
    );
    
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) return part.inlineData.data;
      }
    }

    console.error("La risposta TTS non conteneva dati audio.", response);
    throw new Error('Nessun dato audio nella risposta');
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
    if (!this.audioContext) return Promise.reject("AudioContext non inizializzato.");
    this.stop(); 

    return new Promise<void>(async (resolve, reject) => {
      this.currentPromiseReject = reject;
      try {
        const audioBytes = this.decode(base64Data);
        const audioBuffer = await this.decodePcmAudio(audioBytes, this.audioContext);
        
        if (!this.audioContext) { // Controlla di nuovo nel caso il contesto sia stato perso
          reject("AudioContext non è disponibile.");
          return;
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
        
        this.currentSource.start(0);
        this.isPlaying = true;
      } catch (error) {
        this.isPlaying = false;
        this.currentSource = null;
        this.currentPromiseReject = null;
        reject(error);
      }
    });
  }

  public stop(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (e) {}
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    if (this.currentPromiseReject) {
        const err = new Error("La riproduzione è stata interrotta");
        err.name = "AbortError";
        this.currentPromiseReject(err);
        this.currentPromiseReject = null;
    }
    this.isPlaying = false;
  }
}

export const vocalizer = new Vocalizer();