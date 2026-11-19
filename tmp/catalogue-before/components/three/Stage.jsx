'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { StudioEnv } from './env';
import { Necklace } from './Necklace';
import { Bust, JewelBox } from './Display';
import { makeDiamond, makeGem, makeGold } from './assets';
import { StageLights } from './env';
import { S, FLY, CARD, cardSway, pointer, slotRef, VARIANTS, variantStore } from '@/lib/store';

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
const LIFT_IN = 4.6;
const RISE_IN = 3.2;
const LIFT_OUT = 4.2;

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
  m.gold.color.set(v.metal);
  m.gem.color.set(v.gem);
  m.gem.emissive.set(v.emissive);
  if (m.chain) m.chain.color.set(v.metal);
}

/** The persistent hero stage: bust + necklace + case, choreographed by scroll. */
export function Stage() {
  const root = useRef();
  const sm = useRef({ x: 0, y: 0 });
  const wrap = useRef();
  const bust = useRef();
  const flyer = useRef();
  const mats = useMemo(() => ({ gold: makeGold(VARIANTS[0].metal), gem: makeGem(VARIANTS[0].gem, VARIANTS[0].emissive), diamond: makeDiamond() }), []);
  // the incoming piece has its own materials — whole necklace, solid from the first frame
  const flyMats = useMemo(
    () => ({ gold: makeGold(VARIANTS[1].metal), gem: makeGem(VARIANTS[1].gem, VARIANTS[1].emissive), diamond: makeDiamond() }),
    []
  );
  // hangs exactly as in its card and exactly as on the bust → no re-drape, no pop
  const flyState = useMemo(() => ({ drape: 1, ny: 0, nz: 0, upright: false }), []);

  // new selection → dress the flyer in the new stone & metal
  useEffect(() => variantStore.subscribe(() => paint(flyMats, VARIANTS[variantStore.index])), [flyMats]);

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

    /* ---------- bust: static inside the collection section ---------- */
    const b = bust.current;
    if (b) {
      if (S.bshift > 0) {
        // section still entering: the bust stands at its collection pose,
        // pushed down by however far the section is from the top of the screen
        const P = S.bpose;
        const vh = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
        b.position.set(P.x * kx, P.y - (S.bshift / window.innerHeight) * vh, P.z);
        b.rotation.set(
          P.rx + sm.current.y * 0.07,
          P.ry + sm.current.x * 0.25 + Math.sin(t * 0.35) * 0.05,
          P.rz
        );
        b.scale.setScalar(P.s * ks);
      } else {
        // necklace has landed → bust and necklace move as one from here on
        b.position.copy(g.position);
        b.rotation.copy(g.rotation);
        b.scale.copy(g.scale);
      }
    }

    /* ---------- collection swap ---------- */
    if (FLY.done) {
      // the flyer has landed exactly on the bust → hand over to the resident necklace
      paint(mats, VARIANTS[variantStore.index]);
      FLY.done = false;
      FLY.active = false;
      FLY.k = 0;
      FLY.out = 0;
    }
    // outgoing necklace: lifted straight up off the neck first, then away to the left
    // (moving it sideways while it is still around the neck would cut through the bust)
    const o = FLY.active ? FLY.out : 0;
    if (wrap.current) {
      const lift = inOut(clamp01(o / 0.55));
      const side = Math.pow(clamp01((o - 0.3) / 0.7), 2);
      wrap.current.position.set(-side * 9, lift * LIFT_OUT, 0);
      wrap.current.rotation.set(0, -side * 0.9, side * 0.22);
    }

    const f = flyer.current;
    if (!f) return;
    if (!FLY.active || !FLY.rect) {
      f.visible = false;
      return;
    }
    f.visible = true;
    const u = FLY.k; // eased 0..1
    const r = FLY.rect;
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
    const vw = vh * aspect;
    const W = window.innerWidth;
    const H = window.innerHeight;

    /* start pose: the necklace exactly as it hangs inside its card */
    const s0 = (CARD.scale * vh * r.height) / (H * CARD_VH);
    const cx = ((r.left + r.width / 2) / W - 0.5) * vw;
    const cy = -((r.top + r.height / 2) / H - 0.5) * vh;
    const base = Math.round(ry / TAU) * TAU; // same turn as the bust → no full-circle spin
    _q0.setFromEuler(_e.set(CARD.rx, base + cardSway(t, FLY.phase), 0));
    // the card saw it head-on; turn it to face the camera along its line of sight
    _qc.setFromEuler(_ec.set(Math.atan2(cy, CAM_Z), -Math.atan2(cx, CAM_Z), 0));
    _q0.premultiply(_qc);
    _p0.set(0, -CARD.cy * s0, 0).applyQuaternion(_q0).add(_v.set(cx, cy, 0));

    /* end pose: resting on the bust (= the resident necklace's transform) */
    _T.set(x, y, z);
    _qT.setFromEuler(_e.set(rx, ry, rz));
    _up.set(0, 1, 0).applyQuaternion(_qT).multiplyScalar(s);

    /* path: rise out of the card, arc over to above the head, lower straight down onto the neck */
    _c1.copy(_p0).addScaledVector(_up, RISE_IN);
    _c2.copy(_T).addScaledVector(_up, LIFT_IN);
    bezier(f.position, _p0, _c1, _c2, _T, u);
    const a = sstep(u, 0, 0.7); // fully posed & sized before it reaches the neck
    f.quaternion.slerpQuaternions(_q0, _qT, a);
    f.scale.setScalar(lerp(s0, s, a));
  });

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
          <Necklace mats={mats} />
        </group>
        <JewelBox gold={mats.gold} />
      </group>
      <group ref={flyer} visible={false}>
        <Necklace mats={flyMats} state={flyState} flares={false} />
      </group>
    </>
  );
}
