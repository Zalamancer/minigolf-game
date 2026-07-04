import * as THREE from "three";

const MAX_DRAG_PX = 160;
const MIN_POWER = 0.045;
const CAM_LERP = 6.5;
const CAM_DIST = 4.4;
const CAM_HEIGHT = 3.5;
const ORBIT_SPEED = 1.6; // radians/sec from keyboard

// Mouse/touch slingshot-style aiming + a smooth isometric follow camera.
export class Controls {
  constructor({ camera, domElement, getBallPosition, isBallMoving, onShoot, maxSpeed = 5.6, onAimChange }) {
    this.camera = camera;
    this.dom = domElement;
    this.getBallPosition = getBallPosition;
    this.isBallMoving = isBallMoving;
    this.onShoot = onShoot;
    this.maxSpeed = maxSpeed;
    this.onAimChange = onAimChange || (() => {});

    this.dragging = false;
    this.dragStart = new THREE.Vector2();
    this.dragCurrent = new THREE.Vector2();
    this.aimDir = new THREE.Vector3(0, 0, -1);
    this.power = 0;

    this.azimuth = Math.PI * 0.25;
    this.keys = { left: false, right: false };

    this._camPos = new THREE.Vector3();
    this._initialized = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    this.dom.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  dispose() {
    this.dom.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }

  _onKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a") this.keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d") this.keys.right = true;
  }

  _onKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a") this.keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d") this.keys.right = false;
  }

  _onPointerDown(e) {
    if (this.isBallMoving()) return;
    this.dragging = true;
    this.dragStart.set(e.clientX, e.clientY);
    this.dragCurrent.copy(this.dragStart);
    this.dom.setPointerCapture?.(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this.dragging) return;
    this.dragCurrent.set(e.clientX, e.clientY);
    this._updateAim();
  }

  _onPointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.power >= MIN_POWER) {
      const vx = this.aimDir.x * this.power * this.maxSpeed;
      const vz = this.aimDir.z * this.power * this.maxSpeed;
      this.onShoot(vx, vz, this.power);
    }
    this.power = 0;
    this.onAimChange({ active: false, power: 0, dir: this.aimDir });
  }

  _updateAim() {
    // Slingshot: drag away from the ball, shot direction points from pointer back toward (and past) the ball.
    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const dragLen = Math.hypot(dx, dy);
    this.power = Math.max(0, Math.min(1, dragLen / MAX_DRAG_PX));

    if (dragLen > 1e-3) {
      const camForward = new THREE.Vector3();
      this.camera.getWorldDirection(camForward);
      camForward.y = 0;
      camForward.normalize();

      // right = forward x up (right-handed, up = +Y), flattened to the ground plane
      const camRight = new THREE.Vector3(-camForward.z, 0, camForward.x).normalize();

      const worldX = dx;
      const worldZ = dy;
      const dir = new THREE.Vector3()
        .addScaledVector(camRight, worldX)
        .addScaledVector(camForward, -worldZ);
      if (dir.lengthSq() > 1e-6) {
        dir.normalize();
        this.aimDir.copy(dir);
      }
    }

    this.onAimChange({ active: true, power: this.power, dir: this.aimDir });
  }

  update(dt) {
    if (this.keys.left) this.azimuth += ORBIT_SPEED * dt;
    if (this.keys.right) this.azimuth -= ORBIT_SPEED * dt;

    const ball = this.getBallPosition();
    const offsetX = Math.sin(this.azimuth) * CAM_DIST;
    const offsetZ = Math.cos(this.azimuth) * CAM_DIST;
    const target = new THREE.Vector3(ball.x + offsetX, CAM_HEIGHT, ball.z + offsetZ);

    if (!this._initialized) {
      this._camPos.copy(target);
      this._initialized = true;
    } else {
      const t = 1 - Math.exp(-CAM_LERP * dt);
      this._camPos.lerp(target, t);
    }

    this.camera.position.copy(this._camPos);
    this.camera.lookAt(ball.x, ball.y + 0.12, ball.z);
  }

  getAimOrigin() {
    return this.getBallPosition();
  }
}
