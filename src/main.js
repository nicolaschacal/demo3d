import * as THREE from 'three';

const canvas = document.querySelector('#world');
const loading = document.querySelector('#loading');
const phaseLabel = document.querySelector('#phase');
const caption = document.querySelector('#caption');
const heroHealth = document.querySelector('#hero-health');
const enemyHealth = document.querySelector('#enemy-health');
const heroHp = document.querySelector('#hero-hp');
const enemyHp = document.querySelector('#enemy-hp');
const flash = document.querySelector('#flash');
const recordButton = document.querySelector('#record');
const recordNote = document.querySelector('#record-note');

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

// A stylized adventurer assembled from low-poly primitives.
function makeHero() {
  const root = group(scene, [-.55, .2, 1.05]);
  const body = group(root, [0, .95, 0]);
  mesh(new THREE.CylinderGeometry(.3, .39, .76, 7), mats.cloth, body, [0, 0, 0]);
  mesh(new THREE.SphereGeometry(.34, 8, 7), mats.skin, body, [0, .63, .015]);
  mesh(new THREE.SphereGeometry(.355, 8, 5, 0, Math.PI * 2, 0, Math.PI * .52), mats.hair, body, [0, .75, .015]);
  mesh(new THREE.BoxGeometry(.48, .13, .4), mats.hair, body, [0, .83, -.015]).rotation.x = -.12;
  mesh(new THREE.BoxGeometry(.62, .16, .13), mats.scarf, body, [0, .35, .23]).rotation.z = -.12;
  mesh(new THREE.BoxGeometry(.13, .16, .12), mats.gold, body, [.18, .08, .22]);

  const leftArm = group(body, [-.34, .28, 0]);
  limb(leftArm, mats.skin, .72, .115, [0, -.3, .02], [0, 0, -.12]);
  mesh(new THREE.SphereGeometry(.14, 7, 6), mats.leather, leftArm, [0, -.59, .02]);
  const rightArm = group(body, [.34, .28, 0]);
  limb(rightArm, mats.skin, .68, .12, [0, -.28, 0]);
  mesh(new THREE.SphereGeometry(.14, 7, 6), mats.leather, rightArm, [0, -.58, 0]);
  const sword = group(rightArm, [.04, -.62, .08]);
  mesh(new THREE.BoxGeometry(.095, .88, .12), mats.steel, sword, [0, .48, 0]);
  mesh(new THREE.BoxGeometry(.16, .11, .2), mats.gold, sword, [0, .04, 0]);
  mesh(new THREE.BoxGeometry(.13, .28, .13), mats.leather, sword, [0, -.15, 0]);
  mesh(new THREE.ConeGeometry(.075, .2, 4), mats.steel, sword, [0, .99, 0]);

  const leftLeg = group(root, [-.18, .68, 0]);
  limb(leftLeg, mats.boot, .72, .15, [0, -.3, 0]);
  mesh(new THREE.BoxGeometry(.3, .16, .42), mats.leather, leftLeg, [0, -.64, .12]);
  const rightLeg = group(root, [.18, .68, 0]);
  limb(rightLeg, mats.boot, .72, .15, [0, -.3, 0]);
  mesh(new THREE.BoxGeometry(.3, .16, .42), mats.leather, rightLeg, [0, -.64, .12]);
  return { root, body, leftArm, rightArm, sword, leftLeg, rightLeg };
}

function makeMonster(x, z, scale = 1, variant = 0) {
  const root = group(scene, [x, .22, z]);
  root.scale.setScalar(scale);
  const skin = variant ? mat('#627d70') : mats.monster;
  const light = variant ? mat('#9bb29a') : mats.monsterLight;
  const torso = group(root, [0, .78, 0]);
  mesh(new THREE.SphereGeometry(.57, 8, 7), skin, torso, [0, 0, 0]).scale.set(1, 1.05, .8);
  mesh(new THREE.SphereGeometry(.4, 8, 7), light, torso, [0, .5, .02]).scale.set(1, .86, .8);
  mesh(new THREE.SphereGeometry(.34, 8, 7), skin, torso, [0, .77, .06]);
  // Horns and glowing eyes make the silhouette legible at phone size.
  for (const side of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(.13, .48, 5), mats.horn, torso, [side * .25, 1.06, -.01]);
    horn.rotation.z = side * -.42;
    mesh(new THREE.SphereGeometry(.075, 6, 5), mats.eye, torso, [side * .14, .8, .34], false);
  }
  mesh(new THREE.BoxGeometry(.25, .07, .05), mats.dark, torso, [0, .61, .37], false);
  const armL = group(torso, [-.53, .2, 0]);
  limb(armL, skin, .7, .17, [0, -.28, .02], [0, 0, -.3]);
  mesh(new THREE.ConeGeometry(.17, .3, 5), light, armL, [-.05, -.62, .05]);
  const armR = group(torso, [.53, .2, 0]);
  limb(armR, skin, .7, .17, [0, -.28, .02], [0, 0, .3]);
  mesh(new THREE.ConeGeometry(.17, .3, 5), light, armR, [.05, -.62, .05]);
  const legL = group(root, [-.23, .42, 0]);
  limb(legL, skin, .66, .18, [0, -.27, 0]);
  const legR = group(root, [.23, .42, 0]);
  limb(legR, skin, .66, .18, [0, -.27, 0]);
  return { root, torso, armL, armR, legL, legR };
}

const hero = makeHero();
const brute = makeMonster(1.48, -1.38, .94, 0);
const mossling = makeMonster(-1.9, -2.05, .76, 1);

// Ground contact shadows are soft and local; no fullscreen haze or white overlay.
for (const [x, z, radius] of [[-.55,1.05,.82],[1.48,-1.38,.72],[-1.9,-2.05,.6]]) {
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
let lastPhase = -1;
let recording = false;
let recorder = null;
let recordedChunks = [];
const duration = 22;
const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function pulseFlash() {
  flash.classList.remove('hit');
  void flash.offsetWidth;
  flash.classList.add('hit');
}
function setHud(phase, text, hp, enemies) {
  phaseLabel.textContent = phase;
  caption.textContent = text;
  heroHealth.style.width = hp + '%';
  enemyHealth.style.width = enemies + '%';
  heroHp.textContent = Math.round(hp);
  enemyHp.textContent = Math.round(enemies);
}
function animateBattle(time) {
  const t = time % duration;
  const bob = Math.sin(time * 7) * .035;
  hero.root.position.x = -.55 + Math.sin(t * .45) * .08;
  hero.root.position.z = 1.05 - smooth(1, 4, t) * .42 + smooth(8, 10, t) * .24;
  hero.root.position.y = .2 + bob;
  hero.root.rotation.y = Math.sin(t * .3) * .08;
  hero.leftLeg.rotation.x = Math.sin(time * 7) * .24;
  hero.rightLeg.rotation.x = -Math.sin(time * 7) * .24;
  hero.leftArm.rotation.x = Math.sin(time * 7) * .12;
  hero.rightArm.rotation.x = -.15;

  brute.root.position.x = 1.48 - smooth(2.8, 4.2, t) * .48 + smooth(8, 9.5, t) * .32;
  brute.root.position.z = -1.38 + smooth(2.8, 4.2, t) * .55 - smooth(8, 9.5, t) * .25;
  brute.root.rotation.y = -.12 + Math.sin(time * 2) * .08;
  brute.torso.rotation.x = Math.sin(time * 2.4) * .045;
  brute.armL.rotation.x = Math.sin(time * 3) * .16;
  brute.armR.rotation.x = Math.cos(time * 3) * .16;
  mossling.root.position.x = -1.9 + Math.sin(time * 1.1) * .12;
  mossling.root.position.z = -2.05 + Math.sin(time * 1.5) * .08;
  mossling.root.rotation.y = .18 + Math.sin(time * 1.7) * .12;
  mossling.armL.rotation.x = Math.sin(time * 2.5) * .2;
  mossling.armR.rotation.x = Math.cos(time * 2.5) * .2;

  // Four clear beats: threat, monster lunge, hero counter, finishing strike.
  if (t < 3) {
    hero.rightArm.rotation.x = -.35;
    hero.rightArm.rotation.z = -.12;
    brute.armL.rotation.x = -.2;
    setHud('ENEMIGOS DETECTADOS', 'Tres criaturas bloquean el camino.', 100, 100);
  } else if (t < 6) {
    const k = smooth(3, 4.2, t) * (1 - smooth(4.8, 6, t));
    brute.root.position.x -= k * .5;
    brute.root.position.z += k * .65;
    brute.armL.rotation.x = -1.3 * k;
    hero.root.position.x -= k * .18;
    hero.leftArm.rotation.x = -.7 * k;
    setHud('¡ATAQUE ENEMIGO!', 'Una de las bestias se lanza al ataque.', 82, 100);
  } else if (t < 10) {
    const swing = Math.sin(smooth(6, 7.1, t) * Math.PI);
    hero.rightArm.rotation.x = -1.7 * swing - .25;
    hero.rightArm.rotation.z = -.85 * swing;
    hero.sword.rotation.z = -.45 * swing;
    brute.root.rotation.z = .75 * smooth(6.8, 7.8, t) * (1 - smooth(8.8, 9.8, t));
    brute.root.position.x += smooth(6.8, 7.5, t) * (1 - smooth(8.8, 9.8, t)) * .48;
    brute.armR.rotation.x = 1.2 * swing;
    setHud('CONTRAATAQUE', 'El héroe encuentra una abertura.', 82, 62);
    if (t > 7 && t < 7.08) pulseFlash();
  } else if (t < 15) {
    const charge = smooth(10, 11.3, t) * (1 - smooth(13.4, 14.8, t));
    mossling.root.position.x += charge * .72;
    mossling.root.position.z += charge * .55;
    mossling.armR.rotation.x = -1.3 * charge;
    hero.rightArm.rotation.x = -.4 - .6 * Math.sin(t * 4);
    hero.root.rotation.y = -.35 * charge;
    setHud('SEGUNDA OLEADA', 'La criatura pequeña intenta rodearlo.', 72, 62);
    if (t > 12.9 && t < 12.98) pulseFlash();
  } else if (t < 19) {
    const finisher = Math.sin(smooth(15, 16.2, t) * Math.PI);
    hero.rightArm.rotation.x = -1.9 * finisher - .2;
    hero.rightArm.rotation.z = -.95 * finisher;
    hero.sword.rotation.z = -.6 * finisher;
    mossling.root.rotation.z = .85 * smooth(15.6, 16.4, t) * (1 - smooth(17.8, 18.8, t));
    mossling.root.position.x -= smooth(15.6, 16.4, t) * (1 - smooth(17.8, 18.8, t)) * .42;
    brute.root.rotation.z = -.3 * smooth(16, 17, t);
    setHud('GOLPE FINAL', 'Dos enemigos. Un solo aventurero.', 64, 24);
    if (t > 16.1 && t < 16.18) pulseFlash();
  } else {
    hero.rightArm.rotation.x = -.85;
    hero.rightArm.rotation.z = -.25;
    hero.root.rotation.y = -.12;
    brute.root.rotation.z = .25;
    mossling.root.rotation.z = .18;
    setHud('ARENA SUPERADA', 'La escena sigue viva. El combate vuelve a empezar.', 64, 12);
  }

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
  animateBattle(elapsed);
  fireLight.intensity = 20 + Math.sin(elapsed * 7) * 4;
  renderer.render(scene, camera);
}
render();
loading.classList.add('done');

document.querySelector('#replay').addEventListener('click', () => {
  elapsed = 0;
  lastPhase = -1;
  caption.textContent = 'La batalla comienza otra vez.';
});

function supportedMime() {
  const types = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return types.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || '';
}
recordButton.addEventListener('click', () => {
  if (recording) return;
  if (!canvas.captureStream || !window.MediaRecorder) {
    recordNote.textContent = 'Tu navegador no permite grabar esta escena. Probá desde Chrome o Edge en escritorio.';
    return;
  }
  const mimeType = supportedMime();
  if (!mimeType) {
    recordNote.textContent = 'Este navegador no ofrece un formato de grabación compatible.';
    return;
  }
  recordedChunks = [];
  const stream = canvas.captureStream(30);
  recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  recorder.ondataavailable = (event) => { if (event.data.size) recordedChunks.push(event.data); };
  recorder.onstop = () => {
    const isMp4 = mimeType.startsWith('video/mp4');
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = isMp4 ? 'the-last-stand.mp4' : 'the-last-stand.webm';
    link.click();
    URL.revokeObjectURL(url);
    stream.getTracks().forEach((track) => track.stop());
    recording = false;
    recordButton.disabled = false;
    recordButton.classList.remove('recording');
    recordButton.innerHTML = '<span class="record-dot"></span> GRABAR ESCENA';
    recordNote.textContent = isMp4
      ? 'MP4 descargado. Ya podés llevarlo a Instagram.'
      : 'WebM descargado. Si necesitás MP4, convertí el archivo antes de subirlo a Instagram.';
  };
  recording = true;
  recordButton.disabled = true;
  recordButton.classList.add('recording');
  recordButton.innerHTML = '<span class="record-dot"></span> GRABANDO 22 S';
  recordNote.textContent = 'Grabando la escena en tiempo real…';
  elapsed = 0;
  recorder.start();
  window.setTimeout(() => {
    if (recorder && recorder.state === 'recording') recorder.stop();
  }, duration * 1000);
});
