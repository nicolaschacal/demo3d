import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#world');
const loading = document.querySelector('#loading');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9c9d0');
scene.fog = new THREE.Fog('#b9c9d0', 13, 25);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
camera.position.set(0, 4.1, 9.5);
camera.lookAt(0, 0.85, -0.5);

scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x6c6557, 2.1));
const sun = new THREE.DirectionalLight(0xffedcf, 3.1);
sun.position.set(-4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -7;
sun.shadow.camera.right = 7;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -7;
scene.add(sun);

const groundMat = new THREE.MeshStandardMaterial({ color: '#829b79', roughness: 1 });
const ground = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.03;
ground.receiveShadow = true;
scene.add(ground);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(4.55, 0.055, 8, 64),
  new THREE.MeshStandardMaterial({ color: '#d7bd83', roughness: .8 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.015;
scene.add(ring);

const loader = new GLTFLoader();
const urls = {
  hero: 'https://gobkit.com/freebies/human003/Footman.glb',
  corgi: 'https://gobkit.com/freebies/animal/Corgi.glb',
  duck: 'https://gobkit.com/freebies/animal/Duck.glb',
  bat: 'https://gobkit.com/freebies/animal/Bat.glb'
};

// Gobkit models use meter units. Fixed per-model scales avoid unstable
// bounding-box normalization (which can explode on skinned rigs).
async function loadActor(url, scale, position, kind) {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  model.scale.setScalar(scale);
  model.position.set(0, 0, 0);
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const root = new THREE.Group();
  root.position.set(...position);
  root.add(model);
  scene.add(root);

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) {
    actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  }
  const actor = { root, model, mixer, actions, current: null, kind, alive: true, busy: false };
  play(actor, 'idle');
  return actor;
}

function play(actor, name, loop = true) {
  const key = name.toLowerCase();
  const next = actor.actions[key];
  if (!next || actor.current === key) return;
  const previous = actor.current ? actor.actions[actor.current] : null;
  next.reset();
  next.enabled = true;
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  next.clampWhenFinished = !loop;
  next.fadeIn(.12).play();
  if (previous) previous.fadeOut(.12);
  actor.current = key;
}

let hero;
let animals = [];
let lastAttack = 0;

const clickable = new THREE.Mesh(
  new THREE.SphereGeometry(.78, 16, 12),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
);
clickable.position.set(0, .92, 1.05);
clickable.userData.isHeroHitArea = true;
scene.add(clickable);

const allReady = Promise.all([
  loadActor(urls.hero, .82, [0, 0, 1.05], 'hero'),
  loadActor(urls.corgi, .58, [-1.45, 0, -3.55], 'animal'),
  loadActor(urls.duck, .52, [0, 0, -4.05], 'animal'),
  loadActor(urls.bat, .48, [1.45, 0, -3.55], 'animal')
]).then(([h, ...critters]) => {
  hero = h;
  animals = critters;
  loading.classList.add('done');
}).catch((err) => {
  console.error('Gobkit model loading failed:', err);
  loading.textContent = 'No se pudieron cargar los personajes. Recargá la página.';
});

function attackFromTap() {
  if (!hero || hero.busy) return;
  const now = performance.now();
  if (now - lastAttack < 700) return;
  const target = animals
    .filter(a => a.alive && !a.busy)
    .sort((a, b) => a.root.position.distanceTo(hero.root.position) - b.root.position.distanceTo(hero.root.position))[0];
  if (!target) return;

  lastAttack = now;
  hero.busy = true;
  play(hero, 'attack', false);
  hero.mixer.addEventListener('finished', function onHeroAttack(event) {
    if (event.action !== hero.actions.attack) return;
    hero.mixer.removeEventListener('finished', onHeroAttack);
    hero.busy = false;
    play(hero, 'idle');
  });

  target.busy = true;
  // The animal reacts, then plays its own rigged death clip.
  window.setTimeout(() => {
    if (!target.alive) return;
    play(target, 'dead', false);
    target.alive = false;
  }, 430);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObject(clickable, false).length) attackFromTap();
});

const clock = new THREE.Clock();
function update(delta) {
  if (!hero) return;
  for (const animal of animals) {
    if (!animal.alive || animal.busy) continue;
    const dx = hero.root.position.x - animal.root.position.x;
    const dz = hero.root.position.z - animal.root.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 1.55) {
      play(animal, 'walk');
      const step = Math.min(delta * .78, distance - 1.48);
      animal.root.position.x += (dx / distance) * step;
      animal.root.position.z += (dz / distance) * step;
      // Gobkit rigs face local +Z.
      animal.root.rotation.y = Math.atan2(dx, dz);
    } else {
      play(animal, 'idle');
    }
  }
  hero.mixer.update(delta);
  for (const animal of animals) animal.mixer.update(delta);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 700 ? 38 : 34;
  camera.position.set(0, w < 700 ? 4.4 : 4.1, w < 700 ? 10.4 : 9.5);
  camera.updateProjectionMatrix();
  camera.lookAt(0, .85, -.5);
}
window.addEventListener('resize', resize);
resize();

function render() {
  requestAnimationFrame(render);
  const delta = Math.min(clock.getDelta(), .04);
  update(delta);
  renderer.render(scene, camera);
}
render();
