import { memo, useEffect, useRef } from "react";
import { createSceneState } from "./scene/sceneState";
import { createRenderer } from "./scene/draw";

/**
 * The single full-bleed canvas behind Alignment Mode.
 *
 * Owns the rAF loop and NOTHING else: per frame it reads the freshest
 * alignment packet from packetRef (written by useAlignmentFeed's socket
 * listener, ≤10Hz) and the chrome-derived mode from modeRef (written by
 * AlignmentMode's effect), steps the scene store, and paints. Zero setState
 * in the loop — React re-renders never touch the render path.
 *
 * Lifecycle: DPR-aware sizing (capped at 2) via ResizeObserver, pause on
 * document.hidden, full cleanup on unmount. memo'd so parent re-renders
 * (4Hz chrome commits) never reconcile the canvas subtree.
 */
const AlignmentCanvas = memo(function AlignmentCanvas({ packetRef, modeRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = createRenderer(canvas);
    const scene = createSceneState();
    const size = { w: 0, h: 0, vmin: 0, ringRadius: 0 };

    let raf = 0;
    let running = false;
    let last = performance.now();

    const applySize = (w, h) => {
      if (w <= 0 || h <= 0) return;
      size.w = w;
      size.h = h;
      size.vmin = Math.min(w, h);
      // The Iris: diameter clamp(120px, 18vmin, 200px) → radius 60..100.
      size.ringRadius = Math.max(60, Math.min(100, size.vmin * 0.09));
      renderer.resize(w, h, Math.min(window.devicePixelRatio || 1, 2));
    };

    const loop = (t) => {
      if (!running) return;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      const buffer = packetRef?.current;
      const mode = modeRef.current;
      // Withhold rather than lie: packets older than the feed's own 2s
      // staleness guard are not data any more.
      // One timebase everywhere: sceneState stamps pulse/ripple with the
      // same clock the painters compare against.
      const now = Date.now();
      const fresh =
        buffer?.update && buffer.receivedAt && now - buffer.receivedAt <= 2000;
      scene.step(dt, fresh ? buffer.update : null, mode, size, now);
      renderer.render(scene, mode, size, now);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) applySize(rect.width, rect.height);
    });
    ro.observe(canvas);
    applySize(canvas.clientWidth, canvas.clientHeight);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [packetRef, modeRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
});

export default AlignmentCanvas;
