/* tweetpad agent kit v1: avatars. A VRChat-style avatar (a GLB with a humanoid rig and VRChat's blink and viseme shape keys) on a
   three.js stage, drawn in an anime cel look (three tones of light, an ink outline, a rim light and a soft contact shadow; or
   style: 'standard' for plain PBR), and brought to life: it breathes and sways, its head and eyes follow the pointer, it blinks, its mouth moves while it
   talks (speak()), it can smile or look surprised (express()), it acts (act(): 'wave', 'nod', 'shake', 'cheer', 'bow', 'shrug',
   'dance', 'jump'), it dozes (sleep(true)), and it reports where its head is on screen so tweetpad's speech bubble can point at it
   (head()). Avatars made in a T-pose have their arms lowered to rest at their sides.
     import { createAvatar, glbFromDataUrl } from '/kit/v1/avatar.js';
     const avatar = await createAvatar(canvas, glbFromDataUrl(dataUrl), { layout: tp.layout });
     avatar.speak(reply);            // lip-sync for about as long as the line takes to say
     tp.place(avatar.head());        // { x, y } as fractions of the frame, just above the head
   Bones are found by name under the usual conventions (VRChat/Unity humanoid "Left arm", Mixamo "mixamorig:LeftArm", VRM "J_Bip_L_UpperArm",
   Blender "UpperArm.L", Unreal "upperarm_l", Source "ValveBiped.Bip01_L_UpperArm"); expressions by VRChat's names (vrc.blink, vrc.v_aa,
   v.aa, blendShape1.v_aa…), plain English ones (Blink, smile, Surprised) and MMD's Japanese ones (まばたき, あ, お, 笑い). Without visemes
   the mouth moves a jaw bone if there is one, and otherwise the head nods along. A missing bone or expression is skipped, so any
   rigged GLB at least stands and breathes.
   To turn a .unitypackage or .fbx into a GLB small enough to embed, see SKILL.md, "Bring a VRChat avatar" (tools/vrc-to-glb.py).
   Needs an import map for "three" and "three/addons/" (three 0.160). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* a GLB embedded in the page as a data: URL (or bare base64), as the bytes GLTFLoader parses */
export function glbFromDataUrl(text) {
  const b64 = String(text).trim().replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/* ---------- finding the rig: a bone's side and role from its name, whatever the convention ---------- */
const tokens = (name) => String(name).replace(/^(mixamorig\d*|j_bip_|bip0?1)[:_ ]?/i, '').replace(/([a-z])([A-Z])/g, '$1 $2')
  .toLowerCase().split(/[\s_.:\-]+/).filter((w) => w && !/^(valve|biped|valvebiped|bip0?1|bip|j|mixamorig\d*)$/.test(w));
function roleOf(name) {
  const t = tokens(name), has = (w) => t.includes(w);
  const side = has('left') || has('l') ? 'L' : has('right') || has('r') ? 'R' : '';
  const word = t.filter((w) => !['left', 'right', 'l', 'r', 'upper', 'lower'].includes(w)).join(''), bare = word.replace(/\d+$/, '');
  if (/^(hips|pelvis|hip)$/.test(word)) return 'hips';
  if (/^(upperchest|chest)$/.test(word) || (has('upper') && word === 'chest')) return 'chest';
  if (/^spine0?[2-4]$/.test(word)) return 'chest';
  if (/^spine0?1?$/.test(word)) return 'spine';
  if (bare === 'neck') return 'neck';
  if (bare === 'head') return 'head';
  if (bare === 'jaw') return 'jaw';
  if (!side) return null;
  if (word === 'eye') return 'eye' + side;
  if (/^(shoulder|clavicle|clavical)$/.test(word)) return 'shoulder' + side;
  if (word === 'arm' && !has('lower') || word === 'upperarm') return 'upperArm' + side;
  if (/^(elbow|forearm|lowerarm)$/.test(word) || word === 'arm' && has('lower')) return 'lowerArm' + side;
  if (/^(wrist|hand)$/.test(word)) return 'hand' + side;
  return null;
}
/* expressions: the first shape key whose name matches, across the conventions */
const EXPR = {
  blink: [/^(vrc\.)?blink$/i, /^blink$/i, /^まばたき$/, /^eye_?close$/i, /blink(?!.*(left|right|_l|_r))/i],
  blinkL: [/^vrc\.blink_left$/i, /blink[_ ]?l(eft)?$/i, /ウィンク２?$/],
  blinkR: [/^vrc\.blink_right$/i, /blink[_ ]?r(ight)?$/i, /ウィンク右$/],
  aa: [/^vrc\.v_aa$/i, /(^|[._])v[._]?aa$/i, /^(v_)?aa?$/i, /^あ$/, /mouth_?a$/i, /^ah$/i],   // "Ah", "There", "Your", "Cormorant": MMD's あいおう run through a translator
  oh: [/^vrc\.v_oh$/i, /(^|[._])v[._]?oh$/i, /(^|[._])v[._]?ou$/i, /^(v_)?oh?$/i, /^お$/, /mouth_?o$/i, /^your$/i, /^cormorant$/i],
  ih: [/^vrc\.v_ih$/i, /(^|[._])v[._]?ih$/i, /(^|[._])v[._]?ee$/i, /^(v_)?ih?$/i, /^い$/, /mouth_?i$/i, /^there$/i],
  smile: [/^smile$/i, /^笑い$/, /smile/i, /joy|happy/i, /^a laugh$/i],
  surprised: [/^surprised$/i, /surpris/i, /^びっくり$/, /驚/],
};

/* the cel look: three flat tones of light, the texture kept, a crisp rim on the lit side */
const RAMP = (() => { const t = new THREE.DataTexture(new Uint8Array([96, 178, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
function celOf(m) {
  if (!m || m.isMeshToonMaterial) return m;
  const cel = new THREE.MeshToonMaterial({ map: m.map || null, color: m.color ? m.color.clone() : new THREE.Color('#fff'), gradientMap: RAMP,
    transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, alphaMap: m.alphaMap || null,
    emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0), emissiveMap: m.emissiveMap || null });
  cel.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
      'float rimF = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);\n' +
      'outgoingLight += diffuseColor.rgb * smoothstep(0.62, 0.68, rimF) * 0.28;\n#include <opaque_fragment>');
  };
  return cel;
}
/* the ink line: the mesh again, inside out, pushed out along its normals (skinned and morphed with the original) */
function outlineOf(o, width) {
  const src = [].concat(o.material)[0], cut = src && (src.alphaTest > 0 || src.transparent) && src.map;
  const ink = new THREE.MeshBasicMaterial({ color: '#1d1724', side: THREE.BackSide, map: cut ? src.map : null, alphaTest: cut ? Math.max(0.5, src.alphaTest || 0) : 0 });
  const scale = o.matrixWorld.getMaxScaleOnAxis() || 1;
  ink.onBeforeCompile = (sh) => {
    sh.uniforms.inkWidth = { value: width / scale };
    sh.vertexShader = 'uniform float inkWidth;\n' + sh.vertexShader.replace('#include <skinning_vertex>',
      '#include <skinning_vertex>\n#ifdef USE_SKINNING\n transformed += normalize(objectNormal) * inkWidth;\n#else\n transformed += normalize(normal) * inkWidth;\n#endif');
  };
  const line = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, ink) : new THREE.Mesh(o.geometry, ink);
  if (o.isSkinnedMesh) { line.bind(o.skeleton, o.bindMatrix); line.bindMode = o.bindMode; }
  if (o.morphTargetInfluences) { line.morphTargetInfluences = o.morphTargetInfluences; line.morphTargetDictionary = o.morphTargetDictionary; }
  line.position.copy(o.position); line.quaternion.copy(o.quaternion); line.scale.copy(o.scale);
  line.frustumCulled = false; line.renderOrder = -0.5;
  o.parent.add(line);
}

export async function createAvatar(canvas, glb, opts = {}) {
  const layout = opts.layout || 'page';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const toon = (opts.style || 'toon') === 'toon';
  renderer.toneMapping = toon ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opts.exposure ?? 1;
  const scene = new THREE.Scene();
  if (!toon) { const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture; }
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 30, 1, 0.01, 100);
  scene.add(new THREE.HemisphereLight('#ffffff', opts.groundColor || '#c9c2d6', toon ? 1.15 : 0.6));
  const key = new THREE.DirectionalLight(opts.keyColor || '#fff4e6', toon ? 1.5 : 2.2); key.position.set(1.5, 2.5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(opts.rimColor || '#9fc4ff', toon ? 0.5 : 1.6); rim.position.set(-2.5, 2, -2.5); scene.add(rim);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.parseAsync(glb, '');
  const model = gltf.scene; model.rotation.y = opts.turn || 0;
  scene.add(model);
  model.updateMatrixWorld(true);
  const box0 = new THREE.Box3().setFromObject(model), tall = box0.getSize(new THREE.Vector3()).y || 1;
  const meshes = []; model.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    o.frustumCulled = false;
    for (const m of [].concat(o.material)) {   // small textures are pixel art (a Minecraft skin): keep their pixels sharp
      const img = m.map && m.map.image;
      if (img && (img.width || 999) <= 128) { m.map.magFilter = THREE.NearestFilter; m.map.minFilter = THREE.NearestFilter; m.map.generateMipmaps = false; m.map.needsUpdate = true; }
    }
    if (toon) o.material = Array.isArray(o.material) ? o.material.map(celOf) : celOf(o.material);
    else for (const m of [].concat(o.material)) if (m.isMeshStandardMaterial) { m.roughness = Math.max(m.roughness, 0.6); m.metalness = 0; m.envMapIntensity = 0.5; }
    if (toon && opts.outline !== false) outlineOf(o, tall * (opts.outlineWidth ?? 0.0035));
  }
  if (opts.shadow !== false) {   // a soft contact shadow where it stands
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.5)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.18)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const size0 = box0.getSize(new THREE.Vector3()), centre0 = box0.getCenter(new THREE.Vector3());
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: opts.shadowOpacity ?? 0.55 }));
    disc.rotation.x = -Math.PI / 2; disc.scale.set(Math.max(size0.x, size0.z) * 1.15, Math.max(size0.x, size0.z) * 0.75, 1);
    disc.position.set(centre0.x, box0.min.y + tall * 0.002, centre0.z); disc.renderOrder = -1; scene.add(disc);
  }

  /* the rig, and each bone's rest pose */
  const bones = {}, rest = new Map();
  model.traverse((o) => {
    if (!o.isBone && !(o.type === 'Object3D' && /hips|spine|neck|head/i.test(o.name))) return;
    rest.set(o, o.quaternion.clone());
    const role = roleOf(o.name);
    if (!role) return;
    if (role.startsWith('eye')) (bones[role] ||= []).push(o);   // some rigs carry two pairs of eye bones; turn both
    else bones[role] ||= o;
  });
  /* the expressions: every mesh that has the shape key gets the weight */
  const morphs = {};
  model.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary) return;
    for (const [k, list] of Object.entries(EXPR)) {
      const name = Object.keys(o.morphTargetDictionary).find((n) => list.some((re) => re.test(n)));
      if (name) (morphs[k] ||= []).push([o, o.morphTargetDictionary[name]]);
    }
  });
  const setMorph = (k, v) => (morphs[k] || []).forEach(([o, i]) => { o.morphTargetInfluences[i] = v; });

  /* framing: the whole avatar in the frame, standing above tweetpad's message box; or head and shoulders with framing: 'bust' */
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  const headPos = bones.head ? bones.head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(centre.x, box.max.y - size.y * 0.12, centre.z);
  const headTop = Math.max(box.max.y, headPos.y);
  function frame() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    /* where it stands, as fractions of the frame from the top: its top leaves room for tweetpad's bubble above it, its feet stay
       above the message box; it's never wider than 80% of the frame */
    const bust = opts.framing === 'bust', [top, bottom] = opts.fit || (layout === 'embed' ? [0.3, 0.84] : [0.26, 0.88]);   // fit: [top, bottom] to override
    const span = bust ? (headTop - headPos.y) * 3.4 : size.y, low = bust ? headTop - span : box.min.y;
    const width = bust ? span * 0.9 : Math.max(size.x, size.z);
    const view = Math.max(span / (bottom - top), width / (0.8 * camera.aspect));
    const mid = low - (1 - bottom) * view + view / 2;
    const dist = view / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    camera.near = dist / 100; camera.far = dist * 4 + size.length() * 4;   // avatars come in metres or centimetres
    camera.position.set(centre.x, mid, centre.z + Math.max(size.z, 0.01) / 2 + dist);
    camera.lookAt(centre.x, mid, centre.z);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', frame); frame();

  /* turning a bone in the avatar's own space (yaw, pitch, roll), whatever its local axes: q = parent⁻¹ · turn · parent · rest */
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), e = new THREE.Euler();
  function turn(bone, yaw, pitch, roll = 0, pre = null) {
    if (!bone) return;
    const base = rest.get(bone) || bone.quaternion;
    bone.parent.getWorldQuaternion(qa);
    qb.setFromEuler(e.set(pitch, yaw + 0, roll, 'YXZ'));
    if (pre) qb.multiply(pre);                                     // a fixed turn first (an arm's rest correction)
    const modelQ = model.getWorldQuaternion(new THREE.Quaternion());
    qb.premultiply(modelQ).multiply(modelQ.clone().invert());     // the turn, in the avatar's frame
    bone.quaternion.copy(qa.clone().invert().multiply(qb).multiply(qa).multiply(base));
    bone.updateMatrixWorld(true);
  }

  /* arms: which way each one points (its side of the body, sign), and how far to lower it if it was made in a T- or A-pose */
  const inModel = (v) => v.applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()).invert());
  const arms = {};
  for (const side of ['L', 'R']) {
    const up = bones['upperArm' + side], end = bones['lowerArm' + side] || bones['hand' + side] || (up && up.children.find((c) => c.isBone));   // a one-piece arm (Steve): its end bone
    if (!up || !end) continue;
    const dir = inModel(end.getWorldPosition(new THREE.Vector3()).sub(up.getWorldPosition(new THREE.Vector3())));
    const elevation = Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), sign = Math.sign(dir.x) || (side === 'L' ? 1 : -1);
    /* a T- or A-pose: turn the arm from where it points to hanging at its side, a little out and forward */
    const down = new THREE.Vector3(sign * Math.cos(1.2), -Math.sin(1.2), 0.12).normalize();
    arms[side] = { sign, rest: elevation > -1.0 ? new THREE.Quaternion().setFromUnitVectors(dir.normalize(), down) : null };
  }
  /* actions: each adds to the pose for its length, easing in and out. Arm values raise the arm (radians of elevation); the right
     arm is the one on the avatar's right (the left of the frame). */
  const ACTIONS = {
    wave: [2.4, (t) => ({ armR: 1.2, foreR: 1.35 + 0.38 * Math.sin(t * 11),   // upper arm out to the side, elbow bent, the hand swinging
       head: [0, 0, 0.08], chest: [-0.06, 0, 0] })],
    nod: [1.3, (t) => ({ head: [0, 0.2 * Math.sin(t * 9), 0] })],
    shake: [1.3, (t) => ({ head: [0.32 * Math.sin(t * 10), 0, 0] })],
    cheer: [1.9, (t) => ({ armL: 2.2, armR: 2.2, foreL: 0.3, foreR: 0.3, head: [0, -0.12, 0], lift: 0.035 * Math.abs(Math.sin(t * 7)) })],
    bow: [2.1, () => ({ spine: [0, 0.32, 0], chest: [0, 0.22, 0], head: [0, 0.2, 0] })],
    shrug: [1.7, () => ({ shoulderL: 0.2, shoulderR: 0.2, armL: 0.15, armR: 0.15, foreL: 0.45, foreR: 0.45, head: [0, 0, 0.14] })],
    dance: [3.2, (t) => { const b = t * 6.5; return { hips: [0.22 * Math.sin(b), 0, 0.1 * Math.sin(b * 2)], chest: [-0.15 * Math.sin(b), 0, 0],
      armL: 1.0 + 0.55 * Math.sin(b), armR: 1.0 - 0.55 * Math.sin(b), foreL: 0.7, foreR: 0.7, head: [0, 0, 0.12 * Math.sin(b)], lift: 0.018 * Math.abs(Math.sin(b * 2)) }; }],
    jump: [1.1, (t) => ({ lift: 0.16 * Math.sin(Math.min(1, t / 0.9) * Math.PI), armL: 0.9, armR: 0.9, foreL: 0.4, foreR: 0.4 })],
  };
  const acting = [];   // [name, start]
  const baseY = model.position.y;

  /* state */
  const look = { x: 0, y: 0, tx: 0, ty: 0, last: -1e9 };
  addEventListener('pointermove', (ev) => {
    const r = canvas.getBoundingClientRect();
    look.tx = ((ev.clientX - r.left) / r.width) * 2 - 1; look.ty = -(((ev.clientY - r.top) / r.height) * 2 - 1); look.last = performance.now();
  });
  let talkUntil = 0, talkText = '', talkStart = 0, sleeping = 0, sleepTarget = 0, nextBlink = performance.now() + 1500, blinkAt = -1;
  const expr = { smile: { v: 0, t: 0, until: 0 }, surprised: { v: 0, t: 0, until: 0 } };
  const VOWEL = { a: 'aa', o: 'oh', u: 'oh', e: 'ih', i: 'ih', y: 'ih' };

  let raf = 0, last = performance.now(), clock = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const calm = reduce.matches ? 0.35 : 1;
    sleeping += (sleepTarget - sleeping) * Math.min(1, dt * 2);
    clock += dt * (1 - 0.5 * sleeping);
    for (const b of rest.keys()) b.quaternion.copy(rest.get(b));
    model.updateMatrixWorld(true);

    /* where it looks: the pointer while it moves, then a slow wander */
    if (now - look.last > 2500) { look.tx = 0.35 * Math.sin(clock * 0.31) + 0.15 * Math.sin(clock * 0.83); look.ty = 0.15 * Math.sin(clock * 0.47) - 0.05; }
    look.x += (look.tx - look.x) * Math.min(1, dt * 4); look.y += (look.ty - look.y) * Math.min(1, dt * 4);
    const yaw = look.x * 0.55 * calm, pitch = -look.y * 0.3 * calm - 0.2 * sleeping;

    /* body: breath, a slow sway, a nod while it talks */
    const breath = Math.sin(clock * 2 * Math.PI * 0.25), sway = Math.sin(clock * 0.6) * calm;
    const talking = now < talkUntil, nod = talking ? Math.sin((now - talkStart) / 1000 * 7) * (morphs.aa || bones.jaw ? 0.035 : 0.07) * calm : 0;   // no mouth at all: it nods more
    /* the actions playing now, summed and eased in and out */
    const P = { hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], armL: 0, armR: 0, foreL: 0, foreR: 0, shoulderL: 0, shoulderR: 0, lift: 0 };
    for (let i = acting.length - 1; i >= 0; i--) {
      const [name, at] = acting[i], [len, f] = ACTIONS[name], t = (now - at) / 1000;
      if (t > len) { acting.splice(i, 1); continue; }
      const k = Math.min(1, t / 0.25, (len - t) / 0.3) ** 2 * (3 - 2 * Math.min(1, t / 0.25, (len - t) / 0.3)) * calm, o = f(t);
      for (const [key, v] of Object.entries(o)) { if (Array.isArray(v)) v.forEach((x, j) => { P[key][j] += x * k; }); else P[key] += v * k; }
    }
    model.position.y = baseY + P.lift * size.y;
    turn(bones.hips, sway * 0.03 + P.hips[0], P.hips[1], sway * 0.02 + P.hips[2]);
    turn(bones.spine, sway * 0.02 + P.spine[0], breath * 0.015 + P.spine[1], -sway * 0.015 + P.spine[2]);
    turn(bones.chest, yaw * 0.12 + P.chest[0], breath * 0.02 + P.chest[1], P.chest[2]);
    turn(bones.neck, yaw * 0.35, pitch * 0.35, 0);
    turn(bones.head, yaw * 0.45 + P.head[0], pitch * 0.5 + nod + P.head[1], -yaw * 0.08 + 0.03 * sway + P.head[2]);
    (bones.eyeL || []).concat(bones.eyeR || []).forEach((b) => turn(b, look.x * 0.25 * calm, -look.y * 0.12 * calm));
    const gesture = talking ? 0.07 * Math.sin((now - talkStart) / 1000 * 2.3) * calm : 0;
    for (const side of ['L', 'R']) {   // a roll in the avatar's frame raises the arm; its sign depends on the side
      const a = arms[side]; if (!a) continue;
      const lift = side === 'L' ? 1 : -1;
      turn(bones['shoulder' + side], 0, 0, a.sign * P['shoulder' + side]);
      turn(bones['upperArm' + side], 0, 0, a.sign * (0.04 * breath * calm + gesture * lift + P['arm' + side]), a.rest);
      turn(bones['lowerArm' + side], 0, 0, a.sign * (0.03 * breath * calm + gesture * lift * 0.6 + P['fore' + side]));
    }

    /* face: blinks, the mouth, expressions */
    if (now > nextBlink && blinkAt < 0) blinkAt = now;
    let blink = 0;
    if (blinkAt >= 0) { const p = (now - blinkAt) / 170; blink = p < 1 ? Math.sin(p * Math.PI) : 0; if (p >= 1) { blinkAt = -1; nextBlink = now + 2200 + Math.random() * 3800; } }
    blink = Math.max(blink, 0.75 * sleeping);
    if (morphs.blink) setMorph('blink', blink); else { setMorph('blinkL', blink); setMorph('blinkR', blink); }
    let aa = 0, oh = 0, ih = 0;
    if (talking) {
      const p = (now - talkStart) / 1000 * 13, ch = talkText[Math.floor(p) % Math.max(1, talkText.length)] || ' ';
      const open = Math.sin((p % 1) * Math.PI) * (/[aeiouy]/i.test(ch) ? 1 : /\s|[.,!?]/.test(ch) ? 0 : 0.45);
      const v = VOWEL[ch.toLowerCase()] || 'aa';
      aa = v === 'aa' ? open : open * 0.3; oh = v === 'oh' ? open : 0; ih = v === 'ih' ? open : 0;
      if (!morphs.ih) aa = Math.max(aa, ih * 0.6);
    }
    setMorph('aa', aa * 0.8); setMorph('oh', oh * 0.8); setMorph('ih', ih * 0.7);
    if (!morphs.aa && bones.jaw) turn(bones.jaw, 0, Math.max(aa, oh, ih) * 0.22);   // no visemes: the jaw opens instead
    for (const [k, s] of Object.entries(expr)) { s.t = now < s.until ? 1 : 0; s.v += (s.t - s.v) * Math.min(1, dt * 6); setMorph(k, s.v * 0.85); }

    if (opts.onFrame) opts.onFrame(clock, dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  const hp = new THREE.Vector3();
  return {
    scene, camera, renderer, model, bones, morphs, arms,
    /* lip-sync for about as long as the line takes to say */
    speak(text) { talkText = String(text || ''); talkStart = performance.now(); talkUntil = talkStart + Math.min(9000, Math.max(900, talkText.length * 62)); },
    /* 'smile' or 'surprised', for a few seconds */
    express(name, seconds = 2.5) { if (expr[name]) expr[name].until = performance.now() + seconds * 1000; },
    /* an action: 'wave', 'nod', 'shake', 'cheer', 'bow', 'shrug', 'dance' or 'jump' */
    act(name) { if (ACTIONS[name]) acting.push([name, performance.now()]); },
    actions: Object.keys(ACTIONS),
    sleep(on) { sleepTarget = on ? 1 : 0; },
    look(x, y) { look.tx = x; look.ty = y; look.last = performance.now(); },
    /* the spot just above its head, as fractions of the frame (for tp.place) */
    head() {
      (bones.head ? bones.head.getWorldPosition(hp) : hp.copy(headPos));
      hp.y += (headTop - headPos.y) * 1.1; hp.project(camera);
      return { x: Math.min(0.92, Math.max(0.08, (hp.x + 1) / 2)), y: Math.min(0.9, Math.max(0.12, (1 - hp.y) / 2)) };
    },
    frame,
    stop() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
