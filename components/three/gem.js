'use client';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { MeshBVH, MeshBVHUniformStruct, SAH, BVHShaderGLSL } from 'three-mesh-bvh';
import { once } from './assets';
import { getStudioCube } from './env';

/* ------------------------------------------------------------------
   Realistic faceted gemstones.

   ovalBrilliantGeo — a true 57-facet oval brilliant: octagonal table,
     8 stars, 8 bezel kites, 16 upper halves, a scalloped girdle,
     8 pavilion mains and 16 lower halves.  Every facet is planar.

   useGemMaterial — a ray-traced gem shader.  Per pixel:
     1. surface reflection of the studio (Fresnel, white),
     2. the refracted ray is traced INSIDE the stone (BVH) for several
        bounces; at each facet part of the light leaves (refraction +
        Fresnel), the rest reflects on (total internal reflection),
     3. Beer–Lambert absorption over the distance travelled gives the
        body colour — deep where light has gone far, bright at flashes,
     4. a touch of dispersion splits R/G/B at the exit facet.
------------------------------------------------------------------- */

const TAU = Math.PI * 2;

/** z on the plane through a,b,c at (x, y) */
function zOnPlane(a, b, c, x, y) {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  return a.z - (n.x * (x - a.x) + n.y * (y - a.y)) / n.z;
}

/**
 * Oval brilliant, table +Z, culet −Z, girdle radius 1 along Y (×oval along X).
 * Proportions follow a well-cut brilliant: table 57%, crown ~15%, pavilion ~43%.
 */
export const ovalBrilliantGeo = (oval = 0.78, key = 'oval-brilliant') =>
  once(`${key}-${oval}`, () => {
    const R = 8; // main facets
    const SUB = 4; // girdle samples per half facet → 64-segment smooth outline
    const rt = 0.57; // table radius
    const hT = 0.31; // table height
    const gz = 0.028; // half girdle thickness at the main points
    const hill = 0.014; // girdle is a little thicker between mains (scalloped)
    const rs = rt + (1 - rt) * 0.5; // star facet points
    const rq = 0.23; // lower-half facets reach 77% of the way to the culet
    const zC = -gz - 0.86; // culet
    const c22 = Math.cos(Math.PI / R / 2);
    const pt = (a, r, z) => new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
    const A = (k) => (k / R) * TAU; // main angle
    const Ah = (k) => ((k + 0.5) / R) * TAU; // between mains

    // heights that keep the kites planar
    const zs = hT + (gz - hT) * ((rs * c22 - rt) / (1 - rt));
    const zq = zC + (-gz - zC) * (rq * c22);

    const T = [], S = [], G = [], Gh = [], Gb = [], Ghb = [], Q = [];
    for (let k = 0; k < R; k++) {
      T.push(pt(A(k), rt, hT));
      S.push(pt(Ah(k), rs, zs));
      G.push(pt(A(k), 1, gz));
      Gh.push(pt(Ah(k), 1, gz + hill));
      Gb.push(pt(A(k), 1, -gz));
      Ghb.push(pt(Ah(k), 1, -gz - hill));
      Q.push(pt(Ah(k), rq, zq));
    }
    const top = new THREE.Vector3(0, 0, hT);
    const culet = new THREE.Vector3(0, 0, zC);

    const pos = [];
    const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const nx = (k) => (k + 1) % R;
    const pv = (k) => (k + R - 1) % R;

    for (let k = 0; k < R; k++) {
      tri(top, T[k], T[nx(k)]); // table
      tri(T[k], T[nx(k)], S[k]); // star
      tri(T[k], S[pv(k)], G[k]); // bezel kite
      tri(T[k], G[k], S[k]);
      tri(culet, Q[pv(k)], Gb[k]); // pavilion main kite
      tri(culet, Gb[k], Q[k]);

      // the two half-facet arcs between this main and the next
      for (let h = 0; h < 2; h++) {
        const a0 = A(k) + h * (TAU / R / 2);
        const upA = h ? Gh[k] : G[k], upB = h ? G[nx(k)] : Gh[k];
        const loA = h ? Ghb[k] : Gb[k], loB = h ? Gb[nx(k)] : Ghb[k];
        const up = [], lo = [];
        for (let j = 0; j <= SUB; j++) {
          const a = a0 + (j / SUB) * (TAU / R / 2);
          const x = Math.cos(a), y = Math.sin(a);
          up.push(new THREE.Vector3(x, y, zOnPlane(S[k], upA, upB, x, y)));
          lo.push(new THREE.Vector3(x, y, zOnPlane(Q[k], loA, loB, x, y)));
        }
        for (let j = 0; j < SUB; j++) {
          tri(S[k], up[j], up[j + 1]); // upper half (planar fan)
          tri(Q[k], lo[j], lo[j + 1]); // lower half (planar fan)
          tri(up[j], lo[j], lo[j + 1]); // girdle band
          tri(up[j], lo[j + 1], up[j + 1]);
        }
      }
    }

    // wind every triangle outward (the stone is convex around this point)
    const inside = new THREE.Vector3(0, 0, -0.2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < pos.length; i += 9) {
      a.fromArray(pos, i);
      b.fromArray(pos, i + 3);
      c.fromArray(pos, i + 6);
      n.subVectors(b, a).cross(c.clone().sub(a));
      const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(inside);
      if (n.dot(centroid) < 0) for (let d = 0; d < 3; d++) [pos[i + 3 + d], pos[i + 6 + d]] = [pos[i + 6 + d], pos[i + 3 + d]];
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.scale(oval, 1, 1);
    g.computeVertexNormals(); // non-indexed → one flat normal per facet
    g.computeBoundingSphere();
    return g;
  });

/* Body colours as absorption per unit of path inside the stone (girdle radius = 1). */
export const GEM_PRESETS = {
  emerald: { ior: 1.58, dispersion: 0.004, absorption: [2.6, 0.42, 1.0], body: [0.004, 0.05, 0.026], envIntensity: 1.15 },
  ruby: { ior: 1.77, dispersion: 0.018, absorption: [0.35, 3.2, 2.2], body: [0.06, 0.002, 0.01], envIntensity: 1.1 },
  sapphire: { ior: 1.77, dispersion: 0.018, absorption: [3.0, 1.6, 0.35], body: [0.003, 0.012, 0.06], envIntensity: 1.1 },
  diamond: { ior: 2.42, dispersion: 0.044, absorption: [0.02, 0.02, 0.03], body: [0.02, 0.02, 0.025], envIntensity: 1.0 },
  citrine: { ior: 1.55, dispersion: 0.013, absorption: [0.15, 0.6, 2.8], body: [0.06, 0.03, 0.002], envIntensity: 1.1 },
};

const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp isampler2D;
  precision highp usampler2D;
  ${BVHShaderGLSL.bvh_struct_definitions}
  ${BVHShaderGLSL.common_functions}
  ${BVHShaderGLSL.bvh_ray_functions}

  uniform BVH bvh;
  uniform samplerCube envMap;
  uniform mat4 gemModel;
  uniform mat4 gemModelInv;
  uniform float ior;
  uniform float dispersion;
  uniform float envIntensity;
  uniform vec3 absorption;
  uniform vec3 body;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  vec3 envW(vec3 d) { return texture(envMap, d).rgb * envIntensity; }
  vec3 envL(vec3 dLocal) { return envW(normalize(mat3(gemModel) * dLocal)); }
  float schlick(float c, float f0) { return f0 + (1.0 - f0) * pow(1.0 - c, 5.0); }

  void main() {
    vec3 V = normalize(vWorldPos - cameraPosition);
    vec3 N = normalize(vWorldNormal);
    if (dot(N, V) > 0.0) N = -N;
    float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
    float F = schlick(clamp(dot(-V, N), 0.0, 1.0), f0);

    // 1. surface reflection
    vec3 col = envW(reflect(V, N)) * F;

    // 2. into the stone (traced in the stone's local space)
    vec3 ro = (gemModelInv * vec4(vWorldPos, 1.0)).xyz;
    vec3 rd = normalize(mat3(gemModelInv) * refract(V, N, 1.0 / ior));
    ro += rd * 1e-4;
    vec3 thr = vec3(1.0 - F);

    for (int i = 0; i < GEM_BOUNCES; i++) {
      uvec4 faceIndices; vec3 fn; vec3 bary; float side; float dist;
      bool hit = bvhIntersectFirstHit(bvh, ro, rd, faceIndices, fn, bary, side, dist);
      if (!hit) { col += thr * envL(rd); thr = vec3(0.0); break; }

      thr *= exp(-absorption * dist); // 3. Beer–Lambert body colour
      vec3 hp = ro + rd * dist;
      vec3 n = normalize(fn); // faces against the ray (inward)

      vec3 outG = refract(rd, n, ior);
      if (dot(outG, outG) > 0.0) {
        float Fe = schlick(clamp(dot(outG, -n), 0.0, 1.0), f0);
        // 4. dispersion at the exit facet
        vec3 outR = refract(rd, n, ior * (1.0 - dispersion));
        vec3 outB = refract(rd, n, ior * (1.0 + dispersion));
        if (dot(outR, outR) == 0.0) outR = outG;
        if (dot(outB, outB) == 0.0) outB = outG;
        vec3 e = vec3(envL(outR).r, envL(outG).g, envL(outB).b);
        col += thr * (1.0 - Fe) * e;
        thr *= Fe;
      }
      rd = reflect(rd, n); // total internal reflection (or the Fresnel share)
      ro = hp + rd * 1e-3;
    }
    col += thr * body * 4.0; // light still trapped inside → soft body glow
    col += body;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * A ray-traced gem material bound to one geometry (the BVH is built from it).
 * `preset`: a key of GEM_PRESETS or an object with the same fields.
 */
export function useGemMaterial(geometry, preset = 'emerald', { bounces = 6 } = {}) {
  const gl = useThree((s) => s.gl);
  const material = useMemo(() => {
    const p = typeof preset === 'string' ? GEM_PRESETS[preset] : preset;
    const bvh = new MeshBVHUniformStruct();
    bvh.updateFrom(new MeshBVH(geometry.clone(), { strategy: SAH }));
    const m = new THREE.ShaderMaterial({
      defines: { GEM_BOUNCES: bounces },
      uniforms: {
        bvh: { value: bvh },
        envMap: { value: getStudioCube(gl) },
        gemModel: { value: new THREE.Matrix4() },
        gemModelInv: { value: new THREE.Matrix4() },
        ior: { value: p.ior },
        dispersion: { value: p.dispersion },
        envIntensity: { value: p.envIntensity },
        absorption: { value: new THREE.Vector3(...p.absorption) },
        body: { value: new THREE.Vector3(...p.body) },
      },
      vertexShader,
      fragmentShader,
    });
    m.onBeforeRender = (renderer, scene, camera, geo, object) => {
      m.uniforms.gemModel.value.copy(object.matrixWorld);
      m.uniforms.gemModelInv.value.copy(object.matrixWorld).invert();
      m.uniformsNeedUpdate = true;
    };
    m.userData.bvh = bvh;
    return m;
  }, [geometry, preset, bounces, gl]);

  useEffect(
    () => () => {
      material.userData.bvh.dispose();
      material.dispose();
    },
    [material]
  );
  return material;
}
