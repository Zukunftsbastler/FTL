import { AssetLoader } from '../../utils/AssetLoader';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponTemplate } from '../data/WeaponTemplate';
import type { SystemType } from '../data/SystemType';
import type { StoreInventory, StoreItem } from '../data/StoreInventory';

interface SystemOffer { type: SystemType; label: string; price: number; minSector: number }

const SYSTEM_OFFERS: SystemOffer[] = [
  { type: 'CLOAKING',      label: 'Cloaking Drive',  price: 150, minSector: 1 },
  { type: 'TELEPORTER',    label: 'Teleporter',       price: 150, minSector: 1 },
  { type: 'DRONE_CONTROL', label: 'Drone Control',    price: 120, minSector: 2 },
  { type: 'MEDBAY',        label: 'Medbay',           price:  80, minSector: 1 },
  { type: 'SHIELDS',       label: 'Shield Booster',   price: 100, minSector: 2 },
];

/**
 * Generates a persistent store inventory once per store encounter.
 * The result is saved in GameStateData.currentStore and read each frame by drawStoreScreen.
 */
export class StoreGenerator {
  static generateStore(world: IWorld, sectorLevel: number): StoreInventory {
    const items: StoreItem[] = [];
    let counter = 0;
    const nextId = (): string => `si-${counter++}`;

    // ── Always: basic resources ─────────────────────────────────────────────
    items.push({ id: nextId(), label: 'Fuel  +1',          price:  3, sold: false, category: 'RESOURCE', resourceType: 'fuel',       resourceAmount: 1 });
    items.push({ id: nextId(), label: 'Fuel  +3',          price:  8, sold: false, category: 'RESOURCE', resourceType: 'fuel',       resourceAmount: 3 });
    items.push({ id: nextId(), label: 'Missiles  +3',      price:  6, sold: false, category: 'RESOURCE', resourceType: 'missiles',   resourceAmount: 3 });
    items.push({ id: nextId(), label: 'Hull Repair  +2',   price:  4, sold: false, category: 'RESOURCE', resourceType: 'hull',       resourceAmount: 2 });
    items.push({ id: nextId(), label: 'Drone Parts  +2',   price:  8, sold: false, category: 'RESOURCE', resourceType: 'droneParts', resourceAmount: 2 });

    // ── Weapons (2–3 random, tier-scaled) ───────────────────────────────────
    const allWeapons = AssetLoader.getJSON<WeaponTemplate[]>('weapons') ?? [];
    const maxTier    = sectorLevel <= 2 ? 1 : sectorLevel <= 4 ? 2 : 3;
    const pool       = allWeapons.filter((w) => w.powerCost <= maxTier + 1);
    const shuffled   = [...pool].sort(() => Math.random() - 0.5);
    const wCount     = 2 + Math.floor(Math.random() * 2); // 2 or 3

    for (const w of shuffled.slice(0, wCount)) {
      const base  = w.powerCost * 40 + 25;
      const price = Math.round(base * (1 + (sectorLevel - 1) * 0.08));
      items.push({ id: nextId(), label: w.name, price, sold: false, category: 'WEAPON', weaponId: w.id });
    }

    // ── Systems (filtered: skip what the player already owns) ───────────────
    if (Math.random() < 0.65) {
      const ownedTypes = StoreGenerator.getPlayerSystemTypes(world);
      const available  = SYSTEM_OFFERS.filter(
        (o) => !ownedTypes.has(o.type) && sectorLevel >= o.minSector,
      );
      const shuffledSys = [...available].sort(() => Math.random() - 0.5);
      const sCount      = 1 + Math.floor(Math.random() * 2); // 1 or 2

      for (const offer of shuffledSys.slice(0, sCount)) {
        items.push({ id: nextId(), label: offer.label, price: offer.price, sold: false, category: 'SYSTEM', systemType: offer.type });
      }
    }

    return { items };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private static getPlayerSystemTypes(world: IWorld): Set<string> {
    const owned = new Set<string>();
    // Find player ship entity.
    let playerShipEntity: number | null = null;
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'PLAYER') { playerShipEntity = entity; break; }
    }
    if (playerShipEntity === null) return owned;

    for (const entity of world.query(['System', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner?.shipEntity !== playerShipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys !== undefined) owned.add(sys.type);
    }
    return owned;
  }
}
