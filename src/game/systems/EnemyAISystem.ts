import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PathfindingComponent } from '../components/PathfindingComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';
import type { GridCoord } from '../data/GridCoord';

/** Weight assigned to high-priority rooms (SHIELDS, WEAPONS, critical OXYGEN). */
const HIGH_PRIORITY_WEIGHT = 3;
/** Weight assigned to normal rooms. */
const NORMAL_PRIORITY_WEIGHT = 1;
/** O2 threshold below which the OXYGEN room is treated as high-priority. */
const O2_CRITICAL_THRESHOLD = 50;
/** HP fraction below which crew flee to the MEDBAY. */
const MEDBAY_FLEE_HP_FRACTION = 0.25;

/**
 * Deterministic FTL-style enemy AI.
 *
 * Each frame this system:
 *   1. Powers enemy weapons from the WEAPONS system pool (fixes "pacifist enemy" bug).
 *   2. Assigns weighted room targets to fully-charged weapons, preferring SHIELDS/WEAPONS.
 *   3. Spreads multi-shot weapon fire — never picks the same room twice in a row.
 *   4. Runs enemy crew AI: flee to MEDBAY if dying, man PILOTING/ENGINES, repair systems.
 */
export class EnemyAISystem {
  /** Tracks the last room entity targeted per weapon entity (for spread-fire rule). */
  private readonly lastTargetPerWeapon = new Map<number, number>();

  update(world: IWorld): void {
    const enemyShipEntity = this.findShipEntity(world, 'ENEMY');
    if (enemyShipEntity === null) return;

    const playerShipEntity = this.findShipEntity(world, 'PLAYER');
    if (playerShipEntity === null) return;

    // ── 1. Power enemy weapons ──────────────────────────────────────────────
    this.powerEnemyWeapons(world, enemyShipEntity);

    // ── 2 & 3. Weighted targeting + spread-fire ─────────────────────────────
    this.assignWeaponTargets(world, enemyShipEntity, playerShipEntity);

    // ── 4. Enemy crew AI ────────────────────────────────────────────────────
    this.runCrewAI(world, enemyShipEntity);
  }

  // ── Weapon powering ───────────────────────────────────────────────────────

  /**
   * Explicitly sets `weapon.isPowered` for each enemy weapon in entity-ID order,
   * consuming from the enemy WEAPONS system power budget.
   *
   * Without this, weapons are powered AFTER EnemyAISystem runs (in CombatSystem),
   * so targeting checks for `isPowered` would always see false on the current frame.
   */
  private powerEnemyWeapons(world: IWorld, enemyShipEntity: number): void {
    const pool = this.getWeaponSystemPower(world, enemyShipEntity);
    let budget = pool;

    const weapons = this.getShipWeapons(world, enemyShipEntity);
    for (const [, weapon] of weapons) {
      if (budget >= weapon.powerRequired) {
        weapon.isPowered = true;
        budget -= weapon.powerRequired;
      } else {
        weapon.isPowered = false;
      }
    }
  }

  // ── Weighted targeting ────────────────────────────────────────────────────

  private assignWeaponTargets(
    world: IWorld,
    enemyShipEntity: number,
    playerShipEntity: number,
  ): void {
    const playerRooms = this.getShipRooms(world, playerShipEntity);
    if (playerRooms.length === 0) return;

    // Build weighted list of player rooms.
    const weighted = this.buildWeightedRooms(world, playerRooms);

    const weapons = this.getShipWeapons(world, enemyShipEntity);
    for (const [weaponEntity, weapon] of weapons) {
      // Only assign a target to powered, fully-charged weapons with no current target.
      if (!weapon.isPowered) continue;
      if (weapon.charge < weapon.maxCharge) continue;
      if (weapon.targetRoomEntity !== undefined) continue;

      // Pick a weighted-random room, avoiding the last room this weapon targeted.
      const lastTarget = this.lastTargetPerWeapon.get(weaponEntity);
      const chosen = this.pickWeightedRoom(weighted, lastTarget);

      weapon.targetRoomEntity = chosen;
      this.lastTargetPerWeapon.set(weaponEntity, chosen);
    }

    // Purge stale entries for weapons that no longer exist.
    for (const weaponEntity of this.lastTargetPerWeapon.keys()) {
      if (world.getComponent<WeaponComponent>(weaponEntity, 'Weapon') === undefined) {
        this.lastTargetPerWeapon.delete(weaponEntity);
      }
    }
  }

  /**
   * Returns a weighted array for the player's rooms.
   * SHIELDS and WEAPONS rooms receive HIGH weight.
   * OXYGEN room gets HIGH weight if the player's average O2 is below the critical threshold.
   * All other rooms get NORMAL weight.
   */
  private buildWeightedRooms(
    world: IWorld,
    playerRooms: number[],
  ): Array<{ entity: number; weight: number }> {
    // Check whether the player's average oxygen is critical.
    let totalO2 = 0;
    let o2Count = 0;
    for (const roomEntity of playerRooms) {
      const o2 = world.getComponent<OxygenComponent>(roomEntity, 'Oxygen');
      if (o2 !== undefined) { totalO2 += o2.level; o2Count++; }
    }
    const avgO2 = o2Count > 0 ? totalO2 / o2Count : 100;
    const o2Critical = avgO2 < O2_CRITICAL_THRESHOLD;

    const result: Array<{ entity: number; weight: number }> = [];

    for (const roomEntity of playerRooms) {
      const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
      let weight = NORMAL_PRIORITY_WEIGHT;

      if (sys !== undefined) {
        const t = sys.type;
        if (t === 'SHIELDS' || t === 'WEAPONS') {
          weight = HIGH_PRIORITY_WEIGHT;
        } else if (t === 'OXYGEN' && o2Critical) {
          weight = HIGH_PRIORITY_WEIGHT;
        }
      }

      result.push({ entity: roomEntity, weight });
    }

    return result;
  }

  /**
   * Weighted random selection. If `excludeEntity` is provided (spread-fire rule)
   * and the candidate list has more than one distinct entity, the excluded room
   * is removed before the roll.
   */
  private pickWeightedRoom(
    weighted: Array<{ entity: number; weight: number }>,
    excludeEntity: number | undefined,
  ): number {
    // Filter out the last-targeted room when there are other options.
    let pool = weighted;
    if (excludeEntity !== undefined && weighted.length > 1) {
      const filtered = weighted.filter((e) => e.entity !== excludeEntity);
      if (filtered.length > 0) pool = filtered;
    }

    const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) return entry.entity;
    }
    return pool[pool.length - 1].entity;
  }

  // ── Crew AI ───────────────────────────────────────────────────────────────

  /**
   * Runs three-priority AI for each enemy crew member:
   *   P1 (Self-Preservation) — HP < 25% → walk to MEDBAY (if powered).
   *   P2 (Manning)           — walk to PILOTING if unmanned, then ENGINES if unmanned.
   *   P3 (Repair)            — idle crew walk to the most-damaged SHIELDS or WEAPONS room.
   *
   * Note: enemy ships currently have no starting crew (startingCrew: []).
   * This logic is future-proof for when crew are added to enemy templates.
   */
  private runCrewAI(world: IWorld, enemyShipEntity: number): void {
    const medbayRoom   = this.findSystemRoom(world, enemyShipEntity, 'MEDBAY');
    const pilotingRoom = this.findSystemRoom(world, enemyShipEntity, 'PILOTING');
    const enginesRoom  = this.findSystemRoom(world, enemyShipEntity, 'ENGINES');
    const repairTarget = this.findMostDamagedRoom(world, enemyShipEntity);

    // Determine which rooms are currently manned.
    const mannedRooms = this.getMannedRooms(world, enemyShipEntity);

    const crewEntities = world.query(['Crew', 'Pathfinding', 'Position', 'Owner']);
    for (const crewEntity of crewEntities) {
      const ownerComp = world.getComponent<OwnerComponent>(crewEntity, 'Owner');
      if (ownerComp?.shipEntity !== enemyShipEntity) continue;

      const crew        = world.getComponent<CrewComponent>(crewEntity, 'Crew');
      const pathfinding = world.getComponent<PathfindingComponent>(crewEntity, 'Pathfinding');
      const pos         = world.getComponent<PositionComponent>(crewEntity, 'Position');
      if (crew === undefined || pathfinding === undefined || pos === undefined) continue;

      // Skip crew that are already moving (have a non-empty path).
      if (pathfinding.path.length > 0) continue;

      // ── Priority 1: Self-Preservation ─────────────────────────────────────
      const hpFraction = crew.health / crew.maxHealth;
      if (hpFraction < MEDBAY_FLEE_HP_FRACTION && medbayRoom !== null) {
        if (this.isSystemPowered(world, enemyShipEntity, 'MEDBAY')) {
          this.sendCrewTo(world, pathfinding, pos, medbayRoom);
          continue;
        }
      }

      // ── Priority 2: Manning ───────────────────────────────────────────────
      if (pilotingRoom !== null && !mannedRooms.has(pilotingRoom)) {
        this.sendCrewTo(world, pathfinding, pos, pilotingRoom);
        mannedRooms.add(pilotingRoom); // claim this slot so other crew don't also rush there
        continue;
      }
      if (enginesRoom !== null && !mannedRooms.has(enginesRoom)) {
        this.sendCrewTo(world, pathfinding, pos, enginesRoom);
        mannedRooms.add(enginesRoom);
        continue;
      }

      // ── Priority 3: Repair ────────────────────────────────────────────────
      if (repairTarget !== null) {
        this.sendCrewTo(world, pathfinding, pos, repairTarget);
      }
    }
  }

  /**
   * Sets `pathfinding.path` to a single waypoint (enemy-ship grid coords) pointing
   * at the centre tile of `targetRoomEntity`. MovementSystem will advance the crew
   * toward that waypoint each frame.
   *
   * Limitation: MovementSystem.advanceCrewAlongPaths() uses the player ship's pixel
   * origin to convert grid coords → pixels. For enemy crew this is incorrect. A
   * dedicated EnemyMovementSystem would be needed for accurate movement.  This is
   * acceptable for now since all current enemy ship templates have empty startingCrew.
   */
  private sendCrewTo(
    world: IWorld,
    pathfinding: PathfindingComponent,
    crewPos: PositionComponent,
    targetRoomEntity: number,
  ): void {
    const tRoom = world.getComponent<RoomComponent>(targetRoomEntity, 'Room');
    const tPos  = world.getComponent<PositionComponent>(targetRoomEntity, 'Position');
    if (tRoom === undefined || tPos === undefined) return;

    // Derive the enemy ship's pixel origin from the target room's stored position.
    const shipOriginX = tPos.x - tRoom.x * TILE_SIZE;
    const shipOriginY = tPos.y - tRoom.y * TILE_SIZE;

    // Target grid tile: centre of the target room.
    const targetGridX = tRoom.x + Math.floor(tRoom.width  / 2);
    const targetGridY = tRoom.y + Math.floor(tRoom.height / 2);

    // Current grid tile of this crew member.
    const crewGridX = Math.floor((crewPos.x - shipOriginX) / TILE_SIZE);
    const crewGridY = Math.floor((crewPos.y - shipOriginY) / TILE_SIZE);

    // If already at the target tile, nothing to do.
    if (crewGridX === targetGridX && crewGridY === targetGridY) return;

    const waypoint: GridCoord = { x: targetGridX, y: targetGridY };
    pathfinding.targetX = targetGridX;
    pathfinding.targetY = targetGridY;
    pathfinding.path    = [waypoint];
  }

  // ── Room queries ──────────────────────────────────────────────────────────

  private findSystemRoom(
    world: IWorld,
    shipEntity: number,
    systemType: string,
  ): number | null {
    for (const roomEntity of world.query(['Room', 'System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
      if (sys?.type === systemType) return roomEntity;
    }
    return null;
  }

  private isSystemPowered(world: IWorld, shipEntity: number, systemType: string): boolean {
    for (const entity of world.query(['System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys?.type === systemType) return sys.currentPower > 0;
    }
    return false;
  }

  /**
   * Returns the room entity with the highest `damageAmount` among SHIELDS and WEAPONS
   * rooms on the given ship. Returns null if all systems are pristine.
   */
  private findMostDamagedRoom(world: IWorld, shipEntity: number): number | null {
    let worstEntity: number | null = null;
    let worstDamage = 0;

    for (const roomEntity of world.query(['Room', 'System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
      if (sys === undefined) continue;
      if (sys.type !== 'SHIELDS' && sys.type !== 'WEAPONS') continue;
      if (sys.damageAmount > worstDamage) {
        worstDamage = sys.damageAmount;
        worstEntity = roomEntity;
      }
    }

    return worstEntity;
  }

  /**
   * Returns a Set of room entities currently occupied by at least one crew member
   * of the given ship.
   */
  private getMannedRooms(world: IWorld, shipEntity: number): Set<number> {
    const manned = new Set<number>();

    for (const crewEntity of world.query(['Crew', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(crewEntity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;

      const crewPos = world.getComponent<PositionComponent>(crewEntity, 'Position');
      if (crewPos === undefined) continue;

      for (const roomEntity of world.query(['Room', 'Position', 'Owner'])) {
        const rOwner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
        if (rOwner?.shipEntity !== shipEntity) continue;

        const rPos  = world.getComponent<PositionComponent>(roomEntity, 'Position');
        const rRoom = world.getComponent<RoomComponent>(roomEntity, 'Room');
        if (rPos === undefined || rRoom === undefined) continue;

        if (
          crewPos.x >= rPos.x &&
          crewPos.x <  rPos.x + rRoom.width  * TILE_SIZE &&
          crewPos.y >= rPos.y &&
          crewPos.y <  rPos.y + rRoom.height * TILE_SIZE
        ) {
          manned.add(roomEntity);
          break;
        }
      }
    }

    return manned;
  }

  // ── Ship / weapon helpers ─────────────────────────────────────────────────

  private findShipEntity(world: IWorld, faction: 'PLAYER' | 'ENEMY'): number | null {
    for (const entity of world.query(['Ship', 'Faction'])) {
      const factionComp = world.getComponent<FactionComponent>(entity, 'Faction');
      if (factionComp?.id === faction) return entity;
    }
    return null;
  }

  private getShipRooms(world: IWorld, shipEntity: number): number[] {
    const result: number[] = [];
    for (const entity of world.query(['Room', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity === shipEntity) result.push(entity);
    }
    return result;
  }

  private getShipWeapons(world: IWorld, shipEntity: number): Array<[number, WeaponComponent]> {
    const result: Array<[number, WeaponComponent]> = [];
    for (const entity of world.query(['Weapon', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) result.push([entity, weapon]);
    }
    result.sort(([a], [b]) => a - b);
    return result;
  }

  /** Returns effective WEAPONS system power (currentPower + zoltanBonus) for a ship. */
  private getWeaponSystemPower(world: IWorld, shipEntity: number): number {
    for (const entity of world.query(['System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys?.type === 'WEAPONS') return sys.currentPower + sys.zoltanBonus;
    }
    return 0;
  }
}
