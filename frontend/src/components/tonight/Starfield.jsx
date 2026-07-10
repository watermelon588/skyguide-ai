import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Full-page three.js starfield — the "night sky" material behind /tonight.
 *
 * Three depth layers of round point sprites drift at different speeds and
 * lean gently toward the cursor, so the sky has parallax mass without ever
 * stealing attention. Rendering pauses when the tab is hidden and the whole
 * scene is disposed on unmount.
 *
 * Deliberately plain three.js (no R3F): one scene, one geometry per layer,
 * zero per-frame allocations.
 */

/** Soft round star sprite (radial gradient) generated once per mount. */
function makeStarTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.6)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const LAYERS = [
  // Deep background: many faint white stars.
  { count: 1600, radius: 90, size: 1.1, opacity: 0.55, color: 0xffffff, speed: 0.004 },
  // Midground: fewer, brighter.
  { count: 500, radius: 70, size: 1.9, opacity: 0.8, color: 0xdde6ff, speed: 0.008 },
  // Foreground accents: a handful of warm stars (SkyGuide orange, very dim).
  { count: 90, radius: 55, size: 2.6, opacity: 0.5, color: 0xffb066, speed: 0.014 },
];

function buildLayer({ count, radius, size, opacity, color }, texture) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    // Uniform-ish spherical shell so rotation never exposes empty patches.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.7 + Math.random() * 0.3);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size,
    map: texture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

export default function Starfield() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      300,
    );
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const texture = makeStarTexture();
    const layers = LAYERS.map((cfg) => {
      const points = buildLayer(cfg, texture);
      scene.add(points);
      return { points, speed: cfg.speed };
    });

    // Cursor parallax target (lerped every frame so movement has drag).
    const pointer = { x: 0, y: 0 };
    const lean = { x: 0, y: 0 };
    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    let last = performance.now();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      // Clamp so a background-tab pause never produces one giant jump.
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!reducedMotion) {
        for (const layer of layers) {
          layer.points.rotation.y += layer.speed * delta;
          layer.points.rotation.x += layer.speed * 0.4 * delta;
        }
        lean.x += (pointer.x * 0.05 - lean.x) / 24;
        lean.y += (pointer.y * 0.05 - lean.y) / 24;
        camera.rotation.y = -lean.x;
        camera.rotation.x = -lean.y;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Don't burn GPU while the tab is hidden.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        last = performance.now(); // swallow the hidden interval
        animate();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      for (const layer of layers) {
        layer.points.geometry.dispose();
        layer.points.material.dispose();
      }
      texture.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
