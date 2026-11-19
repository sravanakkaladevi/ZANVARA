'use client';
import * as THREE from 'three';
import { useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { rng } from './assets';

/* A jewellery "studio": soft boxes, strip lights and pin-point
   sparkle lights baked once into a PMREM environment map and shared
   by every view. */
let cache = null;
let studio = null;
function studioScene() {
  if (studio) return studio;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#262626');
  const geo = new THREE.PlaneGeometry(1, 1);
  const add = (color, intensity, pos, scale) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    m.scale.set(...scale);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  add('#ffffff', 2.6, [0, 6, 0.5], [9, 9, 1]); // top softbox
  add('#ffffff', 7, [-5, 1.2, 2], [1.1, 9, 1]); // left strip
  add('#ffffff', 7, [5, 1.2, 2], [1.1, 9, 1]); // right strip
  add('#fff3e2', 2.2, [0, -0.5, 7], [7, 1.6, 1]); // front fill
  add('#ffd79e', 4, [0, 1.5, -6], [11, 0.7, 1]); // warm rim
  add('#ffe6cc', 1.4, [-4, -3, -3], [4, 1, 1]); // cool kicker
  const r = rng(42);
  for (let i = 0; i < 46; i++) {
    const th = r() * Math.PI * 2;
    const ph = Math.acos(2 * r() - 1);
    const rad = 6.5;
    add('#ffffff', 14, [rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph), rad * Math.sin(ph) * Math.sin(th)], [0.22, 0.22, 1]);
  }
  studio = scene;
  return scene;
}

export function getStudioEnv(gl) {
  if (cache) return cache;
  const pmrem = new THREE.PMREMGenerator(gl);
  cache = pmrem.fromScene(studioScene(), 0.015).texture;
  pmrem.dispose();
  return cache;
}

/* The same studio as a sharp, un-blurred HDR cube map — gems ray-trace into
   it, so every facet picks up a crisp softbox, strip light or pin-point. */
let cube = null;
export function getStudioCube(gl) {
  if (cube) return cube;
  const rt = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cam = new THREE.CubeCamera(0.05, 50, rt);
  const autoClear = gl.autoClear;
  gl.autoClear = true;
  cam.update(gl, studioScene());
  gl.autoClear = autoClear;
  cube = rt.texture;
  return cube;
}

export function StudioEnv() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    scene.environment = getStudioEnv(gl);
  }, [gl, scene]);
  return null;
}

/* The key/fill rig of the main stage — reused by the collection cards so a
   piece is lit identically in its card and on the bust. */
export function StageLights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 6, 5]} intensity={1.8} color="#fff4e0" />
      <directionalLight position={[-5, 2, -3]} intensity={1.2} color="#f0d9c2" />
    </>
  );
}

/* Views draw into the same canvas, so every view clears depth before
   it renders — it can overlap the main stage without being clipped. */
export function ClearDepth({ priority, enabled = true }) {
  useFrame(({ gl }) => { if (enabled) gl.clearDepth(); }, priority);
  return null;
}

/* Clears the whole canvas once per frame, before any view renders. */
export function FrameClear() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
  }, 0.1);
  return null;
}
