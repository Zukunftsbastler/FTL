import { describe, it, expect } from 'vitest';
import {
  calculateO2Change,
  equalizeO2,
  O2_REGEN_RATE,
  O2_DECAY_RATE,
  O2_BREACH_RATE,
  ROOM_EQ_RATE,
  SPACE_EQ_RATE,
} from '../../src/game/logic/OxygenMath.ts';

// ── calculateO2Change ─────────────────────────────────────────────────────────

describe('calculateO2Change', () => {
  it('increases O2 when the OXYGEN system is powered', () => {
    const result = calculateO2Change(50, true, false, 1);
    expect(result).toBeCloseTo(50 + O2_REGEN_RATE);
  });

  it('decreases O2 when the OXYGEN system is unpowered', () => {
    const result = calculateO2Change(50, false, false, 1);
    expect(result).toBeCloseTo(50 - O2_DECAY_RATE);
  });

  it('decreases O2 faster with a hull breach (unpowered + breach)', () => {
    const result = calculateO2Change(50, false, true, 1);
    expect(result).toBeCloseTo(50 - O2_DECAY_RATE - O2_BREACH_RATE);
  });

  it('decreases O2 with a breach even when powered', () => {
    // powered regen minus breach penalty
    const expected = 50 + O2_REGEN_RATE - O2_BREACH_RATE;
    const result   = calculateO2Change(50, true, true, 1);
    expect(result).toBeCloseTo(expected);
  });

  it('clamps O2 to 100 when regenerating from a full room', () => {
    const result = calculateO2Change(100, true, false, 10);
    expect(result).toBe(100);
  });

  it('clamps O2 to 0 and does not go negative', () => {
    const result = calculateO2Change(0, false, true, 100);
    expect(result).toBe(0);
  });

  it('is proportional to dt (half the time = half the change)', () => {
    const full = calculateO2Change(50, false, false, 1);
    const half = calculateO2Change(50, false, false, 0.5);
    expect(full - 50).toBeCloseTo(2 * (half - 50));
  });
});

// ── equalizeO2 ───────────────────────────────────────────────────────────────

describe('equalizeO2', () => {
  it('does nothing when the door is closed', () => {
    const [a, b] = equalizeO2(80, 40, false, 1);
    expect(a).toBe(80);
    expect(b).toBe(40);
  });

  it('leaves both rooms unchanged when they are already equal', () => {
    const [a, b] = equalizeO2(60, 60, true, 1);
    expect(a).toBeCloseTo(60);
    expect(b).toBeCloseTo(60);
  });

  it('moves both rooms toward the average when the door is open', () => {
    const avg    = 70; // (80 + 60) / 2
    const [a, b] = equalizeO2(80, 60, true, 1, ROOM_EQ_RATE);
    // Each room moves (avg - current) * ROOM_EQ_RATE * 1 toward the average.
    expect(a).toBeCloseTo(80 + (avg - 80) * ROOM_EQ_RATE);
    expect(b).toBeCloseTo(60 + (avg - 60) * ROOM_EQ_RATE);
    // Rooms approach each other — higher goes down, lower goes up.
    expect(a).toBeLessThan(80);
    expect(b).toBeGreaterThan(60);
  });

  it('rapidly drains a room into space (SPACE_EQ_RATE)', () => {
    // A full room venting into space (O2 = 0).
    const [roomNew, _spaceNew] = equalizeO2(100, 0, true, 1, SPACE_EQ_RATE);
    // avg = 50; delta = (50 - 100) * SPACE_EQ_RATE * 1
    const expected = 100 + (50 - 100) * SPACE_EQ_RATE;
    expect(roomNew).toBeCloseTo(Math.max(0, expected));
  });

  it('drains faster with SPACE_EQ_RATE than ROOM_EQ_RATE', () => {
    const [slowDrain] = equalizeO2(100, 0, true, 1, ROOM_EQ_RATE);
    const [fastDrain] = equalizeO2(100, 0, true, 1, SPACE_EQ_RATE);
    expect(fastDrain).toBeLessThan(slowDrain);
  });

  it('clamps O2 to 0 — never goes negative when draining into space', () => {
    // Very long dt with high rate to force overflow.
    const [a, _b] = equalizeO2(1, 0, true, 100, SPACE_EQ_RATE);
    expect(a).toBeGreaterThanOrEqual(0);
  });

  it('clamps O2 to 100 — never exceeds max during equalization', () => {
    const [a, b] = equalizeO2(100, 100, true, 1);
    expect(a).toBeLessThanOrEqual(100);
    expect(b).toBeLessThanOrEqual(100);
  });

  it('is symmetric: swapping rooms produces mirrored results', () => {
    const [a1, b1] = equalizeO2(80, 20, true, 1, ROOM_EQ_RATE);
    const [b2, a2] = equalizeO2(20, 80, true, 1, ROOM_EQ_RATE);
    expect(a1).toBeCloseTo(a2);
    expect(b1).toBeCloseTo(b2);
  });
});
