import * as THREE from "three";

const stops = [
  { at: 0.0,  color: new THREE.Color("#061a3d") }, // dark blue, deepest ocean
  { at: 0.14, color: new THREE.Color("#0a3f7a") }, // blue, deeper ocean
  { at: 0.28, color: new THREE.Color("#1486b8") },
  { at: 0.4,  color: new THREE.Color("#35d6cf") }, // turquoise, shallow shelf
  { at: 0.49, color: new THREE.Color("#3f9e4a") }, // green, coastal lowlands
  { at: 0.58, color: new THREE.Color("#58a63f") }, // green, lowlands
  { at: 0.66, color: new THREE.Color("#d9c24a") }, // yellow, hills
  { at: 0.76, color: new THREE.Color("#9a6a3a") }, // brown, mountain slopes
  { at: 0.87, color: new THREE.Color("#b4b4b4") }, // light gray, high mountains
  { at: 0.96, color: new THREE.Color("#ffffff") }, // white, highest peaks
];

const out = new THREE.Color();

export function elevationColor(t: number): THREE.Color {
  if (t <= stops[0].at) return out.copy(stops[0].color);
  const last = stops[stops.length - 1];
  if (t >= last.at) return out.copy(last.color);

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.at && t <= b.at) {
      return out.lerpColors(a.color, b.color, (t - a.at) / (b.at - a.at));
    }
  }
  return out.copy(last.color);
}