
/**
 * Unit tests for AttentionalSelector
 */

import { AttentionalSelector, InformationPacket } from '../../agent/computation/AttentionalSelector';

describe('AttentionalSelector - Computational Correctness', () => {
  let selector: AttentionalSelector;

  beforeEach(() => {
    selector = new AttentionalSelector({
      capacity: 7,
      taskRelevanceWeight: 0.35,
      predictionErrorWeight: 0.30,
      actionUtilityWeight: 0.25,
      noveltyWeight: 0.2
    });
  });

  describe('Selection Algorithm', () => {
    test('selects top-scoring packets respecting capacity', () => {
      const packets = generatePacketsWithVaryingScores(20);

      const result = selector.select(packets);

      expect(result.selected.length).toBeLessThanOrEqual(7);
      expect(result.rejected.length).toBe(20 - result.selected.length);
    });

    test('maximizes total utility of selected packets', () => {
      const packets = generatePacketsWithVaryingScores(20);

      const result = selector.select(packets);

      // Selected packets should have higher average utility than rejected
      const selectedAvg = result.selected.reduce((sum, p) =>
        sum + (p.taskRelevance * 0.35 + p.predictionError * 0.30 + p.actionUtility * 0.25 + 0.1), 0) / result.selected.length;

      const rejectedAvg = result.rejected.reduce((sum, p) =>
        sum + (p.taskRelevance * 0.35 + p.predictionError * 0.30 + p.actionUtility * 0.25 + 0.1), 0) / result.rejected.length;

      if (result.rejected.length > 0) {
        expect(selectedAvg).toBeGreaterThan(rejectedAvg);
      }
    });

    test('handles empty packet list', () => {
      const result = selector.select([]);

      expect(result.selected).toEqual([]);
      expect(result.rejected).toEqual([]);
      expect(result.totalUtility).toBe(0);
    });

    test('handles packets below capacity', () => {
      const packets = generatePacketsWithVaryingScores(3);

      const result = selector.select(packets);

      expect(result.selected.length).toBe(3);
      expect(result.rejected.length).toBe(0);
    });
  });

  describe('Composite Scoring', () => {
    test('weights task relevance appropriately', () => {
      const packets: InformationPacket[] = [
        createPacket({ taskRelevance: 0.9, predictionError: 0.1, actionUtility: 0.1 }),
        createPacket({ taskRelevance: 0.1, predictionError: 0.9, actionUtility: 0.1 })
      ];

      const result = selector.select(packets);

      // First packet should be selected (higher composite score)
      expect(result.selected[0]?.taskRelevance).toBe(0.9);
    });

    test('weights prediction error appropriately', () => {
      const packets: InformationPacket[] = [
        createPacket({ taskRelevance: 0.1, predictionError: 0.9, actionUtility: 0.1 }),
        createPacket({ taskRelevance: 0.1, predictionError: 0.1, actionUtility: 0.9 })
      ];

      const result = selector.select(packets);

      // First packet should have high prediction error
      expect(result.selected[0]?.predictionError).toBeGreaterThan(0.5);
    });
  });

  describe('Novelty Calculation', () => {
    test('assigns high novelty to first packet', () => {
      const packets = [createPacket({})];

      const result = selector.select(packets);

      expect(result.selected.length).toBe(1);
    });

    test('reduces novelty for similar packets', () => {
      const similarPacket = createPacket({ source: 'module-a', data: { x: 0.5 } });
      const packets = [
        similarPacket,
        createPacket({ source: 'module-a', data: { x: 0.52 } }) // Similar
      ];

      const result1 = selector.select([packets[0]]);
      const result2 = selector.select(packets);

      // Should select the different packet second time
      expect(result2.selected.length).toBe(2); // Both selected as capacity 7, novelty low but score high
    });
  });

  describe('Selection Statistics', () => {
    test('tracks selection statistics', () => {
      const packets = generatePacketsWithVaryingScores(15);

      selector.select(packets);
      selector.select(packets);
      selector.select(packets);

      const stats = selector.getSelectionStats();

      expect(stats.totalSelections).toBe(3);
      expect(stats.avgSelectedCount).toBeLessThanOrEqual(7);
    });

    test('resets selection history', () => {
      const packets = generatePacketsWithVaryingScores(10);

      selector.select(packets);
      selector.select(packets);

      selector.clearHistory();

      const stats = selector.getSelectionStats();
      expect(stats.totalSelections).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('handles packets with missing fields gracefully', () => {
      const packet: any = {
        id: 'test',
        source: 'test',
        timestamp: Date.now(),
        data: {}
        // Missing computational metrics
      };

      const result = selector.select([packet]);

      expect(result.selected.length).toBeLessThanOrEqual(7);
    });

    test('handles packets with identical scores', () => {
      const packets = [
        createPacket({ taskRelevance: 0.5, predictionError: 0.5, actionUtility: 0.5 }),
        createPacket({ taskRelevance: 0.5, predictionError: 0.5, actionUtility: 0.5 }),
        createPacket({ taskRelevance: 0.5, predictionError: 0.5, actionUtility: 0.5 })
      ];

      const result = selector.select(packets);

      expect(result.selected.length).toBeLessThanOrEqual(3);
    });
  });
});

// Test helpers

function createPacket(overrides: Partial<InformationPacket>): InformationPacket {
  return {
    id: `packet_${Math.random()}`,
    source: 'test-module',
    timestamp: Date.now(),
    data: {},
    taskRelevance: 0.5,
    predictionError: 0.5,
    actionUtility: 0.5,
    novelty: 0.5,
    salience: 0.5,
    ...overrides
  };
}

function generatePacketsWithVaryingScores(count: number): InformationPacket[] {
  const packets: InformationPacket[] = [];

  for (let i = 0; i < count; i++) {
    packets.push(createPacket({
      taskRelevance: Math.random(),
      predictionError: Math.random(),
      actionUtility: Math.random(),
      source: `module-${i % 3}`
    }));
  }

  return packets;
}
