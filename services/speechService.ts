
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition; };
    webkitSpeechRecognition: { new (): SpeechRecognition; };
  }
}

export type ConversationState = 'idle' | 'listening' | 'speaking' | 'processing';

interface ConversationCallbacks {
  onUserSpeech: (text: string) => void;
  onStateChange: (state: ConversationState) => void;
  onError: (error: string) => void;
  onListeningEnd: () => void;
}

class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private callbacks: ConversationCallbacks | null = null;

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    if (!this.isSupported()) {
        console.warn("Il riconoscimento vocale non è supportato da questo browser.");
        return;
    }

    if (this.recognition && this.isListening) {
        this.recognition.abort();
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'it-IT';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks?.onStateChange('listening');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks?.onListeningEnd();
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error("Errore riconoscimento vocale:", event.error);
        this.callbacks?.onError(`Errore riconoscimento vocale: ${event.error}`);
      } else {
        console.log(`Evento riconoscimento vocale: ${event.error}`);
      }
      this.isListening = false;
      this.callbacks?.onListeningEnd();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) {
          this.callbacks?.onUserSpeech(transcript);
      }
    };
  }
  
  public reinitialize(): void {
      this.stopListening();
      this.initializeRecognition();
  }

  setCallbacks(callbacks: ConversationCallbacks): void {
    this.callbacks = callbacks;
  }

  startListening(): void {
    if (!this.recognition) {
      this.callbacks?.onError("Riconoscimento vocale non disponibile");
      return;
    }
    if (this.isListening) {
      console.warn("Attempted to start listening while already listening.");
      return;
    }

    try {
      this.recognition.start();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        console.warn("Il riconoscimento vocale è già in fase di avvio.");
      } else {
        console.error("Impossibile avviare il riconoscimento vocale:", e);
        this.callbacks?.onError("Errore nell'avviare il riconoscimento vocale");
      }
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      // Prevent onend from firing automatically
      this.recognition.onend = null;
      this.recognition.abort();
      this.isListening = false;
       // Restore onend for next cycle
      setTimeout(() => {
        if(this.recognition) {
          this.recognition.onend = () => {
            this.isListening = false;
            this.callbacks?.onListeningEnd();
          };
        }
      }, 100);
    }
  }

  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}

export const speechService = new SpeechService();