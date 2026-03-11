import { AssetLoader }         from '../../utils/AssetLoader';
import { UIRenderer }          from '../../engine/ui/UIRenderer';
import { BackgroundGenerator } from '../world/BackgroundGenerator';
import { GameStateData }       from '../../engine/GameState';
import type { Difficulty }     from '../../engine/GameState';
import type { IInput }         from '../../engine/IInput';
import type { IRenderer }      from '../../engine/IRenderer';
import type { ShipTemplate }   from '../data/ShipTemplate';
import type { WeaponTemplate } from '../data/WeaponTemplate';

interface Hitbox { x: number; y: number; w: number; h: number; action: () => void }

/**
 * Renders the Hangar — the main-menu ship selection screen.
 *
 * Call `draw(renderer, input, onLaunch)` each frame while state === 'HANGAR'.
 * When the player clicks LAUNCH, `onLaunch(selectedShipId)` is called.
 */
export class HangarSystem {
  private selectedShipId: string | null = null;
  private bgCanvas:       HTMLCanvasElement | null = null;

  draw(
    renderer: IRenderer,
    input:    IInput,
    onLaunch: (shipId: string) => void,
  ): void {
    const { width, height } = renderer.getCanvasSize();
    const ctx               = renderer.getContext();
    const hitboxes: Hitbox[] = [];

    // ── Atmospheric background ─────────────────────────────────────────────
    if (this.bgCanvas === null ||
        this.bgCanvas.width !== width || this.bgCanvas.height !== height) {
      this.bgCanvas = BackgroundGenerator.generate('STANDARD', width, height, 54321);
    }
    renderer.drawCanvas(this.bgCanvas, 0, 0);
    renderer.drawRect(0, 0, width, height, 'rgba(0,0,0,0.55)', true);

    // ── Title ──────────────────────────────────────────────────────────────
    renderer.drawText('THE  HANGAR', width / 2, 42, '28px monospace', '#ffffff', 'center');
    renderer.drawText('Select your ship and begin the run.',
      width / 2, 66, '12px monospace', '#556677', 'center');

    // ── Collect player ships ───────────────────────────────────────────────
    const allShips    = AssetLoader.getJSON<ShipTemplate[]>('ships') ?? [];
    const playerShips = allShips.filter((s) => s.isPlayerShip === true);

    if (playerShips.length > 0 && this.selectedShipId === null) {
      this.selectedShipId = playerShips[0].id;
    }

    const selectedShip = playerShips.find((s) => s.id === this.selectedShipId) ?? playerShips[0];

    // ── Difficulty selector ────────────────────────────────────────────────
    {
      const levels: Difficulty[] = ['EASY', 'NORMAL', 'HARD'];
      const PILL_W = 90; const PILL_H = 32; const GAP = 8;
      const totalW = levels.length * PILL_W + (levels.length - 1) * GAP;
      let dx = width / 2 - totalW / 2;
      const dy = 78;

      const diffTips: Record<Difficulty, string> = {
        EASY:   'More starting resources. Increased scrap rewards. Slower Rebel Fleet. Weaker enemies.',
        NORMAL: 'The standard experience. A balanced challenge.',
        HARD:   'Zero starting scrap. Reduced rewards. Faster Rebel pursuit. Enemies are heavily armed.',
      };
      const mouse = input.getMousePosition();

      for (const lvl of levels) {
        const isActive = GameStateData.difficulty === lvl;
        const pillColor = isActive
          ? (lvl === 'EASY' ? '#00cc66' : lvl === 'HARD' ? '#cc3333' : '#00ccdd')
          : 'rgba(60,70,90,0.7)';
        UIRenderer.drawPill(ctx, dx, dy, PILL_W, PILL_H, pillColor);
        renderer.drawText(lvl, dx + PILL_W / 2, dy + PILL_H / 2 + 5,
          isActive ? 'bold 12px monospace' : '11px monospace',
          isActive ? '#001830' : '#556677', 'center');
        const capLvl = lvl;
        hitboxes.push({ x: dx, y: dy, w: PILL_W, h: PILL_H,
          action: () => { GameStateData.difficulty = capLvl; } });

        // Tooltip on hover.
        if (mouse.x >= dx && mouse.x <= dx + PILL_W &&
            mouse.y >= dy && mouse.y <= dy + PILL_H) {
          renderer.drawTooltip(dx + PILL_W / 2, dy, diffTips[lvl]);
        }

        dx += PILL_W + GAP;
      }
    }

    // ── Tutorial toggle ────────────────────────────────────────────────────
    {
      const TW  = 170; const TH = 28;
      const TX  = width / 2 - TW / 2;
      const TY  = 118;
      const tutOn  = GameStateData.tutorialEnabled;
      const tutMouse = input.getMousePosition();
      UIRenderer.drawPill(ctx, TX, TY, TW, TH, tutOn ? '#00cc66' : 'rgba(60,70,90,0.7)');
      renderer.drawText(`TUTORIAL: ${tutOn ? 'ON' : 'OFF'}`,
        TX + TW / 2, TY + TH / 2 + 5,
        tutOn ? 'bold 11px monospace' : '11px monospace',
        tutOn ? '#001830' : '#556677', 'center');
      hitboxes.push({ x: TX, y: TY, w: TW, h: TH,
        action: () => { GameStateData.tutorialEnabled = !GameStateData.tutorialEnabled; } });
      if (tutMouse.x >= TX && tutMouse.x <= TX + TW && tutMouse.y >= TY && tutMouse.y <= TY + TH) {
        renderer.drawTooltip(TX + TW / 2, TY,
          tutOn ? 'Click to disable in-game tutorial pop-ups.'
                : 'Click to enable in-game tutorial pop-ups.');
      }
    }

    // ── Left panel: Ship list ──────────────────────────────────────────────
    const LP_X = 10; const LP_W = 260;
    const LP_Y = 155; const LP_H = height - LP_Y - 70;
    UIRenderer.drawSciFiPanel(ctx, LP_X, LP_Y, LP_W, LP_H,
      { lightBg: true, borderColor: '#ffffff', alpha: 0.93 });
    renderer.drawText('SHIPS', LP_X + LP_W / 2, LP_Y + 18, '13px monospace', '#001830', 'center');
    renderer.drawLine(LP_X + 8, LP_Y + 25, LP_X + LP_W - 8, LP_Y + 25, '#bbccdd', 1);

    let listY = LP_Y + 36;
    for (const ship of playerShips) {
      const isSelected = ship.id === this.selectedShipId;
      const rowH = 44;
      const rowBorder = isSelected ? '#ffffff' : '#336688';

      UIRenderer.drawSciFiPanel(ctx, LP_X + 8, listY, LP_W - 16, rowH,
        { lightBg: isSelected, borderColor: rowBorder, alpha: isSelected ? 0.95 : 0.5 });

      renderer.drawText(ship.name, LP_X + 18, listY + 16,
        'bold 12px monospace', isSelected ? '#001830' : '#aaccee', 'left');
      renderer.drawText(`Hull: ${ship.maxHull}`, LP_X + 18, listY + 30,
        '10px monospace', isSelected ? '#001830' : '#557788', 'left');

      const capturedId = ship.id;
      hitboxes.push({ x: LP_X + 8, y: listY, w: LP_W - 16, h: rowH,
        action: () => { this.selectedShipId = capturedId; } });

      listY += rowH + 6;
    }

    // ── Right panel: Ship details ──────────────────────────────────────────
    const RP_X = LP_X + LP_W + 10;
    const RP_W = Math.min(500, width - RP_X - 10);
    const RP_Y = LP_Y; const RP_H = LP_H;

    UIRenderer.drawSciFiPanel(ctx, RP_X, RP_Y, RP_W, RP_H,
      { lightBg: true, borderColor: '#ffffff', alpha: 0.93 });

    if (selectedShip !== undefined) {
      renderer.drawText(selectedShip.name.toUpperCase(),
        RP_X + RP_W / 2, RP_Y + 20, 'bold 14px monospace', '#001830', 'center');
      renderer.drawLine(RP_X + 8, RP_Y + 28, RP_X + RP_W - 8, RP_Y + 28, '#bbccdd', 1);

      const allWeapons = AssetLoader.getJSON<WeaponTemplate[]>('weapons') ?? [];
      const PILL_H = 22; const PILL_PAD = 8; const PILL_GAP = 4;
      const FONT = '11px monospace';
      const COL = RP_X + 14;
      let dy = RP_Y + 36;

      const drawStat = (label: string, value: string): void => {
        ctx.font = FONT;
        const pw = ctx.measureText(value).width + PILL_PAD * 2;
        UIRenderer.drawPill(ctx, COL, dy, pw, PILL_H, '#00ccdd');
        ctx.font = FONT; ctx.fillStyle = '#001820'; ctx.textAlign = 'left';
        ctx.fillText(value, COL + PILL_PAD, dy + PILL_H / 2 + 4);
        renderer.drawText(label, COL + pw + 8, dy + PILL_H / 2 + 4,
          FONT, '#334455', 'left');
        dy += PILL_H + PILL_GAP;
      };

      drawStat('Max Hull',   String(selectedShip.maxHull));
      drawStat('Reactor',    String(selectedShip.startingReactorPower) + ' power');
      dy += 4;

      renderer.drawText('SYSTEMS', COL, dy + 10, FONT, '#556677', 'left'); dy += 20;
      for (const sys of selectedShip.systems) {
        drawStat(sys.type, `Lv ${sys.level}`);
      }

      dy += 4;
      renderer.drawText('WEAPONS', COL, dy + 10, FONT, '#556677', 'left'); dy += 20;
      if (selectedShip.startingWeapons.length === 0) {
        renderer.drawText('(none)', COL, dy + 10, FONT, '#778899', 'left'); dy += 20;
      } else {
        for (const wId of selectedShip.startingWeapons) {
          const name = allWeapons.find((w) => w.id === wId)?.name ?? wId;
          drawStat('', name);
        }
      }

      dy += 4;
      renderer.drawText('CREW', COL, dy + 10, FONT, '#556677', 'left'); dy += 20;
      if (selectedShip.startingCrew.length === 0) {
        renderer.drawText('(none)', COL, dy + 10, FONT, '#778899', 'left');
      } else {
        for (const crew of selectedShip.startingCrew) {
          drawStat(crew.race, crew.name);
        }
      }
    }

    // ── LAUNCH button ──────────────────────────────────────────────────────
    const BW = 220; const BH = 48;
    const BX = width / 2 - BW / 2; const BY = height - BH - 12;
    const canLaunch = this.selectedShipId !== null;

    UIRenderer.drawSciFiPanel(ctx, BX, BY, BW, BH,
      { lightBg: canLaunch, borderColor: canLaunch ? '#00ffcc' : '#334455', alpha: 0.97 });
    renderer.drawText('▶  LAUNCH', BX + BW / 2, BY + BH / 2 + 7,
      'bold 16px monospace', canLaunch ? '#001830' : '#334455', 'center');

    if (canLaunch) {
      hitboxes.push({ x: BX, y: BY, w: BW, h: BH,
        action: () => { onLaunch(this.selectedShipId!); } });
    }

    // ── Click handling ─────────────────────────────────────────────────────
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
}
