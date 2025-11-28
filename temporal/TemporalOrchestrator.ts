/**
 * @file TemporalOrchestrator.ts
 * @description Coordinates multi-scale temporal dynamics: circadian, ultradian, menstrual, HPA.
 *              Ticks clocks and applies modulations to CoreState.
 *
 * Integrates:
 * - CircadianClock
 * - HormonalCycle (menstrual)
 * - HPAAxis
 *
 * Usage: Call update(elapsedMs) per interaction or timer.
 */

import { HormonalCycle } from '../physiology/HormonalCycle';
import { CircadianClock } from './CircadianClock';
import { HPAAxis } from '../physiology/HPAAxis';
import { CoreState } from '../types';
import { INITIAL_CORE_STATE } from '../constants';
import { PhysiologyTemporalBridge, HormonalState, CircadianPhase } from '../bridges/PhysiologyTemporalBridge';
import { Personality } from '../agent/personality/Personality';
import { applyHPAAxisEffects, calculateDerivedEmotions } from '../agent/affective/state';

export class TemporalOrchestrator {
  private circadianClock: CircadianClock;
  public hormonalCycle: HormonalCycle;
  public hpaAxis: HPAAxis;
  private lastUpdate: number = Date.now(); // ms
  private physioBridge?: PhysiologyTemporalBridge;

  constructor(initialCycleDay?: number) {
    const clock = new CircadianClock(new Date());
    this.circadianClock = clock;
    this.hormonalCycle = new HormonalCycle(25, initialCycleDay);
    this.hpaAxis = new HPAAxis();
  }

  /**
   * Registers physiological-temporal bridge for synchronization
   * Enables Kuramoto coupling between hormonal and circadian oscillators
   *
   * @param bridge - PhysiologyTemporalBridge instance
   */
  public registerPhysiologicalCycle(bridge: PhysiologyTemporalBridge): void {
    this.physioBridge = bridge;
  }

  /**
   * Updates all temporal components with elapsed time.
   * Advances clocks, applies modulations via HPA update (dt in min).
   * If physioBridge is registered, synchronizes hormonal and circadian cycles.
   *
   * @param currentState The current state of the Core to modulate
   * @param personality The personality instance to update over the long term.
   * @returns Modulated CoreState
   */
  public update(currentState: CoreState, personality: Personality): CoreState {
    const now = Date.now();
    const delta = now - this.lastUpdate;
    this.lastUpdate = now;

    // Do not run simulation for trivial time steps to avoid instability
    if (delta < 100) return currentState;

    const deltaHours = delta / (1000 * 60 * 60);
    const deltaSeconds = delta / 1000;

    // Update clocks
    this.circadianClock.tick(delta);
    this.hormonalCycle.update(deltaHours); 

    this.hpaAxis.updateFromCoreState(currentState, deltaSeconds);
    
    // Update long-term personality evolution
    personality.longTermUpdate(deltaHours);

    let modulatedState = { ...currentState };

    // Apply modulations
    modulatedState = this.hormonalCycle.modulateCoreState(modulatedState);
    modulatedState = this.circadianClock.modulateAffectiveState(modulatedState);
    const hpaState = this.hpaAxis.getState();
    modulatedState = applyHPAAxisEffects(modulatedState, {
      cortisol: hpaState.cortisol_free + hpaState.cortisol_bound,
      crh: hpaState.crh,
      acth: hpaState.acth,
      chronic_stress: hpaState.chronic_stress,
      acute_stress: hpaState.acute_stress,
    });
    
    // Apply continuous biological influence on personality
    personality.updateFromBiologicalState(modulatedState);

    // Apply physiological-temporal synchronization if bridge is registered
    if (this.physioBridge) {
      const currentHour = this.circadianClock.getCurrentHour();
      const circadianPhase = this.getCircadianPhase(currentHour);

      const hormonalState: HormonalState = {
        estradiol: modulatedState.estradiol || 0,
        progesterone: modulatedState.progesterone || 0,
        lh: modulatedState.lh || 0,
        fsh: modulatedState.fsh || 0,
        testosterone: modulatedState.testosterone || 0,
        cycle_day: modulatedState.cycle_day || 1,
        cycle_phase: modulatedState.cycle_phase || 'follicular'
      };

      // Synchronize cycles using bridge
      const syncState = this.physioBridge.synchronizeCycles(
        hormonalState,
        circadianPhase,
        currentHour
      );

      // Apply circadian modulation to hormones
      modulatedState.cortisol = this.physioBridge.applyCircadianModulation(
        modulatedState.cortisol,
        'cortisol',
        currentHour
      );

      // Store synchronization metrics in state (for monitoring)
      (modulatedState as any).phaseCoherence = syncState.phaseCoherence;
      (modulatedState as any).chronodisruption = syncState.chronodisruption;
    }

    // Recalculate derived emotions after all physiological updates
    const derivedEmotions = calculateDerivedEmotions(modulatedState);
    modulatedState = { ...modulatedState, ...derivedEmotions };

    return modulatedState;
  }

  /**
   * Maps hour to circadian phase
   */
  private getCircadianPhase(hour: number): CircadianPhase {
    if (hour >= 5 && hour < 8) return 'early_morning';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    if (hour >= 21 || hour < 2) return 'night';
    return 'deep_night';
  }

  /**
   * Applies external stress to HPA.
   * @param stressLevel 0-1
   */
  public applyStress(stressLevel: number): void {
    this.hpaAxis.applyAcuteStress(stressLevel);
  }

  // Serializers for persistence
  public serialize(): object {
    return {
      lastUpdate: this.lastUpdate,
      circadian: this.circadianClock.serialize(),
      hormonal: this.hormonalCycle.serialize(),
      hpa: this.hpaAxis.serialize()
    };
  }

  public deserialize(data: any): void {
    if (data.lastUpdate) this.lastUpdate = data.lastUpdate;
    if (data.circadian) this.circadianClock.deserialize(data.circadian);
    if (data.hormonal) this.hormonalCycle.deserialize(data.hormonal);
    if (data.hpa) this.hpaAxis.deserialize(data.hpa);
  }
}