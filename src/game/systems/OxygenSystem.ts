import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { calculateO2Change, equalizeO2, ROOM_EQ_RATE, SPACE_EQ_RATE } from '../logic/OxygenMath';
import type { Entity } from '../../engine/Entity';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { DoorComponent } from '../components/DoorComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';

/** Cap dt to prevent huge simulation jumps if the tab was backgrounded. */
const MAX_DT = 0.1;

/** Oxygen drained per second by a Lanius crew member in a room (% of room capacity). */
const LANIUS_DRAIN_RATE = 15;

/** O2 drained per second while a room is on fire. */
const FIRE_O2_DRAIN_RATE = 10;

/**
 * Probability per second that a burning room spreads fire to a random room on the
 * same ship that does not already have fire.
 */
const FIRE_SPREAD_CHANCE_PER_SEC = 0.04;

/** Hull damage per second dealt by active fire. */
const FIRE_HULL_DAMAGE_RATE = 0.5;
/** System damage per second dealt by active fire. */
const FIRE_SYSTEM_DAMAGE_RATE = 0.5;

/** Starting fireHealth assigned when fire first appears in a room. */
export const FIRE_HEALTH_INITIAL   = 15;

/** Starting breachHealth assigned when a breach first opens in a room. */
export const BREACH_HEALTH_INITIAL = 20;

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

    // Build a flood-filled set of venting room keys.
    // Seed: every room directly touching an open airlock door.
    // Expand: propagate through all open interior doors so that any room
    // reachable from an open airlock (however indirectly) is also treated
    // as venting — preventing the OXYGEN system from counteracting the drain.
    const ventingRooms = new Set<string>();
    const allDoors: Array<{ door: DoorComponent; sid: number }> = [];
    for (const doorEntity of world.query(['Door', 'Owner'])) {
      const door      = world.getComponent<DoorComponent>(doorEntity, 'Door');
      const ownerComp = world.getComponent<OwnerComponent>(doorEntity, 'Owner');
      if (door === undefined || ownerComp === undefined || !door.isOpen) continue;
      allDoors.push({ door, sid: ownerComp.shipEntity });
      // Direct airlock seeds.
      if (door.roomA === 'SPACE' && door.roomB !== 'SPACE') {
        ventingRooms.add(`${ownerComp.shipEntity}:${door.roomB}`);
      } else if (door.roomB === 'SPACE' && door.roomA !== 'SPACE') {
        ventingRooms.add(`${ownerComp.shipEntity}:${door.roomA}`);
      }
    }
    // Flood-fill through open interior doors.
    let flooded = true;
    while (flooded) {
      flooded = false;
      for (const { door, sid } of allDoors) {
        if (door.roomA === 'SPACE' || door.roomB === 'SPACE') continue;
        const keyA = `${sid}:${door.roomA}`;
        const keyB = `${sid}:${door.roomB}`;
        if (ventingRooms.has(keyA) && !ventingRooms.has(keyB)) { ventingRooms.add(keyB); flooded = true; }
        if (ventingRooms.has(keyB) && !ventingRooms.has(keyA)) { ventingRooms.add(keyA); flooded = true; }
      }
    }

    for (const shipEntity of shipEntities) {
      const isPowered = this.isOxygenPoweredForShip(world, shipEntity);

      // Apply regen / decay (+ breach drain) to all rooms owned by this ship.
      const entities = world.query(['Room', 'Oxygen', 'Owner']);
      for (const entity of entities) {
        const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
        if (ownerComp?.shipEntity !== shipEntity) continue;

        const oxygen = world.getComponent<OxygenComponent>(entity, 'Oxygen');
        const room   = world.getComponent<RoomComponent>(entity, 'Room');
        if (oxygen === undefined || room === undefined) continue;

        // A room venting to space suppresses life-support regen and is treated
        // like an additional breach so O2 plummets even if OXYGEN is powered.
        const isVenting = ventingRooms.has(`${shipEntity}:${room.roomId}`);
        oxygen.level = calculateO2Change(
          oxygen.level,
          isPowered && !isVenting,
          room.hasBreach || isVenting,
          dt,
        );

        // Fire drains O2 independently of breach.
        if (room.hasFire) {
          oxygen.level = Math.max(0, oxygen.level - FIRE_O2_DRAIN_RATE * dt);

          // Fire deals damage to the room's system and the ship's hull.
          const sys = world.getComponent<SystemComponent>(entity, 'System');
          if (sys !== undefined) {
            sys.damageAmount = Math.min(sys.level, sys.damageAmount + FIRE_SYSTEM_DAMAGE_RATE * dt);
          }
          const shipComp = world.getComponent<ShipComponent>(ownerComp.shipEntity, 'Ship');
          if (shipComp !== undefined) {
            shipComp.currentHull = Math.max(0, shipComp.currentHull - FIRE_HULL_DAMAGE_RATE * dt);
          }

          // Fire extinguishes itself when the room runs out of oxygen.
          if (oxygen.level <= 0) {
            room.hasFire = false;
          }
        }
      }

      // Fire spread: each burning room has a small per-second chance to ignite a
      // random non-burning room on the same ship.
      this.applyFireSpread(world, shipEntity, dt);

      // ── Lanius O2 drain: each Lanius in a room reduces that room's O2 ────────
      this.applyLaniusDrain(world, shipEntity, oxygenMap, dt);

      // Equalize O2 through open doors owned by this ship.
      // Doors connecting to (or adjacent to) a venting room use SPACE_EQ_RATE so
      // the drain outpaces OXYGEN system regeneration and propagates visibly.
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

          // Use the faster space-rate if either side is connected to vacuum so that
          // the drain propagates faster than the OXYGEN system can compensate.
          const rate = (ventingRooms.has(keyA) || ventingRooms.has(keyB))
            ? SPACE_EQ_RATE
            : ROOM_EQ_RATE;
          const [newA, newB] = equalizeO2(oxyA.level, oxyB.level, true, dt, rate);
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

  /**
   * For each ship, checks every burning room and gives it a small per-second
   * chance to spread fire to a random non-burning room on the same ship.
   */
  private applyFireSpread(world: IWorld, shipEntity: Entity, dt: number): void {
    // Collect all rooms for this ship.
    const rooms: Array<{ entity: number; room: RoomComponent }> = [];
    for (const entity of world.query(['Room', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (room !== undefined) rooms.push({ entity, room });
    }

    for (const { room: src } of rooms) {
      if (!src.hasFire) continue;
      if (Math.random() >= FIRE_SPREAD_CHANCE_PER_SEC * dt) continue;

      // Pick a random room that is not already on fire.
      const targets = rooms.filter((r) => !r.room.hasFire);
      if (targets.length === 0) continue;

      const target = targets[Math.floor(Math.random() * targets.length)];
      target.room.hasFire    = true;
      target.room.fireHealth = FIRE_HEALTH_INITIAL;
    }
  }

  /**
   * Lanius crew drain oxygen from the room they occupy.
   * The Lanius themselves are immune to suffocation (handled in CrewSystem).
   */
  private applyLaniusDrain(
    world: IWorld,
    shipEntity: Entity,
    oxygenMap: Map<string, OxygenComponent>,
    dt: number,
  ): void {
    // Build a quick room-bounds lookup for this ship.
    const roomBounds: Array<{
      roomId: number;
      left: number; top: number; right: number; bottom: number;
    }> = [];

    for (const entity of world.query(['Room', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;
      roomBounds.push({
        roomId: room.roomId,
        left:   pos.x,
        top:    pos.y,
        right:  pos.x + room.width  * TILE_SIZE,
        bottom: pos.y + room.height * TILE_SIZE,
      });
    }

    // For each Lanius crew on this ship, drain the room they occupy.
    for (const entity of world.query(['Crew', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const crew = world.getComponent<CrewComponent>(entity, 'Crew');
      if (crew?.race !== 'LANIUS') continue;
      const pos = world.getComponent<PositionComponent>(entity, 'Position');
      if (pos === undefined) continue;

      for (const rb of roomBounds) {
        if (pos.x >= rb.left && pos.x < rb.right && pos.y >= rb.top && pos.y < rb.bottom) {
          const key   = `${shipEntity}:${rb.roomId}`;
          const oxygen = oxygenMap.get(key);
          if (oxygen !== undefined) {
            oxygen.level = Math.max(0, oxygen.level - LANIUS_DRAIN_RATE * dt);
          }
          break;
        }
      }
    }
  }
}
