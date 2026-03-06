import { AssetLoader } from '../../utils/AssetLoader';
import { UIRenderer } from '../../engine/ui/UIRenderer';
import { GameStateData } from '../../engine/GameState';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { CloakComponent } from '../components/CloakComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';
import type { WeaponTemplate } from '../data/WeaponTemplate';
import type { SystemType } from '../data/SystemType';

// ── Game rules ────────────────────────────────────────────────────────────────
/** Maximum system capacity reachable through upgrades. */
const MAX_SYSTEM_LEVEL = 8;
/** Maximum active (equipped) weapons at once. */
const MAX_WEAPONS = 4;
/** Flat scrap cost to upgrade the reactor by +1 power. */
const REACTOR_UPGRADE_COST = 30;

/** Cost to upgrade a system from its current level. Formula: currentLevel × 15. */
function systemUpgradeCost(currentLevel: number): number {
  return currentLevel * 15;
}

// ── Shared style constants ────────────────────────────────────────────────────
const BG_COLOR       = '#020810';
const PANEL_BORDER   = '#334466';
const TITLE_F        = '20px monospace';
const HEADER_F       = '13px monospace';
const ROW_F          = '12px monospace';
const TITLE_COLOR    = '#88ddff';
const TEXT_COLOR     = '#aabbcc';
const VAL_COLOR      = '#eef';
const DIM_COLOR      = '#445566';

const BTN_H          = 30;

// Upgrade button — can afford.
const BTN_CAN_BG     = '#0a1a0a';
const BTN_CAN_BORDER = '#44cc44';
const BTN_CAN_TEXT   = '#44ff44';
// Upgrade button — cannot afford.
const BTN_NO_BG      = '#141414';
const BTN_NO_BORDER  = '#2a2a2a';
const BTN_NO_TEXT    = '#444444';
// Equip / Unequip button.
const BTN_EQ_BG      = '#0a0a1e';
const BTN_EQ_BORDER  = '#4455cc';
const BTN_EQ_TEXT    = '#8899ff';
// Back / Leave button.
const BTN_BACK_BG     = '#1a0a0a';
const BTN_BACK_BORDER = '#aa3333';
const BTN_BACK_TEXT   = '#ff5555';
// Buy button (store).
const BTN_BUY_BG     = '#0a100a';
const BTN_BUY_BORDER = '#44aa44';
const BTN_BUY_TEXT   = '#66cc66';

// ── Internal helper ───────────────────────────────────────────────────────────
interface Hitbox { x: number; y: number; w: number; h: number; action: () => void }

function btn(
  r: IRenderer,
  label: string,
  x: number, y: number, w: number, h: number,
  bg: string, border: string, text: string,
): void {
  r.drawRect(x, y, w, h, bg, true);
  r.drawRect(x, y, w, h, border, false);
  r.drawText(label, x + w / 2, y + h / 2 + 5, '12px monospace', text, 'center');
}

function hit(hitboxes: Hitbox[], x: number, y: number, w: number, h: number, action: () => void): void {
  hitboxes.push({ x, y, w, h, action });
}

// ── UpgradeSystem ─────────────────────────────────────────────────────────────

/**
 * Draws and handles user interaction for the UPGRADE and STORE screens.
 *
 * • `drawUpgradeScreen()` — called each frame while in the UPGRADE state.
 * • `drawStoreScreen()`   — called each frame while in the STORE state.
 *
 * Both methods call the provided callback when the "Back"/"Leave" button is clicked.
 */
export class UpgradeSystem {

  // ── UPGRADE screen ──────────────────────────────────────────────────────────

  drawUpgradeScreen(
    world: IWorld,
    renderer: IRenderer,
    input: IInput,
    onBack: () => void,
  ): void {
    const { width, height } = renderer.getCanvasSize();
    renderer.clear(BG_COLOR);

    // Sci-fi background panel for the full upgrade screen.
    UIRenderer.drawSciFiPanel(renderer.getContext(), 30, 30, width - 60, height - 60, {
      chamfer:     20,
      borderColor: PANEL_BORDER,
      alpha:       0.95,
    });

    const hitboxes: Hitbox[] = [];

    // Locate the player ship.
    const playerData = this.findPlayerShip(world);
    if (playerData === null) { onBack(); return; }
    const { shipEntity, ship, reactor } = playerData;

    // ── Header ──────────────────────────────────────────────────────────────
    renderer.drawText('UPGRADE SHIP', width / 2, 44, TITLE_F, TITLE_COLOR, 'center');
    renderer.drawText(
      `Scrap: ${ship.scrap}`,
      width / 2, 68, HEADER_F, '#ddbb44', 'center',
    );
    renderer.drawLine(40, 78, width - 40, 78, PANEL_BORDER, 1);

    // ── Layout split ────────────────────────────────────────────────────────
    const MID_X   = Math.round(width / 2);
    const LEFT_X  = 60;
    const RIGHT_X = MID_X + 30;
    const RIGHT_W = width - RIGHT_X - 60;
    let   ly      = 106;  // left column y cursor
    const ROW_H   = 48;

    // ── Left: Systems ────────────────────────────────────────────────────────
    renderer.drawText('SYSTEMS', LEFT_X, ly - 8, HEADER_F, TITLE_COLOR, 'left');

    const systems = this.collectPlayerSystems(world, shipEntity);
    for (const { entity, system } of systems) {
      const canUpgrade = system.maxCapacity < MAX_SYSTEM_LEVEL;
      const cost       = systemUpgradeCost(system.maxCapacity);
      const canAfford  = ship.scrap >= cost;

      renderer.drawText(
        `${system.type.padEnd(10)}  Lv ${system.maxCapacity}`,
        LEFT_X, ly + 10, ROW_F, TEXT_COLOR, 'left',
      );

      const bx  = LEFT_X + 200;
      const by  = ly - 2;
      const bw  = 170;
      if (canUpgrade) {
        const active = canAfford;
        btn(renderer,
          `+1 Cap  (${cost} Scrap)`,
          bx, by, bw, BTN_H,
          active ? BTN_CAN_BG : BTN_NO_BG,
          active ? BTN_CAN_BORDER : BTN_NO_BORDER,
          active ? BTN_CAN_TEXT : BTN_NO_TEXT,
        );
        if (active) {
          const capturedSystem = system;
          const capturedEntity = entity;
          void capturedEntity;
          hit(hitboxes, bx, by, bw, BTN_H, () => {
            ship.scrap -= cost;
            capturedSystem.level += 1;
            capturedSystem.maxCapacity += 1;
          });
        }
      } else {
        renderer.drawText('MAX', bx + bw / 2, by + BTN_H / 2 + 5, '11px monospace', DIM_COLOR, 'center');
      }

      ly += ROW_H;
    }

    // Reactor row.
    const canAffordReactor = ship.scrap >= REACTOR_UPGRADE_COST;
    renderer.drawText(
      `REACTOR    P ${reactor.totalPower}`,
      LEFT_X, ly + 10, ROW_F, TEXT_COLOR, 'left',
    );
    {
      const bx = LEFT_X + 200;
      const by = ly - 2;
      const bw = 170;
      btn(renderer,
        `+1 Power  (${REACTOR_UPGRADE_COST} Scrap)`,
        bx, by, bw, BTN_H,
        canAffordReactor ? BTN_CAN_BG : BTN_NO_BG,
        canAffordReactor ? BTN_CAN_BORDER : BTN_NO_BORDER,
        canAffordReactor ? BTN_CAN_TEXT : BTN_NO_TEXT,
      );
      if (canAffordReactor) {
        hit(hitboxes, bx, by, bw, BTN_H, () => {
          ship.scrap     -= REACTOR_UPGRADE_COST;
          reactor.totalPower   += 1;
          reactor.currentPower += 1;
        });
      }
    }

    // ── Right: Weapons ────────────────────────────────────────────────────────
    let ry = 106;
    renderer.drawText('WEAPONS', RIGHT_X, ry - 8, HEADER_F, TITLE_COLOR, 'left');

    const equippedWeapons = this.collectPlayerWeapons(world, shipEntity);
    const allWeapons      = AssetLoader.getJSON<WeaponTemplate[]>('weapons') ?? [];
    const SLOT_W          = RIGHT_W;
    const SLOT_H          = 38;

    // Active weapon slots.
    for (let i = 0; i < MAX_WEAPONS; i++) {
      const slot = equippedWeapons[i];
      const sx   = RIGHT_X;
      const sy   = ry;

      if (slot !== undefined) {
        const [wEntity, wComp] = slot;
        const tpl = allWeapons.find((t) => t.id === wComp.templateId);
        const name = tpl?.name ?? wComp.templateId;

        renderer.drawRect(sx, sy, SLOT_W - 90, SLOT_H, '#0d1520', true);
        renderer.drawRect(sx, sy, SLOT_W - 90, SLOT_H, '#334455', false);
        renderer.drawText(name, sx + 8, sy + SLOT_H / 2 + 5, ROW_F, VAL_COLOR, 'left');

        const ubx = sx + SLOT_W - 84;
        const uby = sy + 3;
        const ubw = 80;
        const ubh = SLOT_H - 6;
        btn(renderer, 'Unequip', ubx, uby, ubw, ubh, BTN_EQ_BG, BTN_EQ_BORDER, BTN_EQ_TEXT);
        const capturedEntity = wEntity;
        const capturedId     = wComp.templateId;
        hit(hitboxes, ubx, uby, ubw, ubh, () => {
          world.destroyEntity(capturedEntity);
          ship.cargoWeapons.push(capturedId);
        });
      } else {
        // Empty slot.
        renderer.drawRect(sx, sy, SLOT_W - 90, SLOT_H, '#080c14', true);
        renderer.drawRect(sx, sy, SLOT_W - 90, SLOT_H, '#1a2233', false);
        renderer.drawText('─── empty ───', sx + (SLOT_W - 90) / 2, sy + SLOT_H / 2 + 5, ROW_F, '#1e2e40', 'center');
      }

      ry += SLOT_H + 6;
    }

    // Cargo weapons.
    ry += 12;
    renderer.drawLine(RIGHT_X, ry, RIGHT_X + RIGHT_W, ry, PANEL_BORDER, 1);
    ry += 14;
    renderer.drawText('CARGO', RIGHT_X, ry, HEADER_F, TITLE_COLOR, 'left');
    ry += 18;

    if (ship.cargoWeapons.length === 0) {
      renderer.drawText('(empty)', RIGHT_X + 8, ry + 14, ROW_F, DIM_COLOR, 'left');
    } else {
      for (let ci = 0; ci < ship.cargoWeapons.length; ci++) {
        const weaponId  = ship.cargoWeapons[ci];
        const tpl       = allWeapons.find((t) => t.id === weaponId);
        const name      = tpl?.name ?? weaponId;
        const hasSlot   = equippedWeapons.length < MAX_WEAPONS;

        const sx = RIGHT_X;
        const sy = ry;

        renderer.drawRect(sx, sy, SLOT_W - 90, SLOT_H, '#0d1520', true);
        renderer.drawRect(sx, sy, SLOT_W - 90, SLOT_H, '#1a2233', false);
        renderer.drawText(name, sx + 8, sy + SLOT_H / 2 + 5, ROW_F, TEXT_COLOR, 'left');

        const ebx = sx + SLOT_W - 84;
        const eby = sy + 3;
        const ebw = 80;
        const ebh = SLOT_H - 6;
        btn(renderer, 'Equip',
          ebx, eby, ebw, ebh,
          hasSlot ? BTN_CAN_BG : BTN_NO_BG,
          hasSlot ? BTN_CAN_BORDER : BTN_NO_BORDER,
          hasSlot ? BTN_CAN_TEXT : BTN_NO_TEXT,
        );

        if (hasSlot) {
          const capturedId = weaponId;
          const capturedIdx = ci;
          void capturedIdx;
          hit(hitboxes, ebx, eby, ebw, ebh, () => {
            // Remove from cargo.
            const idx = ship.cargoWeapons.indexOf(capturedId);
            if (idx !== -1) ship.cargoWeapons.splice(idx, 1);
            // Spawn weapon entity owned by player ship.
            this.equipWeapon(world, capturedId, shipEntity, allWeapons);
          });
        }

        ry += SLOT_H + 6;
      }
    }

    // ── Back button ───────────────────────────────────────────────────────────
    const BACK_W = 200;
    const BACK_H = 40;
    const bx = (width - BACK_W) / 2;
    const by = height - BACK_H - 24;
    btn(renderer, 'Back to Star Map', bx, by, BACK_W, BACK_H, BTN_BACK_BG, BTN_BACK_BORDER, BTN_BACK_TEXT);
    hit(hitboxes, bx, by, BACK_W, BACK_H, onBack);

    // ── Panel border drawn over content ───────────────────────────────────────
    // Vertical divider.
    renderer.drawLine(MID_X, 82, MID_X, height - 70, PANEL_BORDER, 1);

    // ── Process clicks ────────────────────────────────────────────────────────
    if (input.isMouseJustPressed(0)) {
      const mouse = input.getMousePosition();
      for (const hb of hitboxes) {
        if (mouse.x >= hb.x && mouse.x <= hb.x + hb.w &&
            mouse.y >= hb.y && mouse.y <= hb.y + hb.h) {
          hb.action();
          break;
        }
      }
    }
  }

  // ── STORE screen ────────────────────────────────────────────────────────────

  drawStoreScreen(
    world: IWorld,
    renderer: IRenderer,
    input: IInput,
    onLeave: () => void,
    onUpgrade?: () => void,
  ): void {
    const { width, height } = renderer.getCanvasSize();
    renderer.clear(BG_COLOR);

    const hitboxes: Hitbox[] = [];

    const playerData = this.findPlayerShip(world);
    if (playerData === null) { onLeave(); return; }
    const { shipEntity, ship } = playerData;

    // ── Panel ─────────────────────────────────────────────────────────────────
    const PW = 560;
    const PH = 560;
    const PX = (width  - PW) / 2;
    const PY = (height - PH) / 2;

    UIRenderer.drawSciFiPanel(renderer.getContext(), PX, PY, PW, PH, {
      chamfer:     12,
      borderColor: PANEL_BORDER,
      alpha:       0.96,
    });

    // Title.
    renderer.drawText('STORE', width / 2, PY + 36, TITLE_F, TITLE_COLOR, 'center');
    renderer.drawLine(PX + 16, PY + 46, PX + PW - 16, PY + 46, PANEL_BORDER, 1);

    // Player resources.
    renderer.drawText(
      `Scrap: ${ship.scrap}   Fuel: ${ship.fuel}   Missiles: ${ship.missiles}   Hull: ${ship.currentHull}/${ship.maxHull}`,
      width / 2, PY + 66, '12px monospace', TEXT_COLOR, 'center',
    );
    renderer.drawLine(PX + 16, PY + 76, PX + PW - 16, PY + 76, PANEL_BORDER, 1);

    // ── Section 1: Consumables ─────────────────────────────────────────────────
    renderer.drawText('SUPPLIES', PX + 24, PY + 96, HEADER_F, TITLE_COLOR, 'left');

    interface StoreItem {
      label: string; detail: string; cost: number; canBuy: () => boolean; onBuy: () => void;
    }
    const items: StoreItem[] = [
      {
        label: 'Fuel  +1',
        detail: '3 Scrap',
        cost: 3,
        canBuy: () => ship.scrap >= 3,
        onBuy:  () => { ship.scrap -= 3; ship.fuel += 1; },
      },
      {
        label: 'Missiles  +3',
        detail: '6 Scrap',
        cost: 6,
        canBuy: () => ship.scrap >= 6,
        onBuy:  () => { ship.scrap -= 6; ship.missiles += 3; },
      },
      {
        label: 'Hull Repair  +1 HP',
        detail: '2 Scrap',
        cost: 2,
        canBuy: () => ship.scrap >= 2 && ship.currentHull < ship.maxHull,
        onBuy:  () => { ship.scrap -= 2; ship.currentHull = Math.min(ship.maxHull, ship.currentHull + 1); },
      },
    ];

    const ITEM_Y0 = PY + 112;
    const ITEM_H  = 46;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy   = ITEM_Y0 + i * ITEM_H;
      const can  = item.canBuy();

      renderer.drawText(item.label,  PX + 24, iy + 16, '13px monospace', VAL_COLOR, 'left');
      renderer.drawText(item.detail, PX + 24, iy + 32, ROW_F, TEXT_COLOR, 'left');

      const bx = PX + PW - 110;
      const by = iy + 6;
      const bw = 90;
      const bh = BTN_H;
      btn(renderer, 'Buy',
        bx, by, bw, bh,
        can ? BTN_BUY_BG : BTN_NO_BG,
        can ? BTN_BUY_BORDER : BTN_NO_BORDER,
        can ? BTN_BUY_TEXT : BTN_NO_TEXT,
      );
      if (can) {
        hit(hitboxes, bx, by, bw, bh, item.onBuy);
      }

      renderer.drawLine(PX + 16, iy + ITEM_H - 2, PX + PW - 16, iy + ITEM_H - 2, '#1a2233', 1);
    }

    // ── Section 2: Upgrade Ship ────────────────────────────────────────────────
    const SEC2_Y = ITEM_Y0 + items.length * ITEM_H + 8;
    renderer.drawText('UPGRADES', PX + 24, SEC2_Y, HEADER_F, TITLE_COLOR, 'left');

    if (onUpgrade !== undefined) {
      const ubx = PX + 24;
      const uby = SEC2_Y + 10;
      const ubw = PW - 48;
      const ubh = BTN_H + 4;
      btn(renderer, 'Open Upgrade Screen', ubx, uby, ubw, ubh,
        BTN_EQ_BG, BTN_EQ_BORDER, BTN_EQ_TEXT);
      hit(hitboxes, ubx, uby, ubw, ubh, onUpgrade);
    }

    // ── Section 3: Buy Subsystems ──────────────────────────────────────────────
    const SEC3_Y = SEC2_Y + BTN_H + 28;
    renderer.drawLine(PX + 16, SEC3_Y - 10, PX + PW - 16, SEC3_Y - 10, PANEL_BORDER, 1);
    renderer.drawText('SUBSYSTEMS', PX + 24, SEC3_Y, HEADER_F, TITLE_COLOR, 'left');

    // Determine which advanced systems the player already has.
    const ownedTypes = new Set<string>();
    for (const entity of world.query(['System', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys !== undefined) ownedTypes.add(sys.type);
    }

    // Find an empty room on the player's ship (no SystemComponent attached).
    const findEmptyRoom = (): number | undefined => {
      for (const entity of world.query(['Room', 'Owner'])) {
        const owner = world.getComponent<OwnerComponent>(entity, 'Owner');
        if (owner?.shipEntity !== shipEntity) continue;
        const sys = world.getComponent<SystemComponent>(entity, 'System');
        if (sys === undefined) return entity;
      }
      return undefined;
    };

    // Purchasable systems, tiered by sector.
    interface SysOffer { type: SystemType; label: string; minSector: number; price: number }
    const OFFERS: SysOffer[] = [
      { type: 'CLOAKING',      label: 'Cloaking Drive',  minSector: 1, price: 150 },
      { type: 'TELEPORTER',    label: 'Teleporter',       minSector: 1, price: 150 },
      { type: 'DRONE_CONTROL', label: 'Drone Control',    minSector: 2, price: 150 },
    ];

    const availableOffers = OFFERS.filter(
      (o) => !ownedTypes.has(o.type) && GameStateData.sectorNumber >= o.minSector,
    );

    let sysY = SEC3_Y + 14;
    const SYS_H = 44;

    if (availableOffers.length === 0) {
      renderer.drawText(
        '(No systems available — all installed or sector too low)',
        PX + 24, sysY + 16, ROW_F, DIM_COLOR, 'left',
      );
    } else {
      for (const offer of availableOffers) {
        const canBuy  = ship.scrap >= offer.price;
        const noRoom  = findEmptyRoom() === undefined;
        const enabled = canBuy && !noRoom;

        renderer.drawText(offer.label,             PX + 24, sysY + 14, '13px monospace', VAL_COLOR, 'left');
        renderer.drawText(`${offer.price} Scrap`,  PX + 24, sysY + 30, ROW_F, TEXT_COLOR, 'left');
        if (noRoom) {
          renderer.drawText('(no empty room)', PX + 180, sysY + 30, ROW_F, '#664444', 'left');
        }

        const sbx = PX + PW - 110;
        const sby = sysY + 6;
        const sbw = 90;
        const sbh = BTN_H;
        btn(renderer, 'Buy',
          sbx, sby, sbw, sbh,
          enabled ? BTN_BUY_BG : BTN_NO_BG,
          enabled ? BTN_BUY_BORDER : BTN_NO_BORDER,
          enabled ? BTN_BUY_TEXT : BTN_NO_TEXT,
        );

        if (enabled) {
          const capturedOffer = offer;
          hit(hitboxes, sbx, sby, sbw, sbh, () => {
            const emptyRoom = findEmptyRoom();
            if (emptyRoom === undefined) return;
            ship.scrap -= capturedOffer.price;

            // Add the SystemComponent to the empty room entity.
            const newSys: SystemComponent = {
              _type:        'System',
              type:         capturedOffer.type,
              level:        1,
              maxCapacity:  1,
              currentPower: 0,
              roomId:       0, // roomId will be read from the RoomComponent
              damageAmount: 0,
              zoltanBonus:  0,
            };
            world.addComponent(emptyRoom, newSys);

            // CLOAKING additionally needs a CloakComponent on the ship root.
            if (capturedOffer.type === 'CLOAKING') {
              const cloakComp: CloakComponent = {
                _type:         'Cloak',
                isActive:      false,
                durationTimer: 0,
                cooldownTimer: 0,
                maxDuration:   5.0,
                maxCooldown:   10.0,
              };
              world.addComponent(shipEntity, cloakComp);
            }
          });
        }

        renderer.drawLine(PX + 16, sysY + SYS_H - 2, PX + PW - 16, sysY + SYS_H - 2, '#1a2233', 1);
        sysY += SYS_H;
      }
    }

    // ── Leave button ─────────────────────────────────────────────────────────
    const LEAVE_W = 180;
    const LEAVE_H = 40;
    const lbx = width / 2 - LEAVE_W / 2;
    const lby = PY + PH - LEAVE_H - 16;
    btn(renderer, 'Leave Store', lbx, lby, LEAVE_W, LEAVE_H, BTN_BACK_BG, BTN_BACK_BORDER, BTN_BACK_TEXT);
    hit(hitboxes, lbx, lby, LEAVE_W, LEAVE_H, onLeave);

    // ── Process clicks ────────────────────────────────────────────────────────
    if (input.isMouseJustPressed(0)) {
      const mouse = input.getMousePosition();
      for (const hb of hitboxes) {
        if (mouse.x >= hb.x && mouse.x <= hb.x + hb.w &&
            mouse.y >= hb.y && mouse.y <= hb.y + hb.h) {
          hb.action();
          break;
        }
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private findPlayerShip(
    world: IWorld,
  ): { shipEntity: number; ship: ShipComponent; reactor: ReactorComponent } | null {
    for (const entity of world.query(['Ship', 'Faction', 'Reactor'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship    = world.getComponent<ShipComponent>(entity, 'Ship');
      const reactor = world.getComponent<ReactorComponent>(entity, 'Reactor');
      if (ship !== undefined && reactor !== undefined) {
        return { shipEntity: entity, ship, reactor };
      }
    }
    return null;
  }

  private collectPlayerSystems(
    world: IWorld,
    shipEntity: number,
  ): Array<{ entity: number; system: SystemComponent }> {
    const result: Array<{ entity: number; system: SystemComponent }> = [];
    for (const entity of world.query(['System', 'Owner'])) {
      const owner  = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const system = world.getComponent<SystemComponent>(entity, 'System');
      if (system !== undefined) result.push({ entity, system });
    }
    return result;
  }

  private collectPlayerWeapons(
    world: IWorld,
    shipEntity: number,
  ): Array<[number, WeaponComponent]> {
    const result: Array<[number, WeaponComponent]> = [];
    for (const entity of world.query(['Weapon', 'Owner'])) {
      const owner  = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) result.push([entity, weapon]);
    }
    return result;
  }

  private equipWeapon(
    world: IWorld,
    weaponId: string,
    shipEntity: number,
    allWeapons: WeaponTemplate[],
  ): void {
    const tpl = allWeapons.find((w) => w.id === weaponId);
    if (tpl === undefined) return;

    const weaponEntity = world.createEntity();
    world.addComponent(weaponEntity, {
      _type: 'Weapon',
      templateId: tpl.id,
      charge: 0,
      maxCharge: tpl.cooldown,
      powerRequired: tpl.powerCost,
      isPowered: false,
      targetRoomEntity: undefined,
      chargeRateMultiplier: 1.0,
    } as WeaponComponent);
    const ownerComp: OwnerComponent = { _type: 'Owner', shipEntity };
    world.addComponent(weaponEntity, ownerComp);
  }
}
