import { describe, it, expect } from 'vitest';
import { calculateMaxShields, rechargeShields } from '../../src/game/logic/ShieldMath.ts';

// ── calculateMaxShields ───────────────────────────────────────────────────────

describe('calculateMaxShields', () => {
  it('0 power → 0 shield layers', () => {
    expect(calculateMaxShields(0)).toBe(0);
  });

  it('1 power → 0 layers (odd numbers do not grant a bubble)', () => {
    expect(calculateMaxShields(1)).toBe(0);
  });

  it('2 power → 1 shield layer', () => {
    expect(calculateMaxShields(2)).toBe(1);
  });

  it('3 power → 1 layer (odd power does not grant second bubble)', () => {
    expect(calculateMaxShields(3)).toBe(1);
  });

  it('4 power → 2 shield layers', () => {
    expect(calculateMaxShields(4)).toBe(2);
  });

  it('5 power → 2 layers (odd power does not grant third bubble)', () => {
    expect(calculateMaxShields(5)).toBe(2);
  });

  it('6 power → 3 shield layers', () => {
    expect(calculateMaxShields(6)).toBe(3);
  });

  it('8 power → 4 shield layers', () => {
    expect(calculateMaxShields(8)).toBe(4);
  });
});

// ── rechargeShields ───────────────────────────────────────────────────────────

describe('rechargeShields', () => {
  it('returns currentShields unchanged when at maxShields', () => {
    expect(rechargeShields(1, 1, true, 1)).toBe(1);
    expect(rechargeShields(2, 2, true, 100)).toBe(2);
  });

  it('returns currentShields unchanged when unpowered', () => {
    expect(rechargeShields(0, 1, false, 1)).toBe(0);
    expect(rechargeShields(0, 2, false, 100)).toBe(0);
  });

  it('advances fractionally: 1 layer recharged after exactly 2 seconds', () => {
    const result = rechargeShields(0, 1, true, 2);
    expect(result).toBeCloseTo(1);
  });

  it('advances fractionally: halfway recharged after 1 second', () => {
    const result = rechargeShields(0, 1, true, 1);
    expect(result).toBeCloseTo(0.5);
  });

  it('does not overshoot maxShields regardless of dt', () => {
    expect(rechargeShields(0, 1, true, 1000)).toBe(1);
    expect(rechargeShields(0.9, 1, true, 100)).toBe(1);
  });

  it('accumulates correctly across multiple small dt steps', () => {
    let shields = 0;
    // Simulate 20 × 0.1s ticks = 2 seconds total
    for (let i = 0; i < 20; i++) {
      shields = rechargeShields(shields, 1, true, 0.1);
    }
    expect(shields).toBeCloseTo(1);
  });

  it('does not recharge above maxShields even when current is just below', () => {
    const result = rechargeShields(1.99, 2, true, 1);
    expect(result).toBe(2);
  });

  it('works correctly at 60 fps (1/60 s per frame)', () => {
    const dt = 1 / 60;
    const result = rechargeShields(0, 2, true, dt);
    expect(result).toBeCloseTo(dt / 2);
  });
});
