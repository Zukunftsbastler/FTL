import { describe, it, expect, beforeEach } from 'vitest';
import { allocatePower, deallocatePower } from '../../src/game/logic/PowerMath.ts';
import type { ReactorState, SystemState } from '../../src/game/logic/PowerMath.ts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReactor(total: number, available: number): ReactorState {
  return { totalPower: total, currentPower: available };
}

function makeSystem(max: number, current: number): SystemState {
  return { maxCapacity: max, currentPower: current };
}

// ── allocatePower ─────────────────────────────────────────────────────────────

describe('allocatePower', () => {
  let reactor: ReactorState;
  let system: SystemState;

  beforeEach(() => {
    reactor = makeReactor(8, 4); // 8 total, 4 available
    system  = makeSystem(3, 1);  // max 3, currently 1
  });

  it('transfers 1 unit from reactor to system and returns true', () => {
    const ok = allocatePower(reactor, system);
    expect(ok).toBe(true);
    expect(reactor.currentPower).toBe(3);
    expect(system.currentPower).toBe(2);
  });

  it('returns false and mutates nothing when reactor has no available power', () => {
    reactor.currentPower = 0;
    const ok = allocatePower(reactor, system);
    expect(ok).toBe(false);
    expect(reactor.currentPower).toBe(0);
    expect(system.currentPower).toBe(1);
  });

  it('returns false and mutates nothing when system is already at max capacity', () => {
    system.currentPower = system.maxCapacity; // 3/3 — full
    const ok = allocatePower(reactor, system);
    expect(ok).toBe(false);
    expect(reactor.currentPower).toBe(4);
    expect(system.currentPower).toBe(3);
  });

  it('fills system to max through repeated calls', () => {
    allocatePower(reactor, system); // 2
    allocatePower(reactor, system); // 3 = max
    const atMax = allocatePower(reactor, system); // should fail
    expect(atMax).toBe(false);
    expect(system.currentPower).toBe(3);
    expect(reactor.currentPower).toBe(2); // only 2 transfers succeeded
  });

  it('drains reactor to zero through repeated calls', () => {
    reactor.currentPower = 2;
    system.currentPower = 0;
    allocatePower(reactor, system); // reactor: 1
    allocatePower(reactor, system); // reactor: 0
    const overDraw = allocatePower(reactor, system);
    expect(overDraw).toBe(false);
    expect(reactor.currentPower).toBe(0);
  });
});

// ── deallocatePower ───────────────────────────────────────────────────────────

describe('deallocatePower', () => {
  let reactor: ReactorState;
  let system: SystemState;

  beforeEach(() => {
    reactor = makeReactor(8, 2); // 8 total, 2 available
    system  = makeSystem(4, 2);  // max 4, currently 2
  });

  it('returns 1 unit from system to reactor and returns true', () => {
    const ok = deallocatePower(reactor, system);
    expect(ok).toBe(true);
    expect(reactor.currentPower).toBe(3);
    expect(system.currentPower).toBe(1);
  });

  it('returns false and mutates nothing when system has no allocated power', () => {
    system.currentPower = 0;
    const ok = deallocatePower(reactor, system);
    expect(ok).toBe(false);
    expect(reactor.currentPower).toBe(2);
    expect(system.currentPower).toBe(0);
  });

  it('empties system to zero through repeated calls', () => {
    deallocatePower(reactor, system); // 1
    deallocatePower(reactor, system); // 0
    const underflow = deallocatePower(reactor, system);
    expect(underflow).toBe(false);
    expect(system.currentPower).toBe(0);
    expect(reactor.currentPower).toBe(4); // 2 + 2 returned
  });

  it('reactor.currentPower can reach totalPower when all systems are drained', () => {
    reactor.currentPower = 0;
    system.currentPower  = 8;
    system.maxCapacity   = 8;
    for (let i = 0; i < 8; i++) deallocatePower(reactor, system);
    expect(reactor.currentPower).toBe(8);
    expect(system.currentPower).toBe(0);
  });
});

// ── round-trip invariant ──────────────────────────────────────────────────────

describe('power conservation', () => {
  it('total power across reactor + system never changes', () => {
    const reactor = makeReactor(8, 5);
    const system  = makeSystem(4, 3);
    const initialTotal = reactor.currentPower + system.currentPower; // 5 + 3 = 8

    allocatePower(reactor, system);
    // reactor: 4, system: 4 — sum still 8 (power is conserved)
    expect(reactor.currentPower + system.currentPower).toBe(initialTotal);

    deallocatePower(reactor, system);
    // reactor: 5, system: 3 — sum still 8
    expect(reactor.currentPower + system.currentPower).toBe(initialTotal);
  });

  it('allocate then deallocate returns to original state', () => {
    const reactor = makeReactor(8, 4);
    const system  = makeSystem(3, 1);
    const r0 = reactor.currentPower;
    const s0 = system.currentPower;
    allocatePower(reactor, system);
    deallocatePower(reactor, system);
    expect(reactor.currentPower).toBe(r0);
    expect(system.currentPower).toBe(s0);
  });
});
