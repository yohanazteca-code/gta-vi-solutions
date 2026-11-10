
export type SpatialPosition = {
  x: number;
  y: number;
  z: number;
};

export type SpatialObject = {
  id: string;
  name: string;
  type: "map" | "board" | "logo" | "concept" | "panel";
  position: SpatialPosition;
  rotation: SpatialPosition;
  scale: number;
  visible: boolean;
};

export const spatialWorld = {
  name: "GTA(VI).Solutions Spatial World",

  objects: [
    {
      id: "vice-city-map",
      name: "Vice City Map",
      type: "map",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      visible: true,
    },
    {
      id: "mystery-board",
      name: "Mystery Board",
      type: "board",
      position: { x: 8, y: 2, z: -4 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      visible: true,
    },
    {
      id: "3d-concept",
      name: "3D Concept",
      type: "concept",
      position: { x: 0, y: 5, z: -12 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      visible: true,
    },
  ] satisfies SpatialObject[],
};

export function getSpatialObject(id: string) {
  return spatialWorld.objects.find((object) => object.id === id);
}
