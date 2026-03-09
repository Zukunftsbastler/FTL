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
const BG_COLOR       = '#020810';
const TITLE_F        = '20px monospace';
const HEADER_F       = '13px monospace';
const ROW_F          = '12px monospace';
const TEXT_COLOR     = '#aabbcc';
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
    const { width, height } = renderer.getCanvasSize();
    renderer.clear(BG_COLOR);

    const hitboxes: Hitbox[] = [];
    const ctx = renderer.getContext();

    const playerData = this.findPlayerShip(world);
    if (playerData === null) { onBack(); return; }
    const { shipEntity, ship, reactor } = playerData;

    // ── Title panel (left-anchored) ───────────────────────────────────────────
    const TITLE_W = Math.min(520, width - 20);
    UIRenderer.drawSciFiPanel(ctx, 0, 0, TITLE_W, 56,
      { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.95 });
    renderer.drawText('SHIP OVERVIEW', TITLE_W / 2, 36, TITLE_F, '#001830', 'center');

    renderer.drawText(
      'Upgrades and weapon swaps are available in stores only.',
      16, 76, ROW_F, DIM_COLOR, 'left',
    );

    // ── Pill helper ───────────────────────────────────────────────────────────
    const PILL_H   = 28;
    const PILL_PAD = 10;
    const PILL_GAP = 6;
    const FONT     = '12px monospace';

    const drawPillRow = (label: string, x: number, y: number): void => {
      ctx.font = FONT;
      const tw = ctx.measureText(label).width;
      const pw = tw + PILL_PAD * 2;
      UIRenderer.drawPill(ctx, x, y, pw, PILL_H, '#00ccdd');
      ctx.font      = FONT;
      ctx.fillStyle = '#001820';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + PILL_PAD, y + PILL_H / 2 + 5);
    };

    // ── Left column: Systems ──────────────────────────────────────────────────
    const COL_X = 20;
    let   ly    = 100;

    UIRenderer.drawSciFiPanel(ctx, 0, ly, Math.round(width / 2) - 20, height - ly - 70,
      { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.92 });

    ly += 14;
    renderer.drawText('SYSTEMS', COL_X + 4, ly + 12, HEADER_F, '#001830', 'left');
    ly += 32;

    const systems = this.collectPlayerSystems(world, shipEntity);
    for (const { system } of systems) {
      drawPillRow(`${system.type.padEnd(14)} Lv ${system.maxCapacity}`, COL_X, ly);
      ly += PILL_H + PILL_GAP;
    }

    // Reactor row.
    ly += 4;
    drawPillRow(`REACTOR   Power ${reactor.totalPower}`, COL_X, ly);

    // ── Right column: Weapons ─────────────────────────────────────────────────
    const RIGHT_X = Math.round(width / 2) + 10;
    const RIGHT_W = width - RIGHT_X - 20;
    let   ry      = 100;

    UIRenderer.drawSciFiPanel(ctx, RIGHT_X, ry, RIGHT_W, height - ry - 70,
      { lightBg: true, borderColor: '#ffffff', alpha: 0.92 });

    ry += 14;
    renderer.drawText('EQUIPPED WEAPONS', RIGHT_X + 10, ry + 12, HEADER_F, '#001830', 'left');
    ry += 32;

    const allWeapons      = AssetLoader.getJSON<WeaponTemplate[]>('weapons') ?? [];
    const equippedWeapons = this.collectPlayerWeapons(world, shipEntity);

    if (equippedWeapons.length === 0) {
      renderer.drawText('(none equipped)', RIGHT_X + 14, ry + 14, ROW_F, DIM_COLOR, 'left');
      ry += PILL_H + PILL_GAP;
    } else {
      for (const [, wComp] of equippedWeapons) {
        const tpl  = allWeapons.find((t) => t.id === wComp.templateId);
        const name = tpl?.name ?? wComp.templateId;
        drawPillRow(name, RIGHT_X + 10, ry);
        ry += PILL_H + PILL_GAP;
      }
    }

    // Cargo weapons.
    ry += 8;
    renderer.drawText('CARGO', RIGHT_X + 10, ry + 12, HEADER_F, '#001830', 'left');
    ry += 28;

    if (ship.cargoWeapons.length === 0) {
      renderer.drawText('(empty)', RIGHT_X + 14, ry + 14, ROW_F, DIM_COLOR, 'left');
    } else {
      for (const weaponId of ship.cargoWeapons) {
        const tpl  = allWeapons.find((t) => t.id === weaponId);
        const name = tpl?.name ?? weaponId;
        drawPillRow(name, RIGHT_X + 10, ry);
        ry += PILL_H + PILL_GAP;
      }
    }

    // ── Back button ───────────────────────────────────────────────────────────
    const BACK_W = 180;
    const BACK_H = 40;
    const backX  = 0;
    const backY  = height - BACK_H - 14;
    UIRenderer.drawSciFiPanel(ctx, backX, backY, BACK_W, BACK_H,
      { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.95 });
    renderer.drawText('← Back to Map', backX + BACK_W / 2, backY + BACK_H / 2 + 6,
      'bold 12px monospace', '#001830', 'center');
    hit(hitboxes, backX, backY, BACK_W, BACK_H, onBack);

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
    _onUpgrade?: () => void,
  ): void {
    const { width, height } = renderer.getCanvasSize();
    renderer.clear(BG_COLOR);
    const ctx = renderer.getContext();

    const hitboxes: Hitbox[] = [];

    const playerData = this.findPlayerShip(world);
    if (playerData === null) { onLeave(); return; }
    const { shipEntity, ship } = playerData;

    const inventory = GameStateData.currentStore;
    if (inventory === null) { onLeave(); return; }

    // ── Title panel (left-anchored) ───────────────────────────────────────────
    const TITLE_W = Math.min(600, width - 20);
    UIRenderer.drawSciFiPanel(ctx, 0, 0, TITLE_W, 56,
      { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.95 });
    renderer.drawText('STORE', TITLE_W / 2, 36, TITLE_F, '#001830', 'center');

    // ── Player resources as pills ─────────────────────────────────────────────
    const PILL_H   = 24;
    const PILL_PAD = 9;
    const PILL_GAP = 6;
    const FONT     = '12px monospace';
    ctx.font = FONT;

    const resPills = [
      `SCRAP  ${ship.scrap}`,
      `FUEL  ${ship.fuel}`,
      `MSL  ${ship.missiles}`,
      `HULL  ${ship.currentHull}/${ship.maxHull}`,
    ];
    const resWidths = resPills.map((t) => ctx.measureText(t).width + PILL_PAD * 2);
    const resPanelW = resWidths.reduce((s, w2) => s + w2, 0) + (resPills.length - 1) * PILL_GAP + 20;
    const resPanelH = PILL_H + 16;
    UIRenderer.drawSciFiPanel(ctx, 0, 62, resPanelW, resPanelH,
      { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.90 });
    {
      let px2 = 10;
      const py2 = 62 + 8;
      resPills.forEach((label, i) => {
        const pw = resWidths[i];
        UIRenderer.drawPill(ctx, px2, py2, pw, PILL_H, '#00ccdd');
        ctx.font = FONT; ctx.fillStyle = '#001820'; ctx.textAlign = 'left';
        ctx.fillText(label, px2 + PILL_PAD, py2 + PILL_H / 2 + 5);
        px2 += pw + PILL_GAP;
      });
    }

    // ── Category layout ───────────────────────────────────────────────────────
    const CARD_W   = 190;
    const CARD_H   = 72;
    const CARD_GAP = 10;
    const SECT_PAD = 16;
    const CONTENT_X = 10;
    let   cy        = 62 + resPanelH + 12;

    const categories: Array<{ label: string; cat: StoreItem['category'] }> = [
      { label: 'RESOURCES', cat: 'RESOURCE' },
      { label: 'WEAPONS',   cat: 'WEAPON'   },
      { label: 'SYSTEMS',   cat: 'SYSTEM'   },
    ];

    for (const { label, cat } of categories) {
      const catItems = inventory.items.filter((it) => it.category === cat);
      if (catItems.length === 0) continue;

      // Section header.
      renderer.drawText(label, CONTENT_X + 4, cy + 14, HEADER_F, TEXT_COLOR, 'left');
      cy += 22;

      // Cards row.
      let cx2 = CONTENT_X;
      for (const item of catItems) {
        const canAfford = ship.scrap >= item.price;
        const isSold    = item.sold;

        UIRenderer.drawSciFiPanel(ctx, cx2, cy, CARD_W, CARD_H,
          { lightBg: true, borderColor: isSold ? '#aaaaaa' : '#ffffff', alpha: isSold ? 0.6 : 0.93 });

        // Item name.
        renderer.drawText(
          item.label, cx2 + CARD_W / 2, cy + 18,
          '11px monospace', isSold ? '#888888' : '#001830', 'center',
        );

        if (isSold) {
          renderer.drawText('SOLD OUT', cx2 + CARD_W / 2, cy + CARD_H / 2 + 10,
            '10px monospace', '#888888', 'center');
        } else {
          // Price pill.
          const priceLabel = `${item.price} scrap`;
          ctx.font = '11px monospace';
          const priceW = ctx.measureText(priceLabel).width + 12;
          const priceX = cx2 + CARD_W / 2 - priceW / 2;
          const priceY = cy + 26;
          UIRenderer.drawPill(ctx, priceX, priceY, priceW, 18, canAfford ? '#00ccdd' : '#cc4444');
          ctx.font = '11px monospace'; ctx.fillStyle = '#001820'; ctx.textAlign = 'left';
          ctx.fillText(priceLabel, priceX + 6, priceY + 13);

          // Buy button.
          const BUY_W = 80; const BUY_H = 22;
          const bx2   = cx2 + CARD_W / 2 - BUY_W / 2;
          const by2   = cy + CARD_H - BUY_H - 6;
          btn(renderer, 'BUY',
            bx2, by2, BUY_W, BUY_H,
            canAfford ? BTN_BUY_BG : BTN_NO_BG,
            canAfford ? BTN_BUY_BORDER : BTN_NO_BORDER,
            canAfford ? BTN_BUY_TEXT : BTN_NO_TEXT,
          );

          if (canAfford) {
            const capturedItem = item;
            hit(hitboxes, bx2, by2, BUY_W, BUY_H, () => {
              ship.scrap -= capturedItem.price;
              capturedItem.sold = true;
              this.applyPurchase(world, capturedItem, shipEntity, ship);
            });
          }
        }

        cx2 += CARD_W + CARD_GAP;
        // Wrap to next row if needed.
        if (cx2 + CARD_W > width - SECT_PAD) {
          cx2  = CONTENT_X;
          cy  += CARD_H + CARD_GAP;
        }
      }

      cy += CARD_H + 18;
    }

    // ── Leave button ──────────────────────────────────────────────────────────
    const LEAVE_W = 180;
    const LEAVE_H = 40;
    const LEAVE_Y = height - LEAVE_H - 14;
    UIRenderer.drawSciFiPanel(ctx, 0, LEAVE_Y, LEAVE_W, LEAVE_H,
      { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.95 });
    renderer.drawText('← Leave Store', LEAVE_W / 2, LEAVE_Y + LEAVE_H / 2 + 6,
      'bold 12px monospace', '#001830', 'center');
    hit(hitboxes, 0, LEAVE_Y, LEAVE_W, LEAVE_H, onLeave);

    // ── Click handling ────────────────────────────────────────────────────────
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
