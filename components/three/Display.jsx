'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { BUST_TRANSFORM, bustGeo, velvetBump, leatherBump } from './assets';
import { S } from '@/lib/store';
import { BUST_NECK, loadModel } from '@/lib/model';

/* The model photograph, placed in the bust's own space so her neck sits exactly
   where the bust's neck is. Drawn first (opaque pass, but alpha-blended so its
   edges feather into the page), then the bust writes depth only, hiding the
   back of every necklace behind her neck. */
const photoVert = /* glsl */ `
  varying vec2 vPos;
  void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const photoFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uMapping; // uc, vn, W, H
  uniform float uNeckY;
  uniform vec4 uBox;     // x0, y0, x1, y1 (local)
  uniform float uOpacity;
  varying vec2 vPos;
  float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 uv = vec2(uMapping.x + vPos.x / uMapping.z, uMapping.y + (uNeckY - vPos.y) / uMapping.w);
    vec2 c = (uBox.xy + uBox.zw) * 0.5, b = (uBox.zw - uBox.xy) * 0.5;
    float d = box(vPos - c, b, 0.6);
    float a = (1.0 - smoothstep(-0.55, 0.0, d)) * uOpacity;
    a *= step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    if (a < 0.002) discard;
    gl_FragColor = vec4(texture2D(uMap, vec2(uv.x, 1.0 - uv.y)).rgb, a);
    #include <colorspace_fragment>
  }
`;

function useModelPhoto() {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    let alive = true;
    loadModel().then((model) => {
      if (!alive || !model) return;
      const map = new THREE.Texture(model.image);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
      map.needsUpdate = true;
      setPhoto({ map, model });
    });
    return () => { alive = false; };
  }, []);
  useEffect(() => () => photo?.map.dispose(), [photo]);
  return photo;
}

function ModelPhoto({ map, model, opacityRef }) {
  const mat = useMemo(() => {
    const { neckL, neckR, bust } = model;
    const aspect = map.image.width / map.image.height;
    const W = (2 * BUST_NECK.halfWidth * bust.scale) / Math.abs(neckR[0] - neckL[0]);
    const H = W / aspect;
    return new THREE.ShaderMaterial({
      vertexShader: photoVert,
      fragmentShader: photoFrag,
      transparent: false, // stays in the opaque list → drawn before the necklace
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uMap: { value: map },
        uMapping: { value: new THREE.Vector4((neckL[0] + neckR[0]) / 2 - bust.dx / W, (neckL[1] + neckR[1]) / 2 + bust.dy / H, W, H) },
        uNeckY: { value: BUST_NECK.y },
        // lips → chest, shoulder to shoulder (bust units)
        uBox: { value: new THREE.Vector4(-4.3, -3.3, 4.3, 5.5) },
        uOpacity: { value: 1 },
      },
    });
  }, [map, model]);
  useEffect(() => () => mat.dispose(), [mat]);
  // geometry in the bust's local units, so the shader's vPos is a bust coordinate
  const geo = useMemo(() => new THREE.PlaneGeometry(8.8, 8.9).translate(0, 1.1, 0), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(() => { mat.uniforms.uOpacity.value = opacityRef.current; });
  return <mesh geometry={geo} material={mat} position={[0, 0, 0.22]} renderOrder={-10} frustumCulled={false} />;
}

/* Velvet necklace bust — or, once the model photo is in place, her silhouette as an occluder */
export function Bust() {
  const photo = useModelPhoto();
  const opacity = useRef(1);
  const occluder = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false }), []);
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
    opacity.current = o;
    mat.opacity = o;
    mat.depthWrite = o > 0.98;
    ref.current.visible = o > 0.005;
    // the photo cross-fades in place; the velvet bust sinks away as before
    ref.current.position.y = BUST_TRANSFORM.y - (photo ? 0 : (1 - o) * 1.2);
  });
  useEffect(() => () => occluder.dispose(), [occluder]);
  return (
    <>
      {photo && <ModelPhoto map={photo.map} model={photo.model} opacityRef={opacity} />}
      <mesh
        ref={ref}
        geometry={bustGeo()}
        material={photo ? occluder : mat}
        renderOrder={photo ? -5 : 0}
        scale={[1, 1, BUST_TRANSFORM.scaleZ]}
        position={[0, BUST_TRANSFORM.y, BUST_TRANSFORM.z]}
      />
    </>
  );
}

/* Signature emerald leather case with a hinged lid */
export function JewelBox({ gold }) {
  const ref = useRef();
  const lid = useRef();
  const leather = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#3a2417',
        roughness: 0.42,
        sheen: 0.25,
        sheenColor: new THREE.Color('#8a5a3c'),
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
      <RoundedBox args={[W, 0.35, D]} radius={0.09} smoothness={4} material={leather} position={[0, -0.88, ZC]} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <RoundedBox args={[0.16, 0.65, D]} radius={0.04} smoothness={3} material={leather} position={[side * (W / 2 - 0.08), -0.53, ZC]} />
          <RoundedBox args={[W - 0.2, 0.65, 0.16]} radius={0.04} smoothness={3} material={leather} position={[0, -0.53, ZC + side * (D / 2 - 0.08)]} />
        </group>
      ))}
      <RoundedBox args={[W - 0.28, 0.16, D - 0.28]} radius={0.04} smoothness={3} material={velvet} position={[0, -0.65, ZC]} />
      {/* velvet bed */}
      <mesh material={velvet} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.565, ZC]}>
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
