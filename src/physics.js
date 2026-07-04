import { TILES, DIRS, rotateDir, rotateSet, DIR_VEC, BALL_RADIUS } from "./tiles.js";

const FRICTION_PER_SEC = 0.62; // velocity multiplier retained after 1 full second of rolling
const RESTITUTION = 0.55; // wall bounce energy retention
const STOP_SPEED = 0.025;
const BUMP_RADIUS = 0.27;
const RAMP_ACCEL = 1.55; // units/s^2 applied along the slope while ball is on a ramp cell
const RAMP_VISUAL_RISE = 0.13; // modest cosmetic height gain across a ramp tile (avoids a jarring drop at its high edge)
const GAP_RADIUS = 0.16;
const HOLE_RADIUS = 0.095;
const HOLE_CAPTURE_SPEED = 1.1;
const WORLD_BOUND_PAD = 1.5;

function cellKey(x, z) {
  return `${x},${z}`;
}

// Builds static collision data (wall segments + special cells) from a built hole's tile list.
export function buildCollision(built) {
  const segments = [];
  const rampCells = new Map();
  const bumpCells = new Map();
  const hazardCells = new Map();

  for (const t of built.tiles) {
    const tile = TILES[t.piece];
    const worldOpen = rotateSet(tile.open, t.rotationSteps);
    const cx = t.x;
    const cz = t.z;

    for (const dir of DIRS) {
      if (worldOpen.includes(dir)) continue;
      segments.push(edgeSegment(cx, cz, dir));
    }

    if (tile.ramp) {
      const uphill = rotateDir("N", t.rotationSteps);
      rampCells.set(cellKey(cx, cz), { x: cx, z: cz, uphill: DIR_VEC[uphill] });
    }
    if (tile.bump) {
      bumpCells.set(cellKey(cx, cz), { x: cx, z: cz });
    }
    if (tile.hazard) {
      hazardCells.set(cellKey(cx, cz), { x: cx, z: cz });
    }
  }

  const cup = { x: built.cup.x, z: built.cup.z };

  return { segments, rampCells, bumpCells, hazardCells, cup, bounds: built.bounds };
}

function edgeSegment(cx, cz, dir) {
  const half = 0.5;
  switch (dir) {
    case "N":
      return { x1: cx - half, z1: cz - half, x2: cx + half, z2: cz - half };
    case "S":
      return { x1: cx - half, z1: cz + half, x2: cx + half, z2: cz + half };
    case "E":
      return { x1: cx + half, z1: cz - half, x2: cx + half, z2: cz + half };
    case "W":
      return { x1: cx - half, z1: cz - half, x2: cx - half, z2: cz + half };
    default:
      throw new Error(`bad dir ${dir}`);
  }
}

function closestPointOnSegment(px, pz, seg) {
  const dx = seg.x2 - seg.x1;
  const dz = seg.z2 - seg.z1;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq === 0 ? 0 : ((px - seg.x1) * dx + (pz - seg.z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: seg.x1 + dx * t, z: seg.z1 + dz * t };
}

export class BallPhysics {
  constructor(collision) {
    this.collision = collision;
    this.x = 0;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.moving = false;
  }

  setPosition(x, z) {
    this.x = x;
    this.z = z;
    this.vx = 0;
    this.vz = 0;
    this.moving = false;
  }

  shoot(vx, vz) {
    this.vx = vx;
    this.vz = vz;
    this.moving = true;
  }

  // Advances the simulation by dt seconds. Returns { sunk, hazard }.
  update(dt) {
    if (!this.moving) return { sunk: false, hazard: false };

    const steps = Math.max(1, Math.ceil(dt / 0.004));
    const subDt = dt / steps;
    let hazard = false;

    for (let i = 0; i < steps && this.moving; i++) {
      hazard = this._integrate(subDt) || hazard;
    }

    const sunk = this._checkHole();
    if (sunk) this.moving = false;

    return { sunk, hazard };
  }

  _integrate(dt) {
    for (const ramp of this.collision.rampCells.values()) {
      if (Math.abs(this.x - ramp.x) < 0.5 && Math.abs(this.z - ramp.z) < 0.5) {
        this.vx -= ramp.uphill[0] * RAMP_ACCEL * dt;
        this.vz -= ramp.uphill[1] * RAMP_ACCEL * dt;
      }
    }

    const frictionFactor = Math.pow(FRICTION_PER_SEC, dt);
    this.vx *= frictionFactor;
    this.vz *= frictionFactor;

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    this._resolveWalls();
    this._resolveBumps();

    const speed = Math.hypot(this.vx, this.vz);
    if (speed < STOP_SPEED) {
      this.vx = 0;
      this.vz = 0;
      this.moving = false;
    }

    return this._checkHazard();
  }

  _resolveWalls() {
    for (const seg of this.collision.segments) {
      const cp = closestPointOnSegment(this.x, this.z, seg);
      const dx = this.x - cp.x;
      const dz = this.z - cp.z;
      const dist = Math.hypot(dx, dz);
      if (dist < BALL_RADIUS && dist > 1e-6) {
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = BALL_RADIUS - dist;
        this.x += nx * overlap;
        this.z += nz * overlap;
        const vDotN = this.vx * nx + this.vz * nz;
        if (vDotN < 0) {
          this.vx -= (1 + RESTITUTION) * vDotN * nx;
          this.vz -= (1 + RESTITUTION) * vDotN * nz;
        }
      }
    }

    const b = this.collision.bounds;
    this.x = Math.max(b.minX - WORLD_BOUND_PAD, Math.min(b.maxX + WORLD_BOUND_PAD, this.x));
    this.z = Math.max(b.minZ - WORLD_BOUND_PAD, Math.min(b.maxZ + WORLD_BOUND_PAD, this.z));
  }

  _resolveBumps() {
    for (const bump of this.collision.bumpCells.values()) {
      const dx = this.x - bump.x;
      const dz = this.z - bump.z;
      const dist = Math.hypot(dx, dz);
      const minDist = BUMP_RADIUS + BALL_RADIUS;
      if (dist < minDist && dist > 1e-6) {
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;
        this.x += nx * overlap;
        this.z += nz * overlap;
        const vDotN = this.vx * nx + this.vz * nz;
        if (vDotN < 0) {
          this.vx -= (1 + RESTITUTION) * vDotN * nx;
          this.vz -= (1 + RESTITUTION) * vDotN * nz;
        }
      }
    }
  }

  _checkHazard() {
    for (const gap of this.collision.hazardCells.values()) {
      const dist = Math.hypot(this.x - gap.x, this.z - gap.z);
      if (dist < GAP_RADIUS) {
        this.moving = false;
        return true;
      }
    }
    return false;
  }

  _checkHole() {
    const cup = this.collision.cup;
    const dist = Math.hypot(this.x - cup.x, this.z - cup.z);
    const speed = Math.hypot(this.vx, this.vz);
    return dist < HOLE_RADIUS && speed < HOLE_CAPTURE_SPEED;
  }

  // Cosmetic surface height offset (added to the flat deck height) for rendering only.
  getSurfaceRise() {
    for (const ramp of this.collision.rampCells.values()) {
      const dx = this.x - ramp.x;
      const dz = this.z - ramp.z;
      if (Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5) {
        const t = Math.max(0, Math.min(1, dx * ramp.uphill[0] + dz * ramp.uphill[1] + 0.5));
        return t * RAMP_VISUAL_RISE;
      }
    }
    return 0;
  }
}
