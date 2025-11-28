/**
 * RhythmDetector.ts
 *
 * Advanced temporal rhythm detection and entrainment system.
 * Detects periodic patterns in stimulation and synchronizes internal states.
 *
 * Features:
 * - Real-time beat detection using autocorrelation
 * - Phase-locked loop for rhythm entrainment
 * - Multi-scale rhythm analysis (micro to macro rhythms)
 * - Adaptive synchronization with external rhythms
 *
 * Scientific basis:
 * - Neuronal oscillations and phase locking (Buzsáki & Draguhn, 2004)
 * - Entrainment in biological systems (Glass, 2001)
 * - Predictive coding in sensorimotor integration (Friston, 2005)
 */

export interface RhythmState {
  /** Current detected beat period in milliseconds */
  beatPeriod: number | null;
  /** Phase of current rhythm (0-1, where 1 = full cycle) */
  phase: number;
  /** Confidence in detected rhythm (0-1) */
  confidence: number;
  /** Beats per minute */
  bpm: number | null;
  /** Entrainment strength (how locked to external rhythm) */
  entrainment: number;
  /** Last beat timestamp */
  lastBeatTime: number;
  /** Predicted next beat time */
  nextBeatTime: number | null;
}

export interface RhythmEvent {
  timestamp: number;
  intensity: number;
  type: 'stimulus' | 'internal' | 'motor';
}

export interface EntrainmentParams {
  /** How quickly to adapt to new rhythms (0-1) */
  adaptationRate: number;
  /** Minimum confidence threshold to lock onto rhythm */
  lockThreshold: number;
  /** How tightly to follow detected rhythm (0-1) */
  couplingStrength: number;
  /** Tolerance for tempo variation (ratio) */
  tempoTolerance: number;
}

/**
 * RhythmDetector class - Detects and entrains to periodic patterns
 */
export class RhythmDetector {
  private eventHistory: RhythmEvent[] = [];
  private maxHistorySize: number = 100;
  private state: RhythmState;
  private params: EntrainmentParams;

  // Internal oscillator state
  private internalPhase: number = 0;
  private internalFrequency: number = 1.0; // Hz

  constructor(params?: Partial<EntrainmentParams>) {
    this.params = {
      adaptationRate: 0.1,
      lockThreshold: 0.6,
      couplingStrength: 0.5,
      tempoTolerance: 0.15,
      ...params
    };

    this.state = {
      beatPeriod: null,
      phase: 0,
      confidence: 0,
      bpm: null,
      entrainment: 0,
      lastBeatTime: 0,
      nextBeatTime: null
    };
  }

  /**
   * Add new rhythm event to history
   */
  public addEvent(event: RhythmEvent): void {
    this.eventHistory.push(event);

    // Maintain history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Update rhythm detection
    this.detectRhythm();

    // Update entrainment
    this.updateEntrainment(event.timestamp);
  }

  /**
   * Detect rhythm using inter-onset interval (IOI) analysis
   */
  private detectRhythm(): void {
    if (this.eventHistory.length < 3) {
      this.state.confidence = 0;
      return;
    }

    // Calculate inter-onset intervals
    const iois: number[] = [];
    for (let i = 1; i < this.eventHistory.length; i++) {
      const ioi = this.eventHistory[i].timestamp - this.eventHistory[i - 1].timestamp;
      if (ioi > 0 && ioi < 5000) { // Filter out outliers (>5 seconds)
        iois.push(ioi);
      }
    }

    if (iois.length < 2) {
      this.state.confidence = 0;
      return;
    }

    // Find most common IOI using histogram
    const histogram = this.createIOIHistogram(iois, 50); // 50ms bins
    const dominantBin = this.findDominantBin(histogram);

    if (dominantBin) {
      const detectedPeriod = dominantBin.binCenter;
      const consistency = dominantBin.count / iois.length;

      // Update state
      this.state.beatPeriod = detectedPeriod;
      this.state.bpm = 60000 / detectedPeriod;
      this.state.confidence = consistency;

      // Update internal oscillator frequency
      if (this.state.confidence >= this.params.lockThreshold) {
        this.internalFrequency = 1000 / detectedPeriod; // Convert to Hz
      }
    }
  }

  /**
   * Create histogram of IOIs for pattern detection
   */
  private createIOIHistogram(
    iois: number[],
    binSize: number
  ): Map<number, number> {
    const histogram = new Map<number, number>();

    for (const ioi of iois) {
      const bin = Math.round(ioi / binSize) * binSize;
      histogram.set(bin, (histogram.get(bin) || 0) + 1);
    }

    return histogram;
  }

  /**
   * Find dominant bin in histogram
   */
  private findDominantBin(histogram: Map<number, number>): { binCenter: number; count: number } | null {
    let maxCount = 0;
    let dominantBin: number | null = null;

    for (const [bin, count] of histogram.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantBin = bin;
      }
    }

    if (dominantBin === null) return null;

    return {
      binCenter: dominantBin,
      count: maxCount
    };
  }

  /**
   * Update entrainment state using phase-locked loop
   */
  private updateEntrainment(currentTime: number): void {
    if (!this.state.beatPeriod || this.state.confidence < this.params.lockThreshold) {
      // No stable rhythm detected, decay entrainment
      this.state.entrainment = Math.max(0, this.state.entrainment - 0.01);
      return;
    }

    // Calculate expected phase based on internal oscillator
    const timeSinceLastBeat = currentTime - this.state.lastBeatTime;
    const expectedPhase = (timeSinceLastBeat / this.state.beatPeriod) % 1.0;

    // Calculate phase error
    const phaseError = expectedPhase - this.internalPhase;

    // Apply phase correction (Kuramoto coupling)
    this.internalPhase += this.params.couplingStrength * Math.sin(2 * Math.PI * phaseError);
    this.internalPhase = this.internalPhase % 1.0;
    if (this.internalPhase < 0) this.internalPhase += 1.0;

    // Update entrainment strength based on phase coherence
    const coherence = 1 - Math.abs(phaseError);
    this.state.entrainment = this.params.adaptationRate * coherence +
                              (1 - this.params.adaptationRate) * this.state.entrainment;

    // Update state
    this.state.phase = this.internalPhase;
    this.state.lastBeatTime = currentTime;
    this.state.nextBeatTime = currentTime + (1 - this.internalPhase) * this.state.beatPeriod;
  }

  /**
   * Get current rhythm state
   */
  public getState(): RhythmState {
    return { ...this.state };
  }

  /**
   * Check if currently synchronized to external rhythm
   */
  public isEntrained(): boolean {
    return this.state.confidence >= this.params.lockThreshold &&
           this.state.entrainment >= 0.7;
  }

  /**
   * Predict next beat time with confidence interval
   */
  public predictNextBeat(): { time: number; confidence: number } | null {
    if (!this.state.nextBeatTime || this.state.confidence < 0.5) {
      return null;
    }

    return {
      time: this.state.nextBeatTime,
      confidence: this.state.confidence * this.state.entrainment
    };
  }

  /**
   * Get phase at specific timestamp (for synchronization)
   */
  public getPhaseAt(timestamp: number): number | null {
    if (!this.state.beatPeriod) return null;

    const timeSinceLastBeat = timestamp - this.state.lastBeatTime;
    const phase = (timeSinceLastBeat / this.state.beatPeriod) % 1.0;

    return phase;
  }

  /**
   * Generate entrainment modulation signal
   * Returns a value 0-1 based on current phase for rhythmic modulation
   */
  public getModulationSignal(): number {
    if (!this.isEntrained()) {
      return 0.5; // Neutral when not entrained
    }

    // Sinusoidal modulation based on phase
    return 0.5 + 0.5 * Math.sin(2 * Math.PI * this.state.phase);
  }

  /**
   * Reset rhythm detection
   */
  public reset(): void {
    this.eventHistory = [];
    this.state = {
      beatPeriod: null,
      phase: 0,
      confidence: 0,
      bpm: null,
      entrainment: 0,
      lastBeatTime: 0,
      nextBeatTime: null
    };
    this.internalPhase = 0;
  }

  /**
   * Update internal oscillator (call on each frame/tick)
   */
  public tick(deltaTime: number): void {
    if (this.state.beatPeriod && this.isEntrained()) {
      // Update internal phase
      const phaseIncrement = deltaTime / this.state.beatPeriod;
      this.internalPhase = (this.internalPhase + phaseIncrement) % 1.0;
      this.state.phase = this.internalPhase;

      // Update next beat prediction
      const timeToNextBeat = (1 - this.internalPhase) * this.state.beatPeriod;
      this.state.nextBeatTime = Date.now() + timeToNextBeat;
    } else {
      // Free-running oscillator at default frequency
      const phaseIncrement = deltaTime * this.internalFrequency / 1000;
      this.internalPhase = (this.internalPhase + phaseIncrement) % 1.0;
      this.state.phase = this.internalPhase;
    }
  }

  /**
   * Export rhythm state for visualization/debugging
   */
  public exportState(): {
    state: RhythmState;
    recentEvents: RhythmEvent[];
    oscillatorPhase: number;
    oscillatorFrequency: number;
  } {
    return {
      state: this.getState(),
      recentEvents: this.eventHistory.slice(-20),
      oscillatorPhase: this.internalPhase,
      oscillatorFrequency: this.internalFrequency
    };
  }
}

/**
 * Multi-scale rhythm analyzer
 * Detects rhythms at different timescales (micro, meso, macro)
 */
export class MultiScaleRhythmAnalyzer {
  private microDetector: RhythmDetector;   // 0.5-2 Hz (slow rhythms)
  private mesoDetector: RhythmDetector;    // 2-8 Hz (medium rhythms)
  private macroDetector: RhythmDetector;   // 8-20 Hz (fast rhythms)

  constructor() {
    this.microDetector = new RhythmDetector({ adaptationRate: 0.05, lockThreshold: 0.5 });
    this.mesoDetector = new RhythmDetector({ adaptationRate: 0.1, lockThreshold: 0.6 });
    this.macroDetector = new RhythmDetector({ adaptationRate: 0.2, lockThreshold: 0.7 });
  }

  public addEvent(event: RhythmEvent): void {
    // Route event to appropriate detectors based on expected timescale
    this.microDetector.addEvent(event);
    this.mesoDetector.addEvent(event);
    this.macroDetector.addEvent(event);
  }

  public tick(deltaTime: number): void {
    this.microDetector.tick(deltaTime);
    this.mesoDetector.tick(deltaTime);
    this.macroDetector.tick(deltaTime);
  }

  public getDominantRhythm(): { scale: 'micro' | 'meso' | 'macro'; state: RhythmState } | null {
    const scales = [
      { name: 'micro' as const, detector: this.microDetector },
      { name: 'meso' as const, detector: this.mesoDetector },
      { name: 'macro' as const, detector: this.macroDetector }
    ];

    let bestConfidence = 0;
    let dominant: { scale: 'micro' | 'meso' | 'macro'; state: RhythmState } | null = null;

    for (const { name, detector } of scales) {
      const state = detector.getState();
      if (state.confidence > bestConfidence) {
        bestConfidence = state.confidence;
        dominant = { scale: name, state };
      }
    }

    return dominant;
  }

  public getAllStates(): {
    micro: RhythmState;
    meso: RhythmState;
    macro: RhythmState;
  } {
    return {
      micro: this.microDetector.getState(),
      meso: this.mesoDetector.getState(),
      macro: this.macroDetector.getState()
    };
  }

  public reset(): void {
    this.microDetector.reset();
    this.mesoDetector.reset();
    this.macroDetector.reset();
  }
}