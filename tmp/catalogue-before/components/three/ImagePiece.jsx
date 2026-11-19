'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { pointer } from '@/lib/store';

/* ------------------------------------------------------------------
   ImagePiece — turns a flat, transparent product PNG into a 2.5D object.

   1. A depth map is built on the CPU from the image itself:
      blurred alpha  → a soft "pillow" volume (thick in the middle, thin at the rim)
      luminance      → fine relief, so facets / links stand out.
   2. A dense plane is displaced by that depth in the vertex shader.
   3. Normals are rebuilt from the depth in the fragment shader, so a moving
      light re-shades the photo as it tilts, plus a sweeping specular glint.
   4. A blurred silhouette behind it acts as a parallax drop shadow.
   While the PNG is loading (or if it is missing) `fallback` is rendered.
------------------------------------------------------------------- */

const DEPTH_RES = 256;

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc * k;
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * k;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

function blur(src, w, h, r, passes = 3) {
  let a = src;
  for (let i = 0; i < passes; i++) a = boxBlur(a, w, h, r);
  return a;
}

/** Build depth (R) + soft shadow (G) maps from the image. */
function buildMaps(image, detail) {
  const aspect = image.width / image.height;
  const w = aspect >= 1 ? DEPTH_RES : Math.round(DEPTH_RES * aspect);
  const h = aspect >= 1 ? Math.round(DEPTH_RES / aspect) : DEPTH_RES;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const alpha = new Float32Array(n);
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    alpha[i] = px[i * 4 + 3] / 255;
    lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
  }

  // big blur of the mask ≈ distance from the edge → rounded volume
  const vol = blur(alpha, w, h, Math.max(2, Math.round(Math.min(w, h) * 0.06)));
  const fine = blur(lum, w, h, 1, 2);
  const shadow = blur(alpha, w, h, Math.max(2, Math.round(Math.min(w, h) * 0.03)));

  let max = 0;
  const depth = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.pow(vol[i], 0.75) * alpha[i];
    depth[i] = v + (fine[i] - 0.5) * detail * alpha[i];
    if (depth[i] > max) max = depth[i];
  }

  // canvas rows run top→bottom, texture rows bottom→top: write rows flipped
  const data = new Uint8Array(n * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = ((h - 1 - y) * w + x) * 4;
      data[o] = Math.max(0, Math.min(255, (depth[i] / (max || 1)) * 255));
      data[o + 1] = shadow[i] * 255;
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const vert = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uAmount;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float d = texture2D(uDepth, uv).r;
    vec3 p = position + vec3(0.0, 0.0, d * uAmount);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uDepth;
  uniform vec2 uTexel;
  uniform float uAmount;
  uniform vec3 uLight;
  uniform float uTime;
  uniform float uSheen;
  uniform float uShade;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.03) discard;

    // normal from the depth map
    float dl = texture2D(uDepth, vUv - vec2(uTexel.x, 0.0)).r;
    float dr = texture2D(uDepth, vUv + vec2(uTexel.x, 0.0)).r;
    float db = texture2D(uDepth, vUv - vec2(0.0, uTexel.y)).r;
    float dt = texture2D(uDepth, vUv + vec2(0.0, uTexel.y)).r;
    vec3 n = normalize(vec3((dl - dr) * uAmount * 40.0, (db - dt) * uAmount * 40.0, 1.0));

    vec3 L = normalize(uLight);
    float diff = dot(n, L);
    vec3 col = tex.rgb * (1.0 + (diff - 0.75) * uShade);

    // specular glint that follows the light, strongest on already-bright pixels
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, H), 0.0), 60.0);
    float bright = smoothstep(0.35, 1.0, dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722)));

    // slow diagonal sweep of light across the piece
    float band = dot(vUv - 0.5, normalize(vec2(1.0, 0.6)));
    float sweep = exp(-pow((band - (fract(uTime * 0.08) * 2.4 - 1.2)) * 9.0, 2.0));

    col += (spec * 0.6 + sweep * 0.45) * bright * uSheen;
    gl_FragColor = vec4(col, tex.a);
    #include <colorspace_fragment>
  }
`;

const shadowFrag = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float s = texture2D(uDepth, vUv).g;
    gl_FragColor = vec4(0.0, 0.02, 0.01, s * uOpacity);
  }
`;
const shadowVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/**
 * @param src      path to a transparent PNG (e.g. /atelier/01-earth.png)
 * @param height   world-space height of the piece
 * @param depth    how far the image bulges toward the camera
 * @param detail   how much the luminance relief adds to the depth (0..0.5)
 * @param sheen    strength of the moving glint
 * @param tilt     how strongly it reacts to the pointer
 * @param fallback rendered until the image has loaded (or if it 404s)
 */
export function ImagePiece({ src, height = 1.9, depth = 0.35, detail = 0.18, sheen = 1, shade = 0.6, tilt = 1, fallback = null }) {
  const [state, setState] = useState({ map: null, depthTex: null, failed: false });

  useEffect(() => {
    let alive = true;
    new THREE.TextureLoader().load(
      src,
      (map) => {
        if (!alive) return map.dispose();
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        setState({ map, depthTex: buildMaps(map.image, detail), failed: false });
      },
      undefined,
      () => alive && setState({ map: null, depthTex: null, failed: true })
    );
    return () => {
      alive = false;
    };
  }, [src, detail]);

  useEffect(
    () => () => {
      state.map?.dispose();
      state.depthTex?.dispose();
    },
    [state]
  );

  if (!state.map) return fallback;
  return <Relief map={state.map} depthTex={state.depthTex} height={height} depth={depth} sheen={sheen} shade={shade} tilt={tilt} />;
}

function Relief({ map, depthTex, height, depth, sheen, shade, tilt }) {
  const group = useRef();
  const phase = useMemo(() => Math.random() * 10, []);
  const aspect = map.image.width / map.image.height;
  const w = height * aspect;

  const geo = useMemo(() => new THREE.PlaneGeometry(w, height, 220, Math.round(220 / aspect)), [w, height, aspect]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        toneMapped: false,
        uniforms: {
          uMap: { value: map },
          uDepth: { value: depthTex },
          uTexel: { value: new THREE.Vector2(1 / depthTex.image.width, 1 / depthTex.image.height) },
          uAmount: { value: depth },
          uLight: { value: new THREE.Vector3(0.4, 0.5, 1) },
          uTime: { value: phase },
          uSheen: { value: sheen },
          uShade: { value: shade },
        },
      }),
    [map, depthTex, depth, sheen, shade, phase]
  );
  const shadowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shadowVert,
        fragmentShader: shadowFrag,
        transparent: true,
        depthWrite: false,
        uniforms: { uDepth: { value: depthTex }, uOpacity: { value: 0.55 } },
      }),
    [depthTex]
  );
  useEffect(() => () => (geo.dispose(), mat.dispose(), shadowMat.dispose()), [geo, mat, shadowMat]);

  const sm = useRef({ x: 0, y: 0 });
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + phase;
    const k = 1 - Math.exp(-dt * 4);
    sm.current.x += (pointer.x - sm.current.x) * k;
    sm.current.y += (pointer.y - sm.current.y) * k;
    const ry = (Math.sin(t * 0.45) * 0.22 + sm.current.x * 0.32) * tilt;
    const rx = (Math.sin(t * 0.33) * 0.08 + sm.current.y * 0.18) * tilt;
    if (group.current) {
      group.current.rotation.set(rx, ry, Math.sin(t * 0.25) * 0.02);
      group.current.position.y = Math.sin(t * 0.9) * 0.04;
    }
    mat.uniforms.uTime.value = t;
    // light swings against the tilt so facets catch and lose the light
    mat.uniforms.uLight.value.set(0.45 - ry * 1.6, 0.55 + rx * 1.6, 1);
  });

  return (
    <group ref={group}>
      <mesh geometry={geo} material={shadowMat} position={[0.05, -0.08, -0.3]} scale={1.04} renderOrder={-1} />
      <mesh geometry={geo} material={mat} />
    </group>
  );
}
