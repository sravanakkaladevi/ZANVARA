'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { StudioEnv } from './env';
import { Necklace } from './Necklace';
import { Bust, JewelBox } from './Display';
import { makeJewelleryMaterials, paintJewellery } from './assets';
import { StageLights } from './env';
import { S, FLY, CARD, cardFrame, stageFrame, flightLift, cardSway, pointer, slotRef, VARIANTS, variantStore } from '@/lib/store';

const FOV = 32;
const CAM_Z = 10;
const TAU = Math.PI * 2;
const BOX_CENTER = new THREE.Vector3(0, -0.45, 0.38);
const _v = new THREE.Vector3();
const _e = new THREE.Euler();
const _ec = new THREE.Euler(0, 0, 0, 'YXZ');
const _q0 = new THREE.Quaternion();
const _qc = new THREE.Quaternion();
const _qT = new THREE.Quaternion();
const _p0 = new THREE.Vector3();
const _c1 = new THREE.Vector3();
const _c2 = new THREE.Vector3();
const _T = new THREE.Vector3();
const _up = new THREE.Vector3();
const _above = new THREE.Vector3();
const _cardMatrix = new THREE.Matrix4();
const _screenMatrix = new THREE.Matrix4();
const _startMatrix = new THREE.Matrix4();
const _regularMatrix = new THREE.Matrix4();
const _correction = new THREE.Matrix4();
const _residual = new THREE.Matrix4();
const _scale = new THREE.Vector3();
const _cardQuaternion = new THREE.Quaternion();
const lerp = THREE.MathUtils.lerp;
const damp = THREE.MathUtils.damp;
const sstep = THREE.MathUtils.smoothstep;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const inOut = (v) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);
// visible height of a card's mini view at the necklace (world units)
const CARD_VH = 2 * Math.tan(THREE.MathUtils.degToRad(CARD.fov / 2)) * CARD.z;
// necklace-space heights (bust neck tops out at y≈3.64): the incoming piece
// comes in above the head and is lowered straight down over the neck; the
// outgoing one is lifted clear of the head before it slides away.
const RISE_IN = 3.2;

/** cubic bezier, written into `out` */
function bezier(out, a, b, c, d, u) {
  const m = 1 - u;
  const w0 = m * m * m;
  const w1 = 3 * m * m * u;
  const w2 = 3 * m * u * u;
  const w3 = u * u * u;
  return out.set(
    a.x * w0 + b.x * w1 + c.x * w2 + d.x * w3,
    a.y * w0 + b.y * w1 + c.y * w2 + d.y * w3,
    a.z * w0 + b.z * w1 + c.z * w2 + d.z * w3
  );
}

function paint(m, v) {
  paintJewellery(m, v);
}

/** The persistent hero stage: bust + necklace + case, choreographed by scroll. */
export function Stage() {
  const root = useRef();
  const sm = useRef({ x: 0, y: 0 });
  const wrap = useRef();
  const bust = useRef();
  const flyer = useRef();
  const get = useThree((state) => state.get);
  const residentPiece = useMemo(() => ({ ...VARIANTS[variantStore.index] }), []);
  const incomingPiece = useMemo(() => ({ ...VARIANTS[variantStore.index] }), []);
  const mats = useMemo(() => makeJewelleryMaterials(VARIANTS[variantStore.index]), []);
  // the incoming piece has its own materials — whole necklace, solid from the first frame
  const flyMats = useMemo(() => makeJewelleryMaterials(VARIANTS[variantStore.index]), []);
  // hangs exactly as in its card and exactly as on the bust → no re-drape, no pop
  const flyState = useMemo(() => ({ drape: 1, ny: 0, nz: 0, upright: false }), []);

  // new selection → dress the flyer in the new stone & metal
  useEffect(() => variantStore.subscribe(() => {
    const piece = VARIANTS[variantStore.index];
    Object.assign(incomingPiece, piece);
    paint(flyMats, piece);
    if (!FLY.active) {
      Object.assign(residentPiece, piece);
      paint(mats, piece);
    }
  }), [flyMats, incomingPiece, mats, residentPiece]);
  useEffect(() => () => {
    Object.values(mats).forEach((m) => m.dispose());
    Object.values(flyMats).forEach((m) => m.dispose());
  }, [mats, flyMats]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    let live = true, cleanup;
    import('./jewelleryDiagnostics').then(({ installJewelleryDiagnostics }) => {
      if (live) cleanup = installJewelleryDiagnostics({ get, root, bust, wrap, flyer, residentPiece, incomingPiece });
    });
    return () => { live = false; cleanup?.(); };
  }, [get, residentPiece, incomingPiece]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const cam = state.camera;
    const aspect = cam.aspect || 1.6;
    sm.current.x = damp(sm.current.x, pointer.x, 2.5, dt);
    sm.current.y = damp(sm.current.y, pointer.y, 2.5, dt);

    // responsive: pull everything toward the centre on narrow screens
    const kx = THREE.MathUtils.clamp(aspect / 1.78, 0.18, 1);
    const ks = THREE.MathUtils.clamp(aspect / 1.45, 0.52, 1);

    let x = S.x * kx;
    let y = S.y + S.iy;
    let z = S.z;
    let s = S.s * ks;
    const framing = stageFrame(residentPiece.length);
    s *= lerp(1, framing.heroScale, S.heroFit || 0);
    y -= s * (framing.centerY * (S.heroFit || 0) + framing.pendantY * (S.detailFit || 0));
    // calm the pointer parallax while zoomed in, so the callouts stay on target
    const calm = 1 - THREE.MathUtils.smoothstep(S.s, 1.6, 2.0) * 0.9;
    let rx = S.rx + sm.current.y * 0.07 * calm;
    let ry = S.ry + S.ispin + (sm.current.x * 0.25 + Math.sin(t * 0.35) * 0.05) * calm;
    let rz = S.rz;

    // final section: fly the closed case into the inline slot of the headline
    if (S.slot > 0.0001 && slotRef.el) {
      const r = slotRef.el.getBoundingClientRect();
      const vh = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
      const vw = vh * aspect;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = ((r.left + r.width / 2) / W - 0.5) * vw;
      const cy = -((r.top + r.height / 2) / H - 0.5) * vh;
      const fit = Math.min(((r.height / H) * vh) / 2.15, ((r.width / W) * vw) / 3.9);
      const frx = 0.5;
      const fry = Math.PI * 2 - 0.42 + Math.sin(t * 0.8) * 0.12;
      _e.set(frx, fry, 0);
      _v.copy(BOX_CENTER).applyEuler(_e).multiplyScalar(fit);
      const k = THREE.MathUtils.smoothstep(S.slot, 0, 1);
      x = lerp(x, cx - _v.x, k);
      y = lerp(y, cy - _v.y, k);
      z = lerp(z, -_v.z, k);
      s = lerp(s, fit, k);
      rx = lerp(rx, frx, k);
      ry = lerp(ry, fry, k);
      rz = lerp(rz, 0, k);
    }

    g.position.set(x, y, z);
    g.rotation.set(rx, ry, rz);
    g.scale.setScalar(s);

    /* ---------- bust: moves as one with the necklace ---------- */
    const b = bust.current;
    if (b) {
      b.position.copy(g.position);
      b.rotation.copy(g.rotation);
      b.scale.copy(g.scale);
    }

    /* ---------- collection swap ---------- */
    if (FLY.done) {
      // the flyer has landed exactly on the bust → hand over to the resident necklace
      paint(mats, VARIANTS[variantStore.index]);
      Object.assign(residentPiece, VARIANTS[variantStore.index]);
      FLY.done = false;
      FLY.active = false;
      FLY.k = 0;
      FLY.out = 0;
      window.dispatchEvent(new Event('verdelle:landed'));
    }
    // outgoing necklace: lifted straight up off the neck first, then away to the left
    // (moving it sideways while it is still around the neck would cut through the bust)
    const o = FLY.active ? FLY.out : 0;
    if (wrap.current) {
      wrap.current.visible = !(S.box > 0.99 && S.lid > -0.05);
      const lift = inOut(clamp01(o / 0.62));
      const side = Math.pow(clamp01((o - 0.64) / 0.36), 2);
      wrap.current.position.set(-side * 9, lift * flightLift(residentPiece.length), 0);
      wrap.current.rotation.set(0, -side * 0.9, side * 0.22);
    }

    const f = flyer.current;
    if (!f) return;
    if (!FLY.active || !FLY.rect) {
      f.visible = false;
      return;
    }
    f.visible = true;
    FLY.renderTime = t;
    const u = FLY.k; // eased 0..1
    // Switch topology while the piece is above the viewport, before descent.
    flyState.detail = u < 0.6 ? 'card' : 'full';
    const r = FLY.rect;
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
    const vw = vh * aspect;
    const W = window.innerWidth;
    const H = window.innerHeight;

    /* start pose: the necklace exactly as it hangs inside its card */
    const frame = cardFrame(incomingPiece.length);
    const s0 = (frame.scale * vh * r.height) / (H * CARD_VH);
    const cx = ((r.left + r.width / 2) / W - 0.5) * vw;
    const cy = -((r.top + r.height / 2) / H - 0.5) * vh;
    const base = Math.round(ry / TAU) * TAU; // same turn as the bust → no full-circle spin
    _q0.setFromEuler(_e.set(frame.rx, base + cardSway(t, FLY.phase), 0));
    // the card saw it head-on; turn it to face the camera along its line of sight
    _qc.setFromEuler(_ec.set(Math.atan2(cy, CAM_Z), -Math.atan2(cx, CAM_Z), 0));
    _q0.premultiply(_qc);
    _p0.set(0, -frame.cy * s0, 0).applyQuaternion(_q0).add(_v.set(cx, cy, 0));

    /* end pose: resting on the bust (= the resident necklace's transform) */
    _T.set(x, y, z);
    _qT.setFromEuler(_e.set(rx, ry, rz));
    _up.set(0, 1, 0).applyQuaternion(_qT).multiplyScalar(s);

    /* path: rise out of the card, arc over to above the head, lower straight down onto the neck */
    _c1.copy(_p0).addScaledVector(_up, RISE_IN);
    _above.copy(_T).addScaledVector(_up, flightLift(incomingPiece.length));
    _c2.copy(_above).addScaledVector(_up, 0.8);
    if (u < 0.64) bezier(f.position, _p0, _c1, _c2, _above, inOut(u / 0.64));
    else f.position.copy(_above).lerp(_T, inOut((u - 0.64) / 0.36));
    const a = sstep(u, 0, 0.6);
    f.quaternion.slerpQuaternions(_q0, _qT, a);
    f.scale.setScalar(lerp(s0, s, a));
    // Map the card's perspective into the stage's off-axis viewport exactly.
    // A depth shear removes the otherwise visible jump at take-off; it relaxes
    // to a rigid transform before the piece is lowered onto the bust.
    const pixelScale = vh * r.height / (H * CARD_VH);
    _cardQuaternion.setFromEuler(_e.set(frame.rx, base + cardSway(t, FLY.phase), 0));
    _cardMatrix.compose(_v.set(0, 0, 0), _cardQuaternion, _scale.setScalar(frame.scale));
    _cardMatrix.multiply(_screenMatrix.makeTranslation(0, -frame.cy, 0));
    _screenMatrix.set(pixelScale, 0, -cx / CAM_Z, cx, 0, pixelScale, -cy / CAM_Z, cy, 0, 0, 1, 0, 0, 0, 0, 1);
    _startMatrix.multiplyMatrices(_screenMatrix, _cardMatrix);
    _regularMatrix.compose(_p0, _q0, _scale.setScalar(s0));
    _correction.copy(_regularMatrix).invert().multiply(_startMatrix);
    _residual.identity();
    for (let i = 0; i < 16; i++) _residual.elements[i] = lerp(_residual.elements[i], _correction.elements[i], 1 - a);
    f.matrix.compose(f.position, f.quaternion, f.scale).multiply(_residual);
    f.matrixWorldNeedsUpdate = true;
  }, -1);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, CAM_Z]} fov={FOV} near={0.1} far={60} />
      <StudioEnv />
      <StageLights />
      <group ref={bust}>
        <Bust />
      </group>
      <group ref={root}>
        <group ref={wrap}>
          <Necklace mats={mats} piece={residentPiece} />
        </group>
        <JewelBox gold={mats.gold} />
      </group>
      <group ref={flyer} visible={false} matrixAutoUpdate={false}>
        <Necklace mats={flyMats} piece={incomingPiece} state={flyState} flares={false} />
      </group>
    </>
  );
}
