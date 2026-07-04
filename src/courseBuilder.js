import { TILES, DIR_VEC, OPPOSITE, turnLeft, turnRight, findRotationSteps } from "./tiles.js";

// Walks a hole's move-sequence DSL into a concrete grid of placed tiles.
//
// hole = {
//   name, par,
//   start: { x, z, heading },     // heading: 'N' | 'E' | 'S' | 'W'
//   steps: [
//     { move: 'forward'|'turnLeft'|'turnRight'|'hole', piece: <tile name> },
//     ...
//   ],
//   decorations: [{ piece, x, z, rotationSteps, scale }]   // optional, off-path props
// }
//
// Returns { tiles: [{piece, x, z, rotationSteps}], tee: {x,z,heading}, cup: {x,z}, bounds }
export function buildHole(hole) {
  const tiles = [];
  let x = hole.start.x;
  let z = hole.start.z;
  let heading = hole.start.heading;

  const teeRot = findRotationSteps("start", [heading]);
  tiles.push({ piece: "start", x, z, rotationSteps: teeRot.steps });
  const tee = { x, z, heading };

  let cup = null;

  hole.steps.forEach((step, i) => {
    const oldHeading = heading;
    let newHeading = heading;
    if (step.move === "turnLeft") newHeading = turnLeft(heading);
    else if (step.move === "turnRight") newHeading = turnRight(heading);
    else if (step.move !== "forward" && step.move !== "hole") {
      throw new Error(`Unknown move "${step.move}" at step ${i}`);
    }

    const [dx, dz] = DIR_VEC[oldHeading];
    x += dx;
    z += dz;

    const entry = OPPOSITE[oldHeading];
    const required = step.move === "hole" ? [entry] : [entry, newHeading];

    let rot;
    try {
      rot = findRotationSteps(step.piece, required);
    } catch (err) {
      throw new Error(`Step ${i} (${step.move} "${step.piece}" at ${x},${z}): ${err.message}`);
    }

    tiles.push({ piece: step.piece, x, z, rotationSteps: rot.steps });

    if (step.move === "hole") {
      cup = { x, z };
    }

    heading = newHeading;
  });

  if (!cup) throw new Error(`Hole "${hole.name}" has no terminal 'hole' step`);

  const xs = tiles.map((t) => t.x);
  const zs = tiles.map((t) => t.z);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };

  return { tiles, tee, cup, bounds, decorations: hole.decorations || [], name: hole.name, par: hole.par };
}
