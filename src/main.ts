import { AssetLoader } from './utils/AssetLoader';
import { Input } from './engine/Input';
import { Renderer } from './engine/Renderer';
import { Time } from './engine/Time';
import { World } from './engine/World';
import { RenderSystem } from './game/systems/RenderSystem';
import { SelectionSystem } from './game/systems/SelectionSystem';
import { MovementSystem } from './game/systems/MovementSystem';
import { PowerSystem } from './game/systems/PowerSystem';
import { DoorSystem } from './game/systems/DoorSystem';
import { OxygenSystem } from './game/systems/OxygenSystem';
import { CrewSystem } from './game/systems/CrewSystem';
import { TargetingSystem } from './game/systems/TargetingSystem';
import { CombatSystem } from './game/systems/CombatSystem';
import { ProjectileSystem } from './game/systems/ProjectileSystem';
import { ManningSystem } from './game/systems/ManningSystem';
import { RepairSystem } from './game/systems/RepairSystem';
import { ShieldSystem } from './game/systems/ShieldSystem';
import { EnemyAISystem } from './game/systems/EnemyAISystem';
import { VictorySystem } from './game/systems/VictorySystem';
import { UpgradeSystem } from './game/systems/UpgradeSystem';
import { ShipFactory } from './game/world/ShipFactory';
import { Pathfinder } from './utils/Pathfinder';
import { TILE_SIZE } from './game/constants';
import type { GameState } from './engine/GameState';
import type { ShipTemplate } from './game/data/ShipTemplate';
import type { WeaponTemplate } from './game/data/WeaponTemplate';
import type { FactionComponent } from './game/components/FactionComponent';
import type { ShipComponent } from './game/components/ShipComponent';
import type { WeaponComponent } from './game/components/WeaponComponent';
import type { PositionComponent } from './game/components/PositionComponent';
import type { SpriteComponent } from './game/components/SpriteComponent';

// ── Canvas Setup ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const ctx = canvas.getContext('2d');
if (ctx === null) {
  throw new Error('main: failed to acquire 2D rendering context.');
}

// ── Engine Singletons ─────────────────────────────────────────────────────────

const renderer = new Renderer(ctx);
const world    = new World();
const input    = new Input(canvas);

// ── Asset Helpers ─────────────────────────────────────────────────────────────

function generatePlaceholderAssets(): Promise<void> {
  const SIZE = 32;
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width  = SIZE;
  tmpCanvas.height = SIZE;

  const tmpCtx = tmpCanvas.getContext('2d');
  if (tmpCtx === null) {
    return Promise.reject(new Error('generatePlaceholderAssets: failed to get 2D context.'));
  }

  tmpCtx.fillStyle   = '#00ccff';
  tmpCtx.fillRect(0, 0, SIZE, SIZE);
  tmpCtx.strokeStyle = '#ffffff';
  tmpCtx.lineWidth   = 2;
  tmpCtx.strokeRect(1, 1, SIZE - 2, SIZE - 2);

  return AssetLoader.loadImage('cursor-sprite', tmpCanvas.toDataURL());
}

// ── Initialisation & Game Loop ────────────────────────────────────────────────

async function init(): Promise<void> {
  // ── Pre-load phase ──────────────────────────────────────────────────────────
  await Promise.all([
    generatePlaceholderAssets(),
    AssetLoader.loadJSON<ShipTemplate[]>('ships', '/data/ships.json'),
    AssetLoader.loadJSON<WeaponTemplate[]>('weapons', '/data/weapons.json'),
  ]);

  // ── Ship layout ─────────────────────────────────────────────────────────────
  // Player ship: kestrel_a = 5×3 tile bounding box — anchored on the left.
  // Enemy ship:  rebel_a   = 3×2 tile bounding box — anchored on the right.
  const PLAYER_GRID_H = 3;
  const ENEMY_GRID_W  = 3;
  const ENEMY_GRID_H  = 2;

  const playerShipX = 50;
  const playerShipY = Math.round((canvas.height - PLAYER_GRID_H * TILE_SIZE) / 2);
  const enemyShipX  = canvas.width  - 50 - ENEMY_GRID_W * TILE_SIZE;
  const enemyShipY  = Math.round((canvas.height - ENEMY_GRID_H  * TILE_SIZE) / 2);

  // ── Star map nodes (fractional canvas positions, computed once) ─────────────
  const STAR_RADIUS = 18;
  const stars: Array<{ x: number; y: number; name: string; nodeType: 'COMBAT' | 'STORE' }> = [
    { x: Math.round(canvas.width * 0.20), y: Math.round(canvas.height * 0.30), name: 'Vega',   nodeType: 'COMBAT' },
    { x: Math.round(canvas.width * 0.50), y: Math.round(canvas.height * 0.50), name: 'Altair', nodeType: 'COMBAT' },
    { x: Math.round(canvas.width * 0.75), y: Math.round(canvas.height * 0.25), name: 'STORE',  nodeType: 'STORE'  },
    { x: Math.round(canvas.width * 0.35), y: Math.round(canvas.height * 0.65), name: 'Rigel',  nodeType: 'COMBAT' },
    { x: Math.round(canvas.width * 0.65), y: Math.round(canvas.height * 0.70), name: 'Sirius', nodeType: 'COMBAT' },
  ];

  // ── Entity setup ────────────────────────────────────────────────────────────

  // Cursor entity (hovers above all game content).
  const SPRITE_SIZE = 32;
  const cursorEntity = world.createEntity();
  world.addComponent(cursorEntity, { _type: 'Position', x: 0, y: 0 } as PositionComponent);
  world.addComponent(cursorEntity, {
    _type: 'Sprite',
    assetId: 'cursor-sprite',
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
  } as SpriteComponent);

  // Player ship only — enemy is spawned on each combat entry.
  ShipFactory.spawnShip(world, 'kestrel_a', playerShipX, playerShipY, 'PLAYER');

  // ── Pathfinder (player ship only) ────────────────────────────────────────────
  const allShips = AssetLoader.getJSON<ShipTemplate[]>('ships');
  if (allShips === undefined) throw new Error('main: ships JSON missing after load.');
  const template = allShips.find((s) => s.id === 'kestrel_a');
  if (template === undefined) throw new Error('main: kestrel_a template not found.');
  const pathfinder = new Pathfinder(template.rooms, template.doors);

  // ── State machine ────────────────────────────────────────────────────────────
  let currentState: GameState = 'STAR_MAP';

  function enterCombat(): void {
    victorySystem.reset();
    ShipFactory.spawnShip(world, 'rebel_a', enemyShipX, enemyShipY, 'ENEMY');
    // Clear any stale weapon targets left over from a previous combat session.
    for (const entity of world.query(['Weapon'])) {
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) weapon.targetRoomEntity = undefined;
    }
    currentState = 'COMBAT';
  }

  /**
   * Applies the combat reward to the player ship, optionally spawns a new crew member,
   * destroys the enemy ship, and transitions to the Star Map.
   */
  function applyRewardAndJump(): void {
    const reward = victorySystem.getReward();
    if (reward === null) return;

    // Apply resources to player ship.
    const playerShipEntities = world.query(['Ship', 'Faction']);
    for (const entity of playerShipEntities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship === undefined) break;
      ship.scrap      += reward.scrap;
      ship.fuel       += reward.fuel;
      ship.missiles   += reward.missiles;
      ship.droneParts += reward.droneParts;
      if (reward.weaponId !== undefined) {
        ship.cargoWeapons.push(reward.weaponId);
      }
      // Spawn new crew if the reward includes one.
      if (reward.newCrew !== undefined) {
        ShipFactory.spawnCrewMember(world, reward.newCrew, entity);
      }
      break;
    }

    victorySystem.destroyEnemyShip(world);
    currentState = 'STAR_MAP';
  }

  // ── Systems ─────────────────────────────────────────────────────────────────

  const targetingSystem   = new TargetingSystem(input, renderer);
  const combatSystem      = new CombatSystem();
  const projectileSystem  = new ProjectileSystem();
  const victorySystem     = new VictorySystem();
  const upgradeSystem     = new UpgradeSystem();
  const renderSystem      = new RenderSystem(renderer, targetingSystem, input, projectileSystem);
  const selectionSystem = new SelectionSystem(input, playerShipX, playerShipY);
  const movementSystem  = new MovementSystem(input, playerShipX, playerShipY, pathfinder);
  const powerSystem     = new PowerSystem(input);
  const doorSystem      = new DoorSystem(input);
  const oxygenSystem    = new OxygenSystem();
  const crewSystem      = new CrewSystem();
  const manningSystem   = new ManningSystem();
  const repairSystem    = new RepairSystem();
  const shieldSystem    = new ShieldSystem();
  const enemyAISystem   = new EnemyAISystem();

  // ── Game Loop ───────────────────────────────────────────────────────────────

  let lastTimestamp: number = performance.now();

  function gameLoop(timestamp: number): void {
    Time.tick(timestamp, lastTimestamp);
    lastTimestamp = timestamp;

    if (currentState === 'STAR_MAP') {
      // ── Star Map ─────────────────────────────────────────────────────────────
      const { width } = renderer.getCanvasSize();
      renderer.clear('#00000f');

      renderer.drawText('STAR MAP', width / 2, 55, '28px monospace', '#aaccff', 'center');
      renderer.drawText('Click a star to engage', width / 2, 85, '14px monospace', '#556677', 'center');

      for (const star of stars) {
        const isStore    = star.nodeType === 'STORE';
        const nodeColor  = isStore ? '#ffdd44' : '#aaddff';
        const ringColor  = isStore ? '#665500' : '#223355';
        const labelColor = isStore ? '#ffee88' : '#88aacc';
        renderer.drawCircle(star.x, star.y, STAR_RADIUS,     nodeColor, true);
        renderer.drawCircle(star.x, star.y, STAR_RADIUS + 5, ringColor, false, 1);
        renderer.drawText(star.name, star.x, star.y + STAR_RADIUS + 18, '13px monospace', labelColor, 'center');
      }

      // "UPGRADE SHIP" button in the top-left corner.
      const UPG_W = 160;
      const UPG_H = 36;
      const UPG_X = 16;
      const UPG_Y = 16;
      renderer.drawRect(UPG_X, UPG_Y, UPG_W, UPG_H, '#0a0a1e', true);
      renderer.drawRect(UPG_X, UPG_Y, UPG_W, UPG_H, '#4455cc', false);
      renderer.drawText('UPGRADE SHIP', UPG_X + UPG_W / 2, UPG_Y + UPG_H / 2 + 5, '13px monospace', '#8899ff', 'center');

      if (input.isMouseJustPressed(0)) {
        const mouse = input.getMousePosition();

        // Check UPGRADE SHIP button first.
        if (
          mouse.x >= UPG_X && mouse.x <= UPG_X + UPG_W &&
          mouse.y >= UPG_Y && mouse.y <= UPG_Y + UPG_H
        ) {
          currentState = 'UPGRADE';
        } else {
          // Check star nodes.
          for (const star of stars) {
            const dx = mouse.x - star.x;
            const dy = mouse.y - star.y;
            if (dx * dx + dy * dy <= STAR_RADIUS * STAR_RADIUS) {
              if (star.nodeType === 'STORE') {
                currentState = 'STORE';
              } else {
                enterCombat();
              }
              break;
            }
          }
        }
      }

    } else if (currentState === 'COMBAT') {
      // ── Combat ───────────────────────────────────────────────────────────────
      renderer.clear('#000000');

      // Sync cursor sprite to mouse position (centred on hotspot).
      const mouse     = input.getMousePosition();
      const entityPos = world.getComponent<PositionComponent>(cursorEntity, 'Position');
      if (entityPos !== undefined) {
        entityPos.x = mouse.x - SPRITE_SIZE / 2;
        entityPos.y = mouse.y - SPRITE_SIZE / 2;
      }

      // Logic systems.
      doorSystem.update(world);       // toggle doors (left-click)
      targetingSystem.update(world);  // weapon selection + targeting (left-click)
      selectionSystem.update(world);  // crew selection (left-click)
      movementSystem.update(world);   // crew movement (right-click + A*)
      powerSystem.update(world);      // power routing (hover + arrow keys)
      manningSystem.update(world);    // manning buffs (charge rate, evasion)
      shieldSystem.update(world);     // shield recharge + max-layer updates
      enemyAISystem.update(world);    // assign targets to charged enemy weapons
      combatSystem.update(world);     // weapon charging + projectile spawning
      projectileSystem.update(world); // advance projectiles, shield check, damage
      oxygenSystem.update(world);     // O2 regen / decay / equalization
      crewSystem.update(world);       // suffocation damage
      repairSystem.update(world);     // system repair + medbay healing

      // Render all layers.
      renderSystem.update(world);

      // Check for end-of-combat conditions (runs after render so the last frame is shown).
      const combatResult = victorySystem.checkCombatEnd(world);
      if (combatResult === 'VICTORY') {
        currentState = 'VICTORY';
      } else if (combatResult === 'GAME_OVER') {
        currentState = 'GAME_OVER';
      }

    } else if (currentState === 'VICTORY') {
      // ── Victory overlay on top of frozen combat scene ─────────────────────
      renderer.clear('#000000');
      renderSystem.update(world);
      victorySystem.drawVictory(renderer, input, applyRewardAndJump);

    } else if (currentState === 'GAME_OVER') {
      // ── Game Over screen ──────────────────────────────────────────────────
      const restart = victorySystem.drawGameOver(renderer, input);
      if (restart) {
        window.location.reload();
      }

    } else if (currentState === 'UPGRADE') {
      // ── Upgrade screen ────────────────────────────────────────────────────
      upgradeSystem.drawUpgradeScreen(world, renderer, input, () => {
        currentState = 'STAR_MAP';
      });

    } else if (currentState === 'STORE') {
      // ── Store screen ──────────────────────────────────────────────────────
      upgradeSystem.drawStoreScreen(world, renderer, input, () => {
        currentState = 'STAR_MAP';
      });
    }

    // Flush "just pressed" — last, so every system above can read this frame's events.
    input.update();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

init().catch((err: unknown) => console.error('[main] Initialisation failed:', err));
