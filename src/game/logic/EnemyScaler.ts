import { GameStateData } from '../../engine/GameState';
import type { ShipTemplate } from '../data/ShipTemplate';
import type { SystemType } from '../data/SystemType';
import type { WeaponTemplate } from '../data/WeaponTemplate';

/**
 * Scales an enemy ship template based on the current sector number.
 *
 * Scaling rules:
 *  - Reactor power grows by 2 per sector after sector 1.
 *  - SHIELDS and ENGINES levels increase by 1 every 2 sectors.
 *  - WEAPONS level increases by 1 every 2 sectors.
 *  - Weapons are drawn from a tiered pool (by powerCost) to prevent
 *    powerful weapons appearing in early sectors.
 *  - Sector 2+: 25 % chance to add a DRONE_CONTROL room.
 *  - Sector 3+: 20 % chance to add a CLOAKING room.
 */
export class EnemyScaler {
  static scaleEnemy(
    template: ShipTemplate,
    sector: number,
    availableWeapons: WeaponTemplate[],
  ): ShipTemplate {
    // Deep copy — never mutate the cached JSON template.
    const t = JSON.parse(JSON.stringify(template)) as ShipTemplate;

    // Effective sector level — shifted by difficulty so enemies feel weaker/stronger.
    const diffOffset    = GameStateData.difficulty === 'EASY' ? -1
                        : GameStateData.difficulty === 'HARD' ?  1
                        : 0;
    const effectiveSector = Math.max(1, sector + diffOffset);

    // ── Hull scaling: +1 HP per sector above sector 1 (authentic FTL pacing) ─
    t.maxHull = t.maxHull + (effectiveSector - 1);

    // ── Reactor ────────────────────────────────────────────────────────────
    t.startingReactorPower += (effectiveSector - 1) * 2;

    // ── System level scaling (every 2 sectors) ─────────────────────────────
    const sysBonus = Math.floor((effectiveSector - 1) / 2);
    for (const sys of t.systems) {
      if (sys.type === 'SHIELDS' || sys.type === 'ENGINES') {
        sys.level += sysBonus;
      }
      if (sys.type === 'WEAPONS') {
        sys.level += sysBonus;
      }
    }

    // ── Tiered weapon assignment ────────────────────────────────────────────
    const tier1 = availableWeapons.filter((w) => w.powerCost === 1);
    const tier2 = availableWeapons.filter((w) => w.powerCost === 2);
    const tier3 = availableWeapons.filter((w) => w.powerCost >= 3);

    const pool: WeaponTemplate[] =
      effectiveSector >= 5 ? [...tier1, ...tier2, ...tier3] :
      effectiveSector >= 3 ? [...tier1, ...tier2] :
                              tier1;

    if (pool.length > 0) {
      const weaponSys = t.systems.find((s) => s.type === 'WEAPONS');
      const budget    = weaponSys?.level ?? 2;
      const chosen: string[] = [];
      let usedPower = 0;

      while (usedPower < budget) {
        const affordable = pool.filter((w) => usedPower + w.powerCost <= budget);
        if (affordable.length === 0) break;
        const pick = affordable[Math.floor(Math.random() * affordable.length)];
        chosen.push(pick.id);
        usedPower += pick.powerCost;
      }

      if (chosen.length > 0) {
        t.startingWeapons = chosen;
      }
    }

    // ── Advanced system injection ───────────────────────────────────────────
    if (effectiveSector >= 2 && Math.random() < 0.25) {
      EnemyScaler.addSystemRoom(t, 'DRONE_CONTROL', 2);
    }
    if (effectiveSector >= 3 && Math.random() < 0.20) {
      EnemyScaler.addSystemRoom(t, 'CLOAKING', 1);
    }

    return t;
  }

  /**
   * Appends a new 1×2 room to the right of the current layout and registers
   * the given system. No-ops if the system is already present.
   */
  private static addSystemRoom(t: ShipTemplate, systemType: SystemType, level: number): void {
    if (t.systems.some((s) => s.type === systemType)) return;

    const rightmostX = t.rooms.reduce((max, r) => Math.max(max, r.x + r.width), 0);
    const newRoomId  = t.rooms.length;

    t.rooms.push({
      roomId: newRoomId,
      x:      rightmostX,
      y:      0,
      width:  1,
      height: 2,
      system: systemType,
    });
    t.systems.push({ type: systemType, level });
  }
}
