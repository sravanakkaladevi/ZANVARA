'use client';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { bustGeo, velvetBump, leatherBump } from './assets';
import { S } from '@/lib/store';

/* Black velvet necklace bust */
export function Bust() {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#141414',
        roughness: 0.92,
        sheen: 1,
        sheenColor: new THREE.Color('#6d6d6d'),
        sheenRoughness: 0.45,
        bumpMap: velvetBump(),
        bumpScale: 1.4,
        transparent: true,
        envMapIntensity: 0.35,
      }),
    []
  );
  useFrame(() => {
    if (!ref.current) return;
    const o = THREE.MathUtils.clamp(S.bust, 0, 1);
    mat.opacity = o;
    mat.depthWrite = o > 0.98;
    ref.current.visible = o > 0.005;
    ref.current.position.y = -0.02 - (1 - o) * 1.2;
  });
  return <mesh ref={ref} geometry={bustGeo()} material={mat} scale={[1, 1, 0.27]} position={[0, 0, -0.04]} />;
}

/* Signature emerald leather case with a hinged lid */
export function JewelBox({ gold }) {
  const ref = useRef();
  const lid = useRef();
  const leather = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0a3020',
        roughness: 0.42,
        sheen: 0.25,
        sheenColor: new THREE.Color('#1d6b44'),
        clearcoat: 0.5,
        clearcoatRoughness: 0.35,
        bumpMap: leatherBump(),
        bumpScale: 0.8,
        envMapIntensity: 0.55,
      }),
    []
  );
  const velvet = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#070708',
        roughness: 1,
        sheen: 0.6,
        sheenColor: new THREE.Color('#262626'),
        bumpMap: velvetBump(),
        bumpScale: 0.6,
        envMapIntensity: 0.12,
      }),
    []
  );

  useFrame(() => {
    if (!ref.current) return;
    const b = S.box;
    ref.current.visible = b > 0.002;
    ref.current.scale.setScalar(Math.max(0.0001, b));
    ref.current.position.y = S.boxY;
    if (lid.current) lid.current.rotation.x = S.lid;
  });

  const W = 3.7;
  const D = 3.7;
  const ZC = 0.38;
  return (
    <group ref={ref}>
      {/* base */}
      <RoundedBox args={[W, 0.85, D]} radius={0.09} smoothness={4} material={leather} position={[0, -0.63, ZC]} />
      {/* velvet bed */}
      <mesh material={velvet} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.198, ZC]}>
        <planeGeometry args={[W - 0.28, D - 0.28]} />
      </mesh>
      {/* gold piping around the opening */}
      {[
        [0, ZC - D / 2 + 0.07, W - 0.1, 0.022],
        [0, ZC + D / 2 - 0.07, W - 0.1, 0.022],
      ].map(([x, z, w, d], i) => (
        <mesh key={`h${i}`} material={gold} position={[x, -0.19, z]}>
          <boxGeometry args={[w, 0.02, d]} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={`v${sx}`} material={gold} position={[sx * (W / 2 - 0.07), -0.19, ZC]}>
          <boxGeometry args={[0.022, 0.02, D - 0.1]} />
        </mesh>
      ))}
      {/* front clasp */}
      <mesh material={gold} position={[0, -0.36, ZC + D / 2 + 0.01]}>
        <boxGeometry args={[0.32, 0.24, 0.05]} />
      </mesh>
      <mesh material={gold} position={[0, -0.36, ZC + D / 2 + 0.04]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
      </mesh>

      {/* lid, hinged at the back edge */}
      <group ref={lid} position={[0, -0.2, ZC - D / 2]}>
        <RoundedBox args={[W, 0.36, D]} radius={0.09} smoothness={4} material={leather} position={[0, 0.18, D / 2]} />
        <mesh material={velvet} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.003, D / 2]}>
          <planeGeometry args={[W - 0.28, D - 0.28]} />
        </mesh>
        {/* gold crest on the inside of the lid */}
        <mesh material={gold} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.01, D / 2 - 0.4]}>
          <torusGeometry args={[0.26, 0.02, 12, 48]} />
        </mesh>
        <mesh material={gold} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.012, D / 2 - 0.4]}>
          <planeGeometry args={[0.18, 0.18]} />
        </mesh>
        {/* crest on the outside */}
        <mesh material={gold} position={[0, 0.365, D / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.02, 48]} />
        </mesh>
        <mesh material={leather} position={[0, 0.372, D / 2]}>
          <cylinderGeometry args={[0.29, 0.29, 0.02, 48]} />
        </mesh>
        <mesh material={gold} position={[0, 0.385, D / 2]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.2, 0.02, 0.2]} />
        </mesh>
        {/* lid clasp tongue */}
        <mesh material={gold} position={[0, 0.06, D + 0.01]}>
          <boxGeometry args={[0.32, 0.16, 0.05]} />
        </mesh>
      </group>
    </group>
  );
}
