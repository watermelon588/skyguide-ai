/**
 * Alignment Mode canvas painters — pure drawing, zero React, zero sockets.
 *
 * Everything luminous is a pre-rendered offscreen radial-gradient sprite
 * blitted with `lighter` compositing; the hot path never touches ctx.filter
 * or shadowBlur. Budget per frame: one clear + ~100 sprite/vector blits.
 *
 * Palette discipline (from the design spec):
 *   white  = structure (the Iris ring, ticks, dust)
 *   orange = exclusively the thing you're chasing (target, comet, bloom)
 *   green  = exclusively lock
 */

const TAU = Math.PI * 2;
const ORANGE = [255, 140, 26]; // #FF8C1A
const GREEN = [34, 197, 94]; // #22C55E
const WHITE = [255, 255, 255];

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

function mix(c1, c2, t) {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ];
}

/** Deterministic PRNG so dust and grain are stable across frames/resizes. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radialSprite(size, stops) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function grainTile(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const rand = mulberry32(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 14; // ~5% alpha noise, blitted below 50% → ~2%
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Screen point for a bearing θ (0° = up, clockwise) at distance r from c. */
function polar(cx, cy, thetaDeg, r) {
  const rad = (thetaDeg * Math.PI) / 180;
  return [cx + Math.sin(rad) * r, cy - Math.cos(rad) * r];
}

export function glyphKind(objectType) {
  const t = (objectType || "").toLowerCase();
  if (/nebula|remnant/.test(t)) return "nebula";
  if (/galaxy/.test(t)) return "galaxy";
  if (/cluster|asterism/.test(t)) return "cluster";
  return "star";
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");

  let W = 0; // CSS px
  let H = 0;
  let bg = null;
  let grainPattern = null;
  let sprites = null;
  let dust = []; // [{x, y, r, a, depth}]

  function buildSprites() {
    sprites = {
      bloom: radialSprite(256, [
        [0, rgba(ORANGE, 0.55)],
        [0.4, rgba(ORANGE, 0.18)],
        [1, rgba(ORANGE, 0)],
      ]),
      halo: radialSprite(128, [
        [0, rgba(ORANGE, 0.8)],
        [0.35, rgba(ORANGE, 0.25)],
        [1, rgba(ORANGE, 0)],
      ]),
      core: radialSprite(32, [
        [0, "rgba(255,255,255,1)"],
        [0.5, "rgba(255,240,220,0.6)"],
        [1, "rgba(255,240,220,0)"],
      ]),
      blob: radialSprite(160, [
        [0, rgba(ORANGE, 0.30)],
        [0.5, rgba([255, 170, 90], 0.12)],
        [1, rgba(ORANGE, 0)],
      ]),
      greenHalo: radialSprite(128, [
        [0, rgba(GREEN, 0.7)],
        [0.4, rgba(GREEN, 0.2)],
        [1, rgba(GREEN, 0)],
      ]),
    };
  }

  function buildDust() {
    const rand = mulberry32(42);
    const count = Math.round((W * H) / 16000); // ~90 at 1440×900
    dust = Array.from({ length: count }, () => ({
      x: rand() * W,
      y: rand() * H,
      r: 0.6 + rand() * 1.2,
      a: 0.04 + rand() * 0.05,
      depth: rand() < 0.5 ? 0 : 1,
    }));
  }

  function resize(w, h, dpr) {
    W = w;
    H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bg = ctx.createRadialGradient(
      w / 2, h / 2, 0,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    bg.addColorStop(0, "#0D1119");
    bg.addColorStop(1, "#05070A");

    grainPattern = ctx.createPattern(grainTile(), "repeat");
    buildSprites();
    buildDust();
  }

  function blit(sprite, x, y, size, alpha) {
    if (alpha <= 0.003 || size <= 0) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- layers

  function drawVoid() {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (grainPattern) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function drawDust(S) {
    ctx.fillStyle = "#FFFFFF";
    for (const p of dust) {
      const off = S.dust[p.depth];
      // Toroidal wrap keeps the field infinite as the scope sweeps.
      const x = (((p.x + off.x) % W) + W) % W;
      const y = (((p.y + off.y) % H) + H) % H;
      ctx.globalAlpha = p.a * S.dim;
      ctx.fillRect(x, y, p.r, p.r);
    }
    ctx.globalAlpha = 1;
  }

  function drawHorizon(S) {
    if (S.horizonAlpha <= 0.01) return;
    const y = H / 2 + S.pitchSmooth * S.pxPerDeg;
    if (y < -50 || y > H + 50) return;
    const a = S.horizonAlpha * S.dim;
    // The sky below the horizon is a shade darker — drowned, not deleted.
    ctx.fillStyle = `rgba(0,0,0,${0.25 * a})`;
    ctx.fillRect(0, y, W, Math.max(0, H - y));
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, `rgba(255,255,255,${0.1 * a})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, 1);
  }

  function drawEdgeBloom(S) {
    if (S.bloom <= 0.01) return;
    const theta = S.unreferenced ? S.cometTheta.x : S.theta.x;
    // Ray from center toward θ, intersected with the viewport rectangle.
    const rad = (theta * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const tx = dx > 0 ? (W - W / 2) / dx : dx < 0 ? -(W / 2) / dx : Infinity;
    const ty = dy > 0 ? (H - H / 2) / dy : dy < 0 ? -(H / 2) / dy : Infinity;
    const t = Math.min(tx, ty);
    const x = W / 2 + dx * t;
    const y = H / 2 + dy * t;

    ctx.globalCompositeOperation = "lighter";
    blit(sprites.bloom, x, y, 160 + 420 * S.bloom, S.bloom * 0.8 * S.dim * S.focus);
    ctx.globalCompositeOperation = "source-over";
  }

  function targetPosition(S) {
    const r = S.radius.x * S.pxPerDeg;
    return polar(W / 2, H / 2, S.theta.x, r);
  }

  function drawTarget(S, mode, nowMs) {
    if (!S.targetVisible || !S.hasPacket) return;
    let [x, y] = targetPosition(S);

    // Atmospheric honesty: low confidence = scintillation (seeded per-frame
    // brightness noise + sub-pixel shimmer), lost stream = defocus.
    const scint = mode.reducedMotion ? 0 : Math.max(0, (100 - S.confidence) / 100);
    let flicker = 1;
    if (scint > 0.05) {
      const n = mulberry32(Math.floor(nowMs / 50))();
      flicker = 1 - scint * 0.35 * n;
      x += (n - 0.5) * 2 * scint;
      y += (mulberry32(Math.floor(nowMs / 50) + 1)() - 0.5) * 2 * scint;
    }

    let alpha = S.dim * flicker * (0.35 + 0.65 * S.focus);
    const horizonY = H / 2 + S.pitchSmooth * S.pxPerDeg;
    if (S.horizonAlpha > 0.01 && y > horizonY) {
      // Below the hairline the presence drowns: dimmer with depth.
      const depth = Math.min(1, (y - horizonY) / 160);
      alpha *= 0.3 * (1 - 0.6 * depth);
    }

    const size = Math.max(8, Math.min(22, S.pxPerDeg * 0.35));
    const defocus = 1 + (1 - S.focus) * 1.6; // lost → bloom diffuses

    ctx.globalCompositeOperation = "lighter";
    const kind = mode.targetKind || "star";
    if (kind === "nebula" || kind === "galaxy") {
      const drift = mode.reducedMotion ? 0 : Math.sin(nowMs / 2400) * size * 0.12;
      blit(sprites.blob, x - drift, y + drift * 0.6, size * 5.2 * defocus, alpha * 0.9);
      blit(sprites.blob, x + drift, y - drift, size * 3.6 * defocus, alpha * 0.7);
      blit(sprites.core, x, y, size * 1.1, alpha * 0.8 * S.focus);
    } else if (kind === "cluster") {
      const rand = mulberry32(9);
      for (let i = 0; i < 5; i++) {
        const ox = (rand() - 0.5) * size * 2.4;
        const oy = (rand() - 0.5) * size * 2.4;
        blit(sprites.core, x + ox, y + oy, size * (0.5 + rand() * 0.5), alpha * 0.85);
      }
      blit(sprites.halo, x, y, size * 4 * defocus, alpha * 0.5);
    } else {
      blit(sprites.halo, x, y, size * 4 * defocus, alpha * 0.85);
      blit(sprites.core, x, y, size * 1.4, alpha * S.focus);
    }
    if (S.lockMix > 0.05) {
      blit(sprites.greenHalo, x, y, size * 4.5, alpha * S.lockMix * 0.6);
    }

    // 4-point diffraction glint at near range.
    if (S.ticksAlpha > 0.3 && kind !== "nebula" && kind !== "galaxy") {
      const spin = mode.reducedMotion ? 0 : (nowMs / 1000) * 4; // ~4°/s
      const len = size * 2.2;
      ctx.strokeStyle = rgba(mix(WHITE, GREEN, S.lockMix), alpha * 0.5 * S.ticksAlpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = ((spin + i * 90) * Math.PI) / 180;
        ctx.moveTo(x + Math.cos(a) * size * 0.5, y + Math.sin(a) * size * 0.5);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function ringArc(cx, cy, r, fromDeg, toDeg, color, width, dashed) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [4, 6] : []);
    ctx.beginPath();
    // Bearing degrees (0=up, cw) → canvas radians (0=+x, ccw is negative).
    ctx.arc(cx, cy, r, ((fromDeg - 90) * Math.PI) / 180, ((toDeg - 90) * Math.PI) / 180);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawIris(S, mode, size, nowMs) {
    const cx = W / 2;
    const cy = H / 2;
    let r = size.ringRadius;

    const pulse = S.pulseT(nowMs);
    if (pulse >= 0) {
      const e = 1 - (1 - pulse) * (1 - pulse); // ease-out
      r *= 1 + 0.06 * (1 - e);
    }

    const ringColor = mix(mix(WHITE, ORANGE, S.closeness), GREEN, S.lockMix);
    const baseAlpha =
      (0.85 + 0.04 * S.beat + (pulse >= 0 ? 0.15 * (1 - pulse) : 0)) *
      S.dim *
      (S.belowHorizon ? 0.5 : 1) *
      (0.55 + 0.45 * S.focus) *
      (S.confidence < 45 ? 0.75 : 1);
    const stroke = rgba(ringColor, Math.min(1, baseAlpha));
    const width = 1.5 + (pulse >= 0 ? 0.8 * (1 - pulse) : 0);

    if (S.unreferenced) {
      // Left/right quadrants dashed at 30% — the ring itself shows which
      // axis is untrusted.
      ringArc(cx, cy, r, -45, 45, stroke, width, false); // top
      ringArc(cx, cy, r, 45, 135, rgba(ringColor, baseAlpha * 0.3), width, true); // right
      ringArc(cx, cy, r, 135, 225, stroke, width, false); // bottom
      ringArc(cx, cy, r, 225, 315, rgba(ringColor, baseAlpha * 0.3), width, true); // left
    } else {
      ringArc(cx, cy, r, 0, 360, stroke, width, false);
    }

    // Bearing comet: bright head + fading tail riding the circumference.
    if (S.cometAlpha > 0.02) {
      const breathe = mode.reducedMotion
        ? 1
        : 1 + 0.1 * Math.sin((nowMs / 2000) * TAU);
      const head = S.cometTheta.x;
      const segs = 8;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (let i = 0; i < segs; i++) {
        const a0 = head - 12 - (30 / segs) * (i + 1);
        const a1 = head - 12 - (30 / segs) * i + 1;
        ringArc(cx, cy, r, a0, a1,
          rgba(ORANGE, S.cometAlpha * breathe * S.dim * 0.55 * (1 - i / segs)), 2.5, false);
      }
      ringArc(cx, cy, r, head - 12, head,
        rgba(ORANGE, S.cometAlpha * breathe * S.dim), 2.5, false);
      ctx.lineCap = "butt";
    }

    // 60 hairline ticks — the Face-ID enrollment ring. Fill runs clockwise
    // from 12 o'clock during the lock hold.
    if (S.ticksAlpha > 0.02) {
      const litColor = mix(ORANGE, GREEN, S.lockMix);
      for (let i = 0; i < 60; i++) {
        // Staggered materialization: later ticks lag the alpha ramp.
        const a = Math.max(0, Math.min(1, S.ticksAlpha * 1.5 - i * 0.008));
        if (a <= 0) continue;
        const lit = i / 60 < S.tickFill;
        const theta = (i / 60) * 360;
        const [x0, y0] = polar(cx, cy, theta, r + 5);
        const [x1, y1] = polar(cx, cy, theta, r + (lit ? 12 : 9));
        ctx.strokeStyle = lit
          ? rgba(litColor, (0.4 + 0.5 * S.lockMix) * a * S.dim)
          : rgba(WHITE, 0.15 * a * S.dim);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }

    // Lock ripple: one ring exhaling outward, once.
    const ripple = S.rippleT(nowMs);
    if (ripple >= 0) {
      const e = 1 - (1 - ripple) * (1 - ripple);
      ringArc(cx, cy, r * (1 + 1.2 * e), 0, 360,
        rgba(GREEN, 0.5 * (1 - e) * S.dim), 1, false);
    }
  }

  function render(S, mode, size, nowMs) {
    drawVoid();
    drawDust(S);
    drawHorizon(S);
    if (mode.guidance) {
      drawEdgeBloom(S);
      drawTarget(S, mode, nowMs);
      drawIris(S, mode, size, nowMs);
    }
  }

  return { resize, render };
}
