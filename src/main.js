import * as THREE from "three";
import { DECK_HEIGHT, BALL_RADIUS, DIR_VEC, OPPOSITE } from "./tiles.js";
import { buildHole } from "./courseBuilder.js";
import { buildCollision, BallPhysics } from "./physics.js";
import { preload, spawnModel } from "./assets.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { HOLES } from "./holes/index.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3f4);
scene.fog = new THREE.Fog(0x8fd3f4, 18, 40);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("app").appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x3a6b2e, 1.1));
const sun = new THREE.DirectionalLight(0xfff3d6, 2.1);
sun.position.set(6, 11, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16;
sun.shadow.camera.bottom = -16;
sun.shadow.bias = -0.0015;
scene.add(sun);
scene.add(sun.target);

const groundGeo = new THREE.PlaneGeometry(1, 1);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

const courseGroup = new THREE.Group();
scene.add(courseGroup);

let ballMesh = null;
let aimLine = null;

const ALL_PIECE_NAMES = new Set();
HOLES.forEach((hole) => {
  buildHole(hole).tiles.forEach((t) => ALL_PIECE_NAMES.add(t.piece));
  (hole.decorations || []).forEach((d) => ALL_PIECE_NAMES.add(d.piece));
});
ALL_PIECE_NAMES.add("ball-red");

function headingToAzimuth(heading) {
  const [ox, oz] = DIR_VEC[OPPOSITE[heading]];
  return Math.atan2(ox, oz);
}

function rotToParLabel(strokes, par) {
  if (strokes === 1) return "Hole in One!";
  const diff = strokes - par;
  if (diff <= -2) return "Eagle";
  if (diff === -1) return "Birdie";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  return diff === 2 ? "Double Bogey" : `+${diff}`;
}

class Game {
  constructor() {
    this.ui = new UI();
    this.controls = new Controls({
      camera,
      domElement: renderer.domElement,
      getBallPosition: () => ({ x: this.ballX, y: this.ballY, z: this.ballZ }),
      isBallMoving: () => this.physics && this.physics.moving,
      onShoot: (vx, vz) => this.onShoot(vx, vz),
      onAimChange: ({ active, power, dir }) => {
        this.ui.setPower(active ? power : null);
        this.updateAimLine(active, power, dir);
      },
      maxSpeed: 5.8,
    });

    this.holeIndex = 0;
    this.strokes = 0;
    this.scores = [];
    this.ballX = 0;
    this.ballY = DECK_HEIGHT + BALL_RADIUS;
    this.ballZ = 0;
    this.physics = null;
    this.sinking = false;
    this.state = "start";

    this.ui.showStartScreen({ onPlay: () => this.startGame() });
  }

  async startGame() {
    this.holeIndex = 0;
    this.scores = [];
    await this.loadHole(0);
  }

  async loadHole(index) {
    this.state = "loading";
    const hole = HOLES[index];
    const built = buildHole(hole);
    this.built = built;
    this.collision = buildCollision(built);
    this.physics = new BallPhysics(this.collision);
    this.physics.setPosition(built.tee.x, built.tee.z);

    while (courseGroup.children.length) courseGroup.remove(courseGroup.children[0]);

    await preload(built.tiles.map((t) => t.piece).concat((built.decorations || []).map((d) => d.piece)));

    for (const t of built.tiles) {
      const mesh = await spawnModel(t.piece);
      mesh.position.set(t.x, 0, t.z);
      mesh.rotation.y = t.rotationSteps * (Math.PI / 2);
      courseGroup.add(mesh);
    }
    for (const d of built.decorations || []) {
      const mesh = await spawnModel(d.piece);
      mesh.position.set(d.x, 0, d.z);
      mesh.rotation.y = (d.rotationSteps || 0) * (Math.PI / 2);
      courseGroup.add(mesh);
    }

    if (!ballMesh) {
      ballMesh = await spawnModel("ball-red");
      ballMesh.castShadow = true;
      scene.add(ballMesh);
    }

    const b = built.bounds;
    const w = b.maxX - b.minX + 6;
    const d = b.maxZ - b.minZ + 6;
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    ground.scale.set(Math.max(w, 14), Math.max(d, 14), 1);
    ground.position.x = cx;
    ground.position.z = cz;
    sun.position.set(cx + 6, 11, cz + 4);
    sun.target.position.set(cx, 0, cz);

    this.ballX = built.tee.x;
    this.ballZ = built.tee.z;
    this.ballY = DECK_HEIGHT + BALL_RADIUS;
    this.strokes = 0;
    this.sinking = false;

    this.controls.azimuth = headingToAzimuth(built.tee.heading);
    this.controls._initialized = false;

    this.ui.setHoleInfo({
      holeNumber: index + 1,
      totalHoles: HOLES.length,
      holeName: hole.name,
      par: hole.par,
    });
    this.ui.setStrokes(0);
    this.ui.setPower(null);

    this.state = "playing";
  }

  onShoot(vx, vz) {
    if (this.state !== "playing" || !this.physics || this.physics.moving) return;
    this.physics.shoot(vx, vz);
    this.strokes++;
    this.ui.setStrokes(this.strokes);
  }

  updateAimLine(active, power, dir) {
    if (!aimLine) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
      aimLine = new THREE.Line(geo, mat);
      aimLine.frustumCulled = false;
      scene.add(aimLine);
    }
    aimLine.visible = active && this.state === "playing";
    if (!aimLine.visible) return;
    const len = 0.4 + power * 1.8;
    const start = new THREE.Vector3(this.ballX, this.ballY, this.ballZ);
    const end = new THREE.Vector3(this.ballX + dir.x * len, this.ballY, this.ballZ + dir.z * len);
    aimLine.geometry.setFromPoints([start, end]);
    aimLine.material.color.setHSL(0.33 - power * 0.33, 0.85, 0.5);
  }

  update(dt) {
    if (this.state === "playing" && this.physics) {
      const { sunk, hazard } = this.physics.update(dt);
      this.ballX = this.physics.x;
      this.ballZ = this.physics.z;
      this.ballY = DECK_HEIGHT + BALL_RADIUS + this.physics.getSurfaceRise();

      if (hazard) {
        this.strokes++;
        this.ui.setStrokes(this.strokes);
        this.ui.showMessage("Hazard! +1 stroke");
        this.physics.setPosition(this.built.tee.x, this.built.tee.z);
        this.ballX = this.built.tee.x;
        this.ballZ = this.built.tee.z;
      }

      if (sunk && !this.sinking) {
        this.sinking = true;
        this.state = "holeComplete";
        const hole = HOLES[this.holeIndex];
        this.scores.push({
          holeNumber: this.holeIndex + 1,
          holeName: hole.name,
          strokes: this.strokes,
          par: hole.par,
        });
        const isLastHole = this.holeIndex === HOLES.length - 1;
        this.ui.setPower(null);
        setTimeout(() => {
          this.ui.showHoleComplete({
            strokes: this.strokes,
            par: hole.par,
            holeNumber: this.holeIndex + 1,
            totalHoles: HOLES.length,
            isLastHole,
            onNext: () => this.onHoleAdvance(isLastHole),
          });
        }, 450);
      }
    }

    if (ballMesh) {
      ballMesh.position.set(this.ballX, this.ballY, this.ballZ);
      if (this.physics && this.physics.moving) {
        const speed = Math.hypot(this.physics.vx, this.physics.vz);
        if (speed > 1e-4) {
          const axis = new THREE.Vector3(this.physics.vz, 0, -this.physics.vx).normalize();
          const angle = (speed * dt) / BALL_RADIUS;
          ballMesh.rotateOnWorldAxis(axis, angle);
        }
      }
    }

    this.controls.update(dt);
  }

  onHoleAdvance(wasLastHole) {
    if (wasLastHole) {
      this.state = "scorecard";
      this.ui.showScorecard({ scores: this.scores, onPlayAgain: () => this.startGame() });
    } else {
      this.holeIndex++;
      this.loadHole(this.holeIndex);
    }
  }
}

const game = new Game();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  game.update(dt);
  renderer.render(scene, camera);
}
animate();

window.__mg = {
  game,
  step(dt = 1 / 60, n = 1) {
    for (let i = 0; i < n; i++) game.update(dt);
    renderer.render(scene, camera);
  },
};

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
