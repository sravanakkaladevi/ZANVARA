'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { linkGeo, makeGold, once } from './assets';
import { ovalBrilliantGeo, useGemMaterial } from './gem';
import { pointer } from '@/lib/store';

/* ------------------------------------------------------------------
   "From stone to signature" — one oval brilliant, one basket setting,
   one chain, assembled by scroll.  The section writes STORY.p (0..1)
   and STORY.photo (the <img> of the model photo, once it has loaded).
------------------------------------------------------------------- */
export const STORY = { p: 0, photo: null, frame: null, model: null };

const OVAL = 0.78; // x/y ratio of the oval girdle
const N = 100; // chain links
const LINK_SCALE = 1.75;
const NECK_Y = 2.3; // local height at which the V meets the neck
const NECK_X = 2.0;
const BAIL_Y = 1.32; // bail loop, in pendant-local units (gem girdle radius = 1)

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = THREE.MathUtils.lerp;

/* four-prong basket + gallery rails + bail, in the gem's local frame */
const basketGeo = () =>
  once('story-basket', () => {
    const parts = [];
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const at = (r, z) => new THREE.Vector3(Math.cos(a) * r * OVAL, Math.sin(a) * r, z);
      const curve = new THREE.CatmullRomCurve3([at(0.9, 0.2), at(1.05, 0.06), at(1.0, -0.3), at(0.42, -0.95)]);
      parts.push(new THREE.TubeGeometry(curve, 24, 0.055, 10, false));
      const tip = new THREE.SphereGeometry(0.075, 14, 10);
      tip.translate(...at(0.9, 0.2).toArray());
      parts.push(tip);
    }
    for (const [r, z, t] of [[0.92, -0.28, 0.04], [0.46, -0.9, 0.035]]) {
      const rail = new THREE.TorusGeometry(r, t, 10, 64);
      rail.scale(OVAL, 1, 1);
      rail.translate(0, 0, z);
      parts.push(rail);
    }
    const bail = new THREE.TorusGeometry(0.2, 0.05, 12, 32);
    bail.rotateY(Math.PI / 2);
    bail.translate(0, BAIL_Y, -0.1);
    parts.push(bail);
    const neck = new THREE.CylinderGeometry(0.05, 0.06, 0.26, 10);
    neck.translate(0, 1.04, -0.1);
    parts.push(neck);
    const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
    parts.forEach((g) => g.dispose());
    return merged;
  });

/* chain paths: a loose S sweeping across the gem, and the worn V */
const S_CURVE = new THREE.CatmullRomCurve3([
  [-7.2, 2.2, -0.8], [-4.4, 0.9, -0.2], [-2.3, -0.7, 0.5], [-0.4, -1.25, 1.1], [1.6, -0.6, 0.6],
  [3.0, -1.5, 0.2], [4.6, -0.3, -0.2], [6.8, -1.9, -0.6],
].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
const V_CURVE = new THREE.CatmullRomCurve3([
  [-3.0, 5.2, -0.2], [-2.45, 3.5, 0], [-NECK_X, NECK_Y, 0.1], [-1.15, 0.65, 0.2], [-0.32, -0.55, 0.25],
  [0, -0.8, 0.25], [0.32, -0.55, 0.25], [1.15, 0.65, 0.2], [NECK_X, NECK_Y, 0.1], [2.45, 3.5, 0], [3.0, 5.2, -0.2],
].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
const V_BOTTOM = new THREE.Vector3(0, -0.8, 0.25);

const _q = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _t = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);

/** where the photo's anchors land in world space, or null */
function photoAnchors(camera, size, out) {
  const img = STORY.photo;
  const model = STORY.model;
  if (!img || !img.naturalWidth || !STORY.frame || !model) return null;
  const view = STORY.frame.getBoundingClientRect();
  const r = img.getBoundingClientRect();
  if (!r.width || !view.height) return null;
  // object-fit: cover, at the model's object-position
  const k = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
  const w = img.naturalWidth * k;
  const h = img.naturalHeight * k;
  const ox = r.left + (r.width - w) * model.pos[0];
  const oy = r.top + (r.height - h) * model.pos[1];
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const vw = vh * (view.width / view.height);
  const toWorld = ([u, v], target) =>
    target.set(((ox + u * w - view.left) / view.width - 0.5) * vw, -((oy + v * h - view.top) / view.height - 0.5) * vh, 0);
  toWorld(model.neckL, out.L);
  toWorld(model.neckR, out.R);
  toWorld(model.drop, out.P);
  return out;
}

export function StoryScene() {
  const gold = useMemo(() => makeGold('#e3b35a', { finish: 'polished' }), []);
  // ray-traced emerald: facets reflect the studio, light bounces inside and picks up its green
  const stoneGeo = ovalBrilliantGeo(OVAL);
  const gem = useGemMaterial(stoneGeo, 'emerald');
  useEffect(() => () => gold.dispose(), [gold]);

  const chain = useRef();
  const unit = useRef(); // gem + basket
  const tilt = useRef();
  const basket = useRef();
  const stone = useRef();
  const smooth = useRef({ p: 0, x: 0, y: 0 });
  const anchors = useMemo(() => ({ L: new THREE.Vector3(), R: new THREE.Vector3(), P: new THREE.Vector3() }), []);
  const samples = useMemo(() => {
    const s = [], v = [];
    for (let i = 0; i < N + 1; i++) s.push(S_CURVE.getPointAt(i / N)), v.push(V_CURVE.getPointAt(i / N));
    return { s, v };
  }, []);

  useFrame(({ camera, size, clock }, dt) => {
    const st = smooth.current;
    st.p = THREE.MathUtils.damp(st.p, STORY.p, 6, dt);
    st.x = THREE.MathUtils.damp(st.x, pointer.x, 2.5, dt);
    st.y = THREE.MathUtils.damp(st.y, pointer.y, 2.5, dt);
    const p = st.p;
    const t = clock.elapsedTime;

    const sweepIn = ease(seg(p, 0.1, 0.32)); // chain slides across the stone
    const sweepOut = ease(seg(p, 0.34, 0.44)); // …and away again
    const lift = ease(seg(p, 0.36, 0.46)); // stone rises
    const rise = ease(seg(p, 0.4, 0.52)); // basket comes up
    const drop = ease(seg(p, 0.5, 0.58)); // stone settles into its prongs
    const vForm = ease(seg(p, 0.6, 0.74)); // chain threads into a V, pendant turns to face us
    const wear = ease(seg(p, 0.76, 0.88)); // onto the model
    const sign = ease(seg(p, 0.88, 0.98)); // the closing line takes the bottom of the frame

    /* ---------- the stone + setting ---------- */
    // tilt: three-quarter view → table up (being set) → face forward (hanging)
    const theta = lerp(lerp(-0.42, -1.12, lift), 0, vForm);
    const spin = (1 - lift) * (Math.sin(t * 0.5) * 0.55 + p * 9) + lift * (1 - vForm) * Math.sin(t * 0.6) * 0.18;
    tilt.current.rotation.set(theta, 0, 0);
    unit.current.rotation.set(st.y * 0.12, spin + st.x * 0.25 * (1 - wear), 0);
    stone.current.position.z = lerp(lerp(0, 0.8, lift), 0, drop);
    basket.current.position.z = lerp(-7, 0, rise);
    basket.current.visible = rise > 0.001;

    /* ---------- chain path ---------- */
    // shift < 0 → the chain's head has not yet reached that part of the path
    const shift = vForm > 0 ? lerp(-1, 0, vForm) : sweepIn < 1 ? sweepIn - 1 : -sweepOut;
    const morph = vForm;
    const fit = wear > 0 ? photoAnchors(camera, size, anchors) : null;
    const w = fit ? wear : 0;
    // narrow / portrait screens: shrink the whole piece so the V stays in frame
    const fr = STORY.frame?.getBoundingClientRect();
    const R = fr && fr.height ? THREE.MathUtils.clamp(fr.width / fr.height / 1.25, 0.5, 1) : 1;
    // photo fit: x scale from neck width, y scale from neck → drop, translate onto the neck
    // no photo: lift and shrink the piece so "From stone to signature" has room below it
    const lift2 = fit ? 0 : sign;
    let kx = R * (1 - 0.18 * lift2), ky = kx, tx = 0, ty = 1.15 * lift2;
    if (fit) {
      const midX = (anchors.L.x + anchors.R.x) / 2;
      const midY = (anchors.L.y + anchors.R.y) / 2;
      const fx = Math.abs(anchors.R.x - anchors.L.x) / (2 * NECK_X);
      const fy = Math.max(0.05, (midY - anchors.P.y) / (NECK_Y - V_BOTTOM.y));
      kx = lerp(R, fx, w);
      ky = lerp(R, fy, w);
      tx = lerp(0, midX, w); // the V is centred on x = 0
      ty = lerp(0, midY - fy * NECK_Y, w);
    }
    const kLink = Math.sqrt(kx * ky);

    const mesh = chain.current;
    for (let i = 0; i < N; i++) {
      const u0 = i / N + shift;
      const u1 = (i + 1) / N + shift;
      if (u0 < 0 || u1 > 1 || (morph === 0 && sweepIn === 0)) {
        mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
        continue;
      }
      const sample = (u, target) => {
        const f = u * N, j = Math.min(N - 1, Math.floor(f)), r = f - j;
        _t.copy(samples.s[j]).lerp(samples.s[j + 1], r);
        target.copy(samples.v[j]).lerp(samples.v[j + 1], r);
        return target.lerp(_t, 1 - morph);
      };
      sample(u0, _a);
      sample(u1, _b);
      // links running up behind the neck disappear as she puts it on
      const hide = w * THREE.MathUtils.smoothstep(Math.max(_a.y, _b.y), NECK_Y - 0.15, NECK_Y + 0.05);
      for (const v of [_a, _b]) v.set(v.x * kx + tx, v.y * ky + ty, v.z * kLink);
      _t.subVectors(_b, _a);
      const len = _t.length() || 1;
      _q.setFromUnitVectors(X, _t.multiplyScalar(1 / len));
      _q.multiply(_qt.setFromAxisAngle(X, i % 2 ? Math.PI / 2 : 0.25));
      _s.setScalar(LINK_SCALE * kLink * (1 - hide));
      _m.compose(_a.add(_b).multiplyScalar(0.5), _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;

    /* ---------- pendant position ---------- */
    // free-floating stone → bottom of the V (bail on the chain)
    const unitScale = lerp(lerp(0.95, 1.05, lift), 0.5, vForm) * kLink;
    const hangX = V_BOTTOM.x * kx + tx;
    const hangY = (V_BOTTOM.y - 0.12) * ky + ty - BAIL_Y * unitScale;
    unit.current.position.set(
      lerp(0, hangX, vForm),
      // while being set the stone sits lower, so it clears the headline when lifted
      lerp(lerp(-0.15, -0.75 + 0.35 * drop, lift) * R, hangY, vForm) + Math.sin(t * 0.9) * 0.04 * (1 - vForm),
      lerp(0, V_BOTTOM.z * kLink, vForm)
    );
    unit.current.scale.setScalar(unitScale);
  });

  return (
    <group>
      <group ref={unit}>
        <group ref={tilt}>
          <mesh ref={stone} geometry={stoneGeo} material={gem} />
          <mesh ref={basket} geometry={basketGeo()} material={gold} />
        </group>
      </group>
      <instancedMesh ref={chain} args={[linkGeo(), gold, N]} frustumCulled={false} />
    </group>
  );
}
