import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const canvas = document.querySelector('#world');
const loading = document.querySelector('#loading');


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
  corgi: 'https://gobkit.com/freebies/animal/Corgi.glb',
  duck: 'https://gobkit.com/freebies/animal/Duck.glb',
  bat: 'https://gobkit.com/freebies/animal/Bat.glb'
};
async function loadActor(url, position, uniformScale) {
  const gltf = await loader.loadAsync(url);
  const model = cloneSkinned(gltf.scene);
  // Fixed, conservative scale multiplier: never infer scale from animated/skinned bounds.
  model.scale.setScalar(uniformScale);
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


function createFallbackEnemy(kind, position, scale) {
  const root = group(scene, position);
  const bodyMat = mat(kind === 'corgi' ? '#b97843' : kind === 'duck' ? '#e6c84d' : '#665b83', .85);
  const darkMat = mat('#302a2a');
  const body = mesh(new THREE.SphereGeometry(.42, 9, 7), bodyMat, root, [0, .62, 0]);
  body.scale.set(1.25, .8, 1.65);
  mesh(new THREE.SphereGeometry(.27, 9, 7), bodyMat, root, [0, .85, .48]);
  if (kind === 'corgi') {
    for (const x of [-.18, .18]) {
      const ear = mesh(new THREE.ConeGeometry(.1, .34, 5), bodyMat, root, [x, 1.13, .52]);
      ear.rotation.z = x < 0 ? .18 : -.18;
    }
  } else if (kind === 'duck') {
    mesh(new THREE.ConeGeometry(.12, .3, 5), mat('#e58b36'), root, [0, .82, .82]).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(.09, 7, 5), darkMat, root, [-.12, .95, .67]);
    mesh(new THREE.SphereGeometry(.09, 7, 5), darkMat, root, [.12, .95, .67]);
  } else {
    for (const side of [-1, 1]) {
      const wing = mesh(new THREE.ConeGeometry(.28, .8, 5), bodyMat, root, [side * .55, .65, 0]);
      wing.rotation.z = side * -1.05;
    }
    mesh(new THREE.SphereGeometry(.08, 7, 5), mats.eye, root, [-.12, .91, .68]);
    mesh(new THREE.SphereGeometry(.08, 7, 5), mats.eye, root, [.12, .91, .68]);
  }
  for (const x of [-.25, .25]) for (const z of [-.32, .32]) {
    mesh(new THREE.CylinderGeometry(.07, .08, .42, 5), bodyMat, root, [x, .27, z]);
  }
  root.scale.setScalar(scale * .55);
  return { root, model: root, mixer: null, actions: {}, current: null, actionTimer: 0,
    home: new THREE.Vector3(...position), speed: 0, fallback: true, bob: Math.random() * 6 };
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

const actorsReady = loadActor(assetUrls.hero, [0, .2, .65], 6.0).then(async (hero) => {
  hero.root.rotation.y = Math.PI;
  setAction(hero, 'idle');
  // Procedural, always-visible animal enemies avoid external GLB loading failures.
  const animalSpecs = [
    ['corgi', [-3.0, .22, 2.65], 2.8],
    ['duck', [0, .22, 3.35], 2.65],
    ['bat', [3.0, .22, 2.65], 2.75]
  ];
  const animals = animalSpecs.map(([kind, position, scale]) =>
    createFallbackEnemy(kind, position, scale)
  );
  return { hero, animals };
});

let actors = null;
actorsReady.then((result) => {
  actors = result;
  loading.classList.add('done');
}).catch((error) => {
  console.error('Could not load the 3D characters:', error);
  loading.textContent = 'No se pudieron cargar los personajes. Recargá la página.';
});

// Tap/click the hero to attack. Alternate the two authored offensive moves.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let nextHeroAttack = 'attack';
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
  if (key === ' ' && actors) { setAction(actors.hero, 'attack', false, true); actors.hero.actionTimer = 0; }
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
canvas.addEventListener('pointerdown', (event) => {
  if (!actors) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.intersectObject(actors.hero.root, true).length) return;
  event.preventDefault();
  setAction(actors.hero, nextHeroAttack, false, true);
  actors.hero.actionTimer = 0;
  nextHeroAttack = nextHeroAttack === 'attack' ? 'special' : 'attack';
}, { passive: false });

function faceToward(actor, target) {
  const dx = target.x - actor.root.position.x;
  const dz = target.z - actor.root.position.z;
  actor.root.rotation.y = Math.atan2(dx, dz);
}

function moveEnemy(actor, hero, delta) {
  const direction = new THREE.Vector3(
    hero.root.position.x - actor.root.position.x,
    0,
    hero.root.position.z - actor.root.position.z
  );
  const distance = direction.length();
  faceToward(actor, hero.root);

  if (distance > 2.0) {
    const speed = distance > 2.8 ? 1.05 : .72;
    // These animal rigs provide a walk cycle; don't request a missing run clip.
    if (!actor.fallback) setAction(actor, actor.actions.walk ? 'walk' : 'idle');
    else actor.root.position.y = .22 + Math.sin(elapsed * 5 + actor.bob) * .08;
    direction.normalize();
    actor.root.position.x += direction.x * speed * delta;
    actor.root.position.z += direction.z * speed * delta;
  } else {
    if (!actor.fallback) setAction(actor, 'idle');
  }
}

function updateActors(delta) {
  if (!actors) return;
  let x = moveVector.x + (keysDown.has('d') || keysDown.has('arrowright') ? 1 : 0) - (keysDown.has('a') || keysDown.has('arrowleft') ? 1 : 0);
  let z = -moveVector.y - (keysDown.has('w') || keysDown.has('arrowup') ? 1 : 0) + (keysDown.has('s') || keysDown.has('arrowdown') ? 1 : 0);
  const inputLength = Math.hypot(x, z);
  if (inputLength > 0.12) {
    x /= Math.max(1, inputLength); z /= Math.max(1, inputLength);
    actors.hero.root.position.x = THREE.MathUtils.clamp(actors.hero.root.position.x + x * 2.8 * delta, -3.25, 3.25);
    actors.hero.root.position.z = THREE.MathUtils.clamp(actors.hero.root.position.z + z * 2.8 * delta, -2.8, 2.6);
    actors.hero.root.rotation.y = Math.atan2(x, z);
    if (actors.hero.current === 'idle') setAction(actors.hero, 'walk');
  } else if (actors.hero.current === 'walk') setAction(actors.hero, 'idle');
  const { hero, animals } = actors;

  hero.actionTimer += delta;
  if (hero.current === 'attack' || hero.current === 'special') {
    const duration = hero.actions[hero.current]?.getClip().duration ?? 1;
    if (hero.actionTimer >= duration) {
      setAction(hero, 'idle');
      hero.actionTimer = 0;
    }
  }

  for (const animal of animals) moveEnemy(animal, hero, delta);
  hero.mixer.update(delta);
  for (const animal of animals) if (animal.mixer) animal.mixer.update(delta);
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
