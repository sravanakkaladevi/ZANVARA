'use client';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { linkGeo } from './assets';
import { Pendant } from './Pendant';
import { S } from '@/lib/store';

const MAX = 320;
const SPACING = 0.068;
const SAMPLES = 900;

/* Necklace path.  θ=0 is the front.  d = drape (1 hanging, 0 lying flat). */
function curvePoint(th, d, out) {
  const front = Math.pow((1 + Math.cos(th)) / 2, 1.6);
  out.set(1.36 * Math.sin(th), d * 2.25 * (1 - front), 1.0 * Math.cos(th) + 0.08 * Math.pow((1 + Math.cos(th)) / 2, 10));
  return out;
}

const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _t = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _r = new THREE.Vector3();
const _m = new THREE.Matrix4();

function layout(mesh, d) {
  // arc-length table
  const pts = [];
  const len = [0];
  for (let i = 0; i <= SAMPLES; i++) {
    const th = (i / SAMPLES) * Math.PI * 2;
    pts.push(curvePoint(th, d, new THREE.Vector3()));
    if (i > 0) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  }
  const total = len[SAMPLES];
  let n = Math.min(MAX, Math.floor(total / SPACING));
  if (n % 2) n -= 1;
  const sp = total / n;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = i * sp + sp * 0.5;
    while (j < SAMPLES - 1 && len[j + 1] < target) j++;
    const f = (target - len[j]) / (len[j + 1] - len[j] || 1);
    _p.copy(pts[j]).lerp(pts[j + 1], f);
    _t.copy(pts[j + 1]).sub(pts[j]).normalize();
    // outward radial, orthogonalised against tangent
    _r.set(_p.x, 0, _p.z).normalize();
    _a.copy(_r).addScaledVector(_t, -_r.dot(_t)).normalize();
    _b.crossVectors(_t, _a).normalize();
    if (i % 2 === 0) _m.makeBasis(_t, _a, _b);
    else _m.makeBasis(_t, _b, _q.copy(_a).negate());
    _m.setPosition(_p);
    mesh.setMatrixAt(i, _m);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Hanging emerald necklace — instanced cable chain + pendant.
 * Reads drape / colours from the shared choreography state.
 */
export function Necklace({ mats, chainMat, state, flares = true }) {
  const group = useRef();
  const chain = useRef();
  const pendant = useRef();
  const last = useRef(-1);
  const st = state || S;

  useFrame(({ clock }) => {
    const d = THREE.MathUtils.clamp(st.drape, 0, 1.25);
    if (group.current) group.current.position.set(0, st.ny || 0, st.nz || 0);
    if (chain.current && Math.abs(d - last.current) > 0.0005) {
      layout(chain.current, d);
      last.current = d;
    }
    if (pendant.current) {
      // `upright` keeps the pendant hanging straight (used while it flies)
      const flat = st.upright ? 0 : THREE.MathUtils.clamp((1 - d) / 0.9, 0, 1);
      const sway = Math.min(1, d);
      const t = clock.elapsedTime;
      pendant.current.position.set(0, -0.015, 1.1);
      pendant.current.rotation.x = -0.14 - flat * (Math.PI / 2 - 0.14) + Math.sin(t * 0.9) * 0.025 * sway;
      pendant.current.rotation.z = Math.sin(t * 1.15) * 0.035 * sway;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={chain} args={[linkGeo(), chainMat || mats.gold, MAX]} frustumCulled={false} />
      <Pendant ref={pendant} mats={mats} flares={flares} />
    </group>
  );
}
