'use client';
import * as THREE from 'three';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  brilliantGeo, templeCabochonGeo, templeCordBeadGeo, templeDropGeo, templeGranuleGeo,
  templeJointGeo, templeMedallion, templePeacock, templeSilkMaterial, templeWireGeo,
} from './assets';
import { Pendant, TempleBatch, useTempleAccent } from './Pendant';
import { createTempleRig, layoutTempleRig, TEMPLE_SEGMENTS, writeTempleDrops, writeTempleInstances } from './templeRig';
import { S } from '@/lib/store';

const BATCHES = ['peacocks', 'medallions', 'primary', 'secondary', 'accents', 'granules', 'joints', 'cordBeads'];

/** Complete temple choker on the original stage/card fitting path. */
export function TempleNecklace({ mats, chainMat, state, flares = true }) {
  const group = useRef();
  const pendant = useRef();
  const rig = useMemo(createTempleRig, []);
  const refs = useMemo(() => Object.fromEntries([...BATCHES, 'beads', 'wires'].map(key => [key, { current: null }])), []);
  const accent = useTempleAccent(mats);
  const st = state || S;
  const metadata = useMemo(() => ({ templeNecklace: true, segments: TEMPLE_SEGMENTS, rig }), [rig]);

  const layout = d => {
    if (layoutTempleRig(rig, d)) for (const key of BATCHES) writeTempleInstances(refs[key].current, rig[key]);
  };
  useLayoutEffect(() => {
    layout(THREE.MathUtils.clamp(st.drape, 0, 1.25));
    for (const key of ['beads', 'wires']) refs[key].current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    writeTempleDrops(refs.beads.current, refs.wires.current, rig.drops, 0, st.drape);
  }, [rig, refs]);
  useEffect(() => () => rig.cordGeometry.dispose(), [rig]);

  useFrame(({ clock }) => {
    const d = THREE.MathUtils.clamp(st.drape, 0, 1.25);
    if (group.current) group.current.position.set(0, st.ny || 0, st.nz || 0);
    layout(d);
    writeTempleDrops(refs.beads.current, refs.wires.current, rig.drops, clock.elapsedTime, d);
    if (pendant.current) {
      const flat = st.upright ? 0 : THREE.MathUtils.clamp((1 - d) / 0.9, 0, 1);
      const sway = Math.min(1, d), t = clock.elapsedTime;
      pendant.current.position.set(0, -0.015, 1.1);
      pendant.current.rotation.x = -0.14 - flat * (Math.PI / 2 - 0.14) + Math.sin(t * 0.9) * 0.025 * sway;
      pendant.current.rotation.z = Math.sin(t * 1.15) * 0.035 * sway;
    }
  });

  return (
    <group ref={group} name="temple-necklace" userData={metadata} dispose={null}>
      <TempleBatch meshRef={refs.peacocks} name="temple-peacock-segments" geometry={templePeacock().geometry} material={mats.gold} count={rig.peacocks.length} />
      <TempleBatch meshRef={refs.medallions} name="temple-lakshmi-segments" geometry={templeMedallion().geometry} material={mats.gold} count={rig.medallions.length} />
      <TempleBatch meshRef={refs.primary} name="temple-main-kemp" geometry={templeCabochonGeo()} material={mats.gem} count={rig.primary.length} />
      <TempleBatch meshRef={refs.secondary} name="temple-secondary-kemp" geometry={templeCabochonGeo()} material={accent} count={rig.secondary.length} />
      <TempleBatch meshRef={refs.accents} name="temple-white-accents" geometry={brilliantGeo()} material={mats.diamond} count={rig.accents.length} />
      <TempleBatch meshRef={refs.granules} name="temple-beaded-borders" geometry={templeGranuleGeo()} material={mats.gold} count={rig.granules.length} />
      <TempleBatch meshRef={refs.joints} name="temple-link-rings" geometry={templeJointGeo()} material={chainMat || mats.gold} count={rig.joints.length} />
      <TempleBatch meshRef={refs.cordBeads} name="temple-dori-gold-sleeves" geometry={templeCordBeadGeo()} material={mats.gold} count={rig.cordBeads.length} />
      <mesh name="temple-twisted-silk-dori" geometry={rig.cordGeometry} material={templeSilkMaterial()} />
      <TempleBatch meshRef={refs.beads} name="temple-segment-ghungroo" geometry={templeDropGeo()} material={mats.gold} count={rig.drops.length} />
      <TempleBatch meshRef={refs.wires} name="temple-segment-drop-wires" geometry={templeWireGeo()} material={mats.gold} count={rig.drops.length} />
      <Pendant ref={pendant} mats={mats} flares={flares} accentMaterial={accent} />
    </group>
  );
}
