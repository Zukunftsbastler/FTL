/**
 * Generates animated explosion spritesheets using a WebGL2 noise-dissolve shader.
 *
 * The WebGL context is temporary — used only during generation — so it does not
 * count against the browser's context limit.  Generated sheets are cached by
 * visual type ('LASER', 'MISSILE', 'ION', 'BEAM') and reused each game session.
 */

// ── Spritesheet layout constants ─────────────────────────────────────────────

/** Pixel size of a single frame in the spritesheet. */
export const EXPLOSION_FRAME_SIZE  = 64;
/** Total frames per spritesheet. */
export const EXPLOSION_FRAME_COUNT = 36;
/** Frames per row in the spritesheet grid. */
export const EXPLOSION_GRID_COLS   = 6;
/** Frames per column in the spritesheet grid (rows = frameCount / cols). */
export const EXPLOSION_GRID_ROWS   = EXPLOSION_FRAME_COUNT / EXPLOSION_GRID_COLS;

// ── GLSL source ───────────────────────────────────────────────────────────────

const VERT_SRC = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG_SRC = `#version 300 es
precision highp float;

uniform float u_time;        // 0.0 = birth, 1.0 = fully dissolved
uniform float u_noiseScale;  // controls noise granularity
uniform vec3  u_colorInner;  // bright center colour
uniform vec3  u_colorMid;    // mid-ring colour
uniform vec3  u_colorOuter;  // outer / edge colour
uniform vec2  u_resolution;  // frame pixel dimensions
out vec4 outColor;

// ── Noise functions ──────────────────────────────────────────────────────────

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 17.31);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i),             hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p  = p * 2.07 + vec2(1.32, 5.74);
    a *= 0.5;
  }
  return v;
}

// ── Main ─────────────────────────────────────────────────────────────────────

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d  = length(uv - 0.5) * 2.0;           // 0 = centre, 1 = edge

  // Animate noise field over time for a churning look.
  float n  = fbm(uv * u_noiseScale - vec2(u_time * 1.5, u_time * 0.8));
  float n2 = noise(uv * u_noiseScale * 2.0 + vec2(u_time * 3.0, 0.7));

  // Dissolve threshold shrinks from 0.88 → 0.0 as u_time goes 0 → 1.
  // The noise offset creates an organic, crumbling edge.
  float threshold = (1.0 - u_time) * 0.88 + n * 0.30;
  float alpha     = smoothstep(0.0, 0.12, threshold - d);

  if (alpha < 0.01) discard;

  // Radial colour gradient: inner → mid → outer.
  vec3 col = mix(u_colorInner, u_colorMid,  smoothstep(0.0, 0.40, d));
  col       = mix(col,          u_colorOuter, smoothstep(0.40, 0.90, d));

  // Brightness fades over lifetime; noise adds gritty speckling.
  float bright = 1.3 * (1.0 - u_time * 0.75) + 0.15;
  col = col * bright + n2 * 0.12 * u_colorMid * (1.0 - u_time);

  outColor = vec4(clamp(col, 0.0, 2.0), alpha);
}`;

// ── Per-type visual configuration ─────────────────────────────────────────────

interface TypeConfig {
  colorInner: [number, number, number];
  colorMid:   [number, number, number];
  colorOuter: [number, number, number];
  noiseScale: number;
  maxAge:     number;
}

const CONFIGS: Record<string, TypeConfig> = {
  MISSILE: {
    colorInner: [1.00, 0.95, 0.70],
    colorMid:   [1.00, 0.40, 0.00],
    colorOuter: [0.30, 0.08, 0.00],
    noiseScale: 3.0,
    maxAge:     0.85,
  },
  LASER: {
    colorInner: [0.90, 1.00, 0.90],
    colorMid:   [0.20, 1.00, 0.20],
    colorOuter: [0.00, 0.25, 0.00],
    noiseScale: 6.0,
    maxAge:     0.50,
  },
  ION: {
    colorInner: [0.85, 1.00, 1.00],
    colorMid:   [0.00, 0.80, 1.00],
    colorOuter: [0.00, 0.20, 0.50],
    noiseScale: 4.0,
    maxAge:     0.65,
  },
  BEAM: {
    colorInner: [1.00, 1.00, 0.90],
    colorMid:   [1.00, 0.90, 0.20],
    colorOuter: [0.80, 0.30, 0.00],
    noiseScale: 5.0,
    maxAge:     0.60,
  },
};

// ── Cache ─────────────────────────────────────────────────────────────────────

const sheetCache = new Map<string, HTMLCanvasElement>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the duration in seconds for one complete explosion of the given type.
 * Falls back to 0.6 s for unknown types.
 */
export function getExplosionMaxAge(type: string): number {
  return CONFIGS[type]?.maxAge ?? 0.6;
}

/**
 * Returns the cached spritesheet for the given type, or undefined if not yet
 * generated.  Call `pregenerate()` during init to ensure all sheets are ready
 * before the first combat frame.
 */
export function getExplosionSheet(type: string): HTMLCanvasElement | undefined {
  return sheetCache.get(type);
}

/**
 * Pre-renders spritesheets for all known visual types.
 * Should be called once during game initialisation (before the first frame).
 */
export function pregenerateExplosions(): void {
  for (const type of Object.keys(CONFIGS)) {
    if (!sheetCache.has(type)) {
      const sheet = buildSheet(type);
      if (sheet !== null) sheetCache.set(type, sheet);
    }
  }
}

// ── Internal WebGL pipeline ───────────────────────────────────────────────────

function buildSheet(type: string): HTMLCanvasElement | null {
  const cfg = CONFIGS[type];
  if (cfg === undefined) return null;

  // ── Offscreen WebGL2 canvas (one frame at a time) ─────────────────────────
  const glCanvas = document.createElement('canvas');
  glCanvas.width  = EXPLOSION_FRAME_SIZE;
  glCanvas.height = EXPLOSION_FRAME_SIZE;

  const gl = glCanvas.getContext('webgl2', {
    antialias:            false,
    alpha:                true,
    premultipliedAlpha:   false,
    preserveDrawingBuffer: true,   // Required so ctx2d.drawImage reads the correct frame.
  }) as WebGL2RenderingContext | null;

  if (gl === null) {
    console.warn(`ExplosionGenerator: WebGL2 not available — falling back to blank sheet.`);
    return makeFallbackSheet();
  }

  // Compile shaders.
  const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (vert === null || frag === null) return makeFallbackSheet();

  const prog = gl.createProgram();
  if (prog === null) return makeFallbackSheet();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('ExplosionGenerator link error:', gl.getProgramInfoLog(prog));
    return makeFallbackSheet();
  }
  gl.useProgram(prog);

  // Fullscreen quad covering [-1, 1] × [-1, 1].
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations.
  const uTime       = gl.getUniformLocation(prog, 'u_time');
  const uNoiseScale = gl.getUniformLocation(prog, 'u_noiseScale');
  const uColorInner = gl.getUniformLocation(prog, 'u_colorInner');
  const uColorMid   = gl.getUniformLocation(prog, 'u_colorMid');
  const uColorOuter = gl.getUniformLocation(prog, 'u_colorOuter');
  const uResolution = gl.getUniformLocation(prog, 'u_resolution');

  gl.uniform1f(uNoiseScale, cfg.noiseScale);
  gl.uniform3fv(uColorInner, cfg.colorInner);
  gl.uniform3fv(uColorMid,   cfg.colorMid);
  gl.uniform3fv(uColorOuter, cfg.colorOuter);
  gl.uniform2f(uResolution, EXPLOSION_FRAME_SIZE, EXPLOSION_FRAME_SIZE);

  gl.viewport(0, 0, EXPLOSION_FRAME_SIZE, EXPLOSION_FRAME_SIZE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // ── 2D spritesheet target canvas ─────────────────────────────────────────
  const sheetW = EXPLOSION_FRAME_SIZE * EXPLOSION_GRID_COLS;
  const sheetH = EXPLOSION_FRAME_SIZE * EXPLOSION_GRID_ROWS;
  const sheet  = document.createElement('canvas');
  sheet.width  = sheetW;
  sheet.height = sheetH;
  const ctx2d  = sheet.getContext('2d');
  if (ctx2d === null) return makeFallbackSheet();

  // ── Render each frame ────────────────────────────────────────────────────
  for (let i = 0; i < EXPLOSION_FRAME_COUNT; i++) {
    const t   = i / (EXPLOSION_FRAME_COUNT - 1);   // 0.0 → 1.0
    const col = i % EXPLOSION_GRID_COLS;
    const row = Math.floor(i / EXPLOSION_GRID_COLS);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();   // Ensure the frame is complete before readback.

    ctx2d.drawImage(
      glCanvas,
      0, 0, EXPLOSION_FRAME_SIZE, EXPLOSION_FRAME_SIZE,
      col * EXPLOSION_FRAME_SIZE,
      row * EXPLOSION_FRAME_SIZE,
      EXPLOSION_FRAME_SIZE, EXPLOSION_FRAME_SIZE,
    );
  }

  // Clean up the temporary WebGL context.
  const ext = gl.getExtension('WEBGL_lose_context');
  ext?.loseContext();

  return sheet;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (shader === null) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('ExplosionGenerator shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Returns a small blank transparent canvas as a graceful fallback. */
function makeFallbackSheet(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width  = EXPLOSION_FRAME_SIZE * EXPLOSION_GRID_COLS;
  c.height = EXPLOSION_FRAME_SIZE * EXPLOSION_GRID_ROWS;
  return c;
}
