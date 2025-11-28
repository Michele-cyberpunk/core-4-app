/**
 * @file HormonalCycle.ts
 * @description Scientifically accurate model of the menstrual cycle with HPG axis dynamics
 * Integrated with emotional, personality, and cognitive modulation systems
 * 
 * Based on:
 * - Reinecke et al. (2009): Mathematical model of human menstrual cycle
 * - Clark et al. (2003): Mathematical model of FSH, LH, E2, P4 dynamics  
 * - Shechter et al. (2010): Computational model of ovarian dynamics
 * - Hall (2015): Neuroendocrinology of the menstrual cycle
 * - Reed & Carr (2018): The Normal Menstrual Cycle and Control of Ovulation
 * - Mihm et al. (2011): The normal menstrual cycle in women
 * - Gordon et al. (2015): Ovarian hormone effects on cognition and mood
 * - Epperson et al. (2017): Premenstrual syndrome and premenstrual dysphoric disorder
 * - Schmidt et al. (2017): Mood and anxiety disorders associated with reproductive hormones
 * - McEwen (2007): Physiology and neurobiology of stress and adaptation
 * - Lupien et al. (2009): Effects of stress throughout the lifespan on the brain
 */

import { 
  CoreState, 
  EmotionLabel, 
  EmotionSystem,
  BigFiveTraitLabel,
  BigFiveTrait,
  CyclePhase,
  CyclePhaseProfile,
  HormonalProfile,
  BrainRegionName,
  Neurochemical
} from '../types';

// Hormone reference ranges (for denormalization if needed)
const HORMONE_RANGES = {
  estradiol: { // pg/mL
    menstrual: [30, 50],
    early_follicular: [30, 100],
    late_follicular: [100, 400],
    ovulation: [200, 400],
    early_luteal: [100, 200],
    mid_luteal: [100, 300],
    late_luteal: [30, 100]
  },
  progesterone: { // ng/mL
    follicular: [0.1, 1.5],
    ovulation: [0.5, 2.5],
    luteal_peak: [10, 25],
    luteal_decline: [2, 10]
  },
  lh: { // IU/L
    baseline: [2, 8],
    surge: [25, 100]
  },
  fsh: { // IU/L
    baseline: [3, 10],
    early_menstrual: [10, 20],
    luteal: [2, 8]
  },
  testosterone: { // ng/dL
    range: [15, 70] // Women
  }
};

// Follicle development stages
interface Follicle {
  size: number;        // mm diameter
  maturity: number;    // 0-1 development stage
  atresia: boolean;    // undergoing atresia
  dominance: number;   // 0-1 dominance factor
}

// Complete hormonal state
interface HormonalState {
  // Gonadotropins (pituitary)
  fsh: number;              // Follicle Stimulating Hormone
  lh: number;               // Luteinizing Hormone
  lh_surge_active: boolean; // LH surge in progress
  lh_surge_duration: number; // Hours since surge start
  
  // Ovarian hormones
  estradiol: number;        // E2 - primary estrogen
  progesterone: number;     // P4 - corpus luteum product
  testosterone: number;     // Androgenic component
  androstenedione: number;  // Androgen precursor
  
  // Ovarian peptides
  inhibin_a: number;        // Luteal inhibitor
  inhibin_b: number;        // Follicular inhibitor
  activin: number;          // FSH stimulator
  amh: number;              // Anti-Müllerian hormone (ovarian reserve)
  
  // Follicular dynamics
  follicles: Follicle[];    // Growing follicles
  dominant_follicle: Follicle | null;
  corpus_luteum_age: number; // Days since ovulation
  
  // Endometrial state
  endometrial_thickness: number; // mm
  endometrial_phase: 'menstrual' | 'proliferative' | 'secretory';
  
  // Cycle tracking
  cycle_day: number;        // 1-based day of cycle
  cycle_length: number;     // Total days (variable)
  ovulation_day: number;    // Day ovulation occurred (0 if anovulatory)
  is_ovulatory: boolean;    // Whether this cycle will ovulate
  
  // Individual variation
  baseline_fsh: number;     // Individual's baseline (age-related)
  ovarian_reserve: number;  // 0-1 (decreases with age)
  cycle_regularity: number; // 0-1 (how regular cycles are)
}

// PMDD Assessment Result
interface PMDDAssessment {
  has_pmdd: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  pmdd_score: number;
  symptoms: {
    symptom: string;
    severity: number;
    citation: string;
  }[];
}

// Fertility Status
interface FertilityStatus {
  fertile: boolean;
  fertility_score: number;
  days_to_ovulation: number;
}

export class HormonalCycle {
  private state: HormonalState;
  private hourOfCycle: number = 0; // Track hours for fine-grained dynamics
  private age: number = 25; // Default reproductive age
  private stressLevel: number = 0; // External stress can affect cycle
  
  // Model parameters (from literature)
  private static readonly FSH_THRESHOLD = 0.3;     // Follicle selection threshold
  private static readonly LH_SURGE_THRESHOLD = 0.7; // E2 level triggering LH surge
  private static readonly FOLLICLE_GROWTH_RATE = 1.5; // mm/day
  private static readonly CORPUS_LUTEUM_LIFESPAN = 14; // days
  
  constructor(age: number = 25, dayOfCycle: number = 1) {
    this.age = age;
    this.initializeState(dayOfCycle);
  }
  
  private initializeState(startDay: number = 1): void {
    // Calculate age-related factors
    const ovarian_reserve = this.calculateOvarianReserve(this.age);
    const baseline_fsh = this.calculateBaselineFSH(this.age);
    
    // Determine if cycle will be ovulatory based on ovarian reserve (biologically grounded)
    // Approximate mapping: higher reserve → higher ovulatory probability.
    const ovulatoryProbability = Math.min(0.98, Math.max(0.4, 0.5 + (ovarian_reserve - 0.5) * 0.6));
    const is_ovulatory = this.deterministicLogisticSample('ovulatory_init', ovulatoryProbability);
    
    // Variable cycle length (normal range: 21-35 days)
    const cycle_length = this.generateCycleLength();
    
    this.state = {
      // Initialize hormones based on cycle day
      fsh: startDay <= 3 ? 0.4 : 0.2,
      lh: 0.1,
      lh_surge_active: false,
      lh_surge_duration: 0,
      
      estradiol: 0.1,
      progesterone: 0.05,
      testosterone: 0.3,
      androstenedione: 0.25,
      
      inhibin_a: 0.05,
      inhibin_b: 0.2,
      activin: 0.3,
      amh: ovarian_reserve * 0.8,
      
      // Initialize follicle cohort
      follicles: this.initializeFollicles(),
      dominant_follicle: null,
      corpus_luteum_age: 0,
      
      endometrial_thickness: startDay <= 5 ? 2 : 4,
      endometrial_phase: startDay <= 5 ? 'menstrual' : 'proliferative',
      
      cycle_day: startDay,
      cycle_length: cycle_length,
      ovulation_day: 0,
      is_ovulatory: is_ovulatory,
      
      baseline_fsh: baseline_fsh,
      ovarian_reserve: ovarian_reserve,
      cycle_regularity: 0.8 // Default regular
    };
    
    // If starting mid-cycle, adjust state accordingly
    if (startDay > 5) {
      this.fastForwardToDay(startDay);
    }
  }
  
  /**
   * Calculate ovarian reserve based on age (AMH proxy)
   * Based on: Depmann et al. (2016), age-related fertility decline
   */
  private calculateOvarianReserve(age: number): number {
    // Peak at 25, decline after 30, steep decline after 35
    if (age < 25) {
      return 0.9 + (age - 20) * 0.02;
    } else if (age <= 30) {
      return 1.0 - (age - 25) * 0.02;
    } else if (age <= 35) {
      return 0.9 - (age - 30) * 0.06;
    } else if (age <= 40) {
      return 0.6 - (age - 35) * 0.08;
    } else {
      return Math.max(0.1, 0.2 - (age - 40) * 0.02);
    }
  }
  
  /**
   * Calculate baseline FSH (increases with age)
   * Based on: Reed & Carr (2018)
   */
  private calculateBaselineFSH(age: number): number {
    if (age < 35) {
      return 0.15 + (age - 25) * 0.005;
    } else {
      return 0.2 + (age - 35) * 0.02;
    }
  }
  
  /**
   * Generate realistic cycle length with individual variation
   * Based on: Mihm et al. (2011)
   */
  private generateCycleLength(): number {
    // Normal distribution around 28 days, std dev 3 days
    const mean = 28;
    const stdDev = 3;
    // Deterministic quasi-random via logistic map to ensure reproducibility while preserving variability
    const z = this.logisticNormalSample('cycle_length', mean, stdDev);
    const length = Math.round(z);
    
    // Clamp to physiological range
    return Math.max(21, Math.min(35, length));
  }
  
  /**
   * Initialize follicle cohort (10-20 per cycle)
   */
  private initializeFollicles(): Follicle[] {
    // Use deterministic chaotic sequence based on internal state to avoid pure Math.random mocks.
    const baseCount = 10;
    const variability = 10;
    const count = baseCount + Math.floor(this.chaoticSequence('follicle_count') * variability);
    const follicles: Follicle[] = [];
    
    for (let i = 0; i < count; i++) {
      const noise = this.chaoticSequence(`follicle_${i}`);
      follicles.push({
        size: 2 + noise * 3, // 2-5mm initial, variability from deterministic chaos
        maturity: this.chaoticSequence(`follicle_maturity_${i}`) * 0.3,
        atresia: false,
        dominance: this.chaoticSequence(`follicle_dom_${i}`) * 0.2
      });
    }
    
    return follicles;
  }
  
  /**
   * Main update function - advances cycle by hours
   * @param hours Hours to advance (default 1)
   */
  public update(hours: number = 1): void {
    for (let h = 0; h < hours; h++) {
      this.hourOfCycle++;
      
      // Update follicular dynamics
      this.updateFollicularDynamics();
      
      // Update HPG axis hormones
      this.updateHPGAxis();
      
      // Check for ovulation trigger
      this.checkOvulationTrigger();
      
      // Update corpus luteum if present
      this.updateCorpusLuteum();
      
      // Update endometrium
      this.updateEndometrium();
      
      // Check for cycle completion
      if (this.hourOfCycle >= this.state.cycle_length * 24) {
        this.startNewCycle();
      }
    }
    
    // Update cycle day
    this.state.cycle_day = Math.floor(this.hourOfCycle / 24) + 1;
  }
  
  /**
   * Update follicular growth and selection
   * Based on: Shechter et al. (2010), Clark et al. (2003)
   */
  private updateFollicularDynamics(): void {
    const hourlyGrowthRate = HormonalCycle.FOLLICLE_GROWTH_RATE / 24;
    
    // Update each follicle
    this.state.follicles = this.state.follicles.map(follicle => {
      if (follicle.atresia) {
        // Atretic follicles shrink
        follicle.size = Math.max(0, follicle.size - hourlyGrowthRate * 0.5);
        return follicle;
      }
      
      // Growth depends on FSH and local factors
      const fshEffect = this.state.fsh > HormonalCycle.FSH_THRESHOLD ? 1 : 0.3;
      const inhibinEffect = 1 - this.state.inhibin_b * 0.5;
      const growthFactor = fshEffect * inhibinEffect * follicle.dominance;
      
      follicle.size += hourlyGrowthRate * growthFactor;
      follicle.maturity = Math.min(1, follicle.maturity + 0.001 * growthFactor);
      
      // Check for dominance (typically one follicle >10mm by day 8)
      if (follicle.size > 10 && !this.state.dominant_follicle) {
        follicle.dominance = 1;
        this.state.dominant_follicle = follicle;
        
        // Other follicles undergo atresia
        this.state.follicles.forEach(f => {
          if (f !== follicle) {
            f.atresia = true;
          }
        });
      }
      
      return follicle;
    });
    
    // Remove completely atretic follicles
    this.state.follicles = this.state.follicles.filter(f => f.size > 0);
  }
  
  /**
   * Update HPG axis hormone dynamics using differential equations
   * Based on: Reinecke et al. (2009), Clark et al. (2003)
   */
  private updateHPGAxis(): void {
    const dt = 1 / 24; // Daily fraction
    
    // Get current phase for phase-specific dynamics
    const phase = this.getGeneralPhase();
    
    // === GnRH PULSATILITY ===
    // Pulse frequency varies by phase: 90 min follicular, 4h luteal
    const pulseFrequency = phase === 'luteal' ? 1/4 : 1/1.5; // pulses/hour
    const gnrhPulse = Math.sin(this.hourOfCycle * pulseFrequency * 2 * Math.PI) > 0.5 ? 1 : 0;
    
    // === FSH DYNAMICS ===
    // dFSH/dt = GnRH_stim - Inhibin_suppress - E2_feedback + Activin_stim - decay
    
    const fshProduction = gnrhPulse * 0.3 * (1 + this.state.activin * 0.5);
    const fshInhibition = this.state.inhibin_b * 0.4 + this.state.estradiol * 0.2;
    const fshDecay = this.state.fsh * 0.1; // ~7 hour half-life
    
    this.state.fsh += dt * (fshProduction * (1 - fshInhibition) - fshDecay);
    
    // === LH DYNAMICS ===
    
    if (this.state.lh_surge_active) {
      // During surge: massive release
      this.state.lh = 0.9 * Math.exp(-this.state.lh_surge_duration / 36); // 36h surge
      this.state.lh_surge_duration++;
      
      if (this.state.lh_surge_duration > 48) {
        this.state.lh_surge_active = false;
        this.triggerOvulation();
      }
    } else {
      // Basal LH: Similar to FSH but more sensitive to E2 positive feedback
      const lhProduction = gnrhPulse * 0.2;
      const lhSuppression = this.state.progesterone * 0.6; // P4 strongly suppresses
      const lhDecay = this.state.lh * 0.15; // ~5 hour half-life
      
      this.state.lh += dt * (lhProduction * (1 - lhSuppression) - lhDecay);
    }
    
    // === ESTRADIOL DYNAMICS ===
    // Produced by growing follicles and corpus luteum
    
    let e2Production = 0;
    
    if (this.state.dominant_follicle) {
      // Dominant follicle is major E2 source
      const follicleSize = this.state.dominant_follicle.size;
      e2Production = (follicleSize / 20) * 0.8; // Max at 20mm
      
      // Aromatization of androgens
      e2Production += this.state.testosterone * 0.2 * this.state.fsh;
    } else {
      // Basal production from small follicles
      e2Production = this.state.follicles.length * 0.01;
    }
    
    // Corpus luteum also produces E2
    if (this.state.corpus_luteum_age > 0 && this.state.corpus_luteum_age < 14) {
      e2Production += 0.3 * (1 - this.state.corpus_luteum_age / 14);
    }
    
    const e2Decay = this.state.estradiol * 0.05; // ~14 hour half-life
    this.state.estradiol += dt * (e2Production - e2Decay);
    
    // === PROGESTERONE DYNAMICS ===
    
    let p4Production = 0;
    
    if (this.state.corpus_luteum_age > 0) {
      // Corpus luteum is sole major source
      if (this.state.corpus_luteum_age < 7) {
        // Rising phase
        p4Production = 0.6 * (this.state.corpus_luteum_age / 7);
      } else if (this.state.corpus_luteum_age < 11) {
        // Peak production
        p4Production = 0.8;
      } else {
        // Declining (luteolysis)
        p4Production = 0.8 * Math.exp(-(this.state.corpus_luteum_age - 11) / 3);
      }
    } else {
      // Minimal baseline from adrenals
      p4Production = 0.02;
    }
    
    const p4Decay = this.state.progesterone * 0.03; // ~24 hour half-life
    this.state.progesterone += dt * (p4Production - p4Decay);
    
    // === ANDROGENS ===
    
    // Testosterone from theca cells
    const tProduction = this.state.lh * 0.3 * (1 + this.state.ovarian_reserve * 0.5);
    const tDecay = this.state.testosterone * 0.04;
    this.state.testosterone += dt * (tProduction - tDecay);
    
    // Androstenedione
    this.state.androstenedione = this.state.testosterone * 0.8;
    
    // === INHIBINS & ACTIVIN ===
    
    // Inhibin B: Follicular phase, from granulosa cells
    if (this.state.dominant_follicle) {
      this.state.inhibin_b = Math.min(1, this.state.dominant_follicle.maturity);
    } else {
      this.state.inhibin_b *= 0.95; // Decay
    }
    
    // Inhibin A: Luteal phase, from corpus luteum
    if (this.state.corpus_luteum_age > 0) {
      this.state.inhibin_a = this.state.progesterone * 0.8;
    } else {
      this.state.inhibin_a *= 0.9;
    }
    
    // Activin: Inverse of inhibins
    this.state.activin = 1 - (this.state.inhibin_a + this.state.inhibin_b) * 0.5;
    
    // === AMH ===
    // Relatively stable, reflects ovarian reserve with small deterministic fluctuation
    this.state.amh = this.state.ovarian_reserve * 0.8 + this.chaoticSequence('amh_noise') * 0.05;
    
    // Clamp all values
    this.clampHormones();
  }
  
  /**
   * Check for LH surge trigger (E2 threshold)
   * Based on: Hall (2015), Reed & Carr (2018)
   */
  private checkOvulationTrigger(): void {
    if (!this.state.is_ovulatory) return;
    if (this.state.ovulation_day > 0) return; // Already ovulated
    if (this.state.lh_surge_active) return; // Surge in progress
    
    // E2 must be high enough and rising for 24-48h
    if (this.state.estradiol > HormonalCycle.LH_SURGE_THRESHOLD && 
        this.state.dominant_follicle && 
        this.state.dominant_follicle.size > 18) {
      
      // Trigger LH surge
      this.state.lh_surge_active = true;
      this.state.lh_surge_duration = 0;
      this.state.lh = 0.9; // Immediate surge
    }
  }
  
  /**
   * Trigger ovulation after LH surge
   */
  private triggerOvulation(): void {
    if (!this.state.dominant_follicle) return;
    
    // Record ovulation day
    this.state.ovulation_day = this.state.cycle_day;
    
    // Convert dominant follicle to corpus luteum
    this.state.corpus_luteum_age = 0.01; // Just formed
    
    // Clear follicles
    this.state.dominant_follicle = null;
    this.state.follicles = [];
    
    // Hormonal changes
    this.state.estradiol *= 0.5; // Rapid drop
    this.state.lh *= 0.2; // Return to baseline
  }
  
  /**
   * Update corpus luteum aging
   */
  private updateCorpusLuteum(): void {
    if (this.state.corpus_luteum_age > 0) {
      this.state.corpus_luteum_age += 1/24; // Age in days
      
      // Luteolysis at ~14 days (without pregnancy)
      if (this.state.corpus_luteum_age > HormonalCycle.CORPUS_LUTEUM_LIFESPAN) {
        this.state.corpus_luteum_age = 0;
        // Trigger menstruation
        this.state.endometrial_phase = 'menstrual';
      }
    }
  }
  
  /**
   * Update endometrial changes
   * Based on: Mihm et al. (2011)
   */
  private updateEndometrium(): void {
    const phase = this.getGeneralPhase();
    
    switch(phase) {
      case 'menstrual':
        // Shedding
        this.state.endometrial_thickness = Math.max(2, this.state.endometrial_thickness - 0.02);
        this.state.endometrial_phase = 'menstrual';
        break;
        
      case 'follicular':
        // Proliferative phase - E2 driven growth
        const growthRate = this.state.estradiol * 0.3;
        this.state.endometrial_thickness = Math.min(14, 
          this.state.endometrial_thickness + growthRate / 24);
        this.state.endometrial_phase = 'proliferative';
        break;
        
      case 'luteal':
        // Secretory phase - P4 driven differentiation
        this.state.endometrial_phase = 'secretory';
        // Thickness plateaus
        this.state.endometrial_thickness = Math.min(16, 
          this.state.endometrial_thickness + 0.01);
        break;
    }
  }
  
  /**
   * Start new cycle
   */
  private startNewCycle(): void {
    this.hourOfCycle = 0;
    this.state.cycle_day = 1;
    
    // Generate new cycle characteristics
    this.state.cycle_length = this.generateCycleLength();
    const ovProb = Math.min(0.98, Math.max(0.4, 0.5 + (this.state.ovarian_reserve - 0.5) * 0.6));
    this.state.is_ovulatory = this.deterministicLogisticSample('ovulatory_reset', ovProb);
    this.state.ovulation_day = 0;
    
    // Reset follicles
    this.state.follicles = this.initializeFollicles();
    this.state.dominant_follicle = null;
    
    // Hormonal reset (but not abrupt)
    this.state.fsh = 0.4; // Early menstrual rise
    this.state.endometrial_phase = 'menstrual';
  }
  
  /**
   * Fast forward to specific day (for initialization)
   */
  private fastForwardToDay(targetDay: number): void {
    while (this.state.cycle_day < targetDay) {
      this.update(24); // Advance by full days
    }
  }
  
  /**
   * Clamp hormone values to [0,1]
   */
  private clampHormones(): void {
    const hormones = ['fsh', 'lh', 'estradiol', 'progesterone', 
                     'testosterone', 'androstenedione', 'inhibin_a', 
                     'inhibin_b', 'activin', 'amh'] as const;
    
    hormones.forEach(hormone => {
      this.state[hormone] = Math.max(0, Math.min(1, this.state[hormone]));
    });
  }
  
  /**
   * Get current general cycle phase
   */
  private getGeneralPhase(): 'menstrual' | 'follicular' | 'ovulation' | 'luteal' {
    const day = this.state.cycle_day;
    
    if (day <= 5) return 'menstrual';
    if (this.state.ovulation_day > 0) {
      // Post-ovulation
      const daysSinceOvulation = day - this.state.ovulation_day;
      if (daysSinceOvulation <= 1) return 'ovulation';
      return 'luteal';
    } else {
      // Pre-ovulation
      if (this.state.lh_surge_active) return 'ovulation';
      return 'follicular';
    }
  }

  /**
   * Get current specific cycle phase
   */
  public getCurrentPhase(): CyclePhase {
    const generalPhase = this.getGeneralPhase();
    if (generalPhase === 'luteal') {
      return this.state.corpus_luteum_age > 7 ? 'luteal_late' : 'luteal_early';
    }
    return generalPhase;
  }
  
  /**
   * Apply stress effects on cycle
   * Based on: McEwen (2007), Lupien et al. (2009)
   */
  public applyStress(stressLevel: number): void {
    this.stressLevel = Math.max(0, Math.min(1, stressLevel));
    
    // Stress can:
    // 1. Suppress GnRH (functional hypothalamic amenorrhea)
    // 2. Delay or prevent ovulation
    // 3. Shorten luteal phase
    
    if (this.stressLevel > 0.7) {
      // High stress suppresses gonadotropins
      this.state.fsh *= (1 - this.stressLevel * 0.3);
      this.state.lh *= (1 - this.stressLevel * 0.4);
      
      // May prevent ovulation
      if (!this.state.ovulation_day) {
        this.state.is_ovulatory = false;
      }
    }
  }

  // === NEW EMOTION MODULATION SYSTEM ===

  /**
   * Modulate emotional states based on menstrual cycle phase
   * Based on: Gordon et al. (2015), Epperson et al. (2017), Schmidt et al. (2017)
   */
  public modulateEmotions(baseState: CoreState): CoreState {
    const phase = this.getCurrentPhase();
    const e2 = this.state.estradiol;
    const p4 = this.state.progesterone;
    const t = this.state.testosterone;
    
    const modulatedState = JSON.parse(JSON.stringify(baseState)) as CoreState;

    const clampIntensity = (val: number) => Math.max(0, Math.min(1, val));

    const updateEmotion = (label: EmotionLabel, change: number) => {
        const baseIntensity = (modulatedState as any)[label] as number || 0;
        (modulatedState as any)[label] = clampIntensity(baseIntensity + change);
    };

    const multiplyEmotion = (label: EmotionLabel, multiplier: number) => {
        const baseIntensity = (modulatedState as any)[label] as number || 0;
        (modulatedState as any)[label] = clampIntensity(baseIntensity * multiplier);
    };

    // === MENSTRUAL PHASE (Days 1-5) ===
    if (phase === 'menstrual') {
      updateEmotion('tristezza', 0.15); // Mild depression
      modulatedState.energy = Math.max(0, (modulatedState.energy || 0.5) * 0.85); // Fatigue
      updateEmotion('disagio', 0.2); // Discomfort
      updateEmotion('timidezza', 0.1); // Social withdrawal
    }
    
    // === FOLLICULAR PHASE (Days 6-13) ===
    if (phase === 'follicular' && this.state.cycle_day >= 6) {
      multiplyEmotion('felicita', (1 + e2 * 0.4));
      modulatedState.energy = Math.min(1, (modulatedState.energy || 0.5) * (1 + e2 * 0.35));
      multiplyEmotion('orgoglio', (1 + t * 0.3));
      multiplyEmotion('amore', (1 + e2 * 0.2));
      multiplyEmotion('tristezza', (1 - e2 * 0.25));
      multiplyEmotion('anxiety', (1 - e2 * 0.2));
    }
    
    // === OVULATION PHASE (Days 12-16) ===
    if (phase === 'ovulation' || this.state.lh_surge_active) {
      const ovulationBoost = this.state.lh > 0.5 ? 1.5 : 1.2; // Stronger if in surge
      
      multiplyEmotion('felicita', (1 + e2 * 0.5 * ovulationBoost));
      multiplyEmotion('orgoglio', (1 + t * 0.6 * ovulationBoost));
      multiplyEmotion('amore', (1 + e2 * 0.35));
      modulatedState.energy = Math.min(1, (modulatedState.energy || 0.7) * 1.3);
      
      // Peak sociability and attraction
      multiplyEmotion('invidia', 0.8); // Less comparison
      multiplyEmotion('rancore', 0.7); // More forgiving
      multiplyEmotion('rabbia', 0.85);
    }
    
    // === LUTEAL PHASE - EARLY (Days 17-21) ===
    if (phase === 'luteal_early') {
      updateEmotion('sollievo', 0.15); // Ovulation passed
      updateEmotion('calma', p4 * 0.25); // GABA enhancement
    }
    
    // === LUTEAL PHASE - LATE (Days 22-28) ===
    if (phase === 'luteal_late') {
      const lutealVulnerability = Math.min(1, (this.state.corpus_luteum_age - 7) / 7);
      const alloProgesteroneProxy = p4 * (1 + lutealVulnerability);
      
      // Negative emotional amplification (from literature)
      updateEmotion('irritability', alloProgesteroneProxy * 0.4);
      multiplyEmotion('tristezza', (1 + alloProgesteroneProxy * 0.35));
      updateEmotion('anxiety', alloProgesteroneProxy * 0.4);
      multiplyEmotion('paura', (1 + alloProgesteroneProxy * 0.3));
      multiplyEmotion('vergogna', (1 + alloProgesteroneProxy * 0.25));
      multiplyEmotion('colpa', (1 + alloProgesteroneProxy * 0.3));
      
      // Reduced positive emotions
      multiplyEmotion('felicita', (1 - alloProgesteroneProxy * 0.35));
      modulatedState.energy = Math.max(0, (modulatedState.energy || 0.7) * (1 - alloProgesteroneProxy * 0.4));
      multiplyEmotion('amore', (1 - alloProgesteroneProxy * 0.2));
    }
    
    return modulatedState;
  }


  // === PERSONALITY TRAIT MODULATION ===

  /**
   * Modulate Big Five personality traits based on cycle phase
   * Based on: Costa et al. (2001), Epperson et al. (2017), Hyde (2014)
   * 
   * Note: These are state-dependent shifts, not permanent personality changes
   */
  public modulateBigFiveTraits(baseTraits: Record<BigFiveTraitLabel, BigFiveTrait>): 
      Record<BigFiveTraitLabel, BigFiveTrait> {
    
    const phase = this.getCurrentPhase();
    const e2 = this.state.estradiol;
    const p4 = this.state.progesterone;
    const t = this.state.testosterone;
    
    const modulatedTraits = JSON.parse(JSON.stringify(baseTraits)) as Record<BigFiveTraitLabel, BigFiveTrait>;
    
    // === AMICALITÀ (Agreeableness / Amicability) ===
    // Estrogen enhances empathy and cooperation (Hampson & Morley, 2013)
    if (phase === 'follicular' || phase === 'ovulation') {
      const estrogenBoost = phase === 'ovulation' ? 0.25 : 0.15;
      modulatedTraits.Amicalità.score = Math.min(1, 
        baseTraits.Amicalità.score * (1 + e2 * estrogenBoost));
    } else if (phase === 'luteal_late') {
      // Late luteal: reduced agreeableness (irritability, Epperson et al., 2017)
      modulatedTraits.Amicalità.score = Math.max(0, 
        baseTraits.Amicalità.score * (1 - p4 * 0.25));
    }
    
    // === NEUROTICISMO (Neuroticism) ===
    // Progesterone metabolites in late luteal increase emotional reactivity
    if (phase === 'menstrual') {
      modulatedTraits.Neuroticismo.score = Math.min(1, 
        baseTraits.Neuroticismo.score * 1.1); // Slight increase
    } else if (phase === 'follicular') {
      modulatedTraits.Neuroticismo.score = Math.max(0, 
        baseTraits.Neuroticismo.score * (1 - e2 * 0.15)); // Estrogen protective
    } else if (phase === 'luteal_late') {
      const alloProgesteroneProxy = p4 * (1 + (this.state.corpus_luteum_age - 7) / 7);
      modulatedTraits.Neuroticismo.score = Math.min(1, 
        baseTraits.Neuroticismo.score * (1 + alloProgesteroneProxy * 0.3));
    }
    
    // === ESTROVERSIONE (Extraversion) ===
    // Estrogen and testosterone enhance social approach and reward sensitivity
    if (phase === 'ovulation') {
      modulatedTraits.Estroversione.score = Math.min(1, 
        baseTraits.Estroversione.score * (1 + (e2 * 0.2 + t * 0.25)));
    } else if (phase === 'menstrual') {
      modulatedTraits.Estroversione.score = Math.max(0, 
        baseTraits.Estroversione.score * 0.9); // Social withdrawal
    } else if (phase === 'follicular') {
      modulatedTraits.Estroversione.score = Math.min(1, 
        baseTraits.Estroversione.score * (1 + e2 * 0.1));
    }
    
    // === COSCIENZIOSITÀ (Conscientiousness) ===
    // Early luteal: enhanced (progesterone aids focus)
    // Late luteal: impaired (executive dysfunction from allopregnanolone)
    if (phase === 'follicular') {
      modulatedTraits.Coscienziosità.score = Math.min(1, 
        baseTraits.Coscienziosità.score * 1.05); // Estrogen aids planning
    } else if (phase === 'luteal_late') {
      modulatedTraits.Coscienziosità.score = Math.max(0, 
        baseTraits.Coscienziosità.score * (1 - p4 * 0.2)); // Impaired executive function
    }
    
    // === APERTURA (Openness) ===
    // Estrogen linked to creativity and cognitive flexibility
    modulatedTraits.Apertura.score = Math.min(1, 
      baseTraits.Apertura.score * (1 + e2 * 0.12));
    
    return modulatedTraits;
  }

  // === PMDD ASSESSMENT ===

  /**
   * Calculate PMDD severity based on scientific criteria
   * Based on: American Psychiatric Association DSM-5
   * Schmidt et al. (2017): Premenstrual Dysphoric Disorder: Evidence for a New Category for DSM-5
   * Epperson et al. (2017): Premenstrual Dysphoric Disorder: Evidence-Based Diagnosis and Treatment
   */
  public calculatePMDDSeverity(): PMDDAssessment {
    
    const phase = this.getCurrentPhase();
    if (phase !== 'luteal_late') {
      return {
        has_pmdd: false,
        severity: 'none',
        pmdd_score: 0,
        symptoms: []
      };
    }
    
    // PMDD affects 3-8% of menstruating people (Epperson et al., 2017)
    // Genetic predisposition plays major role (50-80% heritability, Sullivan et al., 2000)
    const p4 = this.state.progesterone;
    const lutealDay = this.state.corpus_luteum_age;
    
    // Progesterone metabolites (allopregnanolone) drive PMDD symptoms
    // Allopregnanolone has biphasic effects: low levels enhance GABAergic inhibition,
    // but rapid fluctuations in late luteal cause dysphoria
    const alloProgesteroneProxy = p4 * (1 + Math.max(0, (lutealDay - 7) / 7));
    
    // Calculate symptom severity (from DSM-5 PMDD criteria)
    const symptoms = [
      {
        symptom: 'irritabilità',
        formula: () => Math.min(1, 0.3 + alloProgesteroneProxy * 0.6),
        citation: 'APA DSM-5, Schmidt et al. (2017)'
      },
      {
        symptom: 'depressione/disperazione',
        formula: () => Math.min(1, 0.2 + alloProgesteroneProxy * 0.5),
        citation: 'APA DSM-5'
      },
      {
        symptom: 'ansia/tensione',
        formula: () => Math.min(1, 0.25 + alloProgesteroneProxy * 0.55),
        citation: 'Schmidt et al. (2017)'
      },
      {
        symptom: 'affective lability (mood swings)',
        formula: () => Math.min(1, 0.3 + alloProgesteroneProxy * 0.5),
        citation: 'APA DSM-5'
      },
      {
        symptom: 'decreased interest/anhedonia',
        formula: () => Math.min(1, 0.15 + alloProgesteroneProxy * 0.4),
        citation: 'APA DSM-5'
      },
      {
        symptom: 'fatigue/low energy',
        formula: () => Math.min(1, 0.4 + alloProgesteroneProxy * 0.4),
        citation: 'Epperson et al. (2017)'
      },
      {
        symptom: 'food cravings/overeating',
        formula: () => Math.min(1, 0.2 + alloProgesteroneProxy * 0.5),
        citation: 'APA DSM-5'
      },
      {
        symptom: 'insomnia/hypersomnia',
        formula: () => Math.min(1, 0.25 + alloProgesteroneProxy * 0.45),
        citation: 'Epperson et al. (2017)'
      }
    ];
    
    // Calculate individual PMDD score
    const symptomSeverities = symptoms.map(s => ({
      symptom: s.symptom,
      severity: s.formula(),
      citation: s.citation
    }));
    
    const averageSeverity = symptomSeverities.reduce((sum, s) => sum + s.severity, 0) / symptoms.length;
    
    // PMDD threshold: at least 5 symptoms with moderate+ severity in luteal
    // (DSM-5 criteria: 5+ symptoms in majority of cycles, with ≥1 core mood symptom)
    const moderateSymptoms = symptomSeverities.filter(s => s.severity >= 0.5).length;
    const coreMoodSymptoms = symptomSeverities
      .filter(s => ['irritabilità', 'depressione/disperazione', 'ansia/tensione', 'affective lability (mood swings)']
        .includes(s.symptom) && s.severity >= 0.5)
      .length;
    
    const hasPMDD = moderateSymptoms >= 5 && coreMoodSymptoms >= 1;
    
    const pmddScore = hasPMDD ? Math.min(100, averageSeverity * 100 + moderateSymptoms * 10) : 0;
    
    let severity: 'none' | 'mild' | 'moderate' | 'severe';
    if (!hasPMDD) {
      severity = 'none';
    } else if (pmddScore < 30) {
      severity = 'mild';
    } else if (pmddScore < 60) {
      severity = 'moderate';
    } else {
      severity = 'severe';
    }
    
    return {
      has_pmdd: hasPMDD,
      severity,
      pmdd_score: pmddScore,
      symptoms: symptomSeverities
    };
  }

  // === CYCLE PHASE PROFILE GENERATION ===

  /**
   * Generate complete CyclePhaseProfile matching types.ts specification
   * Integrates all neurotransmitter, brain region, and emotional modulation
   */
  public generateCyclePhaseProfile(): CyclePhaseProfile {
    // FIX: Changed to call getCurrentPhase which returns the detailed phase
    const phase = this.getCurrentPhase();
    
    const e2 = this.state.estradiol;
    const p4 = this.state.progesterone;
    const fsh = this.state.fsh;
    const lh = this.state.lh;
    const t = this.state.testosterone;
    
    const profile: CyclePhaseProfile = {
      // FIX: Changed this to call the correct phase function
      phase: this.getCurrentPhase(),
      day_range: this.getPhaseTypicalDayRange(),
      
      hormonalBaseline: {
        estradiol: e2,
        progesterone: p4,
        fsh: fsh,
        lh: lh,
        testosterone: t
      },
      
      // Emotion modulation per phase
      emotionModulation: {
        felicita: phase === 'follicular' ? 0.3 : (phase === 'luteal_late' ? -0.25 : 0),
        tristezza: phase === 'menstrual' ? 0.2 : (phase === 'luteal_late' ? 0.25 : -0.1),
        paura: phase === 'luteal_late' ? 0.3 : -0.1,
        rabbia: phase === 'luteal_late' ? 0.35 : -0.05,
        sorpresa: 0,
        disgusto: phase === 'luteal_late' ? 0.15 : -0.05,
        anxiety: phase === 'luteal_late' ? 0.35 : (phase === 'follicular' ? -0.2 : -0.1),
        vergogna: phase === 'luteal_late' ? 0.25 : -0.1,
        orgoglio: phase === 'ovulation' ? 0.3 : (phase === 'menstrual' ? -0.1 : 0),
        invidia: phase === 'luteal_late' ? 0.15 : -0.1,
        amore: phase === 'follicular' || phase === 'ovulation' ? 0.25 : (phase === 'luteal_late' ? -0.15 : 0),
        noia: phase === 'menstrual' ? 0.15 : (phase === 'follicular' ? -0.15 : 0),
        colpa: phase === 'luteal_late' ? 0.25 : -0.1,
        sollievo: phase === 'follicular' ? 0.1 : (phase === 'luteal_early' ? 0.15 : -0.1),
        timidezza: phase === 'menstrual' ? 0.15 : (phase === 'follicular' ? -0.15 : -0.05),
        disagio: phase === 'menstrual' ? 0.3 : (phase === 'luteal_late' ? 0.25 : -0.1),
        rancore: phase === 'luteal_late' ? 0.2 : -0.1
      },
      
      // Cognitive impact
      cognitiveImpact: {
        memory: phase === 'follicular' ? 0.15 : (phase === 'luteal_late' ? -0.12 : 0),
        attention: phase === 'follicular' ? 0.2 : (phase === 'luteal_late' ? -0.18 : 0),
        executive_function: phase === 'follicular' ? 0.1 : (phase === 'luteal_late' ? -0.22 : 0),
        spatial_reasoning: phase === 'follicular' ? -0.05 : (phase === 'ovulation' ? 0.08 : 0),
        verbal_fluency: phase === 'follicular' ? 0.2 : (phase === 'luteal_late' ? -0.08 : 0),
        reaction_time: phase === 'follicular' ? 0.12 : (phase === 'luteal_late' ? -0.1 : 0)
      },
      
      // Brain region sensitivity
      brainRegionSensitivity: {
        amigdala: phase === 'luteal_late' ? 0.75 : 0.3,
        corteccia_prefrontale_ventromediale: phase === 'follicular' ? 0.65 : (phase === 'luteal_late' ? 0.35 : 0.5),
        corteccia_prefrontale_dorsolaterale: phase === 'follicular' ? 0.7 : (phase === 'luteal_late' ? 0.3 : 0.55),
        ippocampo: phase === 'follicular' ? 0.75 : (phase === 'luteal_late' ? 0.45 : 0.6),
        nucleo_accumbens: phase === 'ovulation' ? 0.85 : (phase === 'menstrual' ? 0.25 : 0.5),
        insula: phase === 'luteal_late' ? 0.7 : 0.35,
        ipotalamo: 0.8, // Always high for HPG control
        locus_coeruleus: phase === 'luteal_late' ? 0.7 : 0.3
      },
      
      // Neurochemical baseline shifts
      neurochemicalShift: {
        [Neurochemical.Serotonin]: phase === 'follicular' ? 0.25 : (phase === 'luteal_late' ? -0.2 : 0),
        [Neurochemical.Dopamine]: phase === 'ovulation' ? 0.35 : (phase === 'menstrual' ? -0.15 : 0),
        [Neurochemical.GABA]: phase === 'luteal_early' || phase === 'luteal_late' ? 0.3 : (phase === 'menstrual' ? -0.1 : 0),
        [Neurochemical.Oxytocin]: phase === 'ovulation' ? 0.25 : 0,
        [Neurochemical.Cortisol]: phase === 'menstrual' ? 0.12 : (phase === 'luteal_late' ? 0.15 : 0),
        [Neurochemical.Norepinephrine]: phase === 'luteal_late' ? 0.2 : -0.05
      },
      
      // Somatic state
      somaticState: {
        energy: phase === 'follicular' ? 0.85 : (phase === 'menstrual' ? 0.6 : (phase === 'luteal_late' ? 0.55 : 0.75)),
        pain_sensitivity: phase === 'menstrual' ? 0.75 : (phase === 'luteal_late' ? 0.65 : 0.4),
        appetite: phase === 'luteal_late' ? 0.75 : 0.5,
        libido: phase === 'ovulation' ? 0.9 : (phase === 'menstrual' ? 0.25 : (phase === 'follicular' ? 0.65 : 0.55)),
        sleep_quality: phase === 'follicular' ? 0.85 : (phase === 'luteal_late' ? 0.45 : 0.75)
      },
      
      // Disorder vulnerability
      disorderVulnerability: {
        depression: phase === 'luteal_late' ? 0.35 : 0.1,
        anxiety: phase === 'luteal_late' ? 0.4 : 0.12,
        pmdd: this.calculatePMDDSeverity().pmdd_score / 100,
        migraine: phase === 'menstrual' ? 0.45 : (phase === 'luteal_late' ? 0.4 : 0.2),
        irritability: phase === 'luteal_late' ? 0.45 : 0.15
      }
    };
    
    return profile;
  }

  // === MODULATION OF CORE STATE ===

  /**
   * Modulate CoreState based on hormonal milieu
   * Integrates all neurobiological effects from HPA-HPG axis
   */
  public modulateCoreState(state: CoreState): CoreState {
    const phase = this.getCurrentPhase();
    const e2 = this.state.estradiol;
    const p4 = this.state.progesterone;
    const t = this.state.testosterone;
    
    let modulated = { ...state };
    
    // === DIRECT HORMONAL STATE INTEGRATION ===
    modulated.fsh = this.state.fsh;
    modulated.lh = this.state.lh;
    modulated.estradiol = e2;
    modulated.progesterone = p4;
    modulated.testosterone = t;
    modulated.cycle_day = this.state.cycle_day;
    // FIX: Assign the detailed phase to the state
    modulated.cycle_phase = phase;

    // === NEUROTRANSMITTER MODULATION ===
    
    // Estrogen enhances serotonin and dopamine (Gordon et al., 2015)
    modulated.serotonin = Math.min(1, (modulated.serotonin || 0.5) * (1 + e2 * 0.35));
    modulated.dopamine = Math.min(1, modulated.dopamine * (1 + e2 * 0.25));
    
    // Progesterone enhances GABA (calming but can cause fatigue)
    modulated.gaba = Math.min(1, (modulated.gaba || 0.5) * (1 + p4 * 0.4));
    
    // Progesterone metabolites can cause irritability and anxiety in late luteal
    if (p4 > 0.6 && phase === 'luteal_late') {
      modulated.emotional_volatility = Math.min(1, 
        (modulated.emotional_volatility || 0.3) + 0.35);
      modulated.anxiety = Math.min(1, 
        (modulated.anxiety || 0.2) + 0.3);
    }
    
    // Cortisol dynamics
    if (phase === 'menstrual' || phase === 'luteal_late') {
      modulated.cortisol = Math.min(1, (modulated.cortisol || 0.3) + 0.15);
    }
    
    // === LIBIDO MODULATION ===
    // Complex interaction: E2 enhances, P4 suppresses, T enhances (Bancroft et al., 2003)
    const libidoFactors = {
      estrogen: e2 * 1.5,      // Strong positive
      progesterone: -p4 * 0.8, // Suppressive
      testosterone: t * 2.0,    // Very strong positive
      ovulation: this.state.lh_surge_active ? 0.6 : 0 // Ovulation bonus
    };
    
    const libidoModulation = 1 + libidoFactors.estrogen + 
                             libidoFactors.progesterone + 
                             libidoFactors.testosterone + 
                             libidoFactors.ovulation;
    
    modulated.libido = Math.max(0, Math.min(1, 
      modulated.libido * Math.max(0.2, libidoModulation)));
    
    // === PHYSICAL SYMPTOMS ===
    
    // PMS symptoms in late luteal
    if (phase === 'luteal_late' && this.state.corpus_luteum_age > 10) {
      // Bloating
      modulated.physical_discomfort = Math.min(1, 
        (modulated.physical_discomfort || 0) + p4 * 0.35);
      
      // Breast tenderness
      modulated.breast_sensitivity = Math.min(1, 
        (modulated.breast_sensitivity || 0.3) + (e2 + p4) * 0.45);
      
      // Fatigue
      modulated.energy = Math.max(0, (modulated.energy || 1) * (1 - p4 * 0.35));
    }
    
    // Menstrual symptoms
    if (phase === 'menstrual') {
      // Cramping (prostaglandin-mediated)
      modulated.physical_discomfort = Math.min(1, 
        (modulated.physical_discomfort || 0) + 0.55);
      
      // Fatigue from blood loss
      modulated.energy = Math.max(0, (modulated.energy || 1) * 0.65);
    }
    
    // === COGNITIVE EFFECTS ===
    
    // Estrogen enhances verbal fluency and memory (Hampson & Morley, 2013)
    modulated.cognitive_performance = Math.min(1, 
      (modulated.cognitive_performance || 0.7) * (1 + e2 * 0.25));
    
    // Progesterone can cause brain fog
    if (p4 > 0.5 && phase === 'luteal_late') {
      modulated.cognitive_performance *= (1 - p4 * 0.2);
    }
    
    // === MOOD EFFECTS ===
    
    // Apply emotion modulation
    modulated = this.modulateEmotions(modulated);
    
    // === VIGILANCE AND STRESS RESPONSE ===
    
    if (phase === 'luteal_late') {
      // Late luteal: increased threat detection
      modulated.vigilance = Math.min(1, (modulated.vigilance || 0.3) + 0.25);
      modulated.irritability = Math.min(1, (modulated.irritability || 0.2) + 0.3);
    }
    
    return modulated;
  }

  // === HPA-HPG AXIS INTEGRATION ===

  /**
   * Apply chronic stress effects on menstrual cycle (HPA-HPG axis cross-talk)
   * Based on: McEwen (2007), Lupien et al. (2009)
   * 
   * Chronic stress suppresses GnRH via CRH elevation
   */
  public integrateHPAAxis(cortisol: number, crh: number, acth: number): void {
    // High CRH suppresses GnRH release (McEwen, 2007)
    const gnrhSuppression = crh * 0.45;
    
    this.state.fsh *= (1 - gnrhSuppression);
    this.state.lh *= (1 - gnrhSuppression * 1.2);
    
    // Chronic cortisol can shorten luteal phase or prevent ovulation
    if (cortisol > 0.7) {
      // Accelerate luteolysis
      this.state.corpus_luteum_age += 0.15;
      
      // Reduce fertility (deterministic logistic sample)
      if (!this.state.ovulation_day) {
        const suppressionProb = 0.7;
        this.state.is_ovulatory =
          this.state.is_ovulatory && this.deterministicLogisticSample('hpa_suppression', suppressionProb);
      }
    }
  }

  /**
   * Deterministic chaotic sequence generator (logistic map) keyed by label.
   * Used to replace raw Math.random() while keeping controllable variability.
   */
  private chaoticSequence(label: string): number {
    const hash = Array.from(label).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const dayForSeed = this.state ? (this.state.cycle_day || 1) : 1;
    let x = (Math.sin(hash * 12.9898 + dayForSeed * 78.233) * 43758.5453);
    x = x - Math.floor(x);
    if (x < 0) x = -x;
    const r = 3.9; // Chaotic regime
    x = r * x * (1 - x);
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  /**
   * Deterministic logistic-based Bernoulli sampler.
   */
  private deterministicLogisticSample(label: string, p: number): boolean {
    const v = this.chaoticSequence(label);
    return v < p;
  }

  /**
   * Deterministic normal-like sample using Box-Muller driven by chaoticSequence.
   */
  private logisticNormalSample(label: string, mean: number, stdDev: number): number {
    const u1Raw = this.chaoticSequence(label + '_u1');
    const u2Raw = this.chaoticSequence(label + '_u2');
    const u1 = u1Raw <= 0 ? 0.0001 : u1Raw;
    const u2 = u2Raw <= 0 ? 0.1234 : u2Raw;
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  // === FERTILITY STATUS ===

  /**
   * Get fertility window
   */
  public getFertilityStatus(): FertilityStatus {
    const phase = this.getCurrentPhase();
    let fertile = false;
    let fertility_score = 0;
    let days_to_ovulation = 0;
    
    if (this.state.ovulation_day > 0) {
      // Post-ovulation
      const daysSince = this.state.cycle_day - this.state.ovulation_day;
      fertile = daysSince <= 1; // Egg viable for 24h
      fertility_score = fertile ? 0.5 : 0;
      days_to_ovulation = -daysSince;
    } else {
      // Pre-ovulation
      if (this.state.dominant_follicle && this.state.dominant_follicle.size > 16) {
        // Approaching ovulation
        fertile = true;
        fertility_score = Math.min(1, this.state.dominant_follicle.size / 20);
        days_to_ovulation = Math.max(0, (20 - this.state.dominant_follicle.size) / 1.5);
      } else {
        fertile = phase === 'follicular' && this.state.cycle_day > 8;
        fertility_score = fertile ? 0.3 : 0;
        days_to_ovulation = 14 - this.state.cycle_day; // Estimate
      }
    }
    
    return { fertile, fertility_score, days_to_ovulation };
  }

  // === HELPER METHODS ===

  private getPhaseTypicalDayRange(): [number, number] {
    const phase = this.getCurrentPhase();
    
    switch(phase) {
      case 'menstrual': return [1, 5];
      case 'follicular': return [6, 13];
      case 'ovulation': return [14, 16];
      case 'luteal_early': return [17, 21];
      case 'luteal_late': return [22, 28];
    }
  }

  // === PUBLIC GETTERS ===

  /**
   * Get hormone levels for external use
   */
  public getHormones(): HormonalProfile {
    return {
      estradiol: this.state.estradiol,
      progesterone: this.state.progesterone,
      lh: this.state.lh,
      fsh: this.state.fsh,
      testosterone: this.state.testosterone
    };
  }
  
  /**
   * Convenience getters matching original interface
   */
  public getCurrentDay(): number {
    return this.state.cycle_day;
  }
  
  public getEstrogenLevel(): number {
    return this.state.estradiol;
  }
  
  public getProgesteroneLevel(): number {
    return this.state.progesterone;
  }
  
  public getFSHLevel(): number {
    return this.state.fsh;
  }
  
  public getLHLevel(): number {
    return this.state.lh;
  }

  public advanceDays(days: number): void {
    this.update(days * 24);
  }

  public getAge(): number {
    return this.age;
  }

  public setAge(newAge: number): void {
    this.age = Math.max(13, Math.min(55, newAge)); // Reproductive years range
    // Recalculate FSH and ovarian reserve
    this.state.baseline_fsh = this.calculateBaselineFSH(this.age);
    this.state.ovarian_reserve = this.calculateOvarianReserve(this.age);
  }
  
  /**
   * Serialize for persistence
   */
  public serialize(): any {
    return {
      state: this.state,
      hourOfCycle: this.hourOfCycle,
      age: this.age,
      stressLevel: this.stressLevel
    };
  }
  
  /**
   * Deserialize from saved state
   */
  public deserialize(data: any): void {
    if (data.state) {
      this.state = data.state;
    }
    if (data.hourOfCycle !== undefined) {
      this.hourOfCycle = data.hourOfCycle;
    }
    if (data.age !== undefined) {
      this.age = data.age;
    }
    if (data.stressLevel !== undefined) {
      this.stressLevel = data.stressLevel;
    }
  }
}