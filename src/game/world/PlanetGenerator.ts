export type PlanetTheme = 'TERRA' | 'LAVA' | 'ICE' | 'DESERT' | 'GAS';

interface ThemePalette {
  /** Radial glow color drawn outside the sphere clip (atmosphere). */
  atmosphere: string;
  /** Solid base fill inside the sphere. */
  base: string;
  /** Accent colors used for texture blobs (continents, craters, clouds). */
  features: string[];
}

const PALETTES: Record<PlanetTheme, ThemePalette> = {
  TERRA: {
    atmosphere: 'rgba(80,160,255,0.25)',
    base:       '#1a4a8a',
    features:   ['#2d7a3a', '#3d9a4a', '#8b6914', '#c8a032', 'rgba(255,255,255,0.6)'],
  },
  LAVA: {
    atmosphere: 'rgba(255,80,0,0.30)',
    base:       '#3a0a00',
    features:   ['#cc3300', '#ff6600', '#ffaa00', '#ff3300', 'rgba(255,200,0,0.5)'],
  },
  ICE: {
    atmosphere: 'rgba(180,220,255,0.30)',
    base:       '#8aaabb',
    features:   ['#ddeeff', '#ffffff', '#6699aa', '#aaccdd', 'rgba(255,255,255,0.7)'],
  },
  DESERT: {
    atmosphere: 'rgba(220,140,60,0.20)',
    base:       '#c8882a',
    features:   ['#8b4513', '#d4a028', '#aa6622', '#663311', 'rgba(200,150,80,0.5)'],
  },
  GAS: {
    atmosphere: 'rgba(100,60,200,0.25)',
    base:       '#334466',
    features:   ['#44aacc', '#aa55cc', '#5599dd', '#224488', 'rgba(120,80,220,0.5)'],
  },
};

/**
 * Generates procedural 3D-looking planet sprites onto offscreen canvases.
 * Each canvas is `radius * 2.5` × `radius * 2.5` px so there is room for
 * the atmospheric glow halo beyond the hard sphere edge.
 * The planet sphere is centered at `(radius * 1.25, radius * 1.25)`.
 */
export class PlanetGenerator {
  /**
   * Renders a planet onto an offscreen HTMLCanvasElement and returns it.
   *
   * Drawing order (critical for the 3D illusion):
   *   1. Atmosphere halo  — unclipped radial glow
   *   2. Clip to sphere   — ctx.save() + arc clip
   *   3. Base fill        — solid base color
   *   4. Texture blobs    — seeded pseudo-random continents/craters/clouds
   *   5. Volume shadow    — radial gradient → dark rim (sphere shading)
   *   6. Terminator       — linear gradient → dark night-side
   *   7. Restore clip     — ctx.restore()
   */
  static generatePlanet(
    theme:  PlanetTheme,
    radius: number,
    seed:   number,
  ): HTMLCanvasElement {
    const size    = radius * 2.5;
    const cx      = size / 2;
    const cy      = size / 2;
    const palette = PALETTES[theme];

    const offscreen = document.createElement('canvas');
    offscreen.width  = size;
    offscreen.height = size;

    const ctx = offscreen.getContext('2d');
    if (ctx === null) return offscreen;

    // ── 1. Atmosphere (unclipped halo) ───────────────────────────────────────
    const atmosRadius = radius * 1.20;
    const atmos = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, atmosRadius);
    atmos.addColorStop(0, palette.atmosphere);
    atmos.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, atmosRadius, 0, Math.PI * 2);
    ctx.fillStyle = atmos;
    ctx.fill();

    // ── 2. Clip to sphere ─────────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // ── 3. Base color fill ────────────────────────────────────────────────────
    ctx.fillStyle = palette.base;
    ctx.fillRect(0, 0, size, size);

    // ── 4. Texture blobs (seeded pseudo-random) ───────────────────────────────
    const rng = PlanetGenerator.makeRng(seed);
    for (let i = 0; i < 200; i++) {
      const bx         = cx + (rng() - 0.5) * radius * 2;
      const by         = cy + (rng() - 0.5) * radius * 2;
      const br         = radius * (0.04 + rng() * 0.22);
      const colorIndex = Math.floor(rng() * palette.features.length);
      const alpha      = 0.30 + rng() * 0.55;

      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = palette.features[colorIndex];
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── 5. Volume shadow (sphere rim shading) ─────────────────────────────────
    const volGrad = ctx.createRadialGradient(
      cx + radius * 0.15, cy - radius * 0.15, radius * 0.10,
      cx, cy, radius,
    );
    volGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
    volGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
    volGrad.addColorStop(1.0, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = volGrad;
    ctx.fillRect(0, 0, size, size);

    // ── 6. Terminator (day / night divide) ────────────────────────────────────
    const termGrad = ctx.createLinearGradient(
      cx - radius * 0.20, cy - radius,
      cx + radius * 0.60, cy + radius,
    );
    termGrad.addColorStop(0.00, 'rgba(0,0,0,0)');
    termGrad.addColorStop(0.55, 'rgba(0,0,0,0)');
    termGrad.addColorStop(1.00, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = termGrad;
    ctx.fillRect(0, 0, size, size);

    // ── 7. Restore clip ───────────────────────────────────────────────────────
    ctx.restore();

    return offscreen;
  }

  /**
   * Park-Miller LCG — returns a seeded () => [0, 1) function.
   * Same seed always produces the exact same sequence.
   */
  private static makeRng(seed: number): () => number {
    let s = ((seed | 0) >>> 0) || 1;
    return (): number => {
      s = Math.imul(s, 16807) % 2147483647;
      if (s < 0) s += 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}
