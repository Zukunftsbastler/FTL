import { Time } from '../../engine/Time';
import { calculateO2Change, equalizeO2, SPACE_EQ_RATE } from '../logic/OxygenMath';
import type { Entity } from '../../engine/Entity';
import type { IWorld } from '../../engine/IWorld';
import type { DoorComponent } from '../components/DoorComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';

/** Cap dt to prevent huge simulation jumps if the tab was backgrounded. */
const MAX_DT = 0.1;

/**
 * Per-frame O2 simulation. Multi-ship aware.
 *
 * The oxygen map uses a compound string key `"${shipEntity}:${roomId}"` so that rooms
 * on different ships with the same template roomId do not collide.
 *
 * Execution order within a frame:
 *   1. Find all ship entities that have at least one room with OxygenComponent.
 *   2. Per ship: check OXYGEN system power, apply calculateO2Change to each room.
 *   3. Per ship: equalize O2 through each open door.
 */
export class OxygenSystem {
  update(world: IWorld): void {
    const dt = Math.min(Time.deltaTime, MAX_DT);

    // Build compound-keyed map: "shipEntityId:roomId" → OxygenComponent.
    const oxygenMap = this.buildOxygenMap(world);

    // Collect unique ship entities from all rooms that have an Owner.
    const shipEntities = this.collectShipEntities(world);

    for (const shipEntity of shipEntities) {
      const isPowered = this.isOxygenPoweredForShip(world, shipEntity);

      // Apply regen / decay to all rooms owned by this ship.
      const entities = world.query(['Room', 'Oxygen', 'Owner']);
      for (const entity of entities) {
        const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
        if (ownerComp?.shipEntity !== shipEntity) continue;

        const oxygen = world.getComponent<OxygenComponent>(entity, 'Oxygen');
        if (oxygen === undefined) continue;
        oxygen.level = calculateO2Change(oxygen.level, isPowered, false, dt);
      }

      // Equalize O2 through open doors owned by this ship.
      const doorEntities = world.query(['Door', 'Owner']);
      for (const entity of doorEntities) {
        const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
        if (ownerComp?.shipEntity !== shipEntity) continue;

        const door = world.getComponent<DoorComponent>(entity, 'Door');
        if (door === undefined || !door.isOpen) continue;

        if (door.roomA !== 'SPACE' && door.roomB !== 'SPACE') {
          const keyA = `${shipEntity}:${door.roomA}`;
          const keyB = `${shipEntity}:${door.roomB}`;
          const oxyA = oxygenMap.get(keyA);
          const oxyB = oxygenMap.get(keyB);
          if (oxyA === undefined || oxyB === undefined) continue;

          const [newA, newB] = equalizeO2(oxyA.level, oxyB.level, true, dt);
          oxyA.level = newA;
          oxyB.level = newB;

        } else if (door.roomA === 'SPACE' && door.roomB !== 'SPACE') {
          const keyB = `${shipEntity}:${door.roomB}`;
          const oxyB = oxygenMap.get(keyB);
          if (oxyB === undefined) continue;
          const [_space, newB] = equalizeO2(0, oxyB.level, true, dt, SPACE_EQ_RATE);
          oxyB.level = newB;

        } else if (door.roomA !== 'SPACE' && door.roomB === 'SPACE') {
          const keyA = `${shipEntity}:${door.roomA}`;
          const oxyA = oxygenMap.get(keyA);
          if (oxyA === undefined) continue;
          const [newA, _space] = equalizeO2(oxyA.level, 0, true, dt, SPACE_EQ_RATE);
          oxyA.level = newA;
        }
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Builds a map from "shipEntityId:roomId" → OxygenComponent for every room
   * that has both an OxygenComponent and an OwnerComponent.
   */
  private buildOxygenMap(world: IWorld): Map<string, OxygenComponent> {
    const map = new Map<string, OxygenComponent>();
    const entities = world.query(['Room', 'Oxygen', 'Owner']);
    for (const entity of entities) {
      const room   = world.getComponent<RoomComponent>(entity, 'Room');
      const oxygen = world.getComponent<OxygenComponent>(entity, 'Oxygen');
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (room !== undefined && oxygen !== undefined && ownerComp !== undefined) {
        map.set(`${ownerComp.shipEntity}:${room.roomId}`, oxygen);
      }
    }
    return map;
  }

  /** Returns the set of unique ship entity IDs referenced by room Owner components. */
  private collectShipEntities(world: IWorld): Set<Entity> {
    const set = new Set<Entity>();
    const entities = world.query(['Room', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp !== undefined) set.add(ownerComp.shipEntity);
    }
    return set;
  }

  /** Returns true if the given ship has an OXYGEN system with ≥ 1 power. */
  private isOxygenPoweredForShip(world: IWorld, shipEntity: Entity): boolean {
    const entities = world.query(['System', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys !== undefined && sys.type === 'OXYGEN') {
        return sys.currentPower > 0;
      }
    }
    return false;
  }
}
