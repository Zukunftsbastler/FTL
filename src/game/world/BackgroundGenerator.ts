/** Theme controlling cloud palette on the star-map background. */
export type MapTheme = 'NEBULA' | 'STANDARD';

/** RGB triplets in [0, 1] range — passed directly as WebGL vec3 uniforms. */
type RGB = [number, number, number];

interface ThemePalette {
  cloudA: RGB;   // deep cloud / inner galaxy colour
  cloudB: RGB;   // highlight cloud / outer arm colour
}

const THEMES: Record<MapTheme, ThemePalette> = {
  NEBULA:   { cloudA: [0.20, 0.04, 0.35], cloudB: [0.55, 0.10, 0.65] },
  STANDARD: { cloudA: [0.05, 0.15, 0.25], cloudB: [0.15, 0.05, 0.20] },
};

// ── WebGL2 source strings ─────────────────────────────────────────────────────

const VERT_SRC = `#version 300 es
in  vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv        = a_pos;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/**
 * Fragment shader — renders a procedural full-screen star-map background.
 *
 * Stars:    crisp 1-pixel dots using pixel-coordinate hashing via u_resolution.
 * NEBULA:   dense 6-octave FBM clouds covering the whole screen.
 * STANDARD: seed-randomised spiral galaxy (polar coords + sin arm signal)
 *           with exponential falloff from the galactic core.
 *
 * Reuses the same hash / valueNoise / fbm functions as PlanetGenerator.ts.
 */
const FRAG_SRC = `#version 300 es
precision highp float;

in  vec2 v_uv;
out vec4 outColor;

uniform float u_seed;
uniform float u_isNebula;
uniform vec2  u_resolution;
uniform vec3  u_cloudA;
uniform vec3  u_cloudB;

// ── Hash / noise (shared with PlanetGenerator) ────────────────────────────────

// Dave Hoskins Hash13 — avoids integer-alignment artifacts from decimal multipliers.
float hash(vec3 p) {
  vec3 p3  = fract(p * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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

// ── Main ──────────────────────────────────────────────────────────────────────

void main() {
  // Slightly lifted base to prevent fully crushed blacks.
  vec3 color = vec3(0.02, 0.02, 0.04);

  float s = u_seed;

  if (u_isNebula > 0.5) {
    // ── NEBULA: dense FBM clouds covering the whole screen ────────────────
    vec3 noiseP = vec3(v_uv * 2.5 + vec2(s * 0.003, s * 0.002), s * 0.001);
    float n = fbm(noiseP);
    float cloudStrength = smoothstep(0.30, 0.65, n) * 0.72;
    color = mix(color, mix(u_cloudA, u_cloudB, n), cloudStrength);

  } else {
    // ── STANDARD: photorealistic galaxy (domain warping + dust lanes) ─────
    vec2  p    = v_uv;
    p.x *= u_resolution.x / u_resolution.y;  // aspect-ratio correction
    float dist  = length(p);

    // 1. Organic swirl via domain warping — stronger twist near the core.
    float swirl = (2.5 + fract(s * 0.1) * 2.0) * exp(-dist * 1.5);
    float s_sin = sin(swirl), s_cos = cos(swirl);
    mat2  rot   = mat2(s_cos, -s_sin, s_sin, s_cos);
    vec2  p_rot = rot * p;

    // 2. Base galactic gas — two FBM layers; second one domain-warped by n1.
    vec3  noiseP = vec3(p_rot * 3.0 + s, s * 0.001);
    float n1     = fbm(noiseP);
    float n2     = fbm(noiseP * 2.0 + n1);

    // 3. Dense, glowing central bulge.
    float core = exp(-dist * 8.0) * 1.5;

    // 4. Subtractive dust lanes — sharpened FBM.
    float dust = fbm(vec3(p_rot * 4.5 - n2, s * 0.002));
    dust = pow(dust, 2.0);

    // 5. Multichromatic coloring: blue-to-pink gas, bright white/blue knots.
    vec3 gasColor = mix(vec3(0.05, 0.2, 0.4), vec3(0.8, 0.4, 0.5), n1);
    gasColor = mix(gasColor, vec3(0.9, 0.95, 1.0), n2 * 0.8);

    // Combine: gas disk + core glow, then subtract dust lanes.
    float diskMask = smoothstep(1.2, 0.0, dist);
    vec3  galaxy   = gasColor * n2 * diskMask * 1.8;
    galaxy += vec3(1.0, 0.95, 0.8) * core;
    galaxy -= dust * 1.2 * diskMask;
    galaxy  = max(galaxy, vec3(0.0));

    color = mix(color, galaxy, 0.9);
  }

  // ── Stars: pixel-coordinate hash for crisp, resolution-independent dots ──
  // Map NDC [-1,1] → pixel coordinates, floor to integer cell, then hash.
  vec2  pixel = (v_uv * 0.5 + 0.5) * u_resolution;
  float h     = hash(vec3(floor(pixel), s * 0.01));
  if (h > 0.994) {
    float br = (h - 0.994) / 0.006;
    // Additive blend so stars always punch through the background.
    color += vec3(0.4 + br * 0.6) * vec3(1.0, 0.97, 0.88);
    color  = min(color, vec3(1.0));
  }

  outColor = vec4(color, 1.0);
}`;

// ── Generator class ───────────────────────────────────────────────────────────

/**
 * Generates a full-screen procedural star-map background via an offscreen
 * WebGL2 canvas.  The result is cached by MapSystem.generate() and drawn
 * with a single drawCanvas call every frame.
 *
 * Falls back to a solid fill + 400 random star dots if WebGL2 is unavailable.
 */
export class BackgroundGenerator {
  static generate(
    theme:  MapTheme,
    width:  number,
    height: number,
    seed:   number,
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;

    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (gl === null) {
      return BackgroundGenerator.cpuFallback(canvas, theme);
    }

    // ── Compile shaders ────────────────────────────────────────────────────
    const vert = BackgroundGenerator.compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
    const frag = BackgroundGenerator.compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (vert === null || frag === null) return canvas;

    // ── Link program ───────────────────────────────────────────────────────
    const program = gl.createProgram();
    if (program === null) {
      gl.deleteShader(vert); gl.deleteShader(frag);
      return canvas;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[BackgroundGenerator] link error:', gl.getProgramInfoLog(program));
      gl.deleteShader(vert); gl.deleteShader(frag); gl.deleteProgram(program);
      return canvas;
    }
    gl.useProgram(program);

    // ── Fullscreen quad ────────────────────────────────────────────────────
    const buf = gl.createBuffer();
    if (buf === null) {
      gl.deleteShader(vert); gl.deleteShader(frag); gl.deleteProgram(program);
      return canvas;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // ── Uniforms ───────────────────────────────────────────────────────────
    const prog = program;
    const setF  = (name: string, v: number): void => {
      const loc = gl.getUniformLocation(prog, name);
      if (loc !== null) gl.uniform1f(loc, v);
    };
    const setV2 = (name: string, x: number, y: number): void => {
      const loc = gl.getUniformLocation(prog, name);
      if (loc !== null) gl.uniform2f(loc, x, y);
    };
    const setV3 = (name: string, v: RGB): void => {
      const loc = gl.getUniformLocation(prog, name);
      if (loc !== null) gl.uniform3fv(loc, v);
    };

    const palette = THEMES[theme];
    setF('u_seed',       seed);
    setF('u_isNebula',   theme === 'NEBULA' ? 1.0 : 0.0);
    setV2('u_resolution', width, height);
    setV3('u_cloudA',    palette.cloudA);
    setV3('u_cloudB',    palette.cloudB);

    // ── Render ─────────────────────────────────────────────────────────────
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish(); // ensure GPU work is complete before 2D ctx reads the canvas

    // ── Cleanup ────────────────────────────────────────────────────────────
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
      console.error('[BackgroundGenerator] shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Canvas 2D fallback when WebGL2 is unavailable.
   * Fills a dark background then draws ~400 random 1×1 star pixels.
   */
  private static cpuFallback(canvas: HTMLCanvasElement, theme: MapTheme): HTMLCanvasElement {
    const ctx2 = canvas.getContext('2d');
    if (ctx2 === null) return canvas;
    ctx2.fillStyle = theme === 'NEBULA' ? '#0a0015' : '#000a18';
    ctx2.fillRect(0, 0, canvas.width, canvas.height);
    // Draw 400 random crisp stars.
    ctx2.fillStyle = 'rgba(255, 250, 230, 0.9)';
    for (let i = 0; i < 400; i++) {
      ctx2.fillRect(
        Math.floor(Math.random() * canvas.width),
        Math.floor(Math.random() * canvas.height),
        1, 1,
      );
    }
    return canvas;
  }
}
