/**
 * Unit tests for BroadcastBus
 *
 * Test computational correctness: latency simulation, utility-based routing,
 * timeout handling, and retry logic
 */

import { BroadcastBus, BroadcastPriority, BroadcastPacket } from '../../agent/computation/BroadcastBus';

describe('BroadcastBus - Computational Correctness', () => {

  let bus: BroadcastBus;

  beforeEach(() => {
    bus = new BroadcastBus({
      latencyMs: 150,
      jitterFactor: 0.2,
      defaultTimeoutMs: 5000,
      retryAttempts: 3
    });
  });

  describe('Subscription Management', () => {
    test('allows modules to subscribe', () => {
      const callback = vi.fn();
      const result = bus.subscribe('module-a', callback, 0.8);

      expect(result).toBe(true);
      expect(bus.getStats().subscriberCount).toBe(1);
    });

    test('prevents duplicate subscriptions', () => {
      const callback = vi.fn();
      bus.subscribe('module-a', callback, 0.8);
      const result = bus.subscribe('module-a', callback, 0.8);

      expect(result).toBe(false);
      expect(bus.getStats().subscriberCount).toBe(1);
    });

    test('allows unsubscription', () => {
      const callback = vi.fn();
      bus.subscribe('module-a', callback);
      const result = bus.unsubscribe('module-a');

      expect(result).toBe(true);
      expect(bus.getStats().subscriberCount).toBe(0);
    });

    test('returns false when unsubscribing non-existent module', () => {
      const result = bus.unsubscribe('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Latency Simulation', () => {
    test('simulates neural latency around 150ms', async () => {
      const packet = createTestPacket();
      const callback = vi.fn();

      bus.subscribe('module-a', callback);

      const start = Date.now();
      await bus.send(packet, { priority: BroadcastPriority.MEDIUM });
      const duration = Date.now() - start;

      // Should be close to 150ms (within ±30ms for jitter)
      expect(duration).toBeGreaterThan(120);
      expect(duration).toBeLessThan(200);
    });

    test('adds jitter to latency', async () => {
      const packet = createTestPacket();
      const callback = vi.fn();

      bus.subscribe('module-a', callback);

      // Measure multiple broadcasts
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await bus.send(packet, { priority: BroadcastPriority.MEDIUM });
        times.push(Date.now() - start);
      }

      // Calculate variance
      const mean = times.reduce((a, b) => a + b) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;

      // Should have noticeable variance (jitter)
      expect(variance).toBeGreaterThan(50);
    });

    test('zero latency config skips simulation', async () => {
      const fastBus = new BroadcastBus({ latencyMs: 0 });
      const packet = createTestPacket();
      const callback = vi.fn();

      fastBus.subscribe('module-a', callback);

      const start = Date.now();
      await fastBus.send(packet, { priority: BroadcastPriority.MEDIUM });
      const duration = Date.now() - start;

      // Should be very fast (< 10ms)
      expect(duration).toBeLessThan(20);
    });
  });

  describe('Utility-Based Recipient Selection', () => {
    test('broadcasts to all subscribers on HIGH priority', async () => {
      const packet = createTestPacket(BroadcastPriority.HIGH);
      const callbackA = vi.fn().mockResolvedValue(undefined);
      const callbackB = vi.fn().mockResolvedValue(undefined);
      const callbackC = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('module-a', callbackA, 0.2); // Low utility
      bus.subscribe('module-b', callbackB, 0.9); // High utility
      bus.subscribe('module-c', callbackC, 0.1); // Very low utility

      const result = await bus.send(packet, { priority: BroadcastPriority.HIGH });

      expect(result.recipients).toBe(3);
      expect(callbackA).toHaveBeenCalled();
      expect(callbackB).toHaveBeenCalled();
      expect(callbackC).toHaveBeenCalled();
    });

    test('selects recipients based on historical utility for MEDIUM priority', async () => {
      const packet = createTestPacket(BroadcastPriority.MEDIUM);
      const callbackA = vi.fn().mockResolvedValue(undefined);
      const callbackB = vi.fn().mockResolvedValue(undefined);
      const callbackC = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('module-a', callbackA, 0.9); // High utility
      bus.subscribe('module-b', callbackB, 0.2); // Low utility
      bus.subscribe('module-c', callbackC, 0.5); // Medium utility

      const result = await bus.send(packet, { priority: BroadcastPriority.MEDIUM });

      // Should select modules with utility >= 0.3 (a and c)
      expect(result.recipients).toBe(2);
      expect(callbackA).toHaveBeenCalled();
      expect(callbackC).toHaveBeenCalled();
      expect(callbackB).not.toHaveBeenCalled(); // Utility too low
    });

    test('allows explicit recipient list override', async () => {
      const packet = createTestPacket(BroadcastPriority.MEDIUM);
      const callbackA = vi.fn().mockResolvedValue(undefined);
      const callbackB = vi.fn().mockResolvedValue(undefined);
      const callbackC = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('module-a', callbackA, 0.9);
      bus.subscribe('module-b', callbackB, 0.9);
      bus.subscribe('module-c', callbackC, 0.9);

      // Explicitly specify only module-a
      const result = await bus.send(packet, {
        priority: BroadcastPriority.MEDIUM,
        recipients: ['module-a']
      });

      expect(result.recipients).toBe(1);
      expect(callbackA).toHaveBeenCalled();
      expect(callbackB).not.toHaveBeenCalled();
      expect(callbackC).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('handles subscriber errors gracefully', async () => {
      const packet = createTestPacket();
      const callbackA = vi.fn().mockResolvedValue(undefined);
      const callbackB = vi.fn().mockRejectedValue(new Error('Subscriber error'));
      const callbackC = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('module-a', callbackA);
      bus.subscribe('module-b', callbackB);
      bus.subscribe('module-c', callbackC);

      const result = await bus.send(packet, { priority: BroadcastPriority.MEDIUM });

      expect(result.results).toHaveLength(3);

      const aResult = result.results.find(r => r.recipientId === 'module-a');
      const bResult = result.results.find(r => r.recipientId === 'module-b');
      const cResult = result.results.find(r => r.recipientId === 'module-c');

      expect(aResult?.status).toBe('SUCCESS');
      expect(bResult?.status).toBe('ERROR');
      expect(cResult?.status).toBe('SUCCESS');
    });

    test('handles timeout with slow subscribers', async () => {
      const packet = createTestPacket();
      const callbackA = vi.fn().mockResolvedValue(undefined);
      const callbackB = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 10000)) // Very slow
      );
      const callbackC = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('module-a', callbackA);
      bus.subscribe('module-b', callbackB);
      bus.subscribe('module-c', callbackC);

      // Use shorter timeout for test
      const fastBus = new BroadcastBus({ latencyMs: 0, defaultTimeoutMs: 100 });
      fastBus.subscribe('module-a', callbackA);
      fastBus.subscribe('module-b', callbackB);
      fastBus.subscribe('module-c', callbackC);

      const result = await fastBus.send(packet, { priority: BroadcastPriority.MEDIUM });

      expect(result.results).toHaveLength(3);

      const aResult = result.results.find(r => r.recipientId === 'module-a');
      const bResult = result.results.find(r => r.recipientId === 'module-b');
      const cResult = result.results.find(r => r.recipientId === 'module-c');

      expect(aResult?.status).toBe('SUCCESS');
      expect(bResult?.status).toBe('TIMEOUT');
      expect(cResult?.status).toBe('SUCCESS');
    });
  });

  describe('Statistics Tracking', () => {
    test('tracks subscriber statistics', async () => {
      const packet = createTestPacket();

      const callbackA = vi.fn().mockResolvedValue(undefined);
      const callbackB = vi.fn().mockResolvedValue(undefined);
      const callbackC = vi.fn().mockRejectedValue(new Error('Failure'));

      bus.subscribe('module-a', callbackA);
      bus.subscribe('module-b', callbackB);
      bus.subscribe('module-c', callbackC);

      await bus.send(packet, { priority: BroadcastPriority.MEDIUM });

      const stats = bus.getStats();

      expect(stats.totalBroadcasts).toBe(1);
      expect(stats.totalRecipients).toBe(3);
      expect(stats.avgRecipients).toBe(3);
      expect(stats.subscriberCount).toBe(3);
    });

    test('updates historical utility', async () => {
      const packet = createTestPacket();
      const callback = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('module-a', callback, 0.5);
      await bus.send(packet, { priority: BroadcastPriority.MEDIUM });

      // Update utility
      const updated = bus.updateHistoricalUtility('module-a', 0.9);
      expect(updated).toBe(true);

      // Next broadcast should prioritize this module
      const callbackB = vi.fn().mockResolvedValue(undefined);
      bus.subscribe('module-b', callbackB, 0.3);

      const result = await bus.send(packet, { priority: BroadcastPriority.MEDIUM });

      // Should have selected module-a (higher utility)
      expect(result.recipients).toBe(1);
      expect(result.results[0].recipientId).toBe('module-a');
    });

    test('tracks broadcast history', async () => {
      const packet1 = createTestPacket();
      const packet2 = createTestPacket();

      const callback = vi.fn().mockResolvedValue(undefined);
      bus.subscribe('module-a', callback);

      await bus.send(packet1, { priority: BroadcastPriority.HIGH });
      await bus.send(packet2, { priority: BroadcastPriority.MEDIUM });

      const stats = bus.getStats();

      expect(stats.totalBroadcasts).toBe(2);
      expect(stats.recentHighPriority).toHaveLength(1);
      expect(stats.recentMediumPriority).toHaveLength(1);
      expect(stats.recentLowPriority).toHaveLength(0);
    });
  });

  describe('Reset and Cleanup', () => {
    test('clearHistory removes broadcast logs', async () => {
      const packet = createTestPacket();
      const callback = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('module-a', callback);
      await bus.send(packet, { priority: BroadcastPriority.MEDIUM });

      expect(bus.getStats().totalBroadcasts).toBe(1);

      bus.clearHistory();

      expect(bus.getStats().totalBroadcasts).toBe(0);
    });

    test('reset clears all data', async () => {
      bus.subscribe('module-a', vi.fn(), 0.8);
      bus.subscribe('module-b', vi.fn(), 0.7);

      const packet = createTestPacket();
      await bus.send(packet, { priority: BroadcastPriority.MEDIUM });

      bus.reset();

      expect(bus.getStats().subscriberCount).toBe(0);
      expect(bus.getStats().totalBroadcasts).toBe(0);
    });
  });
});

// Test helpers
function createTestPacket(priority: BroadcastPriority = BroadcastPriority.MEDIUM): BroadcastPacket {
  return {
    id: `test_${Date.now()}_${Math.random()}`,
    compressedData: {
      vector: new Float32Array([0.1, 0.3, 0.7]),
      metadata: {
        originalSize: 100,
        compressedSize: 15,
        informationLoss: 0.1,
        featureImportance: new Map([['test', 0.8]])
      }
    },
    mutualInformation: 2.5,
    timestamp: Date.now(),
    priority,
    originalStateHash: 'test_hash',
    compressionRatio: 0.15
  };
}
