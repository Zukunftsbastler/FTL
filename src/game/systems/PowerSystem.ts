import { allocatePower, deallocatePower } from '../logic/PowerMath';
import type { Entity } from '../../engine/Entity';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { SystemType } from '../data/SystemType';

// ── System power panel layout ─────────────────────────────────────────────────
// Exported so RenderSystem can draw matching hitboxes without duplicating geometry.

/** Left edge of the system power panel — now positioned right of the reactor. */
export const SYSPANEL_X = 68;

/** @deprecated Use canvas.height - BOTTOM_HUD_H + 6 for actual Y. */
export const SYSPANEL_Y0 = 0;

/** Bottom HUD height (reactor + systems + weapons strip). */
export const BOTTOM_HUD_H = 110;

/** Height of each system row (px). */
export const SYSPANEL_ROW_H = 22;

/** Total clickable width of each row (px). */
export const SYSPANEL_W = 185;

/** Pixel offset from the left edge where the name label ends and pips begin. */
export const SYSPANEL_LABEL_W = 86;

/** Width of each power pip square. */
export const SYSPANEL_PIP_W = 9;

/** Height of each power pip square. */
export const SYSPANEL_PIP_H = 9;

/** Gap between consecutive pip squares. */
export const SYSPANEL_PIP_GAP = 2;

/** Width of each system column in the horizontal system panel. */
export const SYSTEM_COL_W = 28;

/**
 * System types that do NOT draw from the reactor power pool (sub-systems).
 * These are omitted from the clickable power panel.
 */
export const SUBSYSTEM_TYPES = new Set<SystemType>(['PILOTING', 'SENSORS', 'DOORS']);

/**
 * Preferred display order for systems in the power panel.
 * Systems not in this list are appended at the end in query order.
 */
const PANEL_ORDER: SystemType[] = [
  'OXYGEN', 'SHIELDS', 'ENGINES', 'WEAPONS', 'MEDBAY',
  'CLOAKING', 'TELEPORTER', 'DRONE_CONTROL', 'HACKING',
];

/**
 * Click-driven power allocation for the player's ship systems.
 *
 * New interaction model (replaces ArrowUp / ArrowDown hover):
 *   Left-Click  on a system row in the dashboard → allocate 1 power unit.
 *   Right-Click on a system row in the dashboard → deallocate 1 power unit.
 *
 * Sub-systems (PILOTING, SENSORS, DOORS) are excluded from the panel and
 * cannot be modified here.
 */
export class PowerSystem {
  private readonly input: IInput;
  private readonly renderer: IRenderer;

  constructor(input: IInput, renderer: IRenderer) {
    this.input    = input;
    this.renderer = renderer;
  }

  update(world: IWorld): void {
    const { height: canvasH } = this.renderer.getCanvasSize();
    const sysY0 = canvasH - BOTTOM_HUD_H + 6;

    const leftClick  = this.input.isMouseJustPressed(0);
    const rightClick = this.input.isMouseJustPressed(2);

    const playerShipEntity = this.findPlayerShipEntity(world);
    if (playerShipEntity === null) return;

    const mouse   = this.input.getMousePosition();
    const systems = this.getPlayerSystems(world, playerShipEntity);

    // ── Cursor: pointer when hovering a system column ─────────────────────────
    const sysAreaLeft  = SYSPANEL_X;
    const sysAreaRight = SYSPANEL_X + systems.length * SYSTEM_COL_W;
    if (
      mouse.x >= sysAreaLeft && mouse.x < sysAreaRight &&
      mouse.y >= sysY0 && mouse.y < sysY0 + BOTTOM_HUD_H
    ) {
      this.input.setCursor('pointer');
    }

    if (!leftClick && !rightClick) return;

    const reactor = world.getComponent<ReactorComponent>(playerShipEntity, 'Reactor');
    if (reactor === undefined) return;

    for (let i = 0; i < systems.length; i++) {
      const colX = SYSPANEL_X + i * SYSTEM_COL_W;
      if (
        mouse.x >= colX && mouse.x < colX + SYSTEM_COL_W &&
        mouse.y >= sysY0 && mouse.y < sysY0 + BOTTOM_HUD_H
      ) {
        if (leftClick)  allocatePower(reactor, systems[i]);
        if (rightClick) deallocatePower(reactor, systems[i]);
        return;
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private findPlayerShipEntity(world: IWorld): Entity | null {
    const entities = world.query(['Ship', 'Faction', 'Reactor']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'PLAYER') return entity;
    }
    return null;
  }

  /**
   * Returns the player's power-consuming SystemComponents in panel display order,
   * excluding sub-systems (PILOTING, SENSORS, DOORS).
   */
  getPlayerSystems(world: IWorld, playerShipEntity: Entity): SystemComponent[] {
    const all: SystemComponent[] = [];

    for (const entity of world.query(['System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys === undefined || SUBSYSTEM_TYPES.has(sys.type)) continue;
      all.push(sys);
    }

    // Sort by PANEL_ORDER priority; unlisted types go to the end.
    all.sort((a, b) => {
      const pa = PANEL_ORDER.indexOf(a.type);
      const pb = PANEL_ORDER.indexOf(b.type);
      return (pa === -1 ? PANEL_ORDER.length : pa) - (pb === -1 ? PANEL_ORDER.length : pb);
    });

    return all;
  }
}
