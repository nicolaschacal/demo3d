import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const canvas = document.querySelector('#world');
const loading = document.querySelector('#loading');

const intro = document.querySelector('#intro');
const startButton = document.querySelector('#start-button');
const controlsButton = document.querySelector('#controls-button');
const controlsPanel = document.querySelector('#controls-panel');
const closeControls = document.querySelector('#close-controls');
startButton?.addEventListener('click', () => intro?.classList.add('is-hidden'));
controlsButton?.addEventListener('click', () => controlsPanel?.classList.toggle('is-visible'));
closeControls?.addEventListener('click', () => controlsPanel?.classList.remove('is-visible'));



const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b2a32');
scene.fog = new THREE.FogExp2('#1b2a32', 0.035);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
camera.position.set(0, 4.7, 11.8);
camera.lookAt(0, 1.15, -0.35);

scene.add(new THREE.HemisphereLight(0xb8d3dc, 0x4a3a32, 1.65));
const keyLight = new THREE.DirectionalLight(0xffd8a4, 3.0);
keyLight.position.set(-4, 9, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1536, 1536);
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 9;
keyLight.shadow.camera.bottom = -8;
keyLight.shadow.bias = -0.0004;
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x6aa6cf, 35, 16, 2);
rimLight.position.set(3, 4, -5);
scene.add(rimLight);
const fireLight = new THREE.PointLight(0xff8a42, 22, 10, 2);
fireLight.position.set(-3.4, 2.2, -2.7);
scene.add(fireLight);

const mat = (color, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
const mats = {
  stone: mat('#52616a'), stoneDark: mat('#34434d'), floor: mat('#59665b'),
  sand: mat('#9b8060'), gold: mat('#d9a45d', .45, .35), steel: mat('#a8c3c9', .3, .65),
  leather: mat('#503b30'), cloth: mat('#356d76'), scarf: mat('#d8784d'),
  skin: mat('#e1b58d'), hair: mat('#3a2e2b'), boot: mat('#262d32'),
  monster: mat('#8c6657'), monsterLight: mat('#bd8c6d'), horn: mat('#e5d2a7'),
  eye: new THREE.MeshStandardMaterial({ color: '#f5d36d', emissive: '#9a4d1e', emissiveIntensity: 1.8, roughness: .3 }),
  dark: mat('#1b2228'), crystal: new THREE.MeshStandardMaterial({ color: '#5d9ba6', emissive: '#285b68', emissiveIntensity: .7, roughness: .3 })
};

function mesh(geometry, material, parent, position = [0, 0, 0], cast = true) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = cast;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function group(parent, position = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...position);
  parent.add(g);
  return g;
}
function limb(parent, material, length, radius, position, rotation = [0, 0, 0]) {
  const part = mesh(new THREE.CapsuleGeometry(radius, Math.max(.02, length - radius * 2), 3, 6), material, parent, position);
  part.rotation.set(...rotation);
  return part;
}

const arena = new THREE.Group();
scene.add(arena);
mesh(new THREE.CylinderGeometry(5.15, 5.45, .42, 12), mats.stoneDark, arena, [0, -.25, -.25]);
mesh(new THREE.CylinderGeometry(4.98, 5.12, .2, 12), mats.sand, arena, [0, .02, -.25]);
mesh(new THREE.CylinderGeometry(4.68, 4.85, .1, 12), mats.floor, arena, [0, .16, -.25], false);

// Scattered polygonal paving stones create a readable floor without obscuring the fighters.
for (let i = 0; i < 22; i++) {
  const angle = (i / 22) * Math.PI * 2;
  const radius = 2.3 + (i % 4) * .42;
  const tile = mesh(new THREE.CylinderGeometry(.32, .38, .035, 5), i % 3 ? mats.stone : mats.sand, arena,
    [Math.cos(angle) * radius, .23, Math.sin(angle) * radius - .25], false);
  tile.rotation.y = angle;
}

// Broken pillars and rock silhouettes frame the arena at the back.
for (let i = 0; i < 9; i++) {
  const x = -4.5 + i * 1.12;
  const z = -4.05 - (i % 2) * .35;
  const height = 1.5 + (i % 3) * .55;
  const pillar = group(arena, [x, .2, z]);
  const rock = mesh(new THREE.CylinderGeometry(.35, .52, height, 5), i % 2 ? mats.stone : mats.stoneDark, pillar, [0, height / 2, 0]);
  rock.rotation.z = (i % 2 ? 1 : -1) * .08;
  mesh(new THREE.ConeGeometry(.45, .38, 5), mats.stone, pillar, [0, height + .05, 0]);
}
for (const x of [-3.65, 3.65]) {
  const torch = group(arena, [x, .2, -2.6]);
  mesh(new THREE.CylinderGeometry(.09, .14, 1.3, 6), mats.leather, torch, [0, .65, 0]);
  const flame = mesh(new THREE.IcosahedronGeometry(.19, 1), mat('#ff9c4c', .35), torch, [0, 1.42, 0], false);
  flame.material.emissive = new THREE.Color('#ff5d21');
  flame.material.emissiveIntensity = 1.5;
  const glow = new THREE.PointLight(0xff8a42, 8, 5);
  glow.position.set(0, 1.55, .15);
  torch.add(glow);
}

// Rigged CC0 characters are loaded as real GLB assets, not approximated with primitive shapes.
const loader = new GLTFLoader();
const assetUrls = {
  hero: 'https://gobkit.com/freebies/human003/KnightCaptain.glb',
};
async function loadActor(url, position, uniformScale, targetHeight = null) {
  const gltf = await loader.loadAsync(url);
  const model = cloneSkinned(gltf.scene);
  // Fixed, conservative scale multiplier: never infer scale from animated/skinned bounds.
  model.scale.setScalar(uniformScale);
  if (targetHeight) {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const height = bounds.max.y - bounds.min.y;
    if (height > 0.001) model.scale.multiplyScalar(targetHeight / height);
  }
  model.position.set(0, 0, 0);
  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  const root = group(scene, position);
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  return {
    root, model, mixer, actions, current: null, actionTimer: 0,
    home: new THREE.Vector3(...position), speed: 0
  };
}


function setAction(actor, name, loop = true, restart = false) {
  const actionName = name.toLowerCase();
  const action = actor.actions[actionName];
  if (!action) {
    console.warn(`Animation "${name}" not found. Available:`, Object.keys(actor.actions));
    return false;
  }
  if (actor.current === actionName && !restart) return false;
  const previous = actor.current ? actor.actions[actor.current] : null;
  action.reset();
  action.enabled = true;
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  action.fadeIn(.16).play();
  if (previous && previous !== action) previous.fadeOut(.16);
  actor.current = actionName;
  return true;
}

// The knight returns to the arena alone.
let actors = { hero: null };
const actorsReady = loadActor(assetUrls.hero, [0, .2, .65], 6.0).then((hero) => {
  hero.root.rotation.y = Math.PI;
  setAction(hero, 'idle');
  actors.hero = hero;
  loading.classList.add('done');
}).catch((error) => {
  console.error('Could not load the knight model:', error);
  loading.textContent = 'No se pudo cargar el personaje. Recargá la página.';
  loading.classList.add('done');
});

// Two hostile monsters patrol the arena and pursue the knight.
function createMonster(position, variant = 0) {
  const root = group(scene, position);
  const bodyMat = variant ? mat('#4c7770', .7) : mats.monster;
  const detailMat = variant ? mat('#82a89a', .65) : mats.monsterLight;
  const visual = group(root);
  const torso = mesh(new THREE.IcosahedronGeometry(.48, 1), bodyMat, visual, [0, .92, 0]);
  torso.scale.set(.88, 1.18, .7);
  const belly = mesh(new THREE.SphereGeometry(.29, 8, 6), detailMat, visual, [0, .78, .31]);
  belly.scale.set(1, .85, .45);
  const head = group(visual, [0, 1.62, .02]);
  mesh(new THREE.DodecahedronGeometry(.36, 1), bodyMat, head, [0, 0, 0]);
  for (const side of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(.105, .42, 5), mats.horn, head, [side * .23, .34, -.015]);
    horn.rotation.z = side * -.42;
    const eye = mesh(new THREE.SphereGeometry(.065, 8, 6), mats.eye, head, [side * .14, .035, .31], false);
    eye.scale.set(1, .75, .5);
    limb(visual, bodyMat, .76, .15, [side * .48, 1.02, .02], [0, 0, side * -.48]);
    limb(visual, bodyMat, .55, .16, [side * .2, .3, 0], [0, 0, side * -.08]);
  }
  const healthBack = mesh(new THREE.PlaneGeometry(.8, .09), mats.dark, root, [0, 2.25, 0], false);
  const healthFill = mesh(new THREE.PlaneGeometry(.76, .055), mat('#d76e55'), root, [0, 2.25, .006], false);
  return { root, visual, healthFill, health: 3, maxHealth: 3, speed: variant ? .62 : .48, phase: variant * 2.1, hitFlash: 0, dead: false };
}
const enemies = [
  createMonster([-1.8, .2, -2.45], 0),
  createMonster([1.9, .2, -3.35], 1)
];

// Attack with Space or tap/click in the arena.
let nextHeroAttack = 'attack';
let attackCooldown = 0;
let attackHasHit = false;
function performAttack() {
  if (!actors.hero || attackCooldown > 0) return;
  setAction(actors.hero, nextHeroAttack, false, true);
  actors.hero.actionTimer = 0;
  nextHeroAttack = nextHeroAttack === 'attack' ? 'special' : 'attack';
  attackCooldown = .62;
  attackHasHit = false;
}
const keysDown = new Set();
const moveVector = new THREE.Vector2();
const joystick = document.querySelector('#joystick');
const stick = document.querySelector('#stick');
let joystickPointer = null;
let joystickOrigin = null;
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) {
    if (key !== ' ') event.preventDefault();
    keysDown.add(key);
  }
  if (key === ' ') performAttack();
});
window.addEventListener('keyup', (event) => keysDown.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keysDown.clear());
if (joystick && stick) {
  const updateStick = (event) => {
    const dx = event.clientX - joystickOrigin.x;
    const dy = event.clientY - joystickOrigin.y;
    const length = Math.min(42, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * length, y = Math.sin(angle) * length;
    stick.style.transform = `translate(${x}px, ${y}px)`;
    moveVector.set(x / 42, -y / 42);
  };
  joystick.addEventListener('pointerdown', (event) => {
    event.preventDefault(); joystickPointer = event.pointerId;
    joystickOrigin = { x: event.clientX, y: event.clientY };
    joystick.setPointerCapture(event.pointerId); updateStick(event);
  });
  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId === joystickPointer) updateStick(event);
  });
  const releaseStick = (event) => {
    if (event.pointerId !== joystickPointer) return;
    joystickPointer = null; joystickOrigin = null; moveVector.set(0, 0);
    stick.style.transform = 'translate(0, 0)';
  };
  joystick.addEventListener('pointerup', releaseStick);
  joystick.addEventListener('pointercancel', releaseStick);
}
canvas.style.touchAction = 'manipulation';
canvas.addEventListener('pointerdown', () => performAttack(), { passive: true });

function updateActors(delta) {
  if (!actors.hero) return;
  let x = moveVector.x + (keysDown.has('d') || keysDown.has('arrowright') ? 1 : 0) - (keysDown.has('a') || keysDown.has('arrowleft') ? 1 : 0);
  let z = -moveVector.y - (keysDown.has('w') || keysDown.has('arrowup') ? 1 : 0) + (keysDown.has('s') || keysDown.has('arrowdown') ? 1 : 0);
  const inputLength = Math.hypot(x, z);
  if (inputLength > .12) {
    x /= Math.max(1, inputLength); z /= Math.max(1, inputLength);
    actors.hero.root.position.x = THREE.MathUtils.clamp(actors.hero.root.position.x + x * 2.8 * delta, -3.25, 3.25);
    actors.hero.root.position.z = THREE.MathUtils.clamp(actors.hero.root.position.z + z * 2.8 * delta, -2.8, 2.6);
    actors.hero.root.rotation.y = Math.atan2(x, z);
    if (actors.hero.current === 'idle') setAction(actors.hero, 'walk');
  } else if (actors.hero.current === 'walk') setAction(actors.hero, 'idle');

  const hero = actors.hero;
  hero.actionTimer += delta;
  attackCooldown = Math.max(0, attackCooldown - delta);
  if (hero.current === 'attack' || hero.current === 'special') {
    const duration = hero.actions[hero.current]?.getClip().duration ?? .8;
    if (!attackHasHit && hero.actionTimer >= Math.min(.22, duration * .32)) {
      attackHasHit = true;
      const facing = new THREE.Vector3(Math.sin(hero.root.rotation.y), 0, Math.cos(hero.root.rotation.y));
      let target = null, bestDistance = 2.2;
      enemies.forEach((enemy) => {
        if (enemy.dead) return;
        const offset = enemy.root.position.clone().sub(hero.root.position);
        const distance = offset.length();
        if (distance < .9 || (distance < bestDistance && offset.normalize().dot(facing) > .1)) {
          if (distance < bestDistance) { target = enemy; bestDistance = distance; }
        }
      });
      if (target) {
        target.health -= 1;
        target.hitFlash = .25;
        const ratio = Math.max(0, target.health / target.maxHealth);
        target.healthFill.scale.x = ratio;
        target.healthFill.position.x = -.38 * (1 - ratio);
        if (target.health <= 0) {
          target.dead = true;
          target.root.visible = false;
        }
      }
    }
    if (hero.actionTimer >= duration) {
      setAction(hero, 'idle');
      hero.actionTimer = 0;
    }
  }
  hero.mixer.update(delta);

  enemies.forEach((enemy) => {
    if (enemy.dead) return;
    const dx = hero.root.position.x - enemy.root.position.x;
    const dz = hero.root.position.z - enemy.root.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 1.05) {
      enemy.root.position.x += (dx / distance) * enemy.speed * delta;
      enemy.root.position.z += (dz / distance) * enemy.speed * delta;
    }
    enemy.root.rotation.y = Math.atan2(dx, dz);
    enemy.phase += delta * (distance > 1.05 ? 7 : 3);
    enemy.visual.position.y = Math.sin(enemy.phase) * .035;
    enemy.visual.rotation.z = Math.sin(enemy.phase * .5) * .045;
    if (enemy.hitFlash > 0) {
      enemy.hitFlash -= delta;
      enemy.visual.scale.setScalar(1 + Math.sin(enemy.hitFlash * 55) * .08);
    } else enemy.visual.scale.setScalar(1);
    enemy.healthBack?.quaternion?.copy(camera.quaternion);
    enemy.healthFill.quaternion.copy(camera.quaternion);
  });
}
// Floating embers remain independent from the character controller.
const particles = new THREE.Group();
scene.add(particles);
const emberMat = new THREE.MeshBasicMaterial({ color: '#f4b66d' });
for (let i = 0; i < 34; i++) {
  const p = mesh(new THREE.SphereGeometry(.018 + Math.random() * .018, 5, 4), emberMat, particles,
    [(Math.random() - .5) * 8, .5 + Math.random() * 4.2, -4 + Math.random() * 7], false);
  p.userData.offset = Math.random() * Math.PI * 2;
}

const clock = new THREE.Clock();
let elapsed = 0;
function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width < 700 ? 36 : 34;
  camera.position.set(0, width < 700 ? 4.7 : 4.8, width < 700 ? 11.8 : 12.2);
  camera.updateProjectionMatrix();
  camera.lookAt(0, 1.15, -.35);
}
window.addEventListener('resize', resize);
resize();

function render() {
  requestAnimationFrame(render);
  const delta = Math.min(clock.getDelta(), .05);
  elapsed += delta;
  updateActors(delta);
  particles.children.forEach((p, i) => {
    p.position.y = .55 + ((elapsed * (.12 + (i % 4) * .025) + p.userData.offset) % 4.2);
    p.position.x += Math.sin(elapsed + p.userData.offset) * .0008;
  });
  fireLight.intensity = 20 + Math.sin(elapsed * 7) * 4;
  renderer.render(scene, camera);
}
render();
