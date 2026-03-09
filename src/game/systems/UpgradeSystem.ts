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
import type { StoreItem } from '../data/StoreInventory';

// (Upgrade cost constants are store-only; managed inside drawStoreScreen.)

// ── Shared style constants ────────────────────────────────────────────────────
const TITLE_F        = '20px monospace';
const HEADER_F       = '13px monospace';
const ROW_F          = '12px monospace';
const DIM_COLOR      = '#445566';

// Upgrade button — cannot afford.
const BTN_NO_BG      = '#141414';
const BTN_NO_BORDER  = '#2a2a2a';
const BTN_NO_TEXT    = '#444444';
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

  /**
   * Read-only ship overview — accessed from the SHIP button on the Star Map.
   * Shows installed systems and equipped weapons; all editing is store-only.
   */
  drawUpgradeScreen(
    world: IWorld,
    renderer: IRenderer,
    input: IInput,
    onBack: () => void,
  ): void {
    // Background (star map + dark overlay) is rendered by main.ts before this call.
    const { width, height } = renderer.getCanvasSize();
    const hitboxes: Hitbox[] = [];
    const ctx = renderer.getContext();

    const playerData = this.findPlayerShip(world);
    if (playerData === null) { onBack(); return; }
    const { shipEntity, ship, reactor } = playerData;

    // ── Shared pill helper ────────────────────────────────────────────────────
    const PILL_H   = 24;
    const PILL_PAD = 9;
    const PILL_GAP = 5;
    const FONT     = '12px monospace';

    const pill = (label: string, x: number, y: number, maxW = 9999): void => {
      ctx.font = FONT;
      const pw = Math.min(ctx.measureText(label).width + PILL_PAD * 2, maxW);
      UIRenderer.drawPill(ctx, x, y, pw, PILL_H, '#00ccdd');
      ctx.font = FONT; ctx.fillStyle = '#001820'; ctx.textAlign = 'left';
      ctx.fillText(label, x + PILL_PAD, y + PILL_H / 2 + 5);
    };

    // ── Header (floating text over the map) ───────────────────────────────────
    renderer.drawText('SHIP OVERVIEW', width / 2, 28, TITLE_F, '#ffffff', 'center');
    renderer.drawText('Read-only  ·  upgrades available in stores',
      width / 2, 48, ROW_F, '#888888', 'center');

    // ── Three floating panels ─────────────────────────────────────────────────
    const PY = 60;
    const PH = height - PY - 60;
    const PAD = 14;

    const LP_X = 10;  const LP_W = 260;
    const CP_X = LP_X + LP_W + 8;  const CP_W = 290;
    const RP_X = CP_X + CP_W + 8;  const RP_W = Math.max(180, width - RP_X - 10);

    // ── Left: Systems + Reactor ───────────────────────────────────────────────
    UIRenderer.drawSciFiPanel(ctx, LP_X, PY, LP_W, PH,
      { lightBg: true, borderColor: '#ffffff', alpha: 0.93 });
    renderer.drawText('SYSTEMS', LP_X + LP_W / 2, PY + 18, HEADER_F, '#001830', 'center');
    renderer.drawLine(LP_X + 8, PY + 25, LP_X + LP_W - 8, PY + 25, '#bbccdd', 1);

    let ly = PY + 32;
    const systems = this.collectPlayerSystems(world, shipEntity);
    for (const { system } of systems) {
      pill(`${system.type.padEnd(12)} Lv ${system.maxCapacity}`, LP_X + PAD, ly, LP_W - PAD * 2);
      ly += PILL_H + PILL_GAP;
    }
    ly += 4;
    pill(`REACTOR  P${reactor.totalPower}`, LP_X + PAD, ly, LP_W - PAD * 2);

    // ── Center: Weapons ───────────────────────────────────────────────────────
    UIRenderer.drawSciFiPanel(ctx, CP_X, PY, CP_W, PH,
      { lightBg: true, borderColor: '#ffffff', alpha: 0.93 });
    renderer.drawText('WEAPONS', CP_X + CP_W / 2, PY + 18, HEADER_F, '#001830', 'center');
    renderer.drawLine(CP_X + 8, PY + 25, CP_X + CP_W - 8, PY + 25, '#bbccdd', 1);

    const allWeapons = AssetLoader.getJSON<WeaponTemplate[]>('weapons') ?? [];
    const equipped   = this.collectPlayerWeapons(world, shipEntity);
    let wy = PY + 32;
    renderer.drawText('EQUIPPED', CP_X + PAD, wy + 10, ROW_F, '#556677', 'left'); wy += 22;
    if (equipped.length === 0) {
      renderer.drawText('(none)', CP_X + PAD, wy + 12, ROW_F, DIM_COLOR, 'left'); wy += 22;
    } else {
      for (const [, wc] of equipped) {
        const name = allWeapons.find((t) => t.id === wc.templateId)?.name ?? wc.templateId;
        pill(name, CP_X + PAD, wy, CP_W - PAD * 2);
        wy += PILL_H + PILL_GAP;
      }
    }
    wy += 6;
    renderer.drawText('CARGO', CP_X + PAD, wy + 10, ROW_F, '#556677', 'left'); wy += 22;
    if (ship.cargoWeapons.length === 0) {
      renderer.drawText('(empty)', CP_X + PAD, wy + 12, ROW_F, DIM_COLOR, 'left');
    } else {
      for (const wId of ship.cargoWeapons) {
        const name = allWeapons.find((t) => t.id === wId)?.name ?? wId;
        pill(name, CP_X + PAD, wy, CP_W - PAD * 2);
        wy += PILL_H + PILL_GAP;
      }
    }

    // ── Right: Crew ───────────────────────────────────────────────────────────
    if (RP_X + RP_W <= width) {
      UIRenderer.drawSciFiPanel(ctx, RP_X, PY, RP_W, PH,
        { lightBg: true, borderColor: '#ffffff', alpha: 0.93 });
      renderer.drawText('CREW', RP_X + RP_W / 2, PY + 18, HEADER_F, '#001830', 'center');
      renderer.drawLine(RP_X + 8, PY + 25, RP_X + RP_W - 8, PY + 25, '#bbccdd', 1);

      let ry2 = PY + 32;
      let foundCrew = false;
      for (const entity of world.query(['Crew', 'Owner'])) {
        const ownerComp = world.getComponent(entity, 'Owner') as { shipEntity: number } | undefined;
        if (ownerComp?.shipEntity !== shipEntity) continue;
        const crew = world.getComponent(entity, 'Crew') as
          { name: string; race: string; health: number; maxHealth: number } | undefined;
        if (crew === undefined) continue;
        foundCrew = true;
        pill(`${crew.name}  (${crew.race})`, RP_X + PAD, ry2, RP_W - PAD * 2);
        ry2 += PILL_H + 3;
        const bw2 = RP_W - PAD * 2;
        renderer.drawRect(RP_X + PAD, ry2, bw2, 4, '#224422', true);
        const filled = Math.round(bw2 * Math.max(0, crew.health) / Math.max(crew.maxHealth, 1));
        renderer.drawRect(RP_X + PAD, ry2, filled, 4, '#44cc44', true);
        ry2 += 4 + PILL_GAP + 4;
      }
      if (!foundCrew) {
        renderer.drawText('(no crew)', RP_X + PAD, PY + 46, ROW_F, DIM_COLOR, 'left');
      }
    }

    // ── Back button (floating, centred) ───────────────────────────────────────
    const BW = 180; const BH = 38;
    const BX = width / 2 - BW / 2;
    const BY = height - BH - 10;
    UIRenderer.drawSciFiPanel(ctx, BX, BY, BW, BH,
      { lightBg: true, borderColor: '#ffffff', alpha: 0.95 });
    renderer.drawText('← Back to Map', BX + BW / 2, BY + BH / 2 + 6,
      'bold 12px monospace', '#001830', 'center');
    hit(hitboxes, BX, BY, BW, BH, onBack);

    if (input.isMouseJustPressed(0)) {
      const mouse = input.getMousePosition();
      for (const hb of hitboxes) {
        if (mouse.x >= hb.x && mouse.x <= hb.x + hb.w &&
            mouse.y >= hb.y && mouse.y <= hb.y + hb.h) { hb.action(); break; }
      }
    }
  }

  // ── STORE screen ────────────────────────────────────────────────────────────

  drawStoreScreen(
    world: IWorld,
    renderer: IRenderer,
    input: IInput,
    onLeave: () => void,
    _onUpgrade?: () => void,
  ): void {
    // Background (star map + dark overlay) is rendered by main.ts before this call.
    const { width, height } = renderer.getCanvasSize();
    const ctx = renderer.getContext();

    const hitboxes: Hitbox[] = [];

    const playerData = this.findPlayerShip(world);
    if (playerData === null) { onLeave(); return; }
    const { shipEntity, ship } = playerData;

    const inventory = GameStateData.currentStore;
    if (inventory === null) { onLeave(); return; }

    // ── Shared helpers ────────────────────────────────────────────────────────
    const PILL_H   = 24;
    const PILL_PAD = 9;
    const PILL_GAP = 5;
    const FONT     = '12px monospace';
    const PAD      = 12;

    const pill = (label: string, x: number, y: number, maxW: number, color = '#00ccdd'): void => {
      ctx.font = FONT;
      const pw = Math.min(ctx.measureText(label).width + PILL_PAD * 2, maxW);
      UIRenderer.drawPill(ctx, x, y, pw, PILL_H, color);
      ctx.font = FONT; ctx.fillStyle = '#001820'; ctx.textAlign = 'left';
      ctx.fillText(label, x + PILL_PAD, y + PILL_H / 2 + 5);
    };

    // ── Header: title + player resources pills (floating) ─────────────────────
    renderer.drawText('STORE', width / 2, 26, TITLE_F, '#ffffff', 'center');
    const resPills = [
      `SCRAP  ${ship.scrap}`, `FUEL  ${ship.fuel}`,
      `MSL  ${ship.missiles}`, `HULL  ${ship.currentHull}/${ship.maxHull}`,
    ];
    ctx.font = FONT;
    const resWidths = resPills.map((t) => ctx.measureText(t).width + PILL_PAD * 2);
    let rpx = width - resWidths.reduce((s, w2) => s + w2, 0) - (resPills.length - 1) * PILL_GAP - 10;
    resPills.forEach((label, i) => {
      const pw = resWidths[i];
      UIRenderer.drawPill(ctx, rpx, 6, pw, PILL_H, '#00ccdd');
      ctx.font = FONT; ctx.fillStyle = '#001820'; ctx.textAlign = 'left';
      ctx.fillText(label, rpx + PILL_PAD, 6 + PILL_H / 2 + 5);
      rpx += pw + PILL_GAP;
    });

    // ── Three floating panels ─────────────────────────────────────────────────
    const PY = 42;
    const PH = height - PY - 58;

    const resourceItems = inventory.items.filter((it) => it.category === 'RESOURCE');
    const weaponItems   = inventory.items.filter((it) => it.category === 'WEAPON');
    const systemItems   = inventory.items.filter((it) => it.category === 'SYSTEM');

    const LP_W = 210;
    const LP_X = 10;
    const CP_W = weaponItems.length > 0  ? 320 : 0;
    const CP_X = LP_X + LP_W + (CP_W > 0 ? 8 : 0);
    const RP_W = systemItems.length > 0  ? Math.max(200, width - CP_X - CP_W - 18) : 0;
    const RP_X = CP_X + CP_W + (RP_W > 0 ? 8 : 0);

    // Draw an item row with buy button; returns the new y.
    const itemRow = (item: StoreItem, ix: number, iy: number, iw: number): number => {
      const canAfford = ship.scrap >= item.price;
      pill(item.label, ix, iy, iw - 66 - PAD, item.sold ? '#aaaaaa' : '#00ccdd');
      if (item.sold) {
        renderer.drawText('SOLD', ix + iw - PAD - 40, iy + PILL_H / 2 + 5, '10px monospace', '#888888', 'left');
      } else {
        const priceLabel = `${item.price}⚙`;
        ctx.font = '11px monospace';
        const priceW = ctx.measureText(priceLabel).width + 10;
        const priceX  = ix + iw - PAD - priceW - 48;
        UIRenderer.drawPill(ctx, priceX, iy + 3, priceW, 18, canAfford ? '#00bbaa' : '#aa3333');
        ctx.font = '11px monospace'; ctx.fillStyle = '#001820'; ctx.textAlign = 'left';
        ctx.fillText(priceLabel, priceX + 5, iy + 15);
        const bx2 = ix + iw - PAD - 44; const by2 = iy + 2; const bw2 = 42; const bh2 = 20;
        btn(renderer, 'BUY', bx2, by2, bw2, bh2,
          canAfford ? BTN_BUY_BG : BTN_NO_BG,
          canAfford ? BTN_BUY_BORDER : BTN_NO_BORDER,
          canAfford ? BTN_BUY_TEXT : BTN_NO_TEXT);
        if (canAfford) {
          const cap = item;
          hit(hitboxes, bx2, by2, bw2, bh2, () => {
            ship.scrap -= cap.price; cap.sold = true;
            this.applyPurchase(world, cap, shipEntity, ship);
          });
        }
      }
      return iy + PILL_H + PILL_GAP;
    };

    // ── Left: Resources ───────────────────────────────────────────────────────
    UIRenderer.drawSciFiPanel(ctx, LP_X, PY, LP_W, PH,
      { lightBg: true, borderColor: '#ffffff', alpha: 0.93 });
    renderer.drawText('RESOURCES', LP_X + LP_W / 2, PY + 18, HEADER_F, '#001830', 'center');
    renderer.drawLine(LP_X + 6, PY + 25, LP_X + LP_W - 6, PY + 25, '#bbccdd', 1);
    let ly = PY + 32;
    for (const item of resourceItems) { ly = itemRow(item, LP_X, ly, LP_W); }

    // ── Center: Weapons ───────────────────────────────────────────────────────
    if (CP_W > 0) {
      UIRenderer.drawSciFiPanel(ctx, CP_X, PY, CP_W, PH,
        { lightBg: true, borderColor: '#ffffff', alpha: 0.93 });
      renderer.drawText('WEAPONS', CP_X + CP_W / 2, PY + 18, HEADER_F, '#001830', 'center');
      renderer.drawLine(CP_X + 6, PY + 25, CP_X + CP_W - 6, PY + 25, '#bbccdd', 1);
      let wy = PY + 32;
      for (const item of weaponItems) { wy = itemRow(item, CP_X, wy, CP_W); }
    }

    // ── Right: Systems ────────────────────────────────────────────────────────
    if (RP_W > 0 && RP_X + RP_W <= width) {
      UIRenderer.drawSciFiPanel(ctx, RP_X, PY, RP_W, PH,
        { lightBg: true, borderColor: '#ffffff', alpha: 0.93 });
      renderer.drawText('SYSTEMS', RP_X + RP_W / 2, PY + 18, HEADER_F, '#001830', 'center');
      renderer.drawLine(RP_X + 6, PY + 25, RP_X + RP_W - 6, PY + 25, '#bbccdd', 1);
      let sy = PY + 32;
      for (const item of systemItems) { sy = itemRow(item, RP_X, sy, RP_W); }
    }

    // ── Leave button ──────────────────────────────────────────────────────────
    const LW = 180; const LH = 38;
    const LX = width / 2 - LW / 2;
    const LY = height - LH - 10;
    UIRenderer.drawSciFiPanel(ctx, LX, LY, LW, LH,
      { lightBg: true, borderColor: '#ffffff', alpha: 0.95 });
    renderer.drawText('← Leave Store', LX + LW / 2, LY + LH / 2 + 6,
      'bold 12px monospace', '#001830', 'center');
    hit(hitboxes, LX, LY, LW, LH, onLeave);

    if (input.isMouseJustPressed(0)) {
      const mouse = input.getMousePosition();
      for (const hb of hitboxes) {
        if (mouse.x >= hb.x && mouse.x <= hb.x + hb.w &&
            mouse.y >= hb.y && mouse.y <= hb.y + hb.h) { hb.action(); break; }
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

  /**
   * Applies the effect of a purchased store item to the player ship.
   * Resources are added immediately; weapons go into cargo; systems are installed
   * into the first empty room (with any required auxiliary components).
   */
  private applyPurchase(
    world: IWorld,
    item: StoreItem,
    shipEntity: number,
    ship: ShipComponent,
  ): void {
    if (item.category === 'RESOURCE') {
      switch (item.resourceType) {
        case 'fuel':       ship.fuel       += item.resourceAmount ?? 1; break;
        case 'missiles':   ship.missiles   += item.resourceAmount ?? 1; break;
        case 'droneParts': ship.droneParts += item.resourceAmount ?? 1; break;
        case 'hull':
          ship.currentHull = Math.min(ship.maxHull, ship.currentHull + (item.resourceAmount ?? 1));
          break;
      }
      return;
    }

    if (item.category === 'WEAPON' && item.weaponId !== undefined) {
      ship.cargoWeapons.push(item.weaponId);
      return;
    }

    if (item.category === 'SYSTEM' && item.systemType !== undefined) {
      // Find first empty room owned by this ship.
      let emptyRoom: number | undefined;
      for (const entity of world.query(['Room', 'Owner'])) {
        const owner = world.getComponent<OwnerComponent>(entity, 'Owner');
        if (owner?.shipEntity !== shipEntity) continue;
        const sys = world.getComponent<SystemComponent>(entity, 'System');
        if (sys === undefined) { emptyRoom = entity; break; }
      }
      if (emptyRoom === undefined) return; // no room available

      const newSys: SystemComponent = {
        _type:        'System',
        type:         item.systemType,
        level:        1,
        maxCapacity:  1,
        currentPower: 0,
        roomId:       0,
        damageAmount: 0,
        zoltanBonus:  0,
      };
      world.addComponent(emptyRoom, newSys);

      // Auxiliary root components.
      if (item.systemType === 'CLOAKING') {
        const cloakComp: CloakComponent = {
          _type: 'Cloak', isActive: false,
          durationTimer: 0, cooldownTimer: 0,
          maxDuration: 5.0, maxCooldown: 10.0,
        };
        world.addComponent(shipEntity, cloakComp);
      }
    }
  }

}
