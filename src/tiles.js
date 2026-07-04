// Tile catalog for the Kenney Mini Golf kit.
// Compass directions are in world/local XZ space: N = -Z, E = +X, S = +Z, W = -X.
// `open` lists the LOCAL (unrotated, rotationSteps=0) edges a ball can cross.
export const DIRS = ["N", "E", "S", "W"];

export const DIR_VEC = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
};

export const OPPOSITE = { N: "S", S: "N", E: "W", W: "E" };

export function turnLeft(dir) {
  return { N: "W", W: "S", S: "E", E: "N" }[dir];
}

export function turnRight(dir) {
  return { N: "E", E: "S", S: "W", W: "N" }[dir];
}

// Rotating a piece by `steps` * 90 degrees (positive = matches a positive
// Object3D.rotation.y increment) maps each local open edge to a new world edge.
export function rotateDir(dir, steps) {
  const idx = DIRS.indexOf(dir);
  return DIRS[(((idx - steps) % 4) + 4) % 4];
}

export function rotateSet(set, steps) {
  return set.map((d) => rotateDir(d, steps));
}

export const TILES = {
  start: { open: ["N"], kind: "tee", model: "start" },
  "hole-round": { open: ["N"], kind: "hole", model: "hole-round" },
  "hole-square": { open: ["N"], kind: "hole", model: "hole-square" },

  straight: { open: ["N", "S"], kind: "path", model: "straight" },
  "narrow-square": { open: ["N", "S"], kind: "path", model: "narrow-square" },
  "walls-to-open": { open: ["N", "S"], kind: "path", model: "walls-to-open" },
  "tunnel-narrow": { open: ["N", "S"], kind: "path", model: "tunnel-narrow" },
  ramp: { open: ["N", "S"], kind: "path", model: "ramp", ramp: true },
  gap: { open: ["N", "S"], kind: "path", model: "gap", hazard: true },
  "bump-walls": { open: ["N", "S"], kind: "path", model: "bump-walls", bump: true },

  corner: { open: ["N", "W"], kind: "path", model: "corner" },
  "round-corner-a": { open: ["N", "W"], kind: "path", model: "round-corner-a" },
  "square-corner-a": { open: ["N", "W"], kind: "path", model: "square-corner-a" },

  "split-t": { open: ["N", "E", "W"], kind: "path", model: "split-t" },

  side: { open: ["N", "S", "W"], kind: "path", model: "side" },
  "obstacle-triangle": { open: ["N", "S", "W"], kind: "path", model: "obstacle-triangle" },
  "obstacle-diamond": { open: ["N", "S", "W"], kind: "path", model: "obstacle-diamond" },

  open: { open: ["N", "E", "S", "W"], kind: "path", model: "open" },
  "inner-corner": { open: ["N", "E", "S", "W"], kind: "path", model: "inner-corner" },
  bump: { open: ["N", "E", "S", "W"], kind: "path", model: "bump", bump: true },
};

// World-space surface metrics shared by physics + rendering (units = meters, 1 tile = 1x1).
export const DECK_HEIGHT = 0.1466;
export const BALL_RADIUS = 0.035;
export const TILE_SIZE = 1;

export function findRotationSteps(pieceName, requiredWorldOpens) {
  const tile = TILES[pieceName];
  if (!tile) throw new Error(`Unknown piece "${pieceName}"`);
  for (let k = 0; k < 4; k++) {
    const worldOpen = rotateSet(tile.open, k);
    if (requiredWorldOpens.every((d) => worldOpen.includes(d))) {
      return { steps: k, worldOpen };
    }
  }
  throw new Error(
    `Piece "${pieceName}" (local open [${tile.open}]) cannot satisfy required opens [${requiredWorldOpens}]`
  );
}
