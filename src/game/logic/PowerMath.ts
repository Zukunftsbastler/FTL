/**
 * Pure power-allocation functions.  These operate directly on the component
 * data objects and have no ECS / DOM dependencies, making them trivially
 * unit-testable.
 */

/** Minimal shape required by allocatePower / deallocatePower for the reactor. */
export interface ReactorState {
  totalPower: number;
  currentPower: number; // available (unallocated) power
}

/** Minimal shape required by allocatePower / deallocatePower for a system. */
export interface SystemState {
  maxCapacity: number;
  currentPower: number;
}

/**
 * Moves 1 unit of power from the reactor's available pool into a system.
 *
 * Preconditions that cause a no-op (returns false):
 *  - Reactor has no available power (currentPower === 0).
 *  - System is already at max capacity.
 *
 * @returns true if the transfer succeeded.
 */
export function allocatePower(reactor: ReactorState, system: SystemState): boolean {
  if (reactor.currentPower <= 0) return false;
  if (system.currentPower >= system.maxCapacity) return false;
  reactor.currentPower -= 1;
  system.currentPower += 1;
  return true;
}

/**
 * Moves 1 unit of power from a system back to the reactor's available pool.
 *
 * Preconditions that cause a no-op (returns false):
 *  - System has no allocated power (currentPower === 0).
 *
 * @returns true if the transfer succeeded.
 */
export function deallocatePower(reactor: ReactorState, system: SystemState): boolean {
  if (system.currentPower <= 0) return false;
  system.currentPower -= 1;
  reactor.currentPower += 1;
  return true;
}
