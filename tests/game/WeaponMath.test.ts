import { describe, it, expect } from 'vitest';
import { calculateWeaponCharge } from '../../src/game/logic/WeaponMath.ts';

describe('calculateWeaponCharge', () => {
  it('increases charge proportionally to dt when powered', () => {
    expect(calculateWeaponCharge(0, 12, true, 1)).toBeCloseTo(1);
    expect(calculateWeaponCharge(0, 12, true, 3)).toBeCloseTo(3);
  });

  it('does not change charge when unpowered', () => {
    expect(calculateWeaponCharge(5, 12, false, 1)).toBe(5);
    expect(calculateWeaponCharge(0, 12, false, 100)).toBe(0);
  });

  it('clamps at maxCharge and does not overflow', () => {
    expect(calculateWeaponCharge(11.5, 12, true, 1)).toBe(12);
    expect(calculateWeaponCharge(12, 12, true, 1)).toBe(12);
  });

  it('never returns a value above maxCharge regardless of dt', () => {
    const result = calculateWeaponCharge(0, 8, true, 1000);
    expect(result).toBe(8);
  });

  it('works correctly with fractional dt (60-fps frame)', () => {
    const dt = 1 / 60;
    const result = calculateWeaponCharge(0, 12, true, dt);
    expect(result).toBeCloseTo(dt);
  });

  it('reaching maxCharge exactly signals weapon is ready to fire', () => {
    const cooldown = 8;
    let charge = 0;
    // Simulate 8 one-second ticks.
    for (let i = 0; i < 8; i++) charge = calculateWeaponCharge(charge, cooldown, true, 1);
    expect(charge).toBe(cooldown);
  });
});
