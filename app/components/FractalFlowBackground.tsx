import { useEffect, useRef } from "react";

/**
 * Particle flow field background inspired by Electric Sheep / fractal flames.
 * Thousands of particles follow a continuously mutating noise field,
 * leaving fading silk-like trails. Color mapped to velocity:
 * slow = deep indigo, mid = teal/cyan, fast = hot amber.
 */

// ── Simplex-style noise (2D, self-contained) ──
// Permutation table + gradient vectors — no dependencies needed.
const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function initNoise(): void {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle with seeded-enough randomness
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function dot2(gi: number, x: number, y: number): number {
  const g = GRAD[gi & 7];
  return g[0] * x + g[1] * y;
}

/** Classic Perlin noise, 2D. Returns value in roughly [-1, 1]. */
function noise2d(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[xi] + yi];
  const ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi];
  const bb = PERM[PERM[xi + 1] + yi + 1];

  return lerp(
    lerp(dot2(aa, xf, yf), dot2(ba, xf - 1, yf), u),
    lerp(dot2(ab, xf, yf - 1), dot2(bb, xf - 1, yf - 1), u),
    v,
  );
}

/** Fractal Brownian motion — layered noise with drifting parameters. */
function fbm(
  x: number,
  y: number,
  octaves: number,
  lacunarity: number,
  gain: number,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2d(x * frequency, y * frequency);
    maxAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / maxAmp;
}

// ── Color palette ──
interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Map velocity (0–1 normalised) to brand colors. */
function velocityColor(v: number): RGB {
  // 0.0 = deep navy/indigo, 0.4 = teal, 0.7 = cyan, 1.0 = hot amber
  if (v < 0.35) {
    const t = v / 0.35;
    return {
      r: lerp(10, 8, t),
      g: lerp(12, 80, t),
      b: lerp(42, 120, t),
    };
  }
  if (v < 0.65) {
    const t = (v - 0.35) / 0.3;
    return {
      r: lerp(8, 6, t),
      g: lerp(80, 182, t),
      b: lerp(120, 212, t),
    };
  }
  // 0.65 → 1.0: cyan to amber
  const t = (v - 0.65) / 0.35;
  return {
    r: lerp(6, 245, t),
    g: lerp(182, 158, t),
    b: lerp(212, 11, t),
  };
}

// ── Particle ──
interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export default function FractalFlowBackground(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    initNoise();

    let w = 0;
    let h = 0;
    let animId = 0;

    const PARTICLE_COUNT = 3500;
    const particles: Particle[] = [];

    // Mutating field parameters — these drift over time
    let fieldScale = 0.003;
    let fieldOffsetX = 0;
    let fieldOffsetY = 0;
    let octaves = 3;
    let lacunarity = 2.0;
    let gain = 0.5;

    // Mutation targets (smoothly interpolated toward)
    let targetScale = fieldScale;
    let targetLacunarity = lacunarity;
    let targetGain = gain;
    let nextMutationTime = 6000;

    function resize(): void {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fill with base color on resize to avoid flash
      ctx!.fillStyle = "#060a14";
      ctx!.fillRect(0, 0, w, h);
    }

    function spawnParticle(): Particle {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const maxLife = 120 + Math.random() * 200;
      return { x, y, prevX: x, prevY: y, vx: 0, vy: 0, life: 0, maxLife };
    }

    function resetParticle(p: Particle): void {
      // Respawn at edges or random position
      if (Math.random() < 0.3) {
        // Edge spawn — creates flowing-in effect
        const side = Math.floor(Math.random() * 4);
        switch (side) {
          case 0: p.x = 0; p.y = Math.random() * h; break;
          case 1: p.x = w; p.y = Math.random() * h; break;
          case 2: p.x = Math.random() * w; p.y = 0; break;
          default: p.x = Math.random() * w; p.y = h; break;
        }
      } else {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
      p.prevX = p.x;
      p.prevY = p.y;
      p.vx = 0;
      p.vy = 0;
      p.life = 0;
      p.maxLife = 120 + Math.random() * 200;
    }

    resize();
    window.addEventListener("resize", resize);

    // Init particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(spawnParticle());
    }

    // Fill initial background
    ctx.fillStyle = "#060a14";
    ctx.fillRect(0, 0, w, h);

    function draw(time: number): void {
      if (!ctx) return;

      // ── Mutate field parameters ──
      if (time > nextMutationTime) {
        targetScale = 0.002 + Math.random() * 0.004;
        targetLacunarity = 1.6 + Math.random() * 1.2;
        targetGain = 0.35 + Math.random() * 0.3;
        octaves = 2 + Math.floor(Math.random() * 3);
        nextMutationTime = time + 8000 + Math.random() * 12000;
      }

      // Smooth interpolation toward targets
      fieldScale += (targetScale - fieldScale) * 0.002;
      lacunarity += (targetLacunarity - lacunarity) * 0.003;
      gain += (targetGain - gain) * 0.003;

      // Continuous drift of the field origin
      const drift = time * 0.00004;
      fieldOffsetX = Math.sin(drift * 0.7) * 50;
      fieldOffsetY = Math.cos(drift * 1.1) * 50;

      // ── Trail fade: semi-transparent dark rect ──
      // This creates the fading silk trail effect
      ctx.fillStyle = "rgba(6, 10, 20, 0.035)";
      ctx.fillRect(0, 0, w, h);

      // ── Update & draw particles ──
      for (const p of particles) {
        p.prevX = p.x;
        p.prevY = p.y;

        // Sample flow field
        const nx = (p.x + fieldOffsetX) * fieldScale;
        const ny = (p.y + fieldOffsetY) * fieldScale;
        const angle =
          fbm(nx, ny, octaves, lacunarity, gain) * Math.PI * 4;

        // Secondary noise layer for speed variation
        const speedNoise =
          0.5 +
          0.5 * noise2d(nx * 1.7 + time * 0.0001, ny * 1.7);
        const speed = 0.8 + speedNoise * 2.2;

        p.vx = p.vx * 0.92 + Math.cos(angle) * speed * 0.08;
        p.vy = p.vy * 0.92 + Math.sin(angle) * speed * 0.08;

        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Reset if out of bounds or expired
        if (
          p.x < -20 || p.x > w + 20 ||
          p.y < -20 || p.y > h + 20 ||
          p.life > p.maxLife
        ) {
          resetParticle(p);
          continue;
        }

        // Velocity magnitude for color mapping
        const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const velNorm = Math.min(vel / 3.5, 1);

        // Life-based alpha: fade in, sustain, fade out
        const lifeRatio = p.life / p.maxLife;
        let alpha: number;
        if (lifeRatio < 0.05) {
          alpha = lifeRatio / 0.05;
        } else if (lifeRatio > 0.8) {
          alpha = 1 - (lifeRatio - 0.8) / 0.2;
        } else {
          alpha = 1;
        }
        alpha *= 0.4 + velNorm * 0.4; // faster particles are brighter

        const col = velocityColor(velNorm);

        // Draw trail segment (line from prev to current position)
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`;
        ctx.lineWidth = 0.8 + velNorm * 0.8;
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Hot particles get a small glow dot at head
        if (velNorm > 0.7 && alpha > 0.4) {
          ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.2 + velNorm, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
