/**
 * @file IntegrationMetrics.ts
 * @description
 * Quantitative diagnostics for cross-layer integration coherence.
 *
 * Provides:
 * - computePhiProxy: fraction of active cross-layer bridges
 * - computeRecurrenceDepth: depth of recurrent loops in decision traces
 * - computeStochasticConsistency: compares observed conditional-variability vs target profiles
 * - computeBiologicalDeviation: deviation of simulated hormones from expected ranges/half-lives
 *
 * This module is diagnostic-only: no mocks, no side effects on core runtime.
 */

import { CoreState } from '../types';
import { AffectiveDimensions } from '../bridges/NeuralAffectiveBridge';

export interface BridgeActivationSnapshot {
  // Whether each conceptual bridge contributed in this step
  neuralAffective: boolean;
  cognitiveLinguistic: boolean;
  physiologyTemporal: boolean;
  laboratoryIntegration: boolean;
  daemonLoop: boolean;
  intimateSubsystem: boolean;
}

export interface PhiProxyInput {
  coreState: CoreState;
  affective: AffectiveDimensions | null;
  bridges: BridgeActivationSnapshot;
}

/**
 * DecisionTraceEvent:
 * Minimal representation of a processing step in a decision/response episode.
 */
export interface DecisionTraceEvent {
  id: string;
  timestamp: number;
  layer: 'sensory' | 'neural' | 'affective' | 'cognitive' | 'physio' | 'temporal' | 'linguistic' | 'laboratory' | 'intimate';
  source?: string;
  target?: string;
  description?: string;
  // When this event causally references earlier events by id
  dependsOn?: string[];
}

/**
 * StochasticEventSample:
 * Represents a single variability event whose probability is conditioned on state,
 * e.g. hedging insertion, vocal prefix, etc.
 */
export interface StochasticEventSample {
  kind: string;             // e.g. 'linguistic_hedge', 'vocal_prefix', 'somatic_marker'
  stateScalar: number;      // controlling scalar in [0,1] used by the deterministic helper
  realized: boolean;        // whether the variability manifested
}

/**
 * BiologicalSample:
 * Snapshot of simulated biological parameters to evaluate realism.
 */
export interface BiologicalSample {
  estradiol?: number;
  progesterone?: number;
  lh?: number;
  fsh?: number;
  testosterone?: number;
  cortisol?: number;
  melatonin?: number;
  timeOfDayHours?: number;
  cycleDay?: number;
}

export interface PhiProxyResult {
  phi_proxy: number; // 0-1 fraction of bridges engaged
  activeCount: number;
  totalConsidered: number;
}

export interface RecurrenceDepthResult {
  maxDepth: number;
  meanDepth: number;
  loopCount: number;
}

export interface StochasticConsistencyResult {
  // Mean squared error between observed frequency and target(state) across kinds
  mse: number;
  perKind: Record<string, { observed: number; target: number; count: number }>;
}

export interface BiologicalDeviationResult {
  meanRelativeError: number; // 0 = perfect; >0 indicates deviation
  perHormone: Record<string, number>;
}

/**
 * Compute a proxy for "integrated information" across layers:
 * fraction of distinct conceptual bridges that are active in a given snapshot.
 *
 * This is NOT Tononi phi, but an operational, testable metric:
 * higher when multiple cross-layer couplings are simultaneously engaged.
 */
export function computePhiProxy(input: PhiProxyInput): PhiProxyResult {
  const { coreState, affective, bridges } = input;

  const considered: boolean[] = [];

  // Neurochemical ↔ neural ↔ affective
  considered.push(bridges.neuralAffective && !!affective);

  // Cognitive ↔ linguistic
  considered.push(bridges.cognitiveLinguistic);

  // Physio ↔ temporal ↔ hormonal
  const hasCycle =
    typeof coreState.cycle_day === 'number' &&
    typeof coreState.estradiol === 'number' &&
    typeof coreState.progesterone === 'number';
  considered.push(bridges.physiologyTemporal && hasCycle);

  // Laboratory / daemon integration
  considered.push(bridges.laboratoryIntegration);
  considered.push(bridges.daemonLoop);

  // Intimate ↔ affective ↔ linguistic
  const hasIntimate =
    !!coreState.intimateState &&
    typeof coreState.intimateState.arousal === 'number';
  considered.push(bridges.intimateSubsystem && hasIntimate);

  const totalConsidered = considered.length;
  const activeCount = considered.filter(v => v).length;
  const phi_proxy = totalConsidered === 0 ? 0 : activeCount / totalConsidered;

  return { phi_proxy, activeCount, totalConsidered };
}

/**
 * Compute recurrence depth in a decision trace.
 * We treat dependencies as directed edges and measure:
 * - maxDepth: longest dependency chain length
 * - meanDepth: average depth over nodes
 * - loopCount: number of cycles (feedback loops)
 */
export function computeRecurrenceDepth(trace: DecisionTraceEvent[]): RecurrenceDepthResult {
  if (!trace.length) return { maxDepth: 0, meanDepth: 0, loopCount: 0 };

  const byId = new Map<string, DecisionTraceEvent>();
  trace.forEach(e => byId.set(e.id, e));

  const depthCache = new Map<string, number>();
  let loopCount = 0;

  const visit = (id: string, stack: Set<string>): number => {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const ev = byId.get(id);
    if (!ev) {
      depthCache.set(id, 1);
      return 1;
    }
    if (!ev.dependsOn || ev.dependsOn.length === 0) {
      depthCache.set(id, 1);
      return 1;
    }
    if (stack.has(id)) {
      // Loop detected
      loopCount++;
      depthCache.set(id, 1);
      return 1;
    }
    stack.add(id);
    let maxDep = 0;
    for (const dep of ev.dependsOn) {
      maxDep = Math.max(maxDep, visit(dep, stack));
    }
    stack.delete(id);
    const d = maxDep + 1;
    depthCache.set(id, d);
    return d;
  };

  let maxDepth = 0;
  let depthSum = 0;

  for (const ev of trace) {
    const d = visit(ev.id, new Set<string>());
    maxDepth = Math.max(maxDepth, d);
    depthSum += d;
  }

  const meanDepth = depthSum / trace.length;
  return { maxDepth, meanDepth, loopCount };
}

/**
 * Compute how consistent state-conditioned stochastic mechanisms are.
 *
 * For each event kind:
 * - target probability is approximated by the mean of stateScalar in [0,1]
 *   (assuming helpers are monotone in that scalar).
 * - observed probability = realized fraction.
 * We return MSE between observed and target.
 *
 * This assumes callers log each time they evaluate a deterministicVariabilityFromState-like
 * function and whether they crossed the decision threshold.
 */
export function computeStochasticConsistency(
  samples: StochasticEventSample[]
): StochasticConsistencyResult {
  if (!samples.length) {
    return { mse: 0, perKind: {} };
  }

  const byKind: Record<string, { sumState: number; count: number; realized: number }> = {};
  for (const s of samples) {
    if (!byKind[s.kind]) {
      byKind[s.kind] = { sumState: 0, count: 0, realized: 0 };
    }
    const k = byKind[s.kind];
    k.sumState += s.stateScalar;
    k.count += 1;
    if (s.realized) k.realized += 1;
  }

  let mse = 0;
  const perKind: StochasticConsistencyResult['perKind'] = {};

  for (const [kind, agg] of Object.entries(byKind)) {
    const target = agg.count > 0 ? agg.sumState / agg.count : 0;
    const observed = agg.count > 0 ? agg.realized / agg.count : 0;
    const err = observed - target;
    const se = err * err;
    mse += se;
    perKind[kind] = { observed, target, count: agg.count };
  }

  mse /= Object.keys(byKind).length || 1;
  return { mse, perKind };
}

/**
 * Reference ranges (normalized 0-1 internal scale) for diagnostics.
 * These are derived from HormonalCycle design and VALIDATION_PLAN.
 * They are intentionally conservative; this is a runtime guardrail, not biology in vitro.
 */
const EXPECTED_BIO_RANGES: Record<string, { min: number; max: number }> = {
  estradiol: { min: 0.0, max: 1.0 },
  progesterone: { min: 0.0, max: 1.0 },
  lh: { min: 0.0, max: 1.0 },
  fsh: { min: 0.0, max: 1.0 },
  testosterone: { min: 0.0, max: 1.0 },
  cortisol: { min: 0.0, max: 1.0 },
  melatonin: { min: 0.0, max: 1.0 },
};

/**
 * Compute mean relative deviation of biological variables from expected ranges.
 *
 * For each hormone h with expected [min,max]:
 * - If v in [min,max]: deviation 0
 * - Else: deviation = distance to nearest bound divided by span
 *
 * Returns meanRelativeError across all present variables.
 */
export function computeBiologicalDeviation(
  samples: BiologicalSample[]
): BiologicalDeviationResult {
  if (!samples.length) {
    return { meanRelativeError: 0, perHormone: {} };
  }

  const accum: Record<string, { sum: number; count: number }> = {};

  for (const s of samples) {
    for (const [key, range] of Object.entries(EXPECTED_BIO_RANGES)) {
      const v = (s as any)[key];
      if (typeof v !== 'number') continue;
      const span = range.max - range.min || 1;
      let dev = 0;
      if (v < range.min) dev = (range.min - v) / span;
      else if (v > range.max) dev = (v - range.max) / span;
      if (!accum[key]) accum[key] = { sum: 0, count: 0 };
      accum[key].sum += Math.max(0, dev);
      accum[key].count += 1;
    }
  }

  const perHormone: Record<string, number> = {};
  let total = 0;
  let n = 0;

  for (const [key, { sum, count }] of Object.entries(accum)) {
    if (count === 0) continue;
    const meanDev = sum / count;
    perHormone[key] = meanDev;
    total += meanDev;
    n++;
  }

  const meanRelativeError = n > 0 ? total / n : 0;
  return { meanRelativeError, perHormone };
}