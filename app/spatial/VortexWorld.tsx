"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Line, Lightformer, Text, useGLTF, Center } from "@react-three/drei";
import *as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { parseGIF, decompressFrames } from "gifuct-js";

// Compress the shallow 0–119 section into 0–69 scroll units.
// Keep the deeper 120–220 section the same length, shifted 50 units closer.
const mapScrollDepthToWorldDepth = (scrollDepth: number) =>
  scrollDepth <= 39 ? scrollDepth * (119 / 39) : scrollDepth + 80;
const SCROLL_SPEED = 0.012; // lower = slower (it was 0.025)
const portals = [
  {
    title: "VICE CITY MAP",
    subtitle: "Explore the world",
    z: -5,
    x: -2.3,
    color: "#ff4fc8",
    image: "/gta-gifs/vice-city.gif",
  },
  {
    title: "MISSIONS",
    subtitle: "Track your progress",
    z: -15,
    x: 2.3,
    color: "#ff9b52",
    image: "/gta-gifs/missions.gif",
  },
  {
    title: "LEADERBOARDS",
    subtitle: "Compete with players",
    z: -25,
    x: -2.3,
    color: "#45eaff",
    image: "/gta-gifs/leaderboards.gif",
  },
  {
    title: "COMMUNITY",
    subtitle: "Share discoveries",
    z: -35,
    x: 2.3,
    color: "#ff4fc8",
    image: "/gta-gifs/community.gif",
  },
];

type Particle = {
  x: number;
  y: number;
  z: number;
  speed: number;
  size: number;
  flicker: number;
  length: number;
  hue: number;
};

function EnergyParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const streaksRef = useRef<THREE.LineSegments>(null);
  const COUNT = 1200;

  const particles = useRef<Particle[]>(
    Array.from({ length: COUNT }, () => ({
      x: (Math.random() - 0.5) * 9,
      y: (Math.random() - 0.5) * 9,
      z: -Math.random() * 245,
      speed: 2 + Math.random() * 13,
      size: 2 + Math.random() * 7,
      flicker: Math.random() * Math.PI * 2,
      length: 0.08 + Math.random() * 0.8,
      hue: Math.random(),
    }))
  );

  const positions = useRef(
    new Float32Array(particles.current.flatMap((p) => [p.x, p.y, p.z]))
  );

  const colors = useRef(
    new Float32Array(
      particles.current.flatMap((p) => {
        const color = new THREE.Color(
          p.hue > 0.98 ? "#39eaff" : p.hue > 0.94 ? "#ff43d0" : "#ff792b"
        );
        return [color.r, color.g, color.b];
      })
    )
  );

  const sizes = useRef(
    new Float32Array(particles.current.map((p) => p.size))
  );

  const streakPositions = useRef(new Float32Array(COUNT * 2 * 3));

  useFrame(({ clock }, delta) => {
    const points = pointsRef.current;
    const streaks = streaksRef.current;

    if (!points || !streaks) return;

    const position = points.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttribute = points.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttribute = points.geometry.attributes.size as THREE.BufferAttribute;
    const linePosition = streaks.geometry.attributes.position as THREE.BufferAttribute;
    const elapsed = clock.elapsedTime;

    particles.current.forEach((p, i) => {
      p.z += p.speed * delta;

      if (p.z > 8) {
        p.z = -237;
        p.x = (Math.random() - 0.5) * 9;
        p.y = (Math.random() - 0.5) * 9;
        p.speed = 2 + Math.random() * 13;
        p.size = 2 + Math.random() * 7;
        p.length = 0.08 + Math.random() * 0.8;
        p.hue = Math.random();
      }

      const flicker =
        0.5 + 0.5 * Math.sin(elapsed * (8 + p.speed) + p.flicker);

      const life = THREE.MathUtils.clamp((p.z + 237) / 245, 0, 1);
      const brightness = (0.25 + flicker * 0.75) * (1 - life * 0.65);

      const color = new THREE.Color();

      if (flicker > 0.82) color.set("#fff4cc");
      else if (flicker > 0.58) color.set("#ffb52e");
      else if (flicker > 0.3) color.set("#fe5420");
      else color.set("#a51e40");

      if (p.hue > 0.94) color.set("#ff43d0");
      if (p.hue > 0.98) color.set("#39eaff");

      color.multiplyScalar(brightness);

      position.setXYZ(i, p.x, p.y, p.z);
      colorAttribute.setXYZ(i, color.r, color.g, color.b);
      sizeAttribute.setX(i, p.size * (0.65 + flicker * 1.1));

      const base = i * 6;

      streakPositions.current[base] = p.x;
      streakPositions.current[base + 1] = p.y;
      streakPositions.current[base + 2] = p.z;
      streakPositions.current[base + 3] = p.x;
      streakPositions.current[base + 4] = p.y;
      streakPositions.current[base + 5] = p.z - p.length;
    });

    position.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;

    linePosition.array.set(streakPositions.current);
    linePosition.needsUpdate = true;
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions.current, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors.current, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizes.current, 1]}
          />
        </bufferGeometry>

        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;

            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (180.0 / max(1.0, -mvPosition.z));
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vColor;

            void main() {
              float d = distance(gl_PointCoord, vec2(0.5));
              if (d > 0.5) discard;

              float glow = 1.0 - smoothstep(0.12, 0.5, d);
              gl_FragColor = vec4(vColor, glow);
            }
          `}
        />
      </points>

      <lineSegments ref={streaksRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[streakPositions.current, 3]}
          />
        </bufferGeometry>

        <lineBasicMaterial
          color="#ff792b"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function EnergySpiral() {
  const spiralRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (spiralRef.current) {
      spiralRef.current.rotation.z += delta * 0.12;
    }
  });

  return (
    <group ref={spiralRef}>
      {[0, 1].map((side) => {
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= 500; i++) {
          const t = i / 500;
          const angle = t * Math.PI * 18 + side * Math.PI;
          const radius = 3.6 + Math.sin(t * Math.PI * 8) * 0.35;

          points.push(
            new THREE.Vector3(
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              8 - t * 240
            )
          );
        }

        return (
          <Line
            key={side}
            points={points}
            lineWidth={1}
            transparent
            opacity={0.8}
            color={side === 0 ? "#ff38c7" : "#35eaff"}
          />
        );
      })}
    </group>
  );
}

const R_CASE = 0.42;
const R_BULLET = 0.34;
const CASE_TOP = 1.7;
const STRAIGHT_TOP = 1.95;
const OGIVE_LENGTH = 1.15;
const TIP_RADIUS = 0.15; // flat front edge of the hollow point
const BULLET_DISTANCE = 7;


const RHO = (R_BULLET ** 2 + OGIVE_LENGTH ** 2) / (2 * R_BULLET);
const D_TIP = Math.sqrt(RHO ** 2 - (TIP_RADIUS - R_BULLET + RHO) ** 2);
const TIP_Y = STRAIGHT_TOP + D_TIP;

function makeCasingProfile() {
  return [
    [0, 0], [0.44, 0], [0.44, 0.07],
    [0.37, 0.07], [0.37, 0.14],
    [0.42, 0.14], [R_CASE, 1.3],
    [R_BULLET + 0.03, 1.55],
    [R_BULLET + 0.03, CASE_TOP],
  ].map(([r, y]) => new THREE.Vector2(r, y));
}

function makeProjectileProfile() {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(R_BULLET, CASE_TOP - 0.1),
    new THREE.Vector2(R_BULLET, STRAIGHT_TOP),
  ];

  // Outer ogive curve up to the flat edge
  const steps = 28;
  for (let i = 1; i <= steps; i++) {
    const d = (D_TIP * i) / steps;
    const r = Math.sqrt(RHO ** 2 - d ** 2) + R_BULLET - RHO;
    pts.push(new THREE.Vector2(r, STRAIGHT_TOP + d));
  }

  // Hollow cavity: lip, then down into the nose and in to the center
  pts.push(
    new THREE.Vector2(TIP_RADIUS - 0.03, TIP_Y),
    new THREE.Vector2(TIP_RADIUS - 0.045, TIP_Y - 0.1),
    new THREE.Vector2(0.08, TIP_Y - 0.24),
    new THREE.Vector2(0.03, TIP_Y - 0.33),
    new THREE.Vector2(0, TIP_Y - 0.36)
  );

  return pts;
}

const CUT_HALF_WIDTH = 0.028; // half-width of each slit
const CUT_DEPTH = 0.2; // how far the notch drops at the rim
const CUT_REACH = 0.5; // how far down the nose the cut fades out

function smoothstep(a: number, b: number, x: number) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// Adds points along long profile segments so the cut has vertices to bend
function densify(pts: THREE.Vector2[], maxLen: number) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / maxLen));
    for (let k = 1; k <= n; k++) out.push(a.clone().lerp(b, k / n));
  }
  return out;
}

function makeCutProjectileGeometry() {
  const geo = new THREE.LatheGeometry(densify(makeProjectileProfile(), 0.03), 192);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cutAngles = [Math.PI / 4, -Math.PI / 4]; // two lines crossing = X

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Distance from this vertex to the nearest cut line
    let d = Infinity;
    for (const a of cutAngles) {
      d = Math.min(d, Math.abs(-x * Math.sin(a) + z * Math.cos(a)));
    }

    const groove = Math.max(0, 1 - d / CUT_HALF_WIDTH);
    const v = groove * smoothstep(TIP_Y - CUT_REACH, TIP_Y, y);

    pos.setY(i, y - CUT_DEPTH * v);

    // Darken the crease so it reads as a shadowed slit
    const shade = 1 - 0.8 * Math.pow(v, 0.6);
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // Rebuild smooth normals so the groove walls catch light
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();

  // Make sure normals point outward on the straight section
  const n = merged.attributes.normal as THREE.BufferAttribute;
  const p = merged.attributes.position as THREE.BufferAttribute;
  let facing = 0;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < STRAIGHT_TOP - 0.01 && Math.hypot(p.getX(i), p.getZ(i)) > 0.3) {
      facing += n.getX(i) * p.getX(i) + n.getZ(i) * p.getZ(i);
    }
  }
  if (facing < 0) {
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  }

  return merged;
}


function BarrelExplosion({
  active,
  position = [0, 0, 0],
  maxScale = 6,
  duration = 0.8,
}: {
  active: boolean;
  position?: [number, number, number];
  maxScale?: number;
  duration?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shockRef = useRef<THREE.MeshBasicMaterial>(null);
  const flashRef = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const progress = useRef(0);

  useEffect(() => {
    progress.current = 0;
  }, [active]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!active || !g) return;

    progress.current = Math.min(1, progress.current + delta / duration);
    const t = progress.current;
    const ease = 1 - (1 - t) ** 3;

    g.visible = t < 1;
    g.scale.setScalar(0.3 + ease * maxScale);

    if (shockRef.current) shockRef.current.opacity = 0.9 * (1 - t);
    if (flashRef.current) flashRef.current.opacity = Math.max(0, 1 - t * 2.5);
    if (lightRef.current) lightRef.current.intensity = 150 * (1 - t);
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial
          ref={shockRef}
          color="#ffb347"
          wireframe
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={0.35}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshBasicMaterial
          ref={flashRef}
          color="#fff1c1"
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <pointLight ref={lightRef} color="#ffb347" intensity={150} distance={30} />
    </group>
  );
}


const ENTRANCE_BLAST_Z =
  8 - mapScrollDepthToWorldDepth(85);

const BLAST_SPARKS = 220;
const BLAST_CHUNKS = 36;
const BLAST_PUFFS = 22;
const BLAST_TOTAL = 3.6; // seconds the whole effect can last
const FLASH_DELAY = 0.12; // seconds between the air burst and the fireball
const BLAST_LEAD = 2.5; // how far before the muzzle the air burst starts
const BLAST_FIRE = 18; // fire clouds
const BLAST_SIZE = 2.5; // multiplies the size of every sprite in the blast

const blastEase = (k: number) => 1 - (1 - k) ** 3;
const blastClamp = (k: number) => Math.min(1, Math.max(0, k));

function makeBlastTexture(size: number, stops: [number, string][]) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Jagged flame spikes around a hot core
function makeBlastStarTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.translate(size / 2, size / 2);
  ctx.globalCompositeOperation = "lighter";

  const spikes = 11;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 + (i % 2) * 0.1;
    const len = size * (i % 2 ? 0.3 : 0.49);
    const w = size * 0.04;
    ctx.save();
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, "rgba(255,245,210,1)");
    g.addColorStop(0.35, "rgba(255,170,60,0.85)");
    g.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -w);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, w);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.22);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,160,50,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type BlastTextures = {
  glow: THREE.Texture;
  haze: THREE.Texture;
  smoke: THREE.Texture;
  dot: THREE.Texture;
  shock: THREE.Texture;
  star: THREE.Texture;
};

let blastTextureCache: BlastTextures | null = null;

// Built once, then reused for every shot
function getBlastTextures(): BlastTextures | null {
  if (typeof document === "undefined") return null;
  if (!blastTextureCache) {
    blastTextureCache = {
      glow: makeBlastTexture(128, [
        [0, "rgba(255,255,255,1)"],
        [0.25, "rgba(255,220,150,0.9)"],
        [0.6, "rgba(255,140,40,0.35)"],
        [1, "rgba(255,80,0,0)"],
      ]),
      haze: makeBlastTexture(128, [
        [0, "rgba(225,238,255,0.9)"],
        [0.5, "rgba(160,195,255,0.3)"],
        [1, "rgba(140,180,255,0)"],
      ]),
      smoke: makeBlastTexture(128, [
        [0, "rgba(255,255,255,0.9)"],
        [0.5, "rgba(255,255,255,0.45)"],
        [1, "rgba(255,255,255,0)"],
      ]),
      dot: makeBlastTexture(64, [
        [0, "rgba(255,255,255,1)"],
        [0.4, "rgba(255,255,255,0.6)"],
        [1, "rgba(255,255,255,0)"],
      ]),
      // Soft glowing ring: the visible edge of the air burst
      shock: makeBlastTexture(256, [
        [0, "rgba(180,210,255,0)"],
        [0.6, "rgba(180,210,255,0.04)"],
        [0.82, "rgba(200,225,255,0.35)"],
        [0.92, "rgba(255,255,255,0.95)"],
        [0.97, "rgba(190,215,255,0.3)"],
        [1, "rgba(190,215,255,0)"],
      ]),
      star: makeBlastStarTexture(),
    };
  }
  return blastTextureCache;
}

function setBlastSprite(s: THREE.Sprite | null, size: number, opacity: number) {
  if (!s) return;
  s.scale.setScalar(size * BLAST_SIZE);
  (s.material as THREE.SpriteMaterial).opacity = opacity;
}

// Lumpy cloud texture made of overlapping soft blobs, so it doesn't look like a smooth orb
function makeBillowTexture(size: number, blobs: number, seed: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;

  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

  for (let i = 0; i < blobs; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * size * 0.28;
    const x = size / 2 + Math.cos(a) * d;
    const y = size / 2 + Math.sin(a) * d;
    const r = size * (0.12 + rnd() * 0.18);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = Math.round(255 * (0.7 + rnd() * 0.3));
    g.addColorStop(0, `rgba(${v},${v},${v},0.55)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // Soft circular mask so the edge never shows a square
  ctx.globalCompositeOperation = "destination-in";
  const m = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(0.6, "rgba(0,0,0,0.9)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = m;
  ctx.fillRect(0, 0, size, size);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let billowCache: { fire: THREE.Texture; smoke: THREE.Texture } | null = null;

function getBillowTextures() {
  if (typeof document === "undefined") return null;
  if (!billowCache) {
    billowCache = {
      fire: makeBillowTexture(256, 16, 7),
      smoke: makeBillowTexture(256, 28, 21),
    };
  }
  return billowCache;
}

// Fire color over a cloud's life: white-yellow, then orange, then deep red
function fireRamp(k: number, out: THREE.Color) {
  if (k < 0.2) {
    const m = k / 0.2;
    out.setRGB(1, 0.95 - 0.3 * m, 0.7 - 0.5 * m);
  } else if (k < 0.6) {
    const m = (k - 0.2) / 0.4;
    out.setRGB(1 - 0.1 * m, 0.65 - 0.4 * m, 0.2 - 0.15 * m);
  } else {
    const m = (k - 0.6) / 0.4;
    out.setRGB(0.9 - 0.65 * m, 0.25 - 0.21 * m, 0.05 - 0.03 * m);
  }
}


function MuzzleBlast({
  shot,
  position,
  fireMultiplier = 1,
  durationMultiplier = 1,
}: {
  shot: number;
  position: [number, number, number];
  fireMultiplier?: number;
  durationMultiplier?: number;
}) {
  if (shot === 0) return null;

  return (
    <MuzzleBlastEffect
      key={shot}
      position={position}
      fireMultiplier={fireMultiplier}
      durationMultiplier={durationMultiplier}
    />
  );
}



function MuzzleBlastEffect({
  position,
  shake = 0.08,
  fireMultiplier = 1,
  durationMultiplier = 1,
}: {
  position: [number, number, number];
  shake?: number;
  fireMultiplier?: number;
  durationMultiplier?: number;
}) {


  const root = useRef<THREE.Group>(null);
  const shockA = useRef<THREE.Sprite>(null);
  const shockB = useRef<THREE.Sprite>(null);
  const haze = useRef<THREE.Sprite>(null);
  const core = useRef<THREE.Sprite>(null);
  const star = useRef<THREE.Sprite>(null);
  const afterglow = useRef<THREE.Sprite>(null);
  const coneRef = useRef<THREE.Group>(null);
  const coneMat = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const chunksRef = useRef<THREE.InstancedMesh>(null);
  const fireRefs = useRef<(THREE.Sprite | null)[]>([]);
  const smokeRefs = useRef<(THREE.Sprite | null)[]>([]);
  const time = useRef(0);
  const shaking = useRef(false);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const tex = useMemo(() => getBlastTextures(), []);
  const billow = useMemo(() => getBillowTextures(), []);

  const sparks = useMemo(
    () =>
      Array.from({ length: BLAST_SPARKS }, () => {
        const ang = Math.random() * Math.PI * 2;
        const spread = Math.random() < 0.4 ? 0.9 + Math.random() * 1.4 : 0.15 + Math.random() * 0.6;
        const speed = 3 + Math.random() * 9;
        const len = Math.hypot(spread, 1);
        return {
          vx: ((Math.cos(ang) * spread) / len) * speed,
          vy: ((Math.sin(ang) * spread) / len) * speed,
          vz: speed / len,
          max: 0.35 + Math.random() * 0.9,
          delay: FLASH_DELAY + Math.random() * 0.04,
        };
      }),
    []
  );
  const sparkPositions = useMemo(() => new Float32Array(BLAST_SPARKS * 3), []);
  const sparkColors = useMemo(() => new Float32Array(BLAST_SPARKS * 3), []);

  const chunks = useMemo(
    () =>
      Array.from({ length: BLAST_CHUNKS }, () => {
        const ang = Math.random() * Math.PI * 2;
        const spread = 0.3 + Math.random() * 1.6;
        const speed = 2 + Math.random() * 7;
        const len = Math.hypot(spread, 1);
        return {
          vx: ((Math.cos(ang) * spread) / len) * speed,
          vy: ((Math.sin(ang) * spread) / len) * speed,
          vz: speed / len,
          sx: (Math.random() - 0.5) * 18,
          sy: (Math.random() - 0.5) * 18,
          sz: (Math.random() - 0.5) * 18,
          rx: Math.random() * 6,
          ry: Math.random() * 6,
          rz: Math.random() * 6,
          size: 0.035 + Math.random() * 0.07,
          max: 0.7 + Math.random() * 0.9,
          delay: FLASH_DELAY + Math.random() * 0.03,
        };
      }),
    []
  );

  // Fire clouds: fast, bright, short-lived
  const flames = useMemo(
    () =>
      Array.from({ length: BLAST_FIRE }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random();
        return {
          x: Math.cos(a) * r * 0.35,
          y: Math.sin(a) * r * 0.35,
          vx: Math.cos(a) * r * 2.2,
          vy: Math.sin(a) * r * 2.2 + 0.4,
          vz: 1.5 + Math.random() * 2.5,
          size: 2.2 + Math.random() * 2.6,
          life: 0.45 + Math.random() * 0.45,
          start: FLASH_DELAY + Math.random() * 0.1,
          spin: (Math.random() - 0.5) * 3,
          rot: Math.random() * Math.PI * 2,
        };
      }),
    []
  );

  // Smoke: big, slow, long-lived
  const puffs = useMemo(
    () =>
      Array.from({ length: BLAST_PUFFS }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random();
        return {
          x: Math.cos(a) * r * 0.4,
          y: Math.sin(a) * r * 0.4,
          vx: Math.cos(a) * r * 1.8,
          vy: Math.sin(a) * r * 1.8 + 0.7,
          vz: 0.8 + Math.random() * 1.8,
          size: 4 + Math.random() * 4,
          life: 1.6 + Math.random() * 1.3,
          start: FLASH_DELAY + 0.05 + Math.random() * 0.25,
          alpha: 0.35 + Math.random() * 0.3,
          spin: (Math.random() - 0.5) * 0.8,
          rot: Math.random() * Math.PI * 2,
        };
      }),
    []
  );

  useFrame(({ camera }, delta) => {
    const g = root.current;
    if (!g) return;

   

time.current += delta;

// Slow down this explosion independently
const T = time.current / Math.max(0.01, durationMultiplier);
const ft = T - FLASH_DELAY;


    if (T > BLAST_TOTAL) {
      g.visible = false;
      if (shaking.current) {
        camera.position.x = 0;
        camera.position.y = 0;
        shaking.current = false;
      }
      return;
    }

    // ---- 1. AIR BURST ----
    let k = blastClamp(T / 0.38);
    setBlastSprite(shockA.current, 0.6 + blastEase(k) * 9, 0.9 * (1 - k) ** 1.2);

    k = blastClamp((T - 0.05) / 0.55);
    setBlastSprite(shockB.current, 0.5 + blastEase(k) * 13, T < 0.05 ? 0 : 0.5 * (1 - k));

    k = blastClamp(T / 0.32);
    setBlastSprite(haze.current, 1.5 + blastEase(k) * 6, 0.55 * (1 - k) ** 1.5);

    // ---- 2. MUZZLE FLASH ----
    if (ft < 0) {
      setBlastSprite(core.current, 1, 0);
      setBlastSprite(star.current, 1, 0);
      setBlastSprite(afterglow.current, 1, 0);
      if (coneMat.current) coneMat.current.opacity = 0;
    } else {
      k = blastClamp(ft / 0.2);
      setBlastSprite(core.current, 3 + blastEase(k) * 4, (1 - k) ** 2);

      k = blastClamp(ft / 0.14);
      setBlastSprite(star.current, 4 + blastEase(k) * 5, (1 - k) ** 1.5);

      k = blastClamp(ft / 0.16);
      if (coneRef.current) coneRef.current.scale.set(1 + k * 0.8, 1 + k * 0.8, 0.4 + blastEase(k) * 1.5);
      if (coneMat.current) coneMat.current.opacity = 0.9 * (1 - k) ** 1.5;

      k = blastClamp(ft / 0.8);
      setBlastSprite(afterglow.current, 5 + ft * 8, 0.5 * (1 - k) ** 2);
    }

    // Light pulse
    if (lightRef.current) {
      lightRef.current.intensity =
        ft < 0 ? 50 * (T / FLASH_DELAY) : 500 * (1 - blastClamp(ft / 0.4)) ** 2;
    }

    // Camera kick
    const sh = ft < 0 ? 0 : shake * (1 - blastClamp(ft / 0.5)) ** 2;
    if (sh > 0.0005) {
      camera.position.x = (Math.random() - 0.5) * 2 * sh;
      camera.position.y = (Math.random() - 0.5) * 2 * sh;
      shaking.current = true;
    } else if (shaking.current) {
      camera.position.x = 0;
      camera.position.y = 0;
      shaking.current = false;
    }

    // Particles fade out before they reach the camera
    const zLimit = camera.position.z - position[2] - 0.7;

    // ---- 3. SPARKS ----
    const pts = sparksRef.current;
    if (pts) {
      const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
      const col = pts.geometry.attributes.color as THREE.BufferAttribute;
      const drag = 1.8;

      sparks.forEach((s, i) => {
        const age = T - s.delay;
        if (age < 0 || age > s.max) {
          col.setXYZ(i, 0, 0, 0);
          return;
        }
        const d = (1 - Math.exp(-drag * age)) / drag;
        const x = s.vx * d;
        const y = s.vy * d - 2 * age * age;
        const z = s.vz * d;
        if (z > zLimit) {
          col.setXYZ(i, 0, 0, 0);
          return;
        }
        pos.setXYZ(i, x, y, z);

        const f = age / s.max;
        const fade = (1 - f) ** 1.3;
        let r = 1;
        let gc: number;
        let b: number;
        if (f < 0.3) {
          const m = f / 0.3;
          gc = 0.95 - 0.4 * m;
          b = 0.7 - 0.55 * m;
        } else {
          const m = (f - 0.3) / 0.7;
          r = 1 - 0.2 * m;
          gc = 0.55 - 0.4 * m;
          b = 0.15 - 0.1 * m;
        }
        col.setXYZ(i, r * fade, gc * fade, b * fade);
      });
      pos.needsUpdate = true;
      col.needsUpdate = true;
    }

    // ---- 4. FRAGMENTS ----
    const cm = chunksRef.current;
    if (cm) {
      chunks.forEach((c, i) => {
        const age = T - c.delay;
        if (age < 0 || age > c.max) {
          dummy.position.set(0, 0, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          cm.setMatrixAt(i, dummy.matrix);
          return;
        }
        const k2 = 1.2;
        const d = (1 - Math.exp(-k2 * age)) / k2;
        const z = c.vz * d;
        if (z > zLimit) {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          cm.setMatrixAt(i, dummy.matrix);
          return;
        }
        dummy.position.set(c.vx * d, c.vy * d - 3.5 * age * age, z);
        dummy.rotation.set(c.rx + c.sx * age, c.ry + c.sy * age, c.rz + c.sz * age);

        const f = age / c.max;
        dummy.scale.setScalar(c.size * (1 - blastClamp((f - 0.8) / 0.2)));
        dummy.updateMatrix();
        cm.setMatrixAt(i, dummy.matrix);

        const m = blastClamp(f / 0.45);
        tmpColor.setRGB(1 - 0.78 * m, 0.65 - 0.45 * m, 0.25 - 0.06 * m);
        cm.setColorAt(i, tmpColor);
      });
      cm.instanceMatrix.needsUpdate = true;
      if (cm.instanceColor) cm.instanceColor.needsUpdate = true;
    }

    // ---- 5. FIRE CLOUDS ----
    flames.forEach((d, i) => {
      const s = fireRefs.current[i];
      if (!s) return;
      const mat = s.material as THREE.SpriteMaterial;
      const lt = T - d.start;
      if (lt < 0 || lt > d.life) {
        mat.opacity = 0;
        return;
      }
      const kk = lt / d.life;
      const travel = blastEase(kk) * d.life;
      const z = d.vz * travel;
      s.position.set(d.x + d.vx * travel, d.y + d.vy * travel, z);
      
s.scale.setScalar(
  d.size *
  BLAST_SIZE *
  fireMultiplier *
  (0.35 + blastEase(kk) * 1.2)
);

      mat.rotation = d.rot + d.spin * lt;
      fireRamp(kk, mat.color);
      const zFade = blastClamp((zLimit - z) / 1.5);
      mat.opacity = Math.min(1, kk * 8) * (1 - kk) ** 1.2 * 0.9 * zFade;
    });

    // ---- 6. SMOKE ----
    puffs.forEach((d, i) => {
      const s = smokeRefs.current[i];
      if (!s) return;
      const mat = s.material as THREE.SpriteMaterial;
      const lt = T - d.start;
      if (lt < 0 || lt > d.life) {
        mat.opacity = 0;
        return;
      }
      const kk = lt / d.life;
      const travel = blastEase(kk) * d.life;
      const z = d.vz * travel;
      s.position.set(d.x + d.vx * travel, d.y + d.vy * travel, z);
      s.scale.setScalar(d.size * BLAST_SIZE * (0.4 + blastEase(kk) * 1.5));
      mat.rotation = d.rot + d.spin * lt;
      const heat = blastClamp(1 - kk * 2.5);
      mat.color.setRGB(0.3 + 0.7 * heat, 0.3 + 0.3 * heat, 0.32 - 0.15 * heat);
      const zFade = blastClamp((zLimit - z) / 1.5);
      mat.opacity = d.alpha * Math.min(1, kk * 8) * (1 - kk) ** 1.3 * zFade;
    });
  });

  if (!tex || !billow) return null;

  return (
    <group ref={root} position={position} renderOrder={20}>
      {/* AIR BURST */}
      <sprite ref={haze}>
        <spriteMaterial map={tex.haze} transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
      <sprite ref={shockA}>
        <spriteMaterial map={tex.shock} transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
      <sprite ref={shockB}>
        <spriteMaterial map={tex.shock} transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>

      {/* SMOKE, drawn first so the fire lights it from in front */}
      {Array.from({ length: BLAST_PUFFS }, (_, i) => (
        <sprite key={i} ref={(el) => { smokeRefs.current[i] = el; }}>
          <spriteMaterial map={billow.smoke} transparent opacity={0} depthWrite={false} depthTest={false} />
        </sprite>
      ))}

      {/* FLASH */}
      <sprite ref={afterglow}>
        <spriteMaterial map={tex.glow} color="#ff5a1a" transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>

      {/* FIRE CLOUDS */}
      {Array.from({ length: BLAST_FIRE }, (_, i) => (
        <sprite key={i} ref={(el) => { fireRefs.current[i] = el; }}>
          <spriteMaterial map={billow.fire} transparent opacity={0}
            blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
        </sprite>
      ))}

      <sprite ref={core}>
        <spriteMaterial map={tex.glow} color="#fff2c8" transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
      <sprite ref={star}>
        <spriteMaterial map={tex.star} transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>

      {/* Cone of fire */}
      <group ref={coneRef}>
        <mesh position={[0, 0, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[1.4, 3.6, 24, 1, true]} />
          <meshBasicMaterial ref={coneMat} color="#ff9a30" transparent opacity={0}
            blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false}
            side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* SPARKS */}
      <points ref={sparksRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[sparkColors, 3]} />
        </bufferGeometry>
        <pointsMaterial map={tex.dot} size={0.25} sizeAttenuation vertexColors transparent
          blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </points>

      {/* FRAGMENTS */}
      <instancedMesh ref={chunksRef} args={[undefined, undefined, BLAST_CHUNKS]} frustumCulled={false}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.4} />
      </instancedMesh>

      <pointLight ref={lightRef} color="#ffb060" intensity={0} distance={40} />
    </group>
  );
}

function BulletFireTrail() {
  const trailRef = useRef<THREE.Group>(null);
  const tex = useMemo(() => getBlastTextures(), []);

  useFrame(({ camera, clock }) => {
    const trail = trailRef.current;
    if (!trail) return;

    trail.position.copy(camera.position);
    trail.quaternion.copy(camera.quaternion);

    // Bullet is 7 units ahead; trail sits behind it
    trail.translateZ(-BULLET_DISTANCE + 1);

const bulletZ = camera.position.z - BULLET_DISTANCE;

// Stop showing the fire trail when the bullet
// reaches the far end of the gun barrel.

const FIRE_TRAIL_EXTENSION = 9;

const insideBarrel =
  bulletZ <= BARREL_START_Z + FIRE_TRAIL_EXTENSION &&
  bulletZ >= BARREL_END_Z;

trail.visible = insideBarrel;

if (!insideBarrel) return;


    const t = clock.elapsedTime;

    trail.children.forEach((child, i) => {
      if (!(child instanceof THREE.Sprite)) return;

      const phase = (t * 2.5 + i / 12) % 1;

      child.position.set(
        Math.sin(t * 5 + i * 2.4) * 0.25 * phase,
        Math.cos(t * 4 + i * 1.7) * 0.25 * phase,
        phase * 4
      );

      const size = (0.5 + phase * 2.5) * 4.1;
      child.scale.set(size, size, 1);

      const material = child.material as THREE.SpriteMaterial;
      material.opacity = (1 - phase) * 0.25;
      material.color.set(
        phase < 0.35 ? "#fff1a0" :
        phase < 0.7 ? "#ff8a20" : "#ff3010"
      );
    });
  });

  if (!tex) return null;

  return (
    <group ref={trailRef}>
      {Array.from({ length: 12 }, (_, i) => (
        <sprite key={i}>
          <spriteMaterial
            map={tex.glow}
            color="#ff8a20"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}

function Bullet() {
  const followRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);

  const casingGeometry = useMemo(
    () => new THREE.LatheGeometry(makeCasingProfile(), 64),
    []
  );
  const projectileGeometry = useMemo(() => makeCutProjectileGeometry(), []);

  useFrame(({ camera }, delta) => {
    const g = followRef.current;
    if (g) {
      // Lock to the camera's position and rotation, then push straight ahead
      g.position.copy(camera.position);
      g.quaternion.copy(camera.quaternion);
      g.translateZ(-BULLET_DISTANCE);
      g.translateY(-0.2);
    }
    if (spinRef.current) spinRef.current.rotation.y += delta * 3;
  });

  return (
    <group ref={followRef}>
      {/* Lights travel with the bullet, so it's always lit */}
      <pointLight position={[2, 2, 3]} intensity={40} color="#ffe2b0" />
      <pointLight position={[-3, -1, 3]} intensity={25} color="#ff65d4" />

      {/* Slight tilt so you see the side of the round */}
      <group rotation={[0.3, 0, 0.1]} scale={1.2}>
        {/* Rotation turns the bullet's Y axis toward +Z: tip faces the viewer */}
        <group rotation={[Math.PI / 2.5, 0.4, -0.03]}>
          <group ref={spinRef}>
            <group position={[-0.05, -TIP_Y / 190, 0.05]}>
              <mesh geometry={casingGeometry}>
                <meshStandardMaterial
                  color="#e0b04a"
                  metalness={0.85}
                  roughness={0.3}
                  emissive="#3b3936"
                  emissiveIntensity={0.35}
                  side={THREE.DoubleSide}
                />
              </mesh>

              <mesh geometry={projectileGeometry}>
                <meshStandardMaterial
                  color="#c96d21"
                  metalness={0.85}
                  roughness={0.25}
                  emissive="#473126"
                  emissiveIntensity={0.35}
                  vertexColors
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      <Text
        position={[0, -2, 0]}
        fontSize={0.18}
        color="#ff65d4"
        anchorX="center"
        anchorY="middle"
      >
        WELCOME TO LEONIDA
      </Text>
    </group>
  );
}

const GLASS_W = 4.2;
const GLASS_H = 2.3625;
const PORTAL_FRAME_W = 4.35;
const PORTAL_FRAME_H = 2.52;
const BULLET_TIP_Z = 3.4; // how far the bullet's tip sticks out ahead of its group, along z
const GLASS_BREAK_PAST = 2; // the glass breaks when the bullet tip is this many units past it
const IMPACT_INSET = 0.5; // keeps the impact point this far inside the pane edge
const GLASS_SPEED = 0.45; // 1 = the previous speed, lower = slower

const GLASS_VERT = `
  uniform float uTime;
  uniform vec2 uImpact;
  attribute vec3 aCenter;
  attribute vec3 aAxis;
  attribute vec4 aRand;
  attribute vec3 aBary;
  varying vec2 vUv;
  varying vec2 vP;
  varying vec3 vBary;
  varying float vFade;
  varying float vCrack;
  varying float vTint;

  mat3 rotateAxis(vec3 axis, float a) {
    float s = sin(a);
    float c = cos(a);
    float oc = 1.0 - c;
    return mat3(
      oc * axis.x * axis.x + c,          oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
      oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z + axis.x * s,
      oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c
    );
  }

  void main() {
    vUv = uv;
    vP = position.xy;
    vBary = aBary;
    vTint = aRand.w;

    vec2 away = aCenter.xy - uImpact;
    float d = length(away);
    vec2 dir = d > 0.001 ? away / d : vec2(0.0, 1.0);

    float live = step(0.0, uTime); // 0 while the glass is whole

    // 1) Cracks run out from the impact across the whole pane
    vCrack = clamp((uTime - d * 0.05) / 0.1, 0.0, 1.0) * live;

    // 2) Shards let go, closest to the impact first, until the whole pane has fallen
    float t = max(0.0, uTime - (0.08 + d * 0.12)) * live;
    vFade = 1.0 - smoothstep(0.6, 1.3, t);

    float near = 1.0 / (1.0 + d);
    vec3 vel = vec3(dir * (1.5 + 6.0 * near) * aRand.x * aRand.z, 0.6 + 1.6 * near * aRand.x);
    float travel = (1.0 - exp(-1.5 * t)) / 1.5;
    vec3 offset = vel * travel;
    offset.y -= 2.2 * t * t; // gravity

    vec3 local = rotateAxis(aAxis, t * 7.0 * aRand.y) * (position - aCenter);
    vec3 p = aCenter + offset + local;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFade *= smoothstep(0.6, 2.0, -mv.z); // shards fade out before they reach the lens
    gl_Position = projectionMatrix * mv;
  }
`;

const GLASS_FRAG = `
  uniform sampler2D uMap;
  uniform vec2 uImpact;
  uniform float uTime;
  varying vec2 vUv;
  varying vec2 vP;
  varying vec3 vBary;
  varying float vFade;
  varying float vCrack;
  varying float vTint;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    vec3 col = tex.rgb;

    // Bright glass edges that appear as the crack reaches each shard
    float edge = 1.0 - smoothstep(0.0, 0.07, min(vBary.x, min(vBary.y, vBary.z)));
    col *= mix(1.0, vTint, vCrack);
    col += edge * vCrack * vec3(0.75, 0.92, 1.0);

    // Shards catching the light as they tumble
    float glint = pow(max(0.0, sin(uTime * 18.0 + vTint * 40.0)), 10.0);
    col += glint * vCrack * 0.5 * vec3(0.85, 0.95, 1.0);

    // Bright flash right where the bullet hit
    float live = step(0.0, uTime);
    float hit = 1.0 - smoothstep(0.0, 1.1, length(vP - uImpact));
    col += exp(-max(uTime, 0.0) * 8.0) * hit * 0.9 * live;

    float alpha = tex.a * mix(1.0, 0.7, vCrack) * vFade;
    alpha = max(alpha, edge * vCrack * 0.85 * vFade);
    gl_FragColor = vec4(col, alpha);
  }
`;

// The glass pane only: dark tinted glass with a faint sheen. No text on it.
function makeGlassTexture(color: string) {
  const W = 1008;
  const H = 540;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "rgba(16,11,34,0.94)";
  ctx.fillRect(0, 0, W, H);

  const sheen = ctx.createLinearGradient(0, H, W, 0);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.42, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.07)");
  sheen.addColorStop(0.58, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace; // the shader writes colors straight to the screen
  tex.anisotropy = 8;
  return tex;
}

// A jittered grid cut into triangles: every triangle becomes one shard
function makeShardGeometry(w: number, h: number, cols: number, rows: number) {
  const grid: THREE.Vector2[][] = [];
  for (let j = 0; j <= rows; j++) {
    const row: THREE.Vector2[] = [];
    for (let i = 0; i <= cols; i++) {
      let x = -w / 2 + (i / cols) * w;
      let y = -h / 2 + (j / rows) * h;
      if (i > 0 && i < cols) x += (Math.random() - 0.5) * (w / cols) * 0.7;
      if (j > 0 && j < rows) y += (Math.random() - 0.5) * (h / rows) * 0.7;
      row.push(new THREE.Vector2(x, y));
    }
    grid.push(row);
  }

  const tris: THREE.Vector2[][] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i + 1];
      const d = grid[j + 1][i];
      if (Math.random() < 0.5) tris.push([a, b, c], [a, c, d]);
      else tris.push([a, b, d], [b, c, d]);
    }
  }

  const n = tris.length * 3;
  const position = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const center = new Float32Array(n * 3);
  const axis = new Float32Array(n * 3);
  const rand = new Float32Array(n * 4);
  const bary = new Float32Array(n * 3);

  tris.forEach((tri, t) => {
    const cx = (tri[0].x + tri[1].x + tri[2].x) / 3;
    const cy = (tri[0].y + tri[1].y + tri[2].y) / 3;
    const ax = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    const r = [
      0.6 + Math.random() * 0.9, // speed
      0.5 + Math.random() * 1.5, // spin
      0.7 + Math.random() * 0.6, // outward push
      0.85 + Math.random() * 0.3, // brightness
    ];

    for (let k = 0; k < 3; k++) {
      const v = t * 3 + k;
      position.set([tri[k].x, tri[k].y, 0], v * 3);
      uv.set([(tri[k].x + w / 2) / w, (tri[k].y + h / 2) / h], v * 2);
      center.set([cx, cy, 0], v * 3);
      axis.set([ax.x, ax.y, ax.z], v * 3);
      rand.set(r, v * 4);
      bary.set([k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0], v * 3);
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setAttribute("aCenter", new THREE.BufferAttribute(center, 3));
  geo.setAttribute("aAxis", new THREE.BufferAttribute(axis, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
  geo.setAttribute("aBary", new THREE.BufferAttribute(bary, 3));
  return geo;
}

function ShatterPortal({
  portal,
  onSelect,
}: {
  portal: (typeof portals)[number];
  onSelect: (title: string) => void;
}) {
  const intactRef = useRef<THREE.Mesh>(null);
  const shardsRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0); // 0 whole, 1 shattering, 2 gone
  const hitAt = useRef(0);
  const lastTip = useRef<number | null>(null);
const geometry = useMemo(() => makeShardGeometry(GLASS_W, GLASS_H, 18, 10), []);
  const gifTexture = useLoader(THREE.TextureLoader, portal.image);
gifTexture.colorSpace = THREE.SRGBColorSpace;
const gifFrames = useRef<any[]>([]);
const currentFrame = useRef(0);
const frameTimer = useRef(0);

const animatedCanvas = useMemo(() => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
texture.repeat.set(1, 1);
texture.offset.set(0, 0);

  return { canvas, texture };
}, []);

useEffect(() => {
  let cancelled = false;

  async function loadGif() {
    console.log("STARTING GIF LOAD:", portal.title, portal.image);

    const response = await fetch(portal.image);
    const buffer = await response.arrayBuffer();

    if (cancelled) return;

    const parsed = parseGIF(buffer);
    animatedCanvas.canvas.width = parsed.lsd.width;
animatedCanvas.canvas.height = parsed.lsd.height;
if (portal.title === "VICE CITY MAP" && currentFrame.current % 30 === 0) {
  console.log("PLAYING GIF FRAME:", currentFrame.current);
}
animatedCanvas.texture.needsUpdate = true;

    console.log(
      portal.title,
      parsed.lsd.width,
      parsed.lsd.height
    );

    const frames = decompressFrames(parsed, true);
    console.log(
  "GIF ANIMATION:",
  portal.title,
  "Total frames:",
  frames.length,
  "First frame:",
  frames[0]?.dims
);
console.log(
  "GIF SIZE:",
  portal.title,
  "Canvas:",
  parsed.lsd.width,
  "x",
  parsed.lsd.height,
  "Frame:",
  frames[0]?.dims.width,
  "x",
  frames[0]?.dims.height
);
    if (!cancelled) {
      gifFrames.current = frames;
      currentFrame.current = 0;
      frameTimer.current = 0;
    }
  }

  loadGif().catch(console.error);

  return () => {
    cancelled = true;
  };
}, [portal.image]);
const material = useMemo(
  () =>
    new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: animatedCanvas.texture },
        uTime: { value: -1 },
        uImpact: { value: new THREE.Vector2() },
      },
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  [animatedCanvas]
);
  const frame = useMemo<[number, number, number][]>(
    () => [
      [-PORTAL_FRAME_W / 2, -PORTAL_FRAME_H / 2, -0.02],
      [PORTAL_FRAME_W / 2, -PORTAL_FRAME_H / 2, -0.02],
      [PORTAL_FRAME_W / 2, PORTAL_FRAME_H / 2, -0.02],
      [-PORTAL_FRAME_W / 2, PORTAL_FRAME_H / 2, -0.02],
      [-PORTAL_FRAME_W / 2, -PORTAL_FRAME_H / 2, -0.02],
    ],
    []
  );

  useFrame(({ camera, clock }, delta) => {
    const ctx = animatedCanvas.canvas.getContext("2d");
const frames = gifFrames.current;

if (ctx && frames.length > 0) {
  frameTimer.current += delta * 1000;

  const frame = frames[currentFrame.current];

  if (frame && frameTimer.current >= (frame.delay || 100)) {
    frameTimer.current = 0;

    const imageData = new ImageData(
      new Uint8ClampedArray(frame.patch),
      frame.dims.width,
      frame.dims.height
    );

    ctx.putImageData(imageData, frame.dims.left, frame.dims.top);

    currentFrame.current =
      (currentFrame.current + 1) % frames.length;

    animatedCanvas.texture.needsUpdate = true;
  }
}
gifTexture.needsUpdate = true;
    // The bullet rides BULLET_DISTANCE ahead of the camera; its tip leads the way
    const tipZ = camera.position.z - BULLET_DISTANCE + BULLET_TIP_Z;
    const prev = lastTip.current;
    lastTip.current = tipZ;
    const breakZ = portal.z + GLASS_BREAK_PAST;

    if (prev !== null) {
      if (prev < breakZ && tipZ >= breakZ && phase.current === 0) {
        // Bullet is through the glass: SHATTER around the impact point
        phase.current = 1;
        hitAt.current = clock.elapsedTime;

        const lx = THREE.MathUtils.clamp(
          camera.position.x - portal.x,
          -GLASS_W / 2 + IMPACT_INSET,
          GLASS_W / 2 - IMPACT_INSET
        );
        const ly = THREE.MathUtils.clamp(
          camera.position.y - 0.2,
          -GLASS_H / 2 + IMPACT_INSET,
          GLASS_H / 2 - IMPACT_INSET
        );
        material.uniforms.uImpact.value.set(lx, ly);
        material.uniforms.uTime.value = 0;

        if (intactRef.current) intactRef.current.visible = false;
        if (shardsRef.current) shardsRef.current.visible = true;
      } else if (prev >= breakZ && tipZ < breakZ && phase.current !== 0) {
        // Bullet went back in: the glass re-forms
        phase.current = 0;
        material.uniforms.uTime.value = -1;
        if (intactRef.current) intactRef.current.visible = true;
        if (shardsRef.current) shardsRef.current.visible = false;
      }
    }

    if (phase.current === 1) {
  const t = (clock.elapsedTime - hitAt.current) * GLASS_SPEED;
  material.uniforms.uTime.value = t;
  if (t > 2.2) {
        phase.current = 2;
        if (shardsRef.current) shardsRef.current.visible = false;
      }
    }
  });

  return (
    <group position={[portal.x, 0, portal.z]}>
      {/* Neon outline: stays after the glass is gone */}
      <Line points={frame} color={portal.color} lineWidth={1.5} transparent opacity={0.9} />

      {/* Card behind the glass: stays, and is always clickable */}
      <mesh
        position={[0, 0, -0.01]}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(portal.title);
        }}
      >
        <planeGeometry args={[GLASS_W, GLASS_H]} />
        <meshBasicMaterial
          color="#100b22"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glass pane while it's whole */}
      {/* Glass pane while it's whole */}
<mesh ref={intactRef}>
  <planeGeometry args={[GLASS_W, GLASS_H]} />
  <meshBasicMaterial
    map={gifTexture}
    side={THREE.DoubleSide}
    transparent
    toneMapped={false}
  />
</mesh>

      {/* The same pane in pieces, shown only while it's breaking */}
      <mesh
        ref={shardsRef}
        geometry={geometry}
        material={material}
        visible={false}
        frustumCulled={false}
      />

      
    </group>
  );
}


function EntranceBlast({ shot }: { shot: number }) {
  const blastRef = useRef<THREE.Group>(null);

  useFrame(({ camera }) => {
    if (!blastRef.current) return;

    // Keep the entrance explosion in front of the camera
    blastRef.current.position.copy(camera.position);
    blastRef.current.quaternion.copy(camera.quaternion);

    // Position the explosion 12 units ahead
    blastRef.current.translateZ(-12);
  });

  if (shot === 0) return null;

  return (
    <group ref={blastRef}>
      <MuzzleBlast
        shot={shot}
        position={[0, 0, 0]}
      />
    </group>
  );
}


function Tunnel({
  depth,
  onSelect,
}: {
  depth: number;
  onSelect: (title: string) => void;
}) {
   const worldDepth = mapScrollDepthToWorldDepth(depth);

const [entranceShot, setEntranceShot] = useState(0);

useEffect(() => {
  setEntranceShot(1);
}, []);

  // Muzzle blast: fires only as the bullet leaves the barrel (scrolling down/out)
  const [shot, setShot] = useState(0);
  const shotCount = useRef(0);
  const lastBulletZ = useRef<number | null>(null);

  useFrame(({ camera }, delta) => {
  const targetZ = 8 - worldDepth;

  camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 2.5, delta);
  camera.lookAt(0, 0, targetZ - 12);


    // The bullet rides BULLET_DISTANCE behind the camera along z
    const bulletZ = camera.position.z - BULLET_DISTANCE;
    const triggerZ = BARREL_START_Z - BLAST_LEAD;
    const prev = lastBulletZ.current;

    if (prev !== null) {
      if (prev < triggerZ && bulletZ >= triggerZ) {
        // Crossing the muzzle on the way OUT: fire
        shotCount.current += 1;
        setShot(shotCount.current);
      } else if (prev >= triggerZ && bulletZ < triggerZ) {
        // Crossing back IN: remove any blast still on screen
        setShot(0);
      }
    }
    lastBulletZ.current = bulletZ;
  });


  return (
    <group>
      <EnergyParticles />
      <EnergySpiral />

     
<Bullet />

{/* Fire follows behind the bullet */}
<BulletFireTrail />

<MuzzlePhoto depth={worldDepth} />

     
     {/* NEW: Automatic entrance blast at depth 85 */}
<MuzzleBlast
  shot={entranceShot}
  position={[0, -0.2, ENTRANCE_BLAST_Z - 12]}
  fireMultiplier={2.5}
  durationMultiplier={2.5}
/>

{/* ORIGINAL: Keep your existing muzzle blast unchanged */}
{/* Leave your existing <MuzzleBlast ... /> here */}
<MuzzleBlast
  shot={shot}
  position={[0, -0.2, BARREL_START_Z + 1]}
/>

      <GunBarrel />

      {Array.from({ length: 60 }, (_, i) => i)
        .filter((i) => {
          const z = 8 - i * 4;
          return z > -108 || z < -224;
        })
        .map((i) => (
          <group key={i} position={[0, 0, 8 - i * 4]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[5, 0.035, 8, 80]} />
              <meshBasicMaterial
                color={i % 2 === 0 ? "#ff38c7" : "#35eaff"}
                transparent
                opacity={0.65}
              />
            </mesh>

            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[4.65, 0.012, 6, 80]} />
              <meshBasicMaterial color="#9b59ff" transparent opacity={0.4} />
            </mesh>
          </group>
        ))}

      {portals.map((portal) => (
        <ShatterPortal key={portal.title} portal={portal} onSelect={onSelect} />
      ))}

      <ambientLight intensity={0.8} />
    </group>
  );
}

// Depth → world z. The camera sits at z = 8 - depth.
const zAtDepth = (d: number) => 8 - d;
const BARREL_START_Z = zAtDepth(120);
const BARREL_END_Z = zAtDepth(170);
const BARREL_LENGTH = BARREL_START_Z - BARREL_END_Z;
const BARREL_RADIUS = 5.2;

const FRAME_W = 3.5;
const FRAME_H = 4.6;
const FRAME_X = 5.0; // distance of frames from the center line

// Oldest first. Drop matching images into /public/gta/
const GTA_GAMES = [
  { title: "GRAND THEFT AUTO", year: "1997", file: "gta1.jpg" },
  { title: "GTA: LONDON 1969", year: "1999", file: "london1969.jpg" },
  { title: "GTA 2", year: "1999", file: "gta2.jpg" },
  { title: "GTA III", year: "2001", file: "gta3.jpg" },
  { title: "GTA: VICE CITY", year: "2002", file: "vicecity.jpg" },
  { title: "GTA ADVANCE", year: "2004", file: "advance.jpg" },
  { title: "GTA: SAN ANDREAS", year: "2004", file: "sanandreas.jpg" },
  { title: "GTA: LIBERTY CITY STORIES", year: "2005", file: "lcs.jpg" },
  { title: "GTA: VICE CITY STORIES", year: "2006", file: "vcs.jpg" },
  { title: "GTA IV", year: "2008", file: "gta4.jpg" },
  { title: "GTA: CHINATOWN WARS", year: "2009", file: "chinawars.jpg" },
  { title: "GTA V", year: "2013", file: "gta5.jpg" },
  { title: "GTA ONLINE", year: "2013", file: "online.jpg" },
];

function GameFrame({
  game,
  side,
  z,
  index,
}: {
  game: (typeof GTA_GAMES)[number];
  side: -1 | 1;
  z: number;
  index: number;
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const neon = index % 2 === 0 ? "#ff38c7" : "#35eaff";

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();

    loader.load(
      `/gta/${game.file}`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        if (!cancelled) {
          setTex(texture);
          console.log("IMAGE LOADED:", game.file);
        } else {
          texture.dispose();
        }
      },
      undefined,
      (error) => {
        if (!cancelled) {
          console.error(`IMAGE FAILED: /gta/${game.file}`, error);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [game.file]);

  // Keep the frame inside the barrel so its edges remain visible.
  const wallX = BARREL_RADIUS - 1.0;

  return (
    <group
      position={[side * wallX, 0, z]}
      rotation={[0, -side * Math.PI / 2, 0]}
    >
      {/* Picture mounted against the inner side wall */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[FRAME_W, FRAME_H]} />

        {tex ? (
          <meshBasicMaterial
            map={tex}
            color="white"
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshBasicMaterial
            color="#100b22"
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      {/* Show the title while the image loads */}
      {!tex && (
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.26}
          color={neon}
          anchorX="center"
          anchorY="middle"
          maxWidth={FRAME_W - 0.3}
          textAlign="center"
        >
          {game.title}
        </Text>
      )}

      {/* Game title */}
      <Text
        position={[0, -FRAME_H / 2 - 0.4, 0.02]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={FRAME_W + 0.6}
        textAlign="center"
      >
        {game.title}
      </Text>

      {/* Release year */}
      <Text
        position={[0, -FRAME_H / 2 - 0.75, 0.02]}
        fontSize={0.16}
        color={neon}
        anchorX="center"
        anchorY="middle"
      >
        {game.year}
      </Text>
    </group>
  );
}


function makeBrushedSteelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext("2d")!;

  // Dark steel base
  ctx.fillStyle = "#737b86";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Fine brushed-metal machining marks
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const brightness = Math.random();

    ctx.strokeStyle =
      brightness > 0.5
        ? `rgba(235,240,250,${Math.random() * 0.13})`
        : `rgba(15,20,30,${Math.random() * 0.15})`;

    ctx.lineWidth = 0.3 + Math.random() * 0.7;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 15 + Math.random() * 130, y);
    ctx.stroke();
  }

  // Occasional darker machining marks
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * canvas.height;

    ctx.fillStyle = "rgba(15,20,28,0.09)";
    ctx.fillRect(0, y, canvas.width, 0.5 + Math.random() * 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 24);
  texture.anisotropy = 8;

  return texture;
}


function GunBarrel() {
  // Helical rifling lines that twist along the whole barrel
  const rifling = useMemo(
    () =>
      Array.from({ length: 8 }, (_, s) => {
        const pts: THREE.Vector3[] = [];
        const steps = 300;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = s * ((Math.PI * 2) / 8) + t * Math.PI * 2 * 5;
          pts.push(
            new THREE.Vector3(
              Math.cos(angle) * (BARREL_RADIUS - 0.1),
              Math.sin(angle) * (BARREL_RADIUS - 0.1),
              BARREL_START_Z - t * BARREL_LENGTH
            )
          );
        }
        return pts;
      }),
    
    []
  );

  // Brushed steel texture for the barrel walls
  const steelTexture = useMemo(
    () => makeBrushedSteelTexture(),
    []
  );

  useEffect(() => {
    return () => steelTexture.dispose();
  }, [steelTexture]);

  return (
    <group>

      <Bullet />



{/* Brushed gunmetal steel bore */}
<mesh
  position={[
    0,
    0,
    (BARREL_START_Z + BARREL_END_Z) / 2
  ]}
  rotation={[Math.PI / 2, 0, 0]}
>
  <cylinderGeometry
    args={[
      BARREL_RADIUS,
      BARREL_RADIUS,
      BARREL_LENGTH,
      128,
      1,
      true
    ]}
  />

 
<meshPhysicalMaterial
  map={steelTexture}
  color="#e0e4ea"
  metalness={1.0}
  roughness={0.22}
  clearcoat={0.18}
  clearcoatRoughness={0.28}
  emissive="#080a10"
  emissiveIntensity={0.03}
  side={THREE.BackSide}
  envMapIntensity={2.0}
/>

</mesh>


     
{/* Metallic rifling grooves */}
{rifling.map((pts, i) => (
  <Line
    key={i}
    points={pts}
    color="#aeb8c5"
    lineWidth={2}
    transparent
    opacity={0.55}
  />
))}


      {/* Muzzle crown */}
      <mesh position={[0, 0, BARREL_START_Z]}>
        <torusGeometry args={[BARREL_RADIUS, 0.3, 12, 64]} />
        <meshBasicMaterial color="#9a9aa8" />
      </mesh>

      {/* Closed chamber end with a glowing ring */}
      <mesh position={[0, 0, BARREL_END_Z - 8]}>
        <circleGeometry args={[BARREL_RADIUS, 64]} />
        <meshBasicMaterial color="#07060c" />
      </mesh>
      <mesh position={[0, 0, BARREL_END_Z - 7.9]}>
        <torusGeometry args={[1.3, 0.05, 8, 64]} />
        <meshBasicMaterial color="#ff792b" />
      </mesh>

      {/* Photo frames, oldest at depth 220, newest at depth 120 */}
      
{GTA_GAMES.map((game, i) => (
        <GameFrame
          key={game.file}
          game={game}
          index={i}
          side={i % 2 === 0 ? -1 : 1}
          z={BARREL_END_Z + (i * BARREL_LENGTH) / (GTA_GAMES.length - 1) - (game.file === "online.jpg" ? 3 : 0)}
        />
      ))}
    </group>
  );
}



const PHOTO_H = 22;
const PHOTO_W = PHOTO_H * (2576 / 1438); // matches your image's aspect ratio
const MUZZLE_UV = { x: 0.501, y: 0.424 }; // muzzle position in the image, from top-left
const MUZZLE_WORLD = { x: 0, y: -0.2 }; // where the muzzle lands in the scene
const PHOTO_Z = 8 - 112;
const PHOTO_FADE_DEPTH = 8; // photo is fully gone by this depth

function MuzzlePhoto({ depth }: { depth: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);
  const tune = useRef({ ...MUZZLE_WORLD, z: PHOTO_Z, s: 180
   });

  useEffect(() => {
    let cancelled = false;
    new THREE.TextureLoader().load(
      "/gta/muzzle.png",
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        if (!cancelled) setTex(t);
      },
      undefined,
      () => {
        if (!cancelled) setFailed(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Arrow keys move the photo, [ ] push it back/forward, - = resize it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 0.5 : 0.05;
      const v = tune.current;
      if (e.key === "ArrowLeft") v.x -= step;
      else if (e.key === "ArrowRight") v.x += step;
      else if (e.key === "ArrowUp") v.y += step;
      else if (e.key === "ArrowDown") v.y -= step;
      else if (e.key === "[") v.z -= step;
      else if (e.key === "]") v.z += step;
      else if (e.key === "-") v.s *= 0.97;
      else if (e.key === "=") v.s *= 1.03;
      else return;
      e.preventDefault();
      console.log(
        `MUZZLE_WORLD = { x: ${v.x.toFixed(2)}, y: ${v.y.toFixed(2)} }, PHOTO_Z = ${v.z.toFixed(2)}, scale = ${v.s.toFixed(2)}`
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

 
useFrame(({ camera }) => {
  const g = groupRef.current;
  const m = matRef.current;
  if (!g || !m) return;

  const v = tune.current;

  // Progress from the muzzle at depth 120 to full screen at depth 1.
  const progress = THREE.MathUtils.clamp((120 - depth) / 119, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);

  // The photo begins at the barrel muzzle.
  const muzzlePosition = new THREE.Vector3(
    v.x,
    v.y,
    BARREL_START_Z
  );

  // Destination: a camera-facing plane just in front of the viewer.
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const distance = 6;
  const targetPosition = camera.position
    .clone()
    .addScaledVector(direction, distance);

  // Keep the muzzle position at the start, then transition toward the viewer.
  g.position.copy(muzzlePosition).lerp(targetPosition, eased);
  g.quaternion.copy(camera.quaternion);

  // Calculate the scale needed to cover the viewport at the target distance.
  const cam = camera as THREE.PerspectiveCamera;
  const viewHeight =
    2 * distance * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const viewWidth = viewHeight * cam.aspect;

  const fullScreenScale = Math.max(
    viewHeight / PHOTO_H,
    viewWidth / PHOTO_W
  ) * 8.0;

  // Normalize the existing tuning value so 180 does not multiply the zoom.
  const tuningScale = v.s / 140;
  const startScale = 0.02;

  const reverseProgress = 1.1 - eased;

const scale =
  (startScale + reverseProgress * (fullScreenScale - startScale)) *
  tuningScale;

  g.scale.setScalar(scale);

  // Fade in at the start and remain visible through depth 1.
  m.opacity = THREE.MathUtils.clamp((120 - depth) / 8, 0, 1);
  g.visible = depth <= 120 && depth >= 0;
});


  if (!tex) {
    return failed ? (
      <Text position={[0, 0, PHOTO_Z]} fontSize={0.5} color="red" anchorX="center">
        muzzle.png NOT FOUND
      </Text>
    ) : null;
  }

  return (
    <group ref={groupRef} position={[MUZZLE_WORLD.x, MUZZLE_WORLD.y, PHOTO_Z]}>
      {/* The plane is offset so the muzzle bore sits at the group's origin */}
      <mesh
        position={[
          -(MUZZLE_UV.x - 0.5) * PHOTO_W,
          -(0.5 - MUZZLE_UV.y) * PHOTO_H,
          0,
        ]}
      >
        <planeGeometry args={[PHOTO_W, PHOTO_H]} />
        <meshBasicMaterial ref={matRef} map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}


function GtaLogo3D() {
  const { scene } = useGLTF("/gta-logo/gtalogo.glb");
  const logoRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!logoRef.current) return;

    const t = clock.elapsedTime;

    logoRef.current.rotation.y = Math.sin(t * 0.7) * 0.3;
    logoRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    logoRef.current.position.y = Math.sin(t * 1.5) * 0.1;
  });

  return (
    <group ref={logoRef}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  );
}


export default function VortexWorld() {
  const [depth, setDepth] = useState(85);

const [entranceShot, setEntranceShot] = useState(0);

useEffect(() => {
  // Automatically play the entrance explosion
  setEntranceShot(1);
}, []);

  const [selected, setSelected] = useState<string | null>(null);
const [autoScroll, setAutoScroll] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);
useEffect(() => {
  if (!autoScroll || menuOpen) return;

  const interval = window.setInterval(() => {
    setDepth((current) =>
      THREE.MathUtils.clamp(
        current - 0.08,
        2.1,
        85
      )
    );
  }, 16);

  return () => window.clearInterval(interval);
}, [autoScroll, menuOpen]);

function travel(event: React.WheelEvent<HTMLElement>) {
  event.preventDefault();

  const delta = THREE.MathUtils.clamp(event.deltaY, -60, 60);

  setDepth((current) =>
    THREE.MathUtils.clamp(
      current - delta * SCROLL_SPEED,
      2.1,
      85
    )
  );
}

  
return (
  <main
    onWheel={travel}
    style={{
      position: "relative",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      background: "#05030b",
      color: "white",
    }}
  >

    {/* BLACK TOP HEADER BACKGROUND */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "110px",
        background: "#000000",
        zIndex: 10,
        pointerEvents: "none",
        borderBottom: "2px solid #ff38c7",
        boxShadow: "0 4px 20px rgba(255,56,199,0.35)",
      }}
    />

    <Canvas

        camera={{ position: [0, 0, 8], fov: 70 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#05030b"]} />
     
<color attach="background" args={["#05030b"]} />

{/* METALLIC BARREL LIGHTING */}
<ambientLight intensity={0.7} />

<pointLight
  position={[3, 3, -155]}
  color="#ff38c7"
  intensity={45}
  distance={35}
/>

<pointLight
  position={[-3, -2, -175]}
  color="#35eaff"
  intensity={45}
  distance={35}
/>
  
{/* AUTOMATIC WEBSITE ENTRANCE EXPLOSION */}
<EntranceBlast shot={entranceShot} />

       <Tunnel
  depth={depth}
  onSelect={(title) => {
  if (title === "VICE CITY MAP") {
    window.location.href = "/maps/vice-city";
    return;
  }

  if (title === "MISSIONS") {
    window.location.href = "/missions";
    return;
  }

  if (title === "LEADERBOARDS") {
    window.location.href = "/leaderboards";
    return;
  }

  if (title === "COMMUNITY") {
    window.location.href = "/community";
    return;
  }

  setSelected(title);
}}
/>
      </Canvas>

      
<div
  style={{
    position: "absolute",
    top: 0,
    left: 24,
    zIndex: 100,
    pointerEvents: "none",
    fontFamily: "Arial, sans-serif",
    textShadow: "0 0 18px #ff38c7",
  }}
>

       
        
<img
  src="/gta-logo/site-logo.png"
  alt="GTA VI Solutions"
  style={{
    display: "block",
    width: 300,
    height: "auto",
    maxHeight: 175,
    objectFit: "contain",
    margin: "8px 0",
    filter: "drop-shadow(0 0 12px rgba(255,56,199,0.45))",
  }}
/>


        
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          width: "max-content",
          maxWidth: "90%",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
          color: "#d9d5e8",
          fontSize: 12,
          letterSpacing: 2,
          pointerEvents: "none",
        }}
      >
        SCROLL TO TRAVEL DEEPER

        <div style={{ color: "#ff65d4", marginTop: 8 }}>
          DEPTH {Math.round(depth)} / 85
        </div>
      </div>

      {selected && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(5,3,11,0.82)",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              padding: 32,
              width: "min(380px, 85vw)",
              border: "1px solid #ff4fc8",
              background: "#100b22",
              boxShadow: "0 0 40px #ff38c744",
            }}
          >
            <div style={{ color: "#ff65d4", fontSize: 11, letterSpacing: 3 }}>
              PORTAL SELECTED
            </div>

            <h2>{selected}</h2>

            <p style={{ color: "#c7c1d6", fontSize: 13 }}>
              This destination is ready for us to build.
            </p>

            <button
              onClick={() => setSelected(null)}
              style={{
                padding: "10px 16px",
                color: "white",
                background: "#35163f",
                border: "1px solid #ff4fc8",
                cursor: "pointer",
              }}
            >
              RETURN TO VORTEX
            </button>
          </div>
        </div>
      )}
    
{/* FLOATING GTA VI LOGO + PAGE SHORTCUTS */}
<div
  style={{
    position: "absolute",
    top: 0,
    right: 24,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 12,
  }}
>
  <button
    type="button"
    aria-label="Open GTA VI page selection"
    aria-expanded={menuOpen}
    onMouseEnter={() => {
      if (!menuOpen) setAutoScroll(true);
    }}
    onMouseLeave={() => setAutoScroll(false)}
    onClick={() => {
      setAutoScroll(false);
      setMenuOpen((current) => !current);
    }}
    style={{
      width: 110,
      height: 130,
      padding: 0,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      perspective: "600px",
      filter: "drop-shadow(0 0 14px rgba(255,65,190,0.5))",
    }}
  >
    
<Canvas
  camera={{ position: [0, 0, 12], fov: 35 }}
  style={{
    width: "100%",
    height: "100%",
    background: "transparent",
    pointerEvents: "none",
  }}
  gl={{ alpha: true }}
>
  <ambientLight intensity={2} />
  <directionalLight position={[3, 4, 5]} intensity={3} />

  <GtaLogo3D />
</Canvas>

  </button>

  {menuOpen && (
    <nav
      aria-label="Page selection"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        border: "1px solid rgba(69,234,255,0.35)",
        borderRadius: 12,
        background: "rgba(5,3,11,0.9)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 25px rgba(255,56,199,0.2)",
      }}
    >
      {[
        { label: "VICE CITY MAP", href: "/maps/vice-city" },
        { label: "MISSIONS", href: "/missions" },
        { label: "LEADERBOARDS", href: "/leaderboards" },
        { label: "COMMUNITY", href: "/community" },
      ].map((item) => (
        <a
          key={item.label}
          href={item.href}
          style={{
            color: "#8ceeff",
            padding: "10px 16px",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: "bold",
            letterSpacing: 2,
            borderRadius: 6,
            border: "1px solid rgba(69,234,255,0.2)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )}
</div>

<style>{`
  @keyframes viFloat {
    0%, 100% {
      transform: translateY(0) rotateY(-12deg) rotateX(5deg);
    }
    50% {
      transform: translateY(-9px) rotateY(12deg) rotateX(-5deg);
    }
  }
`}</style>

    </main>
  );
}