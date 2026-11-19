'use client';
import * as THREE from 'three';
import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  brilliantGeo, makeGem, starTexture, templeCabochonGeo, templeDropGeo,
  templeGranuleGeo, templePendant, templeWireGeo,
} from './assets';
import { writeTempleDrops, writeTempleInstances } from './templeRig';

/* Own the secondary kemp material without taking ownership of the caller's
   gold/gem/diamond materials. Imperative Stage.paint changes are followed too. */
export function useTempleAccent(mats, supplied) {
  const accent = useMemo(() => supplied || makeGem('#9e0f22', '#250309'), [mats.gem, supplied]);
  const last = useRef({ hex: -1, accent: null });
  const sync = () => {
    const hex = mats.gem.color.getHex();
    if (hex === last.current.hex && accent === last.current.accent) return;
    last.current = { hex, accent };
    const { r, g, b } = mats.gem.color;
    const green = g > r * 1.15 && g > b;
    accent.color.set(green ? '#9e0f22' : '#0b6b3a');
    accent.emissive.set(green ? '#250309' : '#021b0c');
    accent.attenuationColor.copy(accent.color);
    mats.gem.attenuationColor?.copy(mats.gem.color);
  };
  useLayoutEffect(sync, [mats.gem, accent]);
  useFrame(sync);
  useEffect(() => () => { if (!supplied) accent.dispose(); }, [accent, supplied]);
  return accent;
}

export function TempleBatch({ meshRef, geometry, material, count, name }) {
  return <instancedMesh ref={meshRef} name={name} args={[geometry, material, count]} frustumCulled={false} />;
}

/** Lakshmi relief, carved peacock shoulders, arched pillars and lotus drop.
 *  Origin remains the bail. Total height including fringe is 1.42 units. */
export const Pendant = forwardRef(function Pendant({ mats, flares = false, accentMaterial }, ref) {
  const design = useMemo(templePendant, []);
  const accent = useTempleAccent(mats, accentMaterial);
  const refs = useMemo(() => Object.fromEntries(['primary', 'secondary', 'accents', 'granules', 'beads', 'wires'].map(key => [key, { current: null }])), []);
  const flareRefs = useRef([]);
  const sparkles = useMemo(() => [design.primary[0], design.primary[3], design.accents[1]], [design]);
  const star = useMemo(() => flares ? starTexture() : null, [flares]);
  const sparkleMaterials = useMemo(() => flares ? sparkles.map(() => new THREE.SpriteMaterial({
    map: star, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false,
  })) : [], [flares, star, sparkles]);
  useEffect(() => () => sparkleMaterials.forEach(material => material.dispose()), [sparkleMaterials]);

  useLayoutEffect(() => {
    for (const key of ['primary', 'secondary', 'accents', 'granules']) writeTempleInstances(refs[key].current, design[key]);
    for (const key of ['beads', 'wires']) refs[key].current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    writeTempleDrops(refs.beads.current, refs.wires.current, design.drops, 0);
  }, [design, refs]);

  useFrame(({ clock }) => {
    const flat = ref && typeof ref === 'object' && ref.current ? Math.abs(Math.cos(ref.current.rotation.x)) : 1;
    const t = clock.elapsedTime;
    writeTempleDrops(refs.beads.current, refs.wires.current, design.drops, t, flat);
    if (!flares) return;
    flareRefs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const v = Math.pow(Math.max(0, Math.sin(t * (0.7 + i * 0.17) + i * 2.1)), 22);
      sprite.scale.setScalar(0.025 + v * 0.15);
      sprite.material.opacity = v * 0.65;
      sprite.material.rotation = t * 0.17 + i;
    });
  });

  return (
    <group ref={ref} name="temple-pendant" dispose={null}>
      <mesh name="temple-pendant-relief" geometry={design.geometry} material={mats.gold} />
      <TempleBatch meshRef={refs.primary} name="temple-pendant-kemp" geometry={templeCabochonGeo()} material={mats.gem} count={design.primary.length} />
      <TempleBatch meshRef={refs.secondary} name="temple-pendant-secondary-kemp" geometry={templeCabochonGeo()} material={accent} count={design.secondary.length} />
      <TempleBatch meshRef={refs.accents} name="temple-pendant-white-accents" geometry={brilliantGeo()} material={mats.diamond} count={design.accents.length} />
      <TempleBatch meshRef={refs.granules} name="temple-pendant-granulation" geometry={templeGranuleGeo()} material={mats.gold} count={design.granules.length} />
      <TempleBatch meshRef={refs.beads} name="temple-pendant-ghungroo" geometry={templeDropGeo()} material={mats.gold} count={design.drops.length} />
      <TempleBatch meshRef={refs.wires} name="temple-pendant-drop-wires" geometry={templeWireGeo()} material={mats.gold} count={design.drops.length} />
      {flares && sparkles.map((stone, i) => (
        <sprite key={i} name="temple-stone-sparkle" material={sparkleMaterials[i]} ref={sprite => { flareRefs.current[i] = sprite; }} position={[stone.position[0], stone.position[1], stone.position[2] + 0.04]} />
      ))}
    </group>
  );
});
