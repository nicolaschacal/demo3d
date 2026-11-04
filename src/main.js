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
  brute: 'https://gobkit.com/freebies/human011/WerewolfCaptain.glb',
  mossling: 'https://gobkit.com/freebies/human011/StitchedBrute.glb'
};
async function loadActor(url, position, targetHeight) {
  const gltf = await loader.loadAsync(url);
  const model = cloneSkinned(gltf.scene);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, .001);
  model.scale.setScalar(scale);
  const scaledBounds = new THREE.Box3().setFromObject(model);
  model.position.y -= scaledBounds.min.y;
  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  const root = group(scene, position);
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations;
  const actions = {};
  for (const clip of clips) actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  const actor = { root, model, mixer, actions, current: null };
  return actor;
}
function setAction(actor, name, loop = true) {
  const action = actor.actions[name.toLowerCase()];
  if (!action || actor.current === name.toLowerCase()) return;
  const previous = actor.current ? actor.actions[actor.current] : null;
  action.reset();
  action.enabled = true;
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  action.fadeIn(.18).play();
  if (previous) previous.fadeOut(.18);
  actor.current = name.toLowerCase();
}
const actorsReady = Promise.all([
  loadActor(assetUrls.hero, [0, .2, 1.05], 2.25),
  loadActor(assetUrls.brute, [1.3, .22, -1.05], 2.05),
  loadActor(assetUrls.mossling, [-1.3, .22, -1.15], 1.8)
]).then(([hero, brute, mossling]) => {
  setAction(hero, 'idle');
  setAction(brute, 'idle');
  setAction(mossling, 'idle');
  return { hero, brute, mossling };
});
let actors = null;
actorsReady.then((result) => {
  actors = result;
  loading.classList.add('done');
}).catch((error) => {
  console.error('Could not load the 3D characters:', error);
  loading.textContent = 'No se pudieron cargar los personajes. Recargá la página.';
});
// Ground contact shadows are soft and local; no fullscreen haze or white overlay.
for (const [x, z, radius] of [[0,1.05,.82],[1.3,-1.05,.72],[-1.3,-1.15,.6]]) {
  const shadow = mesh(new THREE.CircleGeometry(radius, 20), new THREE.MeshBasicMaterial({ color: '#111b20', transparent: true, opacity: .34, depthWrite: false }), scene, [x,.245,z], false);
  shadow.rotation.x = -Math.PI / 2;
}

// Floating embers and dust give the scene a little movement.
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
const duration = 22;
const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function animateBattle(time, delta) {
  if (!actors) return;
  const t = time % duration;
  const { hero, brute, mossling } = actors;
  hero.root.position.x = 0 + Math.sin(t * .45) * .04;
  hero.root.position.z = 1.05 - smooth(1, 4, t) * .28 + smooth(8, 10, t) * .18;
  hero.root.rotation.y = Math.PI + Math.sin(t * .3) * .08;
  brute.root.position.x = 1.3 - smooth(2.8, 4.2, t) * .48 + smooth(8, 9.5, t) * .32;
  brute.root.position.z = -1.05 + smooth(2.8, 4.2, t) * .55 - smooth(8, 9.5, t) * .25;
  brute.root.rotation.y = Math.sin(time * 2) * .08;
  mossling.root.position.x = -1.3 + Math.sin(time * 1.1) * .12;
  mossling.root.position.z = -1.15 + Math.sin(time * 1.5) * .08;
  mossling.root.rotation.y = Math.sin(time * 1.7) * .08;

  // Named rig animations drive each beat of the fight.
  if (t < 3) {
    setAction(hero, 'idle'); setAction(brute, 'idle'); setAction(mossling, 'idle');
    
  } else if (t < 6) {
    setAction(hero, 'hit', false); setAction(brute, 'attack', false); setAction(mossling, 'idle');
    const k = smooth(3, 4.2, t) * (1 - smooth(4.8, 6, t));
    brute.root.position.x -= k * .5;
    brute.root.position.z += k * .65;
    hero.root.position.x -= k * .18;
    
  } else if (t < 10) {
    setAction(hero, 'attack', false); setAction(brute, 'hit', false); setAction(mossling, 'idle');
    brute.root.rotation.z = .42 * smooth(6.8, 7.8, t) * (1 - smooth(8.8, 9.8, t));
    brute.root.position.x += smooth(6.8, 7.5, t) * (1 - smooth(8.8, 9.8, t)) * .48;
    

  } else if (t < 15) {
    setAction(hero, 'special', false); setAction(brute, 'idle'); setAction(mossling, 'attack', false);
    const charge = smooth(10, 11.3, t) * (1 - smooth(13.4, 14.8, t));
    mossling.root.position.x += charge * .72;
    mossling.root.position.z += charge * .55;
    hero.root.rotation.y = Math.PI - .35 * charge;
    

  } else if (t < 19) {
    setAction(hero, 'attack', false); setAction(brute, 'death', false); setAction(mossling, 'hit', false);
    mossling.root.rotation.z = .38 * smooth(15.6, 16.4, t) * (1 - smooth(17.8, 18.8, t));
    mossling.root.position.x -= smooth(15.6, 16.4, t) * (1 - smooth(17.8, 18.8, t)) * .42;
    

  } else {
    setAction(hero, 'idle'); setAction(brute, 'death', false); setAction(mossling, 'death', false);
    
  }
  hero.mixer.update(delta);
  brute.mixer.update(delta);
  mossling.mixer.update(delta);
  particles.children.forEach((p, i) => {
    p.position.y = .55 + ((time * (.12 + (i % 4) * .025) + p.userData.offset) % 4.2);
    p.position.x += Math.sin(time + p.userData.offset) * .0008;
  });
}
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
  animateBattle(elapsed, delta);
  fireLight.intensity = 20 + Math.sin(elapsed * 7) * 4;
  renderer.render(scene, camera);
}
render();
