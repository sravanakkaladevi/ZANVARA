'use client';
import * as THREE from 'three';
import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { bezelGeo, brilliantGeo, emeraldCutGeo, octShape, plateGeo, linkGeo, starTexture } from './assets';

const W = 0.42;
const H = 0.58;
const C = 0.09;
const GEM_Y = -0.6;

/* Halo diamond positions (pendant-local) */
function haloPoints(n = 22) {
  const s = octShape(W + 0.2, H + 0.2, C + 0.08);
  const pts = s.getSpacedPoints(n);
  pts.pop();
  return pts.map((p) => new THREE.Vector3(p.x, p.y + GEM_Y, 0.035));
}

/**
 * The emerald-halo pendant.  Origin = the bail, where it hangs from the chain.
 * mats: { gold, gem, diamond }
 */
export const Pendant = forwardRef(function Pendant({ mats, flares = false }, ref) {
  const halo = useMemo(() => haloPoints(22), []);
  const flareRefs = useRef([]);
  const flareSet = useMemo(() => [1, 5, 9, 13, 17, 20].map((i, k) => ({ p: halo[i], phase: k * 1.37, speed: 0.9 + k * 0.23 })), [halo]);
  const star = useMemo(() => (flares ? starTexture() : null), [flares]);

  useFrame(({ clock }) => {
    if (!flares) return;
    const t = clock.elapsedTime;
    flareRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const f = flareSet[i];
      const v = Math.pow(Math.max(0, Math.sin(t * f.speed + f.phase)), 14);
      sp.scale.setScalar(0.05 + v * 0.42);
      sp.material.opacity = v;
      sp.material.rotation = t * 0.3 + i;
    });
  });

  return (
    <group ref={ref}>
      {/* bail */}
      <mesh geometry={linkGeo()} material={mats.gold} position={[0, -0.02, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} scale={[1.6, 1.6, 1.6]} />
      <mesh material={mats.gold} position={[0, -0.13, 0]}>
        <cylinderGeometry args={[0.028, 0.04, 0.12, 16]} />
      </mesh>
      <mesh geometry={brilliantGeo()} material={mats.diamond} position={[0, -0.13, 0.04]} scale={0.035} />

      {/* backing plate + bezel */}
      <mesh geometry={plateGeo(W + 0.34, H + 0.34, C + 0.12)} material={mats.gold} position={[0, GEM_Y, -0.05]} />
      <mesh geometry={bezelGeo(W, H, C)} material={mats.gold} position={[0, GEM_Y, 0.01]} />

      {/* the stone */}
      <mesh geometry={emeraldCutGeo(W, H)} material={mats.gem} position={[0, GEM_Y, 0.04]} scale={[1, 1, 0.75]} />

      {/* halo of brilliants */}
      {halo.map((p, i) => (
        <mesh key={i} geometry={brilliantGeo()} material={mats.diamond} position={p} scale={0.044} />
      ))}

      {/* drop */}
      <mesh geometry={linkGeo()} material={mats.gold} position={[0, GEM_Y - H / 2 - 0.2, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} scale={1.2} />
      <mesh geometry={brilliantGeo()} material={mats.gem} position={[0, GEM_Y - H / 2 - 0.33, 0.01]} scale={0.1} />
      <mesh geometry={brilliantGeo()} material={mats.diamond} position={[0, GEM_Y - H / 2 - 0.47, 0.01]} scale={0.04} />

      {flares &&
        flareSet.map((f, i) => (
          <sprite key={i} ref={(el) => (flareRefs.current[i] = el)} position={[f.p.x, f.p.y, f.p.z + 0.06]}>
            <spriteMaterial map={star} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
          </sprite>
        ))}
    </group>
  );
});
