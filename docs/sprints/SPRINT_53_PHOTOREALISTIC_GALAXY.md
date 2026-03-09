# SPRINT 53: Photorealistic Galaxy Shader (Domain Warping)

## 1. Sprint Objective
**To the AI Assistant:** The user strongly disliked the rigid, abstract mathematical symmetry of the previous background shader. The current standard galaxy looks like a stylized vector graphic rather than a real celestial body. We need to implement a photorealistic, organic galaxy generation using "Domain Warping", a massive bright central core, and subtractive dust lanes. This will bring the visuals much closer to actual astrophotography and the original FTL game.

## 2. Tasks

### A. Rewrite the STANDARD Shader Math (`BackgroundGenerator.ts`)
* **The Fix:** Open `src/game/world/BackgroundGenerator.ts`. In the `FRAG_SRC` string, locate the `STANDARD: seeded spiral galaxy` block. Replace its contents entirely with the following layered, photorealistic approach:

```glsl
    vec2  p    = v_uv;                              
    p.x *= u_resolution.x / u_resolution.y;        
    float dist  = length(p);

    // 1. Organic Swirl via Domain Warping (Gravity simulation)
    // The closer to the center, the stronger the twist
    float swirl = (2.5 + fract(s * 0.1) * 2.0) * exp(-dist * 1.5);
    float s_sin = sin(swirl), s_cos = cos(swirl);
    mat2 rot = mat2(s_cos, -s_sin, s_sin, s_cos);
    vec2 p_rot = rot * p;

    // 2. Base Galactic Gas (FBM)
    vec3 noiseP = vec3(p_rot * 3.0 + s, s * 0.001);
    float n1 = fbm(noiseP);
    float n2 = fbm(noiseP * 2.0 + n1); // Domain warping for feathered structures

    // 3. Dense, glowing central bulge
    float core = exp(-dist * 8.0) * 1.5;

    // 4. Subtractive Dust Lanes
    float dust = fbm(vec3(p_rot * 4.5 - n2, s * 0.002));
    dust = pow(dust, 2.0); // Sharpen the dust

    // 5. Multichromatic Coloring (White, Blue, Pink H-II regions)
    vec3 gasColor = mix(vec3(0.05, 0.2, 0.4), vec3(0.8, 0.4, 0.5), n1); // Blue to Pinkish
    gasColor = mix(gasColor, vec3(0.9, 0.95, 1.0), n2 * 0.8); // Add bright white/blue gas
    
    // Combine core and gas with soft edge falloff
    float diskMask = smoothstep(1.2, 0.0, dist);
    vec3 galaxy = gasColor * n2 * diskMask * 1.8;
    galaxy += vec3(1.0, 0.95, 0.8) * core; // Add yellowish-white core
    
    // Apply dark dust lanes (subtract light)
    galaxy -= dust * 1.2 * diskMask;
    galaxy = max(galaxy, vec3(0.0)); // Prevent negative color artifacts

    color = mix(color, galaxy, 0.9);

```

### B. Clean up old variables

Ensure that old variables like arms, twist, armSignal, falloff, and galaxyBright from the previous implementation are completely removed from the STANDARD block to prevent unused variable warnings from the GLSL compiler.

## 3. Success Criteria
* The STANDARD galaxy renders with a bright, overexposed yellowish-white core.
* The spiral arms look organic, chaotic, and feathered, entirely lacking the previous rigid mathematical symmetry.
* Dark, gritty dust lanes visibly interrupt the brightness of the galactic gas.
* The galaxy uses a photorealistic multichromatic color mix rather than just two solid colors.
* No TypeScript or WebGL compiler errors.