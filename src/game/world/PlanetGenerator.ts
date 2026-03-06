export type PlanetTheme = 'TERRA' | 'LAVA' | 'ICE' | 'DESERT' | 'GAS';

/** RGB triplets in [0, 1] range — passed directly as WebGL vec3 uniforms. */
type RGB = [number, number, number];

interface ThemePalette {
  color1: RGB;  // deep base  (ocean, magma crust, ice sheet, sand, gas band)
  color2: RGB;  // feature    (land, lava river, ice fracture, rock, swirl)
  color3: RGB;  // highlight  (clouds, bright magma, snow cap, pale dune, accent)
  atmos:  RGB;  // atmosphere glow tint
}

/**
 * Returns a CSS hex color representing the planet theme's atmosphere glow —
 * the most visually distinctive per-theme colour, used to tint star map nodes.
 */
export function getPlanetNodeColor(theme: PlanetTheme): string {
  const [r, g, b] = PALETTES[theme].atmos;
  const hex = (v: number): string => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

const PALETTES: Record<PlanetTheme, ThemePalette> = {
  TERRA:  { color1: [0.06,0.25,0.50], color2: [0.14,0.48,0.20], color3: [0.90,0.92,0.95], atmos: [0.30,0.65,1.00] },
  LAVA:   { color1: [0.18,0.04,0.02], color2: [0.80,0.25,0.02], color3: [1.00,0.80,0.00], atmos: [1.00,0.30,0.00] },
  ICE:    { color1: [0.50,0.72,0.85], color2: [0.80,0.92,1.00], color3: [1.00,1.00,1.00], atmos: [0.70,0.88,1.00] },
  DESERT: { color1: [0.70,0.45,0.12], color2: [0.50,0.26,0.08], color3: [0.90,0.75,0.45], atmos: [0.85,0.60,0.25] },
  GAS:    { color1: [0.15,0.20,0.40], color2: [0.25,0.60,0.70], color3: [0.60,0.30,0.80], atmos: [0.40,0.25,0.70] },
};

// ── GLSL source strings ────────────────────────────────────────────────────────

const VERT_SRC = `#version 300 es
in  vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv        = a_pos;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/**
 * Fragment shader — the core of the pixel-art planet look.
 *
 * Coordinate system
 *   v_uv spans [-1, 1] (NDC quad).
 *   PLANET_SCALE = radius / canvas_half = radius / (radius * 1.25) = 0.8
 *   Divide v_uv by PLANET_SCALE → sphere coords where length() == 1 is the
 *   hard sphere edge.
 *
 * Passes:
 *   1. Atmosphere halo — outside the sphere, alpha-faded glow ring.
 *   2. Sphere interior:
 *      a. Reconstruct 3-D normal (avoids pole stretching in noise sampling).
 *      b. FBM value noise on the sphere normal → continent / crater mask.
 *      c. Three-threshold biome color mapping.
 *      d. Key light + Bayer 4×4 ordered dithering → pixel-art terminator band.
 */
const FRAG_SRC = `#version 300 es
precision highp float;

in  vec2 v_uv;
out vec4 outColor;

uniform float u_seed;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec3  u_color3;
uniform vec3  u_atmos;

// Planet radius expressed as a fraction of the NDC half-extent.
// Canvas = radius * 2.5, half = radius * 1.25  =>  1 / 1.25 = 0.8.
const float PLANET_SCALE = 0.8;

// ── 3-D hash value noise ──────────────────────────────────────────────────────

float hash(vec3 p) {
  p  = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}

float valueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i),             hash(i+vec3(1,0,0)), u.x),
        mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), u.x), u.y),
    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), u.x),
        mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), u.x), u.y),
    u.z);
}

// 6-octave fractional Brownian motion for layered continent shapes.
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    v += a * valueNoise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

// ── 4×4 Bayer ordered dithering ──────────────────────────────────────────────
//
// 2×2 sub-matrix values:  (0,0)=0  (1,0)=2  (0,1)=3  (1,1)=1
// Recursive construction: B4(x,y) = 4*B2(x&1,y&1) + B2(x>>1,y>>1)
// Verified against standard Bayer 4×4 table.

int b2(int x, int y) {
  return 2 * x * (1 - y) + (3 - 2 * x) * y;
}

float bayer4(ivec2 pos) {
  int x = pos.x & 3;
  int y = pos.y & 3;
  return float(4 * b2(x & 1, y & 1) + b2(x >> 1, y >> 1)) / 16.0;
}

// ── Main ──────────────────────────────────────────────────────────────────────

void main() {
  // Map canvas NDC [-1,1] into sphere coordinates (sphere edge = length 1.0).
  vec2  p    = v_uv / PLANET_SCALE;
  float dist = length(p);

  // ── Atmosphere halo (outside sphere, inside canvas) ───────────────────────
  if (dist > 1.0) {
    float a = (1.0 - smoothstep(1.0, 1.15, dist)) * 0.55;
    outColor = vec4(u_atmos, a);
    return;
  }

  // ── Sphere interior ───────────────────────────────────────────────────────
  // Reconstruct the Z component so noise is sampled on the 3-D unit sphere
  // normal — this prevents stretching / singularities at the poles.
  vec3 normal = vec3(p.x, p.y, sqrt(1.0 - dist * dist));

  // Shift noise coordinates by the seed so each planet has a unique layout.
  float n = fbm(normal * 2.8 + vec3(
    u_seed * 0.0091,
    u_seed * 0.0073,
    u_seed * 0.0113
  ));

  // Three-band biome color selection driven by FBM value.
  vec3 surfaceColor = n < 0.40 ? u_color1 : (n < 0.58 ? u_color2 : u_color3);

  // ── Pixel-art dithered lighting ───────────────────────────────────────────
  // Key light from top-left; clamp + scale compresses the transition band
  // so the dithered terminator line is tight and pixelated.
  float diffuse = dot(normal, normalize(vec3(-0.55, 0.70, 0.45)));
  float light   = clamp(diffuse * 1.5 + 0.5, 0.0, 1.0);

  // Ordered dithering: pixel is lit if light > Bayer threshold at this pixel.
  float shadow  = step(bayer4(ivec2(gl_FragCoord.xy)), light);

  outColor = vec4(mix(surfaceColor * 0.04, surfaceColor, shadow), 1.0);
}
`;

// ── Generator class ────────────────────────────────────────────────────────────

/**
 * Renders procedural pixel-art planet sprites via an offscreen WebGL2 canvas.
 *
 * The returned canvas is `Math.floor(radius * 2.5)` × `Math.floor(radius * 2.5)`
 * pixels with `preserveDrawingBuffer: true` so that the 2D RenderSystem can
 * call `ctx.drawImage(cachedPlanet, …)` on any subsequent frame without the
 * WebGL framebuffer being cleared by the browser.
 *
 * Falls back to a plain 2D coloured disc if WebGL2 is unavailable.
 */
export class PlanetGenerator {
  /**
   * Generates a planet canvas synchronously.
   * Public API is identical to the Sprint 35 Canvas 2D version.
   */
  static generatePlanet(
    theme:  PlanetTheme,
    radius: number,
    seed:   number,
  ): HTMLCanvasElement {
    const size   = Math.floor(radius * 2.5);
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;

    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (gl === null) {
      return PlanetGenerator.cpuFallback(canvas, size, PALETTES[theme]);
    }

    // ── Compile shaders ────────────────────────────────────────────────────
    const vert = PlanetGenerator.compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
    const frag = PlanetGenerator.compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (vert === null || frag === null) return canvas;

    // ── Link program ───────────────────────────────────────────────────────
    const program = gl.createProgram();
    if (program === null) { gl.deleteShader(vert); gl.deleteShader(frag); return canvas; }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[PlanetGenerator] link error:', gl.getProgramInfoLog(program));
      gl.deleteShader(vert); gl.deleteShader(frag); gl.deleteProgram(program);
      return canvas;
    }
    gl.useProgram(program);

    // ── Fullscreen quad ────────────────────────────────────────────────────
    // Four vertices as TRIANGLE_STRIP covering the entire NDC [-1,1]×[-1,1].
    const buf = gl.createBuffer();
    if (buf === null) { gl.deleteShader(vert); gl.deleteShader(frag); gl.deleteProgram(program); return canvas; }

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // ── Uniforms ───────────────────────────────────────────────────────────
    // Capture program into a typed const so the closure sees WebGLProgram (not null).
    const prog = program;
    const setV3 = (name: string, v: RGB): void => {
      const loc = gl.getUniformLocation(prog, name);
      if (loc !== null) gl.uniform3fv(loc, v);
    };

    const seedLoc = gl.getUniformLocation(prog, 'u_seed');
    if (seedLoc !== null) gl.uniform1f(seedLoc, seed);

    const palette = PALETTES[theme];
    setV3('u_color1', palette.color1);
    setV3('u_color2', palette.color2);
    setV3('u_color3', palette.color3);
    setV3('u_atmos',  palette.atmos);

    // ── Render ─────────────────────────────────────────────────────────────
    gl.viewport(0, 0, size, size);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish(); // ensure GPU work is complete before 2D ctx reads the canvas

    // ── Cleanup GPU objects (framebuffer content is preserved in canvas) ───
    gl.deleteBuffer(buf);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    gl.deleteProgram(program);

    return canvas;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private static compileShader(
    gl:   WebGL2RenderingContext,
    type: number,
    src:  string,
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (shader === null) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[PlanetGenerator] shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /** Minimal Canvas 2D fallback — used only if WebGL2 is unavailable. */
  private static cpuFallback(
    canvas: HTMLCanvasElement,
    size:   number,
    p:      ThemePalette,
  ): HTMLCanvasElement {
    const ctx2 = canvas.getContext('2d');
    if (ctx2 === null) return canvas;
    const cx = size / 2;
    const r  = size * 0.4;
    const [rv, gv, bv] = p.color1;
    ctx2.beginPath();
    ctx2.arc(cx, cx, r, 0, Math.PI * 2);
    ctx2.fillStyle = `rgb(${Math.round(rv * 255)},${Math.round(gv * 255)},${Math.round(bv * 255)})`;
    ctx2.fill();
    return canvas;
  }
}
