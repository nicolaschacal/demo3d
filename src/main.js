import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#world');
const loading = document.querySelector('#loading');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b8d4bf');
scene.fog = new THREE.Fog('#b8d4bf', 22, 65);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
camera.position.set(4.5, 7.2, 17.5);
camera.lookAt(4.2, 1.5, 0);

scene.add(new THREE.HemisphereLight(0xe9f5e9, 0x58744f, 2.1));
const sun = new THREE.DirectionalLight(0xfff1d7, 3.2);
sun.position.set(-4, 13, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(55, 80),
  new THREE.MeshStandardMaterial({ color: 0x88aa78, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.06;
ground.receiveShadow = true;
scene.add(ground);

// A winding, lighter trail gives the scene the familiar adventure-game feeling.
const trailPoints = [
  new THREE.Vector3(-14, 0.005, 9), new THREE.Vector3(-8, 0.005, 6),
  new THREE.Vector3(-3, 0.005, 7), new THREE.Vector3(2, 0.005, 4),
  new THREE.Vector3(7, 0.005, 5), new THREE.Vector3(14, 0.005, 0),
  new THREE.Vector3(20, 0.005, -5)
];
const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
const trail = new THREE.Mesh(
  new THREE.TubeGeometry(trailCurve, 90, 2.4, 8, false),
  new THREE.MeshStandardMaterial({ color: 0xc4b88e, roughness: 1 })
);
trail.position.y = 0.005;
trail.receiveShadow = true;
scene.add(trail);

const loader = new GLTFLoader();
const mixers = [];
const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

function normalizeModel(root, targetHeight) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.001);
  root.scale.setScalar(scale);
  const scaledBox = new THREE.Box3().setFromObject(root);
  root.position.y -= scaledBox.min.y;
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material) {
        obj.material.roughness = Math.max(obj.material.roughness ?? 0.7, 0.65);
      }
    }
  });
}

function addTree(model, x, z, scale = 1) {
  const tree = model.clone(true);
  tree.position.set(x, 0, z);
  tree.scale.multiplyScalar(scale);
  tree.rotation.y = (x * 13.7 + z * 8.1) % (Math.PI * 2);
  tree.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(tree);
}

async function loadModel(url) {
  const gltf = await loader.loadAsync(url);
  return gltf;
}

const assets = {
  scout: 'https://gobkit.com/freebies/human003/Scout.glb',
  fox: 'https://gobkit.com/freebies/animal006/Fox.glb',
  treeA: 'https://gobkit.com/freebies/environment/TreeHigh001.glb',
  treeB: 'https://gobkit.com/freebies/environment/TreeMed002.glb',
  treeC: 'https://gobkit.com/freebies/environment/TreeLow003.glb',
  rock: 'https://gobkit.com/freebies/environment/Rock002.glb',
  hill: 'https://gobkit.com/freebies/environment/Hill002.glb'
};

async function buildWorld() {
  const [scoutGLTF, foxGLTF, treeA, treeB, treeC, rock, hill] = await Promise.all([
    ...Object.values(assets).map(loadModel)
  ]);

  // Background hills and a ring of low-poly trees frame the characters.
  for (const [x, z, s] of [[-12,-9,1.5],[-4,-13,1.2],[5,-14,1.6],[14,-10,1.4],[19,1,1.8],[-15,2,1.7]]) {
    const h = hill.scene.clone(true);
    h.position.set(x, -0.3, z); h.scale.setScalar(s * 1.8); world.add(h);
  }
  const treeModels = [treeA.scene, treeB.scene, treeC.scene];
  const placements = [
    [-11,3,1.25],[-9,-4,1.05],[-6,-10,1.2],[-2,-12,.95],[2,-11,1.1],[7,-13,1.2],[11,-9,1.15],[15,-6,1.3],
    [17,1,1.25],[14,8,1.15],[9,10,1.1],[-13,9,1.3],[-16,-4,1.2],[-3,13,1.1],[4,13,1.2],[19,10,1.35]
  ];
  placements.forEach(([x,z,s],i) => addTree(treeModels[i%3],x,z,s));
  for (const [x,z,s] of [[-7,4,.9],[8,8,.7],[13,-2,.8],[-14,-8,.8],[3,-8,.6]]) {
    const r = rock.scene.clone(true); r.position.set(x,0,z); r.scale.setScalar(s); world.add(r);
  }

  const hero = scoutGLTF.scene;
  normalizeModel(hero, 2.45);
  hero.position.set(4.6, 0, 0.3);
  hero.rotation.y = Math.PI; // face along the trail toward the viewer
  world.add(hero);
  const heroMixer = new THREE.AnimationMixer(hero);
  mixers.push(heroMixer);
  const run = THREE.AnimationClip.findByName(scoutGLTF.animations, 'Run') ||
              THREE.AnimationClip.findByName(scoutGLTF.animations, 'run') ||
              scoutGLTF.animations.find((clip) => /run/i.test(clip.name));
  const idle = scoutGLTF.animations.find((clip) => /idle/i.test(clip.name));
  heroMixer.clipAction(run || idle || scoutGLTF.animations[0]).play();

  const companion = foxGLTF.scene;
  normalizeModel(companion, 1.05);
  companion.position.set(3.0, 0, 2.0);
  companion.rotation.y = Math.PI;
  world.add(companion);
  const foxMixer = new THREE.AnimationMixer(companion);
  mixers.push(foxMixer);
  const walk = foxGLTF.animations.find((clip) => /walk/i.test(clip.name)) ||
               foxGLTF.animations.find((clip) => /idle/i.test(clip.name)) ||
               foxGLTF.animations[0];
  foxMixer.clipAction(walk).play();

  // Small ambient details: flowers and glowing firefly specks.
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf0d88b, roughness: .9 });
  const flowerGeo = new THREE.SphereGeometry(.07, 7, 6);
  for (let i=0;i<36;i++) {
    const flower = new THREE.Mesh(flowerGeo, flowerMat);
    flower.position.set((Math.random()*22)-7, .12, (Math.random()*22)-11);
    flower.scale.y = 1.5; world.add(flower);
  }
  const fireflies = new THREE.Group();
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff4a7 });
  for (let i=0;i<18;i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),glowMat);
    dot.position.set(THREE.MathUtils.randFloat(-8,18),THREE.MathUtils.randFloat(1,4),THREE.MathUtils.randFloat(-10,8));
    fireflies.add(dot);
  }
  world.add(fireflies);

  loading.classList.add('done');
  return { hero, companion, fireflies };
}

let actors = null;
buildWorld().then((result) => { actors = result; }).catch((error) => {
  console.error('Could not load the 3D world:', error);
  loading.innerHTML = '<span>Could not load the 3D models. Please refresh the page.</span>';
});

const pointer = new THREE.Vector2();
let pointerTargetX = 0;
let pointerTargetY = 0;
window.addEventListener('pointermove', (event) => {
  pointerTargetX = (event.clientX / innerWidth - .5) * 2;
  pointerTargetY = (event.clientY / innerHeight - .5) * 2;
});

function resize() {
  const width = innerWidth;
  const height = innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width < 760 ? 43 : 34;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  const t = clock.elapsedTime;
  mixers.forEach((mixer) => mixer.update(delta));
  if (actors) {
    // A gentle looping stride across the path; the fox follows a beat behind.
    actors.hero.position.x = 4.6 + Math.sin(t * .22) * .42;
    actors.hero.position.z = .3 + Math.cos(t * .22) * .3;
    actors.hero.rotation.y = Math.PI + Math.sin(t * .22) * .12;
    actors.companion.position.x = 3.0 + Math.sin(t * .22 - .42) * .48;
    actors.companion.position.z = 2.0 + Math.cos(t * .22 - .42) * .34;
    actors.companion.rotation.y = Math.PI + Math.sin(t * .22 - .42) * .14;
    actors.fireflies.children.forEach((dot,i) => {
      dot.position.y += Math.sin(t * 1.8 + i) * .0009;
    });
  }
  world.rotation.y = pointerTargetX * .025;
  camera.position.y += ((7.2 - pointerTargetY * .35) - camera.position.y) * .025;
  renderer.render(scene,camera);
}
animate();
