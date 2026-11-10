"use client";

import { useState } from "react";
import { spatialWorld } from "./SpatialEngine";
import "./spatial.css";

export default function SpatialScene() {
  const [selectedId, setSelectedId] = useState("vice-city-map");

  const selectedObject = spatialWorld.objects.find(
    (object) => object.id === selectedId
  );

  return (
    <section className="spatial-scene" aria-label="Spatial world preview">
        <p style={{ color: "red", fontSize: "20px" }}>
  SPATIAL SCENE TEST
</p>

      <div className="spatial-scene__header">
        <div>
          <p className="spatial-scene__eyebrow">SPATIAL ENGINE / 001</p>
          <h2>Spatial World</h2>
        </div>
        <span className="spatial-scene__status">ENGINE ONLINE</span>
      </div>

      <div className="spatial-scene__stage">
        <div className="spatial-scene__grid" aria-hidden="true" />

        {spatialWorld.objects
          .filter((object) => object.visible)
          .map((object) => (
            <button
              key={object.id}
              type="button"
              className={`spatial-object ${
                selectedId === object.id ? "is-selected" : ""
              }`}
              style={{
                left: `${50 + object.position.x * 3}%`,
                top: `${50 - object.position.y * 5}%`,
                transform: `translate(-50%, -50%) scale(${
                  Math.max(0.65, object.scale - object.position.z * 0.015)
                })`,
                zIndex: Math.round(100 - object.position.z),
              }}
              onClick={() => setSelectedId(object.id)}
            >
              <span className="spatial-object__type">
                {object.type.toUpperCase()}
              </span>
              <span className="spatial-object__name">{object.name}</span>
              <span className="spatial-object__coordinates">
                X {object.position.x} · Y {object.position.y} · Z{" "}
                {object.position.z}
              </span>
            </button>
          ))}
      </div>

      {selectedObject && (
        <div className="spatial-scene__details" aria-live="polite">
          <div>
            <p className="spatial-scene__eyebrow">SELECTED OBJECT</p>
            <h3>{selectedObject.name}</h3>
            <p>
              Position: ({selectedObject.position.x},{" "}
              {selectedObject.position.y}, {selectedObject.position.z})
            </p>
          </div>
          <span className="spatial-scene__status">
            {selectedObject.visible ? "VISIBLE" : "HIDDEN"}
          </span>
        </div>
      )}
    </section>
  );
}
