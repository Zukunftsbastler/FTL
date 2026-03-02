import { Time } from '../../engine/Time';
import { calculateO2Change, equalizeO2, SPACE_EQ_RATE } from '../logic/OxygenMath';
import type { IWorld } from '../../engine/IWorld';
import type { DoorComponent } from '../components/DoorComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';

/** Cap dt to prevent huge simulation jumps if the tab was backgrounded. */
const MAX_DT = 0.1;

/**
 * Per-frame O2 simulation.
 *
 * Execution order within a frame:
 *   1. Apply calculateO2Change to every room (regen/decay based on OXYGEN system power).
 *   2. Equalize O2 through every open door (interior or airlock to SPACE).
 */
export class OxygenSystem {
  update(world: IWorld): void {
    const dt = Math.min(Time.deltaTime, MAX_DT);

    // ── 1. Find the OXYGEN system's current power ──────────────────────────
    const isPowered = this.isOxygenPowered(world);

    // ── 2. Build roomId → OxygenComponent map ──────────────────────────────
    const roomOxygenMap = this.buildOxygenMap(world);

    // ── 3. Apply regen / decay to every room ────────────────────────────────
    for (const oxygen of roomOxygenMap.values()) {
      oxygen.level = calculateO2Change(oxygen.level, isPowered, false, dt);
    }

    // ── 4. Equalize O2 through open doors ───────────────────────────────────
    const doorEntities = world.query(['Door']);
    for (const entity of doorEntities) {
      const door = world.getComponent<DoorComponent>(entity, 'Door');
      if (door === undefined || !door.isOpen) continue;

      if (door.roomA !== 'SPACE' && door.roomB !== 'SPACE') {
        // Interior door — equalize between two rooms.
        const oxyA = roomOxygenMap.get(door.roomA);
        const oxyB = roomOxygenMap.get(door.roomB);
        if (oxyA === undefined || oxyB === undefined) continue;

        const [newA, newB] = equalizeO2(oxyA.level, oxyB.level, true, dt);
        oxyA.level = newA;
        oxyB.level = newB;

      } else if (door.roomA === 'SPACE' && door.roomB !== 'SPACE') {
        // Airlock: roomA is space, roomB is the interior room that vents.
        const oxyB = roomOxygenMap.get(door.roomB);
        if (oxyB === undefined) continue;

        const [_space, newB] = equalizeO2(0, oxyB.level, true, dt, SPACE_EQ_RATE);
        oxyB.level = newB;

      } else if (door.roomA !== 'SPACE' && door.roomB === 'SPACE') {
        // Airlock: roomA is the interior room that vents into space.
        const oxyA = roomOxygenMap.get(door.roomA);
        if (oxyA === undefined) continue;

        const [newA, _space] = equalizeO2(oxyA.level, 0, true, dt, SPACE_EQ_RATE);
        oxyA.level = newA;
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isOxygenPowered(world: IWorld): boolean {
    const systemEntities = world.query(['System']);
    for (const entity of systemEntities) {
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys !== undefined && sys.type === 'OXYGEN') {
        return sys.currentPower > 0;
      }
    }
    return false; // no OXYGEN system found → treat as unpowered
  }

  private buildOxygenMap(world: IWorld): Map<number, OxygenComponent> {
    const map = new Map<number, OxygenComponent>();
    const entities = world.query(['Room', 'Oxygen']);
    for (const entity of entities) {
      const room   = world.getComponent<RoomComponent>(entity, 'Room');
      const oxygen = world.getComponent<OxygenComponent>(entity, 'Oxygen');
      if (room !== undefined && oxygen !== undefined) {
        map.set(room.roomId, oxygen);
      }
    }
    return map;
  }
}
