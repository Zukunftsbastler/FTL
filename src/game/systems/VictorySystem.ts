import { AssetLoader } from '../../utils/AssetLoader';
import { generateCombatReward } from '../logic/RewardGenerator';
import type { Reward } from '../logic/RewardGenerator';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { WeaponTemplate } from '../data/WeaponTemplate';

// ── Modal layout constants ─────────────────────────────────────────────────────
const MODAL_W = 440;
const MODAL_H = 340;
const MODAL_BG      = 'rgba(4,10,20,0.96)';
const MODAL_BORDER  = '#44aaff';
const TITLE_COLOR   = '#88ddff';
const TEXT_COLOR    = '#aabbcc';
const VAL_COLOR     = '#eef';
const BTN_W         = 200;
const BTN_H         = 40;
const BTN_COLOR     = '#0a2a0a';
const BTN_BORDER    = '#44cc44';
const BTN_TEXT_COL  = '#44ff44';

// ── Game-Over layout constants ─────────────────────────────────────────────────
const GO_BTN_W = 180;
const GO_BTN_H = 44;
const GO_BTN_BG     = '#200000';
const GO_BTN_BORDER = '#cc2222';
const GO_BTN_TEXT   = '#ff4444';

/**
 * Handles end-of-combat conditions: Victory (enemy hull → 0) and Game Over (player hull → 0
 * or all player crew dead).
 *
 * Usage pattern in main.ts:
 *   • During COMBAT: call `checkCombatEnd(world)` each frame.
 *     It returns 'VICTORY', 'GAME_OVER', or null.
 *   • During VICTORY state: call `drawVictory(renderer, input, world, onCollect)`.
 *   • During GAME_OVER state: call `drawGameOver(renderer, input)` and handle the restart button.
 *   • Call `reset()` when starting a new combat session.
 */
export class VictorySystem {
  private triggered      = false;
  private pendingReward: Reward | null = null;

  /** Returns the reward generated when the VICTORY condition was met. */
  getReward(): Reward | null { return this.pendingReward; }

  /** Clears trigger state. Call before each new combat encounter. */
  reset(): void {
    this.triggered     = false;
    this.pendingReward = null;
  }

  // ── Combat-phase detection ────────────────────────────────────────────────

  /**
   * Checks if the combat should end this frame.
   * @returns 'VICTORY' if enemy hull is 0, 'GAME_OVER' if player is defeated, null otherwise.
   */
  checkCombatEnd(world: IWorld): 'VICTORY' | 'GAME_OVER' | null {
    if (this.triggered) return null;

    if (this.isPlayerDefeated(world)) {
      this.triggered = true;
      return 'GAME_OVER';
    }

    if (!this.isEnemyAlive(world)) {
      this.triggered = true;
      const weaponIds = this.collectWeaponIds();
      this.pendingReward = generateCombatReward(1, weaponIds);
      return 'VICTORY';
    }

    return null;
  }

  // ── Victory overlay ────────────────────────────────────────────────────────

  /**
   * Draws the Victory modal overlay on top of the frozen combat scene.
   * Calls `onCollect` when the "Collect & Jump" button is clicked.
   */
  drawVictory(
    renderer: IRenderer,
    input: IInput,
    onCollect: () => void,
  ): void {
    const reward = this.pendingReward;
    if (reward === null) return;

    const { width, height } = renderer.getCanvasSize();
    const mx = (width  - MODAL_W) / 2;
    const my = (height - MODAL_H) / 2;

    // Modal background.
    renderer.drawRect(mx, my, MODAL_W, MODAL_H, MODAL_BG, true);
    renderer.drawRect(mx, my, MODAL_W, MODAL_H, MODAL_BORDER, false);

    // Title.
    renderer.drawText('VICTORY', width / 2, my + 36, '22px monospace', TITLE_COLOR, 'center');
    renderer.drawText('Enemy ship destroyed', width / 2, my + 58, '13px monospace', TEXT_COLOR, 'center');

    // Divider.
    renderer.drawLine(mx + 12, my + 66, mx + MODAL_W - 12, my + 66, '#334466', 1);

    // Loot list.
    let ly = my + 90;
    const lx = mx + 24;
    const LINE_H = 24;

    renderer.drawText('SCRAP:',      lx,           ly, '13px monospace', TEXT_COLOR, 'left');
    renderer.drawText(`${reward.scrap}`, mx + MODAL_W - 24, ly, '13px monospace', VAL_COLOR, 'right');
    ly += LINE_H;

    renderer.drawText('FUEL:',       lx, ly, '13px monospace', TEXT_COLOR, 'left');
    renderer.drawText(`${reward.fuel}`,  mx + MODAL_W - 24, ly, '13px monospace', VAL_COLOR, 'right');
    ly += LINE_H;

    renderer.drawText('MISSILES:',   lx, ly, '13px monospace', TEXT_COLOR, 'left');
    renderer.drawText(`${reward.missiles}`, mx + MODAL_W - 24, ly, '13px monospace', VAL_COLOR, 'right');
    ly += LINE_H;

    renderer.drawText('DRONE PARTS:', lx, ly, '13px monospace', TEXT_COLOR, 'left');
    renderer.drawText(`${reward.droneParts}`, mx + MODAL_W - 24, ly, '13px monospace', VAL_COLOR, 'right');
    ly += LINE_H;

    if (reward.weaponId !== undefined) {
      renderer.drawText('WEAPON:', lx, ly, '13px monospace', '#ffdd44', 'left');
      renderer.drawText(reward.weaponId, mx + MODAL_W - 24, ly, '13px monospace', '#ffee88', 'right');
      ly += LINE_H;
    }

    if (reward.newCrew !== undefined) {
      renderer.drawText('NEW CREW:', lx, ly, '13px monospace', '#44eeaa', 'left');
      renderer.drawText(
        `${reward.newCrew.name} (${reward.newCrew.race})`,
        mx + MODAL_W - 24, ly, '13px monospace', '#88ffcc', 'right',
      );
    }

    // "Collect & Jump" button.
    const bx = width / 2 - BTN_W / 2;
    const by = my + MODAL_H - BTN_H - 20;
    renderer.drawRect(bx, by, BTN_W, BTN_H, BTN_COLOR, true);
    renderer.drawRect(bx, by, BTN_W, BTN_H, BTN_BORDER, false);
    renderer.drawText('Collect & Jump', width / 2, by + BTN_H / 2 + 5, '14px monospace', BTN_TEXT_COL, 'center');

    if (input.isMouseJustPressed(0)) {
      const mouse = input.getMousePosition();
      if (
        mouse.x >= bx && mouse.x <= bx + BTN_W &&
        mouse.y >= by && mouse.y <= by + BTN_H
      ) {
        onCollect();
      }
    }
  }

  // ── Game-Over overlay ──────────────────────────────────────────────────────

  /**
   * Draws the Game Over screen.
   * Returns true when the "Restart" button is clicked (caller should call window.location.reload()).
   */
  drawGameOver(renderer: IRenderer, input: IInput): boolean {
    const { width, height } = renderer.getCanvasSize();

    renderer.clear('#000000');
    renderer.drawText(
      'GAME OVER',
      width / 2, height / 2 - 40,
      '36px monospace', '#cc2222', 'center',
    );
    renderer.drawText(
      'Your ship was destroyed.',
      width / 2, height / 2,
      '16px monospace', '#885555', 'center',
    );

    const bx = width  / 2 - GO_BTN_W / 2;
    const by = height / 2 + 30;
    renderer.drawRect(bx, by, GO_BTN_W, GO_BTN_H, GO_BTN_BG, true);
    renderer.drawRect(bx, by, GO_BTN_W, GO_BTN_H, GO_BTN_BORDER, false);
    renderer.drawText('Restart', width / 2, by + GO_BTN_H / 2 + 6, '16px monospace', GO_BTN_TEXT, 'center');

    if (input.isMouseJustPressed(0)) {
      const mouse = input.getMousePosition();
      if (
        mouse.x >= bx && mouse.x <= bx + GO_BTN_W &&
        mouse.y >= by && mouse.y <= by + GO_BTN_H
      ) {
        return true;
      }
    }
    return false;
  }

  // ── Enemy cleanup ──────────────────────────────────────────────────────────

  /**
   * Destroys all ECS entities belonging to the enemy ship.
   * Called from main.ts when the player clicks "Collect & Jump".
   */
  destroyEnemyShip(world: IWorld): void {
    let enemyShipEntity: number | undefined;
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'ENEMY') { enemyShipEntity = entity; break; }
    }
    if (enemyShipEntity === undefined) return;

    for (const entity of world.query(['Owner'])) {
      const owner = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner?.shipEntity === enemyShipEntity) world.destroyEntity(entity);
    }
    world.destroyEntity(enemyShipEntity);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isEnemyAlive(world: IWorld): boolean {
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'ENEMY') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      return ship !== undefined && ship.currentHull > 0;
    }
    return false;
  }

  private isPlayerDefeated(world: IWorld): boolean {
    // Condition 1: player hull ≤ 0.
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship !== undefined && ship.currentHull <= 0) return true;
      break;
    }

    // Condition 2: all player crew are dead (health ≤ 0).
    // Import CrewComponent inline since we only need it here.
    const crewEntities = world.query(['Crew', 'Owner']);
    let playerCrewCount = 0;
    let deadCrewCount   = 0;
    for (const entity of crewEntities) {
      const owner = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner === undefined) continue;
      const shipFaction = this.getShipFaction(world, owner.shipEntity);
      if (shipFaction !== 'PLAYER') continue;
      playerCrewCount++;
      // Access crew health via the raw component map — use any-typed cast to avoid circular import.
      const crew = world.getComponent(entity, 'Crew') as { health: number } | undefined;
      if (crew !== undefined && crew.health <= 0) deadCrewCount++;
    }
    if (playerCrewCount > 0 && deadCrewCount >= playerCrewCount) return true;

    return false;
  }

  private getShipFaction(world: IWorld, shipEntity: number): string | undefined {
    const faction = world.getComponent<FactionComponent>(shipEntity, 'Faction');
    return faction?.id;
  }

  /** Collects all weapon IDs from the loaded weapons.json for the loot drop pool. */
  private collectWeaponIds(): string[] {
    const templates = AssetLoader.getJSON<WeaponTemplate[]>('weapons');
    return templates?.map((t) => t.id) ?? [];
  }
}
