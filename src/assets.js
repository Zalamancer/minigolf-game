import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const templates = new Map(); // name -> Promise<THREE.Group>

function loadTemplate(name) {
  if (!templates.has(name)) {
    templates.set(
      name,
      new Promise((resolve, reject) => {
        loader.load(
          `/models/${name}.glb`,
          (gltf) => {
            gltf.scene.traverse((o) => {
              if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
              }
            });
            resolve(gltf.scene);
          },
          undefined,
          reject
        );
      })
    );
  }
  return templates.get(name);
}

export async function preload(names) {
  await Promise.all([...new Set(names)].map(loadTemplate));
}

export async function spawnModel(name) {
  const template = await loadTemplate(name);
  return template.clone(true);
}
