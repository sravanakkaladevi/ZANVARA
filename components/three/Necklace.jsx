'use client';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { S, VARIANTS } from '@/lib/store';
import { checkNecklace, createNecklaceRig } from './necklaceRig';

/** One instanced assembly, shared by the bust, flyer and collection cards. */
export function Necklace({ mats, chainMat, state, flares = true, piece = VARIANTS[0], detail = 'full' }) {
  const rig = useMemo(() => createNecklaceRig(mats, chainMat, flares), [mats, chainMat, flares]);
  const st = state || S;
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame(({ clock }) => {
    // Resident geometry and material switch in Stage's callback before this one.
    const changed = rig.setPiece(piece, st.detail || detail);
    const d = THREE.MathUtils.clamp(st.drape ?? 1, 0, 1);
    rig.group.position.set(0, st.ny || 0, st.nz || 0);
    rig.layout(d, !!st.upright);
    let visible = true;
    for (let p = rig.group; p; p = p.parent) if (!p.visible) { visible = false; break; }
    if (visible) rig.sway(clock.elapsedTime, d);
    if (changed && process.env.NODE_ENV !== 'production') checkNecklace(rig, piece);
  });
  return <primitive object={rig.group} dispose={null} />;
}
