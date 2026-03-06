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
import { EvasionSystem } from './game/systems/EvasionSystem';
import { CloakingSystem } from './game/systems/CloakingSystem';
import { TeleportSystem } from './game/systems/TeleportSystem';
import { EnemyAISystem } from './game/systems/EnemyAISystem';
import { VictorySystem } from './game/systems/VictorySystem';
import { UpgradeSystem } from './game/systems/UpgradeSystem';
import { EventSystem } from './game/systems/EventSystem';
import { MapSystem } from './game/systems/MapSystem';
import { ZoltanPowerSystem } from './game/systems/ZoltanPowerSystem';
import { AugmentSystem } from './game/systems/AugmentSystem';
import { HazardSystem } from './game/systems/HazardSystem';
import { DroneControlSystem } from './game/systems/DroneControlSystem';
import { ParticleSystem } from './game/systems/ParticleSystem';
import { ShipFactory } from './game/world/ShipFactory';
import { EnemyScaler } from './game/logic/EnemyScaler';
import { pregenerateExplosions } from './game/vfx/ExplosionGenerator';
import { pregenerateShields } from './game/vfx/ShieldGenerator';
import { ExplosionSystem } from './game/systems/ExplosionSystem';
import { ExplosionRenderSystem } from './game/systems/ExplosionRenderSystem';
import { ProjectileRenderSystem } from './game/systems/ProjectileRenderSystem';
import { Pathfinder } from './utils/Pathfinder';
import { PlanetGenerator } from './game/world/PlanetGenerator';
import type { PlanetTheme } from './game/world/PlanetGenerator';
import { TILE_SIZE } from './game/constants';
import type { GameState } from './engine/GameState';
import { GameStateData } from './engine/GameState';
import type { ShipTemplate } from './game/data/ShipTemplate';
import type { WeaponTemplate } from './game/data/WeaponTemplate';
import type { EventTemplate } from './game/data/EventTemplate';
import type { AugmentTemplate } from './game/data/AugmentTemplate';
import type { CrewRaceStats } from './game/data/CrewRaceStats';
import type { DroneTemplate } from './game/data/DroneTemplate';
import type { SectorTemplate } from './game/data/SectorTemplate';
import type { EventReward } from './game/data/EventTemplate';
import type { CrewRace } from './game/data/CrewRace';
import type { CrewClass } from './game/data/CrewClass';
import type { CrewComponent } from './game/components/CrewComponent';
import type { FactionComponent } from './game/components/FactionComponent';
import type { OwnerComponent } from './game/components/OwnerComponent';
import type { ShipComponent } from './game/components/ShipComponent';
import type { SystemComponent } from './game/components/SystemComponent';
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
    AssetLoader.loadJSON<ShipTemplate[]>('ships',       '/data/ships.json'),
    AssetLoader.loadJSON<WeaponTemplate[]>('weapons',   '/data/weapons.json'),
    AssetLoader.loadJSON<EventTemplate[]>('events',     '/data/events.json'),
    AssetLoader.loadJSON<CrewRaceStats[]>('crew_stats', '/data/crew_stats.json'),
    AssetLoader.loadJSON<AugmentTemplate[]>('augments', '/data/augments.json'),
    AssetLoader.loadJSON<DroneTemplate[]>('drones',     '/data/drones.json'),
    AssetLoader.loadJSON<SectorTemplate[]>('sectors',   '/data/sectors.json'),
  ]);

  // ── Planet generation ─────────────────────────────────────────────────────────
  const PLANET_THEMES: PlanetTheme[] = ['TERRA', 'LAVA', 'ICE', 'DESERT', 'GAS'];
  function randomPlanet(): void {
    const theme = PLANET_THEMES[Math.floor(Math.random() * PLANET_THEMES.length)];
    GameStateData.cachedPlanet = PlanetGenerator.generatePlanet(
      theme,
      300,
      Math.floor(Math.random() * 999983),
    );
    GameStateData.planetTheme = theme;
  }
  randomPlanet();

  // ── Explosion spritesheet pre-generation ──────────────────────────────────────
  // Pre-render all explosion types into cached 2D spritesheets once at startup.
  pregenerateExplosions();

  // ── Shield texture pre-generation ─────────────────────────────────────────────
  // Pre-render hex-grid shield sprites for PLAYER and ENEMY factions once at startup.
  pregenerateShields();

  // ── UI safe-zone layout ──────────────────────────────────────────────────────
  // These must match the panel constants in RenderSystem.ts.
  const LEFT_UI_W   = 250;   // left pillar panel width
  const TOP_UI_H    = 50;    // top bar height
  const BOTTOM_UI_H = 120;   // bottom weapon-strip height

  // The "safe zone" is the canvas area not covered by any HUD panel.
  const safeX = LEFT_UI_W;
  const safeY = TOP_UI_H;
  const safeW = canvas.width  - LEFT_UI_W;
  const safeH = canvas.height - TOP_UI_H - BOTTOM_UI_H;

  // ── Ship layout ─────────────────────────────────────────────────────────────
  // kestrel_a bounding box: 7 tiles wide (rooms span x=0..6), 3 tiles tall.
  // rebel_a   bounding box: 3 tiles wide, 2 tiles tall.
  const PLAYER_GRID_W = 7;
  const PLAYER_GRID_H = 3;
  const ENEMY_GRID_W  = 3;
  const ENEMY_GRID_H  = 2;

  // Player ship centre at 25% of safe zone width, vertically centred.
  const playerShipX = Math.round(safeX + safeW * 0.25 - (PLAYER_GRID_W * TILE_SIZE) / 2);
  const playerShipY = Math.round(safeY + safeH * 0.5  - (PLAYER_GRID_H * TILE_SIZE) / 2);

  // Enemy ship centre at 75% of safe zone width, vertically centred.
  const enemyShipX  = Math.round(safeX + safeW * 0.75 - (ENEMY_GRID_W  * TILE_SIZE) / 2);
  const enemyShipY  = Math.round(safeY + safeH * 0.5  - (ENEMY_GRID_H  * TILE_SIZE) / 2);

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

    // Scale the enemy template based on the current sector.
    const allShipsData   = AssetLoader.getJSON<ShipTemplate[]>('ships');
    const allWeaponsData = AssetLoader.getJSON<WeaponTemplate[]>('weapons') ?? [];
    const rawEnemy = allShipsData?.find((s) => s.id === shipTemplateId);
    const scaledTemplate = rawEnemy !== undefined
      ? EnemyScaler.scaleEnemy(rawEnemy, GameStateData.sectorNumber, allWeaponsData)
      : undefined;

    ShipFactory.spawnShip(world, shipTemplateId, enemyShipX, enemyShipY, 'ENEMY', scaledTemplate);
    // Clear any stale weapon targets left over from a previous combat session.
    for (const entity of world.query(['Weapon'])) {
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) weapon.targetRoomEntity = undefined;
    }

    // weapon_pre_igniter: player weapons start fully charged.
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship?.augments.includes('weapon_pre_igniter') !== true) break;
      for (const wEntity of world.query(['Weapon', 'Owner'])) {
        const ownerComp = world.getComponent<OwnerComponent>(wEntity, 'Owner');
        if (ownerComp?.shipEntity !== entity) continue;
        const weapon = world.getComponent<WeaponComponent>(wEntity, 'Weapon');
        if (weapon !== undefined) weapon.charge = weapon.maxCharge;
      }
      break;
    }

    currentState = 'COMBAT';
  }

  /**
   * Applies all side-effects of an EventReward WITHOUT transitioning state.
   * Used both by applyEventReward (→ STAR_MAP) and as onInstantReward before combat.
   */
  function applyRewardEffects(reward: EventReward): void {
    // ── Find player ship root ──────────────────────────────────────────────
    let playerShipEntity: number | undefined;
    let ship: ShipComponent | undefined;
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      playerShipEntity = entity;
      ship = world.getComponent<ShipComponent>(entity, 'Ship');
      break;
    }
    if (ship === undefined || playerShipEntity === undefined) return;

    // ── Ship resources ─────────────────────────────────────────────────────
    if (reward.scrap !== undefined) {
      // scrap_recovery_arm: 10% more scrap per stack.
      const armCount = ship.augments.filter((a) => a === 'scrap_recovery_arm').length;
      const scrapMult = 1.0 + armCount * 0.1;
      ship.scrap = Math.max(0, ship.scrap + Math.round(reward.scrap * scrapMult));
    }
    if (reward.fuel       !== undefined) ship.fuel       += reward.fuel;
    if (reward.missiles   !== undefined) ship.missiles   += reward.missiles;
    if (reward.hullRepair !== undefined) {
      ship.currentHull = Math.min(ship.maxHull, Math.max(0, ship.currentHull + reward.hullRepair));
    }
    if (reward.weaponId !== undefined) ship.cargoWeapons.push(reward.weaponId);

    // ── Crew gain ──────────────────────────────────────────────────────────
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
      }, playerShipEntity);
    }

    // ── Crew loss ──────────────────────────────────────────────────────────
    if (reward.loseCrewMember === true) {
      const pool: number[] = [];
      for (const e of world.query(['Crew', 'Owner'])) {
        const o = world.getComponent<OwnerComponent>(e, 'Owner');
        if (o?.shipEntity === playerShipEntity) pool.push(e);
      }
      if (pool.length > 0) {
        world.destroyEntity(pool[Math.floor(Math.random() * pool.length)]);
      }
    }

    // ── Crew damage ────────────────────────────────────────────────────────
    if (reward.crewDamage !== undefined) {
      const pool: number[] = [];
      for (const e of world.query(['Crew', 'Owner'])) {
        const o = world.getComponent<OwnerComponent>(e, 'Owner');
        if (o?.shipEntity === playerShipEntity) pool.push(e);
      }
      if (pool.length > 0) {
        const target = pool[Math.floor(Math.random() * pool.length)];
        const crew = world.getComponent<CrewComponent>(target, 'Crew');
        if (crew !== undefined) {
          crew.health -= reward.crewDamage;
          if (crew.health <= 0) world.destroyEntity(target);
        }
      }
    }

    // ── System damage ──────────────────────────────────────────────────────
    if (reward.systemDamage !== undefined) {
      for (const [sysType, amount] of Object.entries(reward.systemDamage)) {
        for (const e of world.query(['System', 'Owner'])) {
          const o = world.getComponent<OwnerComponent>(e, 'Owner');
          if (o?.shipEntity !== playerShipEntity) continue;
          const sys = world.getComponent<SystemComponent>(e, 'System');
          if (sys?.type === sysType) { sys.damageAmount += amount; break; }
        }
      }
    }

    // ── Map / rebel fleet effects ──────────────────────────────────────────
    if (reward.revealMap        === true)      mapSystem.revealAllNodes();
    if (reward.delayRebels      !== undefined) mapSystem.delayRebels(reward.delayRebels);
    if (reward.fleetAdvancement !== undefined) mapSystem.advanceRebels(reward.fleetAdvancement);
  }

  /**
   * Applies an EventReward and transitions to STAR_MAP (or GAME_OVER if hull reaches 0).
   * Called by the onReward callback from EventSystem.
   */
  function applyEventReward(reward: EventReward): void {
    applyRewardEffects(reward);
    // Check if hull damage caused by the event is lethal.
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship !== undefined && ship.currentHull <= 0) {
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

  const targetingSystem      = new TargetingSystem(input, renderer);
  const combatSystem         = new CombatSystem();
  const projectileSystem     = new ProjectileSystem();
  const particleSystem          = new ParticleSystem(renderer);
  const explosionSystem         = new ExplosionSystem();
  const explosionRenderSystem   = new ExplosionRenderSystem(renderer);
  const projectileRenderSystem  = new ProjectileRenderSystem(renderer);
  const victorySystem      = new VictorySystem();
  const upgradeSystem      = new UpgradeSystem();
  const eventSystem        = new EventSystem();
  const mapSystem          = new MapSystem();
  const renderSystem       = new RenderSystem(renderer, targetingSystem, input, projectileSystem);
  const selectionSystem    = new SelectionSystem(input);
  const movementSystem     = new MovementSystem(input, pathfinder);
  const powerSystem        = new PowerSystem(input);
  const doorSystem         = new DoorSystem(input);
  const oxygenSystem       = new OxygenSystem();
  const crewSystem         = new CrewSystem();
  const manningSystem      = new ManningSystem();
  const repairSystem       = new RepairSystem();
  const shieldSystem       = new ShieldSystem();
  const evasionSystem      = new EvasionSystem();
  const cloakingSystem     = new CloakingSystem(input);
  const teleportSystem     = new TeleportSystem(input);
  const enemyAISystem      = new EnemyAISystem();
  const zoltanPowerSystem  = new ZoltanPowerSystem();
  const augmentSystem      = new AugmentSystem();
  const hazardSystem       = new HazardSystem(mapSystem);
  const droneControlSystem = new DroneControlSystem(input);

  // Inject CombatSystem into RenderSystem so beam displays can be drawn.
  renderSystem.setCombatSystem(combatSystem);
  // Inject PowerSystem into RenderSystem so the system power panel can be drawn.
  renderSystem.setPowerSystem(powerSystem);
  // Inject ParticleSystem into ProjectileSystem so impacts spawn spark bursts.
  projectileSystem.setParticleSystem(particleSystem);
  // Inject ExplosionSystem into ProjectileSystem so direct hits spawn explosions.
  projectileSystem.setExplosionSystem(explosionSystem);

  // ── Game Loop ───────────────────────────────────────────────────────────────

  let lastTimestamp: number = performance.now();
  let isPaused = false;

  function gameLoop(timestamp: number): void {
    // Space toggles tactical pause — only meaningful during combat.
    if (currentState === 'COMBAT' && input.isKeyJustPressed('Space')) {
      isPaused = !isPaused;
    }
    // Produce dt=0 while paused so all timer-driven logic naturally freezes.
    // Always advance lastTimestamp to prevent a large spike when unpausing.
    if (isPaused) {
      Time.tick(lastTimestamp, lastTimestamp);
    } else {
      Time.tick(timestamp, lastTimestamp);
    }
    lastTimestamp = timestamp;

    if (currentState === 'STAR_MAP') {
      // ── Star Map ─────────────────────────────────────────────────────────────
      const { width } = renderer.getCanvasSize();
      renderer.clear('#00000f');

      renderer.drawText('STAR MAP', width / 2, 55, '28px monospace', '#aaccff', 'center');
      renderer.drawText('Click a connected node to jump (costs 1 Fuel)', width / 2, 80, '12px monospace', '#445566', 'center');

      // Upgrades are only available from the Store — no map-level shortcut button.

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
        onStore: () => { currentState = 'STORE'; },
        onExit: () => {
          // New sector: regenerate the map, roll a new planet, increment sector.
          const { width: w, height: h } = renderer.getCanvasSize();
          mapSystem.nextSector(w, h);
          randomPlanet();
          GameStateData.sectorNumber += 1;
        },
      });

    } else if (currentState === 'COMBAT') {
      // ── Combat ───────────────────────────────────────────────────────────────
      // Reset cursor to default; systems will override it based on hover context.
      input.setCursor('default');
      renderer.clear('#000000');

      // Logic systems.
      doorSystem.update(world);         // toggle doors (left-click)
      targetingSystem.update(world);    // weapon selection + targeting (left-click)
      selectionSystem.update(world);    // crew selection (left-click)
      movementSystem.update(world);     // crew movement (right-click + A*)
      teleportSystem.update(world);     // crew teleportation 'T' key
      droneControlSystem.update(world); // drone activation ('D') + drone AI
      powerSystem.update(world);        // power routing (hover + arrow keys)
      zoltanPowerSystem.update(world);  // Zoltan +1 free power to occupied room system
      evasionSystem.update(world);      // reset evasion + ENGINES power baseline (incl. Zoltan)
      manningSystem.update(world);      // manning buffs (charge rate, crew evasion bonus)
      augmentSystem.update(world);      // passive augment effects (automated_reloader, medbots)
      cloakingSystem.update(world);     // cloak activation + evasion bonus + freeze enemy charges
      hazardSystem.update(world);       // environmental hazards (asteroids, flares, ion, nebula)
      shieldSystem.update(world);       // shield recharge + max-layer updates (incl. Zoltan)
      if (!isPaused) enemyAISystem.update(world); // assign targets to charged enemy weapons
      combatSystem.update(world);       // weapon charging + projectile spawning + beam fire
      projectileSystem.update(world);   // advance projectiles, shield check, damage
      explosionSystem.update(world);    // tick explosion ages, destroy expired entities
      oxygenSystem.update(world);       // O2 regen / decay / equalization + Lanius drain
      crewSystem.update(world);         // suffocation damage (racial multipliers)
      repairSystem.update(world);       // system repair + medbay healing (racial repair speed)

      // Render all layers.
      renderSystem.update(world);
      // Render in-flight projectiles with neon/trail VFX.
      projectileRenderSystem.update(world);
      // Render noise-dissolve explosions on top of the world scene.
      explosionRenderSystem.update(world);
      // Render particle bursts on top of the world scene.
      particleSystem.update();

      // Draw pause overlay on top of the scene when paused.
      if (isPaused) {
        const { width: cw, height: ch } = renderer.getCanvasSize();
        renderer.drawRect(0, 0, cw, ch, 'rgba(0,0,0,0.45)', true);
        renderer.drawText('PAUSED', cw / 2, ch / 2, '48px monospace', '#ffffff', 'center');
        renderer.drawText('SPACE to resume', cw / 2, ch / 2 + 44, '16px monospace', '#aaaaaa', 'center');
      }

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
        onCombat:        (shipId) => { enterCombat(shipId); },
        onReward:        (reward) => { applyEventReward(reward); },
        onInstantReward: (reward) => { applyRewardEffects(reward); },
        onNextEvent:     (id)     => { eventSystem.loadEvent(id); },
        onStore:         ()       => { currentState = 'STORE'; },
        onContinue:      ()       => { currentState = 'STAR_MAP'; },
      });

    } else if (currentState === 'UPGRADE') {
      // ── Upgrade screen ────────────────────────────────────────────────────
      upgradeSystem.drawUpgradeScreen(world, renderer, input, () => {
        currentState = 'STAR_MAP';
      });

    } else if (currentState === 'STORE') {
      // ── Store screen ──────────────────────────────────────────────────────
      upgradeSystem.drawStoreScreen(
        world, renderer, input,
        () => { currentState = 'STAR_MAP'; },
        () => { currentState = 'UPGRADE'; },
      );
    }

    // Flush "just pressed" — last, so every system above can read this frame's events.
    input.update();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

init().catch((err: unknown) => console.error('[main] Initialisation failed:', err));
