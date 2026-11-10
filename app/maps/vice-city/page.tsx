"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { elevationColor } from "./elevationColors";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";

type MapMode = "height" | "labeled" | "merged" | "basemap";

export default function ViceCityMapPage() {
  const mountRef = useRef<HTMLDivElement>(null);

  const terrainRef = useRef<THREE.Mesh | null>(null);
  const basemapRef = useRef<THREE.Mesh | null>(null);
const placingPinRef = useRef(false);
  const materialsRef = useRef<{
    height: THREE.MeshStandardMaterial;
    labeled: THREE.MeshStandardMaterial;
    merged: THREE.MeshStandardMaterial;
    basemap: THREE.MeshBasicMaterial;
  } | null>(null);

  const [loading, setLoading] = useState(true);
const [mode, setMode] = useState<MapMode>("height");

const [discoveryType, setDiscoveryType] = useState<"Mystery" | "Collectible">("Mystery");
const [placingPin, setPlacingPin] = useState(false);
const [pinPosition, setPinPosition] = useState<{ x: number; z: number } | null>(null);
const [discoveryTitle, setDiscoveryTitle] = useState("");
const [discoveryDescription, setDiscoveryDescription] = useState("");

useEffect(() => {
  placingPinRef.current = placingPin;
}, [placingPin]);

useEffect(() => {
  const mount = mountRef.current;

  if (!mount) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07110c);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  camera.position.set(0, 260, 360);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;

  mount.appendChild(renderer.domElement);

  const controls = new OrbitControls(
    camera,
    renderer.domElement
  );
// --------------------------------------------------
// DISCOVERY PIN PLACEMENT
// --------------------------------------------------
let previewPin: THREE.Mesh | null = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const handleMapClick = (event: MouseEvent) => {
  if (!placingPinRef.current || !terrainRef.current) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObject(
    terrainRef.current,
    false
  );

  if (intersections.length === 0) {
    return;
  }

 const point = intersections[0].point;

// Remove the previous preview pin, if one exists.
if (previewPin) {
  scene.remove(previewPin);
  previewPin.geometry.dispose();
  (previewPin.material as THREE.Material).dispose();
}

// Create a visible discovery pin.
const pinGeometry = new THREE.SphereGeometry(2.2, 20, 20);

const pinMaterial = new THREE.MeshStandardMaterial({
  color: discoveryType === "Mystery" ? 0x45eaff : 0xb77aff,
  emissive: discoveryType === "Mystery" ? 0x087b99 : 0x6325a5,
  emissiveIntensity: 1.2,
});

previewPin = new THREE.Mesh(pinGeometry, pinMaterial);

previewPin.position.set(
  point.x,
  point.y + 3,
  point.z
);

scene.add(previewPin);

setPinPosition({
  x: Number(point.x.toFixed(2)),
  z: Number(point.z.toFixed(2)),
});

setPlacingPin(false);
};

renderer.domElement.addEventListener("click", handleMapClick);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 40;
  controls.maxDistance = 900;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 15, 0);

  // --------------------------------------------------
  // LIGHTING
  // --------------------------------------------------

  const ambient = new THREE.AmbientLight(
    0x6f8f78,
    1.2
  );

  scene.add(ambient);

  const sun = new THREE.DirectionalLight(
    0xfff1d0,
    2.2
  );

  sun.position.set(180, 350, 160);
  sun.castShadow = true;

  sun.shadow.mapSize.set(2048, 2048);

  scene.add(sun);

  const fill = new THREE.DirectionalLight(
    0x6ea8ff,
    0.55
  );

  fill.position.set(-200, 180, -200);

  scene.add(fill);

  // --------------------------------------------------
  // CONSTANTS
  // --------------------------------------------------

  const SIZE = 400;
  const SEGMENTS = 256;
  const HEIGHT_SCALE = 55;

  // --------------------------------------------------
  // TEXTURE LOADER
  // --------------------------------------------------

  const loader = new THREE.TextureLoader();

  let heightTexture:
    | THREE.Texture
    | null = null;

  let labeledTexture:
    | THREE.Texture
    | null = null;

  let terrain:
    | THREE.Mesh
    | null = null;
let basemapMesh: THREE.Mesh | null = null;
let basemapGeometry: THREE.PlaneGeometry | null = null;
let basemapMaterial: THREE.MeshBasicMaterial | null = null;
  let water:
    | THREE.Mesh
    | null = null;

  let grid:
    | THREE.GridHelper
    | null = null;

  let geometry:
    | THREE.BufferGeometry
    | null = null;

  let waterGeometry:
    | THREE.BufferGeometry
    | null = null;

  let heightMaterial:
    | THREE.MeshStandardMaterial
    | null = null;

  let labeledMaterial:
    | THREE.MeshStandardMaterial
    | null = null;

  let mergedMaterial:
    | THREE.MeshStandardMaterial
    | null = null;

  let waterMaterial:
    | THREE.MeshStandardMaterial
    | null = null;

  // --------------------------------------------------
  // LOAD HEIGHTMAP
  // --------------------------------------------------

  heightTexture = loader.load(
    "/maps/vice-city/heightmap.png",
    (texture) => {
      console.log(
        "HEIGHTMAP LOADED:",
        texture.image.width,
        texture.image.height
      );

      const image =
        texture.image as HTMLImageElement;

      // ----------------------------------------------
      // READ IMAGE INTO CANVAS
      // ----------------------------------------------

      const canvas =
        document.createElement("canvas");

      canvas.width = image.width;
      canvas.height = image.height;

      const context =
        canvas.getContext("2d");

      if (!context) {
        console.error(
          "Could not create canvas context."
        );

        setLoading(false);
        return;
      }

      context.drawImage(
        image,
        0,
        0
      );

      const imageData =
        context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

      // ----------------------------------------------
      // CREATE TERRAIN GEOMETRY
      // ----------------------------------------------

      geometry =
        new THREE.PlaneGeometry(
          SIZE,
          SIZE,
          SEGMENTS,
          SEGMENTS
        );

      const position =
        geometry.attributes.position;
const colors = new Float32Array(position.count * 3);
      for (
        let i = 0;
        i < position.count;
        i++
      ) {
        const x =
          position.getX(i);

        const y =
          position.getY(i);

        const u =
          (x + SIZE / 2) / SIZE;

        const v =
          (y + SIZE / 2) / SIZE;

        const pixelX =
          Math.min(
            canvas.width - 1,
            Math.max(
              0,
              Math.floor(
                u *
                  (canvas.width - 1)
              )
            )
          );

        const pixelY =
          Math.min(
            canvas.height - 1,
            Math.max(
              0,
              Math.floor(
                (1 - v) *
                  (canvas.height - 1)
              )
            )
          );

        const index =
          (pixelY * canvas.width +
            pixelX) *
          4;

        const r =
          imageData.data[index];

        const g =
          imageData.data[index + 1];

        const b =
          imageData.data[index + 2];

        const brightness =
          (r + g + b) /
          (255 * 3);

        const elevation =
          brightness *
          HEIGHT_SCALE;

        position.setZ(
          i,
          elevation
        );

        const c = elevationColor(brightness);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3)
      );

      geometry.rotateX(
        -Math.PI / 2
      );

      geometry.computeVertexNormals();

      // ----------------------------------------------
      // MATERIALS
      // ----------------------------------------------

      heightMaterial =
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: true,
          roughness: 0.9,
          metalness: 0.02,
        });

     labeledMaterial =
        new THREE.MeshStandardMaterial({
          map: labeledTexture,
          emissive: 0xffffff,
          emissiveMap: labeledTexture,
          emissiveIntensity: 0.55,
          roughness: 0.85,
          metalness: 0.02,
        });

      mergedMaterial =
        new THREE.MeshStandardMaterial({
          map: labeledTexture,
          color: 0xdce8df,
          roughness: 0.82,
          metalness: 0.02,
        });

      terrain =
        new THREE.Mesh(
          geometry,
          heightMaterial
        );

      terrain.castShadow = true;
      terrain.receiveShadow = true;

      terrain.position.y = 0;

      terrainRef.current =
        terrain;



      scene.add(terrain);

basemapGeometry = new THREE.PlaneGeometry(SIZE, SIZE);
basemapGeometry.rotateX(-Math.PI / 2);

basemapMaterial = new THREE.MeshBasicMaterial({
  map: basemapTexture,
  side: THREE.DoubleSide,
});

basemapMesh = new THREE.Mesh(
  basemapGeometry,
  basemapMaterial
);

basemapMesh.position.y = HEIGHT_SCALE + 2;
basemapMesh.visible = false;

scene.add(basemapMesh);
basemapRef.current = basemapMesh;

// Assign materials after all four exist
materialsRef.current = {
  height: heightMaterial,
  labeled: labeledMaterial,
  merged: mergedMaterial,
  basemap: basemapMaterial,
};

      // ----------------------------------------------
      // WATER
      // ----------------------------------------------

      waterGeometry =
        new THREE.PlaneGeometry(
          SIZE * 1.6,
          SIZE * 1.6
        );

      waterGeometry.rotateX(
        -Math.PI / 2
      );

      waterMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x075985,
          transparent: true,
          opacity: 0.55,
          roughness: 0.15,
          metalness: 0.25,
        });

      water =
        new THREE.Mesh(
          waterGeometry,
          waterMaterial
        );

      water.position.y = -3;

      scene.add(water);

      // ----------------------------------------------
      // GRID
      // ----------------------------------------------

      grid =
        new THREE.GridHelper(
          SIZE,
          20,
          0x31543c,
          0x183022
        );

      grid.position.y = -2.8;

      scene.add(grid);

      // ----------------------------------------------
      // DONE
      // ----------------------------------------------

      setLoading(false);
    },
    undefined,
    (error) => {
      console.error(
        "FAILED TO LOAD HEIGHTMAP:",
        error
      );

      setLoading(false);
    }
  );

  // --------------------------------------------------
  // LOAD LABELED MAP
  // --------------------------------------------------

  labeledTexture = loader.load(
    "/maps/vice-city/labeled.png",
    (texture) => {
      console.log(
        "LABELED MAP LOADED"
      );

      texture.colorSpace =
        THREE.SRGBColorSpace;

      texture.wrapS =
        THREE.ClampToEdgeWrapping;

      texture.wrapT =
        THREE.ClampToEdgeWrapping;

    texture.colorSpace = THREE.SRGBColorSpace;
texture.wrapS = THREE.ClampToEdgeWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
texture.flipY = true;
texture.needsUpdate = true;

if (labeledMaterial) {
  labeledMaterial.map = texture;
  labeledMaterial.emissiveMap = texture;
  labeledMaterial.color.set(0xffffff);
  labeledMaterial.needsUpdate = true;
}

if (mergedMaterial) {
  mergedMaterial.map = texture;
  mergedMaterial.color.set(0xffffff);
  mergedMaterial.needsUpdate = true;
}

      if (mergedMaterial) {
        mergedMaterial.map =
          texture;

        mergedMaterial.needsUpdate =
          true;
      }
    },
    undefined,
    (error) => {
      console.error(
        "FAILED TO LOAD LABELED MAP:",
        error
      );
    }
  );

  // --------------------------------------------------
  // LOAD LEONIDA BASEMAP
  // --------------------------------------------------

  const basemapTexture = loader.load(
    "/maps/vice-city/leonida/leonida_basemap_highres.webp",
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;

      console.log("LEONIDA BASEMAP LOADED");
    },
    undefined,
    (error) => {
      console.error("FAILED TO LOAD LEONIDA BASEMAP:", error);
    }
  );

  // --------------------------------------------------
  // ANIMATION
  // --------------------------------------------------

  let animationId = 0;

  const animate = () => {
    animationId =
      requestAnimationFrame(
        animate
      );

    controls.update();

    renderer.render(
      scene,
      camera
    );
  };

  animate();

  // --------------------------------------------------
  // RESIZE
  // --------------------------------------------------

  const handleResize = () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  };

  window.addEventListener(
    "resize",
    handleResize
  );

  // --------------------------------------------------
  // CLEANUP
  // --------------------------------------------------

  return () => {
    cancelAnimationFrame(
      animationId
    );

    window.removeEventListener(
      "resize",
      handleResize
    );
renderer.domElement.removeEventListener(
  "click",
  handleMapClick
);

if (previewPin) {
  scene.remove(previewPin);
  previewPin.geometry.dispose();
  (previewPin.material as THREE.Material).dispose();
}
    controls.dispose();

    if (geometry) {
      geometry.dispose();
    }

    if (waterGeometry) {
      waterGeometry.dispose();
    }

    if (heightMaterial) {
      heightMaterial.dispose();
    }

    if (labeledMaterial) {
      labeledMaterial.dispose();
    }

    if (mergedMaterial) {
      mergedMaterial.dispose();
    }

    if (waterMaterial) {
      waterMaterial.dispose();
    }

    if (heightTexture) {
      heightTexture.dispose();
    }

    if (labeledTexture) {
      labeledTexture.dispose();
    }

    renderer.dispose();

    if (
      mount.contains(
        renderer.domElement
      )
    ) {
      mount.removeChild(
        renderer.domElement
      );
    }

    terrainRef.current = null;
    materialsRef.current = null;
  };
}, []);

  // ------------------------------------------------------------
  // CHANGE MAP MODE
  // ------------------------------------------------------------

  useEffect(() => {
  const terrain = terrainRef.current;
  const basemap = basemapRef.current;
  const materials = materialsRef.current;

  if (!terrain || !basemap || !materials) return;

  if (mode === "basemap") {
    terrain.visible = false;
    basemap.visible = true;
  } else {
    terrain.visible = true;
    basemap.visible = false;
    terrain.material = materials[mode];
    terrain.scale.y = mode === "labeled" ? 0.001 : 1;
  }
}, [mode]);

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  const buttonStyle = (
    active: boolean
  ): React.CSSProperties => ({
    border: active
      ? "1px solid rgba(80,255,150,0.8)"
      : "1px solid rgba(148,163,184,0.25)",

    background: active
      ? "rgba(30,100,55,0.9)"
      : "rgba(15,23,42,0.75)",

    color: "#e2e8f0",

    padding:
      "9px 14px",

    borderRadius: 999,

    cursor: "pointer",

    fontSize: 13,

    fontWeight: 600,

    transition:
      "all 0.15s ease",
  });

  return (
    <main

      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background:
          "#07110c",
      }}
    >
{/* Back to Leonida */}
<Link
  href="/spatial"
  className="absolute right-5 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-green-400/40 bg-black/70 px-5 py-3 font-mono text-xs font-bold tracking-widest text-green-300 backdrop-blur-md transition hover:border-green-400 hover:bg-green-400/10"
>
  <span aria-hidden="true">←</span>
  BACK TO LEONIDA
</Link>

      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
        }}
      />

      {/* -------------------------------------------------------
          LOADING
      -------------------------------------------------------- */}

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            background:
              "#07110c",

            color:
              "#94a3b8",

            fontSize: 15,
          }}
        >
          Loading GTA VI Leonida terrain…
        </div>
      )}

      {/* -------------------------------------------------------
          TITLE
      -------------------------------------------------------- */}

      <div
        style={{
          position: "absolute",

          top: 16,
          left: 16,

          zIndex: 10,

          maxWidth: 330,

          padding:
            "15px 18px",

          borderRadius: 12,

          background:
            "rgba(7,17,12,0.86)",

          backdropFilter:
            "blur(12px)",

          border:
            "1px solid rgba(100,255,150,0.16)",

          color:
            "#e2e8f0",

          boxShadow:
            "0 10px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#f8fafc",
            marginBottom: 5,
          }}
        >
          GTA VI – Leonida
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "#94a3b8",
          }}
        >
          Interactive 3D terrain map.
          <br />
          Drag to orbit • Scroll to zoom
          • Right-click to pan
        </div>
      </div>
{/* -------------------------------------------------------
    DISCOVERY CONTROLS
-------------------------------------------------------- */}

<div
  style={{
    position: "absolute",
    top: 175,
    left: 16,
    zIndex: 20,
    width: 280,
    padding: 16,
    borderRadius: 12,
    background: "rgba(7,17,12,0.92)",
    border: "1px solid rgba(100,255,150,0.25)",
    backdropFilter: "blur(12px)",
    color: "#e2e8f0",
  }}
>
  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
    LEONIDA DISCOVERIES
  </div>

  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
    Help players uncover the world.
  </div>

  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
    <button
      type="button"
      onClick={() => setDiscoveryType("Mystery")}
      style={{
        ...buttonStyle(discoveryType === "Mystery"),
        flex: 1,
      }}
    >
      🔎 Mystery
    </button>

    <button
      type="button"
      onClick={() => setDiscoveryType("Collectible")}
      style={{
        ...buttonStyle(discoveryType === "Collectible"),
        flex: 1,
      }}
    >
      💎 Collectible
    </button>
  </div>

  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
    Selected category: {discoveryType}
  </div>

  <button
    type="button"
    onClick={() => setPlacingPin(!placingPin)}
    style={{
      width: "100%",
      padding: "11px 14px",
      borderRadius: 8,
      border: "1px solid rgba(80,255,150,0.6)",
      background: placingPin ? "#7f1d1d" : "#166534",
      color: "white",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {placingPin ? "Cancel Pin Placement" : "+ Place Discovery Pin"}
  </button>

  {placingPin && (
    <div style={{ marginTop: 12, fontSize: 12, color: "#86efac" }}>
      Pin placement mode is active. Next, connect your clicks to the terrain.
    </div>
  )}
</div>
   {/* -------------------------------------------------------
    DISCOVERY SUBMISSION FORM
-------------------------------------------------------- */}

{pinPosition && (
  <div
    style={{
      position: "absolute",
      top: 150,
      right: 20,
      zIndex: 20,
      width: 300,
      padding: 18,
      borderRadius: 14,
      background: "rgba(7,17,12,0.95)",
      border: "1px solid rgba(100,255,150,0.3)",
      color: "#e2e8f0",
    }}
  >
    <h2 style={{ marginTop: 0 }}>
      Submit a Discovery
    </h2>

    <p>
      Category: <strong>{discoveryType}</strong>
    </p>

    <p>
      Map position: {pinPosition.x}, {pinPosition.z}
    </p>

    <input
      value={discoveryTitle}
      onChange={(event) =>
        setDiscoveryTitle(event.target.value)
      }
      placeholder="Discovery title"
      style={{
        width: "100%",
        padding: 10,
        marginBottom: 10,
        boxSizing: "border-box",
      }}
    />

    <textarea
      value={discoveryDescription}
      onChange={(event) =>
        setDiscoveryDescription(event.target.value)
      }
      placeholder="Describe what you discovered..."
      rows={4}
      style={{
        width: "100%",
        padding: 10,
        marginBottom: 10,
        boxSizing: "border-box",
      }}
    />

    <button
  type="button"
  disabled={!discoveryTitle.trim()}
  onClick={async () => {
    const { error } = await supabase
      .from("discoveries")
      .insert({
        type: discoveryType,
        title: discoveryTitle.trim(),
        description: discoveryDescription.trim(),
        map_x: pinPosition.x,
        map_z: pinPosition.z,
        status: "pending",
      });

    if (error) {
      console.error("Submission error:", error);
      alert("Submission failed: " + error.message);
      return;
    }

    alert("Discovery submitted successfully! Pending approval.");

    setDiscoveryTitle("");
    setDiscoveryDescription("");
    setPinPosition(null);
  }}
>
  Submit Discovery
</button>
  </div>
)}

      {/* -------------------------------------------------------
          MODE BUTTONS
      -------------------------------------------------------- */}

      <div
        style={{
          position: "absolute",

          bottom: 24,
          left: "50%",

          transform:
            "translateX(-50%)",

          zIndex: 10,

          display: "flex",

          gap: 8,

          padding:
            "9px 10px",

          borderRadius: 999,

          background:
            "rgba(7,17,12,0.9)",

          backdropFilter:
            "blur(12px)",

          border:
            "1px solid rgba(100,255,150,0.18)",

          boxShadow:
            "0 10px 40px rgba(0,0,0,0.35)",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setMode("height")
          }
          style={buttonStyle(
            mode === "height"
          )}
        >
          Elevation Map
        </button>

      
        <button
  type="button"
  onClick={() => setMode("basemap")}
  style={buttonStyle(mode === "basemap")}
>
  Map of Leonida 
</button>
      </div>
    </main>
  );
}