/* tweetpad agent kit v1: the character. A three.js stage and one agent on it, built from a look:
     { shape: 'ball' | 'oval' | 'box' | 'tilted' | 'mallow', color: '#rrggbb', hat: 'none' | 'sombrero', glasses: bool, gloss?: bool }
   It follows the pointer, blinks, bobs, hops when it talks (talk()), squints when pleased (pleased()), dozes (sleep(true)) and can be
   drawn smaller (setSize(0.75)). In X's card it stands in the middle, or left of centre with setAside(true) when a browser sits beside it.
   Dot (/dot) and every agent page (/a/<name>) are drawn with this, so creators get the same character we use.
     import { createStage } from '/kit/v1/character.js';
     const stage = createStage(canvas, { layout: 'page' | 'embed' | 'card' });
     stage.setLook({ shape: 'oval', color: '#ff6a1a' });
   Needs an import map for "three" and "three/addons/" (three 0.160). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* the eye: a pill outline as an alpha mask, so a flat patch reads as a rounded pill */
const pillMask = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(4, 4, 56, 120, 28); g.fill();
  return new THREE.CanvasTexture(c);
})();
const EYE = { w: 0.17, h: 0.34, r: 1.004, tilt: 0.32, yaw: 0.26, pitch: 0.06 };
const eyeMaterial = (dark) => new THREE.MeshStandardMaterial({ color: dark ? 0x020202 : 0xffffff, roughness: dark ? 0.78 : 0.6, envMapIntensity: 0.25,
  alphaMap: pillMask, alphaTest: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });

/* a ball's eyes are wrapped onto the sphere (a grid projected onto it), so they follow its curve with no clipping; a blink
   shortens the pill along the surface by projecting the grid again */
function wrappedEye(parent, side, mat) {
  const geo = new THREE.PlaneGeometry(EYE.w, EYE.h, 12, 24);
  const flat = geo.attributes.position.array.slice();
  const centre = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(-EYE.pitch, side * EYE.yaw, 0));
  const right = new THREE.Vector3(0, 1, 0).cross(centre).normalize(), up = centre.clone().cross(right).normalize();
  parent.add(new THREE.Mesh(geo, mat));
  const v = new THREE.Vector3(), cos = Math.cos(EYE.tilt), sin = Math.sin(EYE.tilt);
  const lay = (open) => {
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const x = flat[i * 3], y = flat[i * 3 + 1] * open;
      const tx = x * cos - y * sin, ty = x * sin + y * cos;
      v.copy(centre).addScaledVector(right, tx).addScaledVector(up, ty).normalize().multiplyScalar(EYE.r);
      pos.setXYZ(i, v.x, v.y, v.z); nor.setXYZ(i, v.x / EYE.r, v.y / EYE.r, v.z / EYE.r);
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
  };
  lay(1);
  return { open: lay };
}
/* other shapes: a flat pill laid on the surface at a point, facing along its normal; a blink squashes it */
function patchEye(parent, p, n, mat, tilt) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(EYE.w, EYE.h), mat);
  const h = new THREE.Group(); h.position.copy(p).addScaledVector(n, 0.006); h.lookAt(h.position.clone().add(n)); m.rotation.z = tilt; h.add(m); parent.add(h);
  return { open: (k) => { m.scale.y = k; } };
}
const onEllipsoid = (a, b, c, x, y) => { const z = c * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (y / b) ** 2)); return [new THREE.Vector3(x, y, z), new THREE.Vector3(x / a ** 2, y / b ** 2, z / c ** 2).normalize()]; };

function glasses() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.45 });
  for (const x of [-0.26, 0.26]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 12, 40), m); rim.position.x = x; g.add(rim); }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), m); bridge.rotation.z = Math.PI / 2; bridge.position.y = 0.03; g.add(bridge);
  return g;
}
/* the sombrero, sized for a head of radius 1: the crown's opening matches the head where it meets it (y 0.71, radius 0.73) */
function sombrero() {
  const g = new THREE.Group(), straw = new THREE.MeshStandardMaterial({ color: 0xc9a24f, roughness: 0.85, side: THREE.DoubleSide });
  const pts = [[0, 1.3], [0.24, 1.27], [0.44, 1.13], [0.58, 0.92], [0.7, 0.74], [0.75, 0.71], [1.0, 0.67], [1.2, 0.7], [1.31, 0.78], [1.34, 0.85], [1.29, 0.81], [1.17, 0.73], [0.98, 0.72], [0.78, 0.76], [0.73, 0.76]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 72), straw));
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.04, 10, 56), new THREE.MeshStandardMaterial({ color: 0xc8343b, roughness: 0.6 }));
  band.rotation.x = Math.PI / 2; band.position.y = 0.8; g.add(band);
  g.rotation.z = 0.08; g.rotation.x = -0.06;
  return g;
}

/* light colours get black eyes (as Dot), the rest white */
const isLight = (hex) => { const c = new THREE.Color(hex); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b > 0.6; };

/* one agent from a look: { group, face (turns to look), eyes } */
export function buildCharacter(look) {
  const l = { shape: 'ball', color: '#f4f4f4', hat: 'none', glasses: false, ...look };
  const group = new THREE.Group(), face = new THREE.Group(), eyes = [];
  const mat = l.gloss
    ? new THREE.MeshPhysicalMaterial({ color: l.color, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 0.4 })
    : new THREE.MeshPhysicalMaterial({ color: l.color, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.5, sheen: 0.25 });
  const em = eyeMaterial(isLight(l.color));
  let front = 1;
  if (l.shape === 'ball') {
    group.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), mat)); group.add(face);
    for (const s of [-1, 1]) eyes.push(wrappedEye(face, s, em));
  } else if (l.shape === 'oval') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), mat); m.scale.set(1.15, 0.88, 1); group.add(m); group.add(face);
    for (const x of [-0.3, 0.3]) eyes.push(patchEye(face, ...onEllipsoid(1.15, 0.88, 1, x, 0.05), em, 0.4));
  } else if (l.shape === 'box' || l.shape === 'tilted') {
    const inner = new THREE.Group(); inner.add(new THREE.Mesh(new RoundedBoxGeometry(1.75, 1.75, 1.35, 8, 0.48), mat)); inner.add(face); group.add(inner);
    for (const x of [-0.27, 0.27]) eyes.push(patchEye(face, new THREE.Vector3(x, 0.08, 0.675), new THREE.Vector3(0, 0, 1), em, 0.12));
    if (l.shape === 'tilted') inner.rotation.z = 0.5;
    front = 0.68;
  } else {
    const inner = new THREE.Group(); inner.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 0.42, 16, 48), mat)); inner.add(face); inner.rotation.z = -0.32; group.add(inner);
    for (const x of [-0.27, 0.27]) eyes.push(patchEye(face, ...onEllipsoid(0.85, 0.85, 0.85, x, 0.12), em, 0.05));
  }
  if (l.glasses) { const sp = glasses(); sp.position.set(0, 0.1, front + 0.04); face.add(sp); }
  if (l.hat === 'sombrero') group.add(sombrero());
  /* only a ball's face turns inside its body (the eyes slide over the sphere); other shapes turn whole */
  return { group, face: l.shape === 'ball' ? face : null, eyes };
}

export function createStage(canvas, { layout = 'page', aside = false, still = matchMedia('(prefers-reduced-motion: reduce)').matches } = {}) {
  const card = layout === 'card', embed = layout === 'embed';
  if (card) still = true;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: card });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 4, 4); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.5));
  const holder = new THREE.Group(); scene.add(holder);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.55; shadow.scale.set(0.9, 0.9, 1); scene.add(shadow);

  let agent = null, size = 1, running = true;
  function setLook(look) {
    if (agent) { holder.remove(agent.group); agent.group.traverse(o => { o.geometry?.dispose(); }); }
    agent = buildCharacter(look); holder.add(agent.group);
  }

  function fit() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0.15, card ? 7.2 : embed ? 8.2 : w / h < 0.8 ? 7.8 : 6.2);
    if (embed) camera.position.set(aside ? 1.15 : 0, 0.05, 8.2);   // X's card: centred, or left of its browser when it has one
    if (card) camera.position.y = 0.62;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', fit); fit();

  const gaze = { x: 0, y: 0, tx: 0, ty: 0, last: 0 };
  addEventListener('pointermove', (e) => { gaze.tx = (e.clientX / innerWidth) * 2 - 1; gaze.ty = -((e.clientY / innerHeight) * 2 - 1); gaze.last = performance.now(); });
  const mood = { bounce: 0, squint: 0, blinkAt: 1.5, blink: 0, lid: 1, asleep: false, doze: 0 };
  const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (card) { gaze.tx = 0.35; gaze.ty = 0.25; }
    else if (mood.asleep) { gaze.tx = 0; gaze.ty = -0.35; }
    else if (performance.now() - gaze.last > 3000) { gaze.tx = Math.sin(t * 0.4) * 0.35; gaze.ty = Math.sin(t * 0.27) * 0.15; }
    gaze.x += (gaze.tx - gaze.x) * 0.06; gaze.y += (gaze.ty - gaze.y) * 0.06;
    if (agent) {
      if (agent.face) { agent.face.rotation.y = gaze.x * 0.5; agent.face.rotation.x = -gaze.y * 0.35; }
      holder.rotation.y = gaze.x * (agent.face ? 0.12 : 0.4); holder.rotation.x = -gaze.y * (agent.face ? 0.08 : 0.2);
    }
    mood.doze += ((mood.asleep ? 1 : 0) - mood.doze) * 0.04;
    const bob = still ? 0 : Math.sin(t * (1.6 - mood.doze)) * (0.06 - 0.03 * mood.doze);
    mood.bounce = Math.max(0, mood.bounce - dt * 2.2);
    const hop = Math.sin(mood.bounce * Math.PI) * 0.35;
    holder.position.y = (bob + hop - mood.doze * 0.12) * size - (1 - size) * 0.55;
    const squash = 1 + Math.sin(mood.bounce * Math.PI * 2) * 0.05 * mood.bounce;
    holder.scale.set(size / Math.sqrt(squash), size * squash, size / Math.sqrt(squash));
    shadow.scale.setScalar((0.9 - (bob + hop) * 0.25) * size); shadow.material.opacity = 0.45 - (bob + hop) * 0.3;
    if (t > mood.blinkAt && !card) { mood.blink = 1; mood.blinkAt = t + 2.5 + Math.random() * 3; }
    mood.blink = Math.max(0, mood.blink - dt * 7);
    mood.squint = Math.max(0, mood.squint - dt * 0.6);
    const open = 1 - Math.sin(mood.blink * Math.PI) * 0.9;
    const lid = Math.max(0.12, open * (1 - 0.55 * Math.min(1, mood.squint)) * (1 - 0.88 * mood.doze));
    if (agent && Math.abs(lid - mood.lid) > 0.002) { for (const e of agent.eyes) e.open(lid); mood.lid = lid; }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setLook,
    talk() { mood.bounce = still ? 0 : 1; },
    pleased() { mood.squint = 1.6; },
    sleep(on) { mood.asleep = !!on; },
    /* in X's card, move over for a browser window on the right (aside), or back to the middle */
    setAside(on) { aside = !!on; fit(); },
    /* smaller or larger on the stage, standing on the same shadow (1 is Dot's size) */
    setSize(k) { size = k; },
    /* stops drawing for good (the page shows the agent's own code instead) */
    stop() { running = false; renderer.setAnimationLoop(null); renderer.dispose(); },
  };
}
