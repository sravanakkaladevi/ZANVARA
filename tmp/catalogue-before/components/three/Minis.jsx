'use client';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, View } from '@react-three/drei';
import { ClearDepth, StageLights, StudioEnv } from './env';
import { Pendant } from './Pendant';
import { Necklace } from './Necklace';
import { CARD, cardSway } from '@/lib/store';
import { brilliantGeo, crystalGeo, emeraldCutGeo, linkGeo, makeDiamond, makeGem, makeGold } from './assets';

let viewIndex = 2;

/** A small 3D window that lives inside any DOM element (all share one WebGL canvas). */
export function MiniView({ className, style, children, z = 4, fov = 30, visible = true, stageLights = false }) {
  const index = useMemo(() => viewIndex++, []);
  return (
    <View className={className} style={style} index={index} visible={visible}>
      <PerspectiveCamera makeDefault position={[0, 0, z]} fov={fov} />
      <StudioEnv />
      <ClearDepth priority={index - 0.5} />
      {stageLights ? (
        <StageLights />
      ) : (
        <>
          <ambientLight intensity={0.4} />
          <directionalLight position={[2, 4, 5]} intensity={1.5} />
        </>
      )}
      {children}
    </View>
  );
}

function Spin({ children, speed = 0.5, tilt = 0.25, bob = 0.06, swing = 0 }) {
  const ref = useRef();
  const hover = useRef(0);
  const phase = useMemo(() => Math.random() * 6, []);
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    if (swing) ref.current.rotation.y = Math.sin(t * speed + phase) * swing;
    else ref.current.rotation.y += dt * speed;
    ref.current.rotation.x = tilt + Math.sin(t * 0.7) * 0.08;
    ref.current.position.y = Math.sin(t * 1.1) * bob + hover.current;
  });
  return <group ref={ref}>{children}</group>;
}

function useMats(metal = '#f2c877', gem = '#0c8f50', emissive = '#03371c') {
  return useMemo(() => ({ gold: makeGold(metal), gem: makeGem(gem, emissive), diamond: makeDiamond() }), [metal, gem, emissive]);
}

export function EmeraldGem({ color = '#0c8f50', emissive = '#03371c', scale = 2.6 }) {
  const m = useMats('#f2c877', color, emissive);
  return (
    <Spin speed={0.6} tilt={0.35}>
      <mesh geometry={emeraldCutGeo(0.42, 0.58)} material={m.gem} scale={scale} rotation={[0, 0, 0.0]} />
    </Spin>
  );
}

export function Diamond({ scale = 0.95 }) {
  const m = useMats();
  return (
    <Spin speed={0.45} tilt={0.9}>
      <mesh geometry={brilliantGeo()} material={m.diamond} scale={scale} />
    </Spin>
  );
}

export function RawCrystal() {
  const m = useMats('#f2c877', '#1f9a5c', '#03371c');
  const mat = useMemo(() => {
    const x = m.gem.clone();
    x.roughness = 0.28;
    x.metalness = 0.2;
    return x;
  }, [m]);
  const rock = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.95, flatShading: true }), []);
  return (
    <Spin speed={0.3} tilt={0.15}>
      <group position={[0, -0.1, 0]}>
        <mesh geometry={crystalGeo(3)} material={mat} position={[0, 0.1, 0]} />
        <mesh geometry={crystalGeo(5)} material={mat} position={[0.55, -0.15, 0.1]} rotation={[0, 0.5, -0.45]} scale={0.6} />
        <mesh geometry={crystalGeo(9)} material={mat} position={[-0.5, -0.25, -0.1]} rotation={[0.2, 0.2, 0.5]} scale={0.5} />
        <mesh material={rock} position={[0, -0.75, 0]} scale={[1.2, 0.35, 0.9]}>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      </group>
    </Spin>
  );
}

export function ChainCoil() {
  const m = useMats();
  const ref = useRef();
  const links = useMemo(() => {
    const out = [];
    const n = 70;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const a = t * Math.PI * 4;
      const r = 0.25 + t * 0.6;
      out.push({ p: [Math.cos(a) * r, (t - 0.5) * 0.9, Math.sin(a) * r], a, odd: i % 2 });
    }
    return out;
  }, []);
  return (
    <Spin speed={0.4} tilt={0.5}>
      <group ref={ref} scale={1.25}>
        {links.map((l, i) => (
          <mesh key={i} geometry={linkGeo()} material={m.gold} position={l.p} rotation={[l.odd ? Math.PI / 2 : 0, -l.a + Math.PI / 2, 0.25]} scale={1.6} />
        ))}
      </group>
    </Spin>
  );
}

export function PendantPiece({ metal, gem, emissive, scale = 1.9, speed = 0.5, flares = true }) {
  const m = useMats(metal, gem, emissive);
  return (
    <Spin speed={speed * 1.6} tilt={0.05} bob={0.04} swing={0.75}>
      <group scale={scale} position={[0, 0.62 * scale, 0]}>
        <Pendant mats={m} flares={flares} />
      </group>
    </Spin>
  );
}

/**
 * The whole necklace — chain and pendant — hanging as it is shown in a collection card.
 * The pose is deterministic (shared clock + phase) so the stage can lift it out mid-sway.
 */
export function NecklacePiece({ metal, gem, emissive, phase = 0 }) {
  const m = useMats(metal, gem, emissive);
  const ref = useRef();
  const st = useMemo(() => ({ drape: 1, ny: 0, nz: 0, upright: false }), []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.set(CARD.rx, cardSway(clock.elapsedTime, phase), 0);
  });
  return (
    <group ref={ref} scale={CARD.scale}>
      <group position={[0, -CARD.cy, 0]}>
        <Necklace mats={m} state={st} flares={false} />
      </group>
    </group>
  );
}
