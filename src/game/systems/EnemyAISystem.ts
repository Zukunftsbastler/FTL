import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { WeaponComponent } from '../components/WeaponComponent';

/**
 * Basic enemy AI: once an enemy weapon is fully charged it picks a random room
 * on the player ship as its target.  CombatSystem handles the actual firing.
 *
 * A new target is assigned each time the weapon reaches full charge, so the
 * enemy fires at a different room every shot.
 */
export class EnemyAISystem {
  update(world: IWorld): void {
    const enemyShipEntity = this.findShipEntity(world, 'ENEMY');
    if (enemyShipEntity === null) return;

    const playerShipEntity = this.findShipEntity(world, 'PLAYER');
    if (playerShipEntity === null) return;

    // Collect all room entities that belong to the player ship.
    const playerRooms = this.getShipRooms(world, playerShipEntity);
    if (playerRooms.length === 0) return;

    // For each fully-charged enemy weapon without a target, assign one.
    const entities = world.query(['Weapon', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== enemyShipEntity) continue;

      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon === undefined || !weapon.isPowered) continue;
      if (weapon.charge < weapon.maxCharge) continue;
      if (weapon.targetRoomEntity !== undefined) continue;

      weapon.targetRoomEntity = playerRooms[Math.floor(Math.random() * playerRooms.length)];
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private findShipEntity(world: IWorld, faction: 'PLAYER' | 'ENEMY'): number | null {
    const entities = world.query(['Ship', 'Faction']);
    for (const entity of entities) {
      const factionComp = world.getComponent<FactionComponent>(entity, 'Faction');
      if (factionComp?.id === faction) return entity;
    }
    return null;
  }

  /** Returns entity IDs of all rooms owned by the given ship. */
  private getShipRooms(world: IWorld, shipEntity: number): number[] {
    const result: number[] = [];
    const entities = world.query(['Room', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity === shipEntity) result.push(entity);
    }
    return result;
  }
}
