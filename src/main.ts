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
import { EventSystem } from './game/systems/EventSystem';
import { MapSystem } from './game/systems/MapSystem';
import { ShipFactory } from './game/world/ShipFactory';
import { Pathfinder } from './utils/Pathfinder';
import { TILE_SIZE } from './game/constants';
import type { GameState } from './engine/GameState';
import type { ShipTemplate } from './game/data/ShipTemplate';
import type { WeaponTemplate } from './game/data/WeaponTemplate';
import type { EventTemplate } from './game/data/EventTemplate';
import type { EventReward } from './game/data/EventTemplate';
import type { CrewRace } from './game/data/CrewRace';
import type { CrewClass } from './game/data/CrewClass';
import type { FactionComponent } from './game/components/FactionComponent';
import type { ShipComponent } from './game/components/ShipComponent';
import type { WeaponComponent } from './game/components/WeaponComponent';

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
    AssetLoader.loadJSON<EventTemplate[]>('events', '/data/events.json'),
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

  // ── Entity setup ────────────────────────────────────────────────────────────

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

  function enterCombat(shipTemplateId = 'rebel_a'): void {
    victorySystem.reset();
    ShipFactory.spawnShip(world, shipTemplateId, enemyShipX, enemyShipY, 'ENEMY');
    // Clear any stale weapon targets left over from a previous combat session.
    for (const entity of world.query(['Weapon'])) {
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) weapon.targetRoomEntity = undefined;
    }
    currentState = 'COMBAT';
  }

  /**
   * Applies an EventReward to the player ship and returns to the Star Map.
   * Called when a narrative choice grants resources.
   */
  function applyEventReward(reward: EventReward): void {
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship === undefined) break;
      if (reward.scrap      !== undefined) ship.scrap = Math.max(0, ship.scrap + reward.scrap);
      if (reward.fuel       !== undefined) ship.fuel       += reward.fuel;
      if (reward.missiles   !== undefined) ship.missiles   += reward.missiles;
      if (reward.hullRepair !== undefined) {
        ship.currentHull = Math.min(ship.maxHull, Math.max(0, ship.currentHull + reward.hullRepair));
      }
      if (reward.weaponId !== undefined) {
        ship.cargoWeapons.push(reward.weaponId);
      }
      if (reward.crewMember === true) {
        const races:   CrewRace[]  = ['HUMAN', 'ENGI', 'MANTIS'];
        const classes: CrewClass[] = ['ENGINEER', 'GUNNER', 'PILOT', 'SECURITY'];
        const names    = ['Ally', 'Crest', 'Dorn', 'Exa', 'Fyra'];
        ShipFactory.spawnCrewMember(world, {
          name:      names[Math.floor(Math.random() * names.length)],
          race:      races[Math.floor(Math.random() * races.length)],
          crewClass: classes[Math.floor(Math.random() * classes.length)],
          skills:    { piloting: 0, engineering: 0, gunnery: 0, repair: 0, combat: 0 },
          roomId:    0,
        }, entity);
      }
      // Hull damage from events can cause game over.
      if (ship.currentHull <= 0) {
        currentState = 'GAME_OVER';
        return;
      }
      break;
    }
    currentState = 'STAR_MAP';
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
  const eventSystem       = new EventSystem();
  const mapSystem         = new MapSystem();
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
      renderer.drawText('Click a connected node to jump (costs 1 Fuel)', width / 2, 80, '12px monospace', '#445566', 'center');

      // "UPGRADE SHIP" button in the top-left corner.
      const UPG_W = 160;
      const UPG_H = 36;
      const UPG_X = 16;
      const UPG_Y = 16;
      renderer.drawRect(UPG_X, UPG_Y, UPG_W, UPG_H, '#0a0a1e', true);
      renderer.drawRect(UPG_X, UPG_Y, UPG_W, UPG_H, '#4455cc', false);
      renderer.drawText('UPGRADE SHIP', UPG_X + UPG_W / 2, UPG_Y + UPG_H / 2 + 5, '13px monospace', '#8899ff', 'center');

      // "STORE" button next to upgrade button.
      const STORE_W = 100;
      const STORE_X = UPG_X + UPG_W + 8;
      renderer.drawRect(STORE_X, UPG_Y, STORE_W, UPG_H, '#0a0a1e', true);
      renderer.drawRect(STORE_X, UPG_Y, STORE_W, UPG_H, '#557733', false);
      renderer.drawText('STORE', STORE_X + STORE_W / 2, UPG_Y + UPG_H / 2 + 5, '13px monospace', '#99cc55', 'center');

      // Handle upgrade/store button clicks before passing input to MapSystem.
      if (input.isMouseJustPressed(0)) {
        const mouse = input.getMousePosition();
        if (
          mouse.x >= UPG_X && mouse.x <= UPG_X + UPG_W &&
          mouse.y >= UPG_Y && mouse.y <= UPG_Y + UPG_H
        ) {
          currentState = 'UPGRADE';
        } else if (
          mouse.x >= STORE_X && mouse.x <= STORE_X + STORE_W &&
          mouse.y >= UPG_Y && mouse.y <= UPG_Y + UPG_H
        ) {
          currentState = 'STORE';
        }
      }

      // Map graph — handles node click detection internally.
      mapSystem.drawStarMap(renderer, input, world, {
        onCombat: (shipId) => { enterCombat(shipId); },
        onEvent:  (eventId) => {
          if (eventId !== undefined) {
            eventSystem.loadEvent(eventId);
          } else {
            eventSystem.loadRandomEvent();
          }
          currentState = 'EVENT';
        },
        onExit: () => {
          // New sector: regenerate the map.
          const { width: w, height: h } = renderer.getCanvasSize();
          mapSystem.nextSector(w, h);
        },
      });

    } else if (currentState === 'COMBAT') {
      // ── Combat ───────────────────────────────────────────────────────────────
      renderer.clear('#000000');

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

    } else if (currentState === 'EVENT') {
      // ── Narrative Event screen ─────────────────────────────────────────────
      renderer.clear('#020810');
      eventSystem.drawEventScreen(renderer, input, world, {
        onCombat:    (shipId) => { enterCombat(shipId); },
        onReward:    (reward) => { applyEventReward(reward); },
        onNextEvent: (id)     => { eventSystem.loadEvent(id); },
        onContinue:  ()       => { currentState = 'STAR_MAP'; },
      });

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
