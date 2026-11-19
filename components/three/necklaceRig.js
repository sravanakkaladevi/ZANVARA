import * as THREE from 'three';
import { once, starTexture } from './assets.js';
import { doriGeo, jewelleryLinkGeo, jewelleryTemplates } from './jewelleryGeometry.js';
import { bustDistance, cloneFrame, fitFrame, flatPoint, frameMatrix, pathFrames, templateSamples, wornPoint } from './necklacePaths.js';

const M = new THREE.Matrix4(), A = new THREE.Matrix4(), B = new THREE.Matrix4();
const P = new THREE.Vector3(), Q = new THREE.Quaternion(), SCALE = new THREE.Vector3();
const TURN = new THREE.Matrix4();
const TAU = Math.PI * 2;

function pair(source, scale, samples) {
  const worn = cloneFrame(source.worn, scale), flat = cloneFrame(source.flat, scale);
  if (samples) fitFrame(worn, samples);
  return { worn, flat, matrix: frameMatrix(worn), samples };
}

export function createNecklaceRig(mats, chainMat, flares = false) {
  const group = new THREE.Group();
  group.name = 'Procedural bridal necklace';
  let batches = [], anchors = [], signature = '', current = null, lastDrape = -1, lastUpright = false;
  let glints = null, pendantAnchor = -1;

  function clear() {
    batches.forEach(({ mesh }) => { group.remove(mesh); mesh.dispose(); });
    batches = []; anchors = [];
    if (glints) { group.remove(glints); glints.dispose(); glints.material.dispose(); glints = null; }
  }

  function setPiece(piece, detail = 'full') {
    const key = `${piece.id}:${piece.style}:${piece.length}:${detail}`;
    if (signature === key) return false;
    clear(); signature = key; current = piece; lastDrape = -1;
    const source = pathFrames(piece.length), templates = jewelleryTemplates(piece.style, detail);
    const full = jewelleryTemplates(piece.style, 'full');
    // Both detail levels share the full-size fitting envelope and exact poses.
    const motifSamples = templateSamples(full.motif), pendantSamples = templateSamples(full.pendant);
    const pending = new Map();
    const add = (part, anchor, phase) => {
      const batchKey = `${part.geo.uuid}-${part.material}`;
      if (!pending.has(batchKey)) pending.set(batchKey, { geo: part.geo, material: part.material, records: [] });
      pending.get(batchKey).records.push({ ...part, anchor, phase });
    };
    source.motifs.forEach((f, i) => {
      if (i === Math.floor(source.motifs.length / 2)) return;
      const anchor = anchors.push(pair(f, source.motifScale, motifSamples)) - 1;
      templates.motif.forEach((p) => add(p, anchor, i * 1.77));
    });
    const pendantIndex = anchors.push(pair(source.pendant, source.pendantScale, pendantSamples)) - 1;
    pendantAnchor = pendantIndex;
    anchors[pendantIndex].pendant = true;
    templates.pendant.forEach((p) => add(p, pendantIndex, 0));

    const dori = piece.style === 'temple' || piece.style === 'haram';
    source.links.forEach((f, i) => {
      const linkFrame = pair(f, 1, null);
      linkFrame.worn.position.addScaledVector(linkFrame.worn.normal, 0.035);
      const anchor = anchors.push(linkFrame) - 1;
      const cord = dori && f.back;
      add({ geo: cord ? doriGeo(detail) : jewelleryLinkGeo(detail), material: cord ? 'cord' : 'chain',
        matrix: cord ? new THREE.Matrix4() : new THREE.Matrix4().makeRotationX(i % 2 ? Math.PI / 2 : 0) }, anchor, 0);
    });
    for (const batch of pending.values()) {
      const mesh = new THREE.InstancedMesh(batch.geo, batch.material === 'chain' ? chainMat || mats.gold : mats[batch.material] || mats.gold, batch.records.length);
      mesh.name = `${piece.style} / ${batch.material}`;
      mesh.frustumCulled = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (batch.material === 'pearl') {
        const tint = new THREE.Color();
        batch.records.forEach((_, i) => mesh.setColorAt(i, tint.setRGB(1, 0.94 + (i * 13 % 7) / 140, 0.88 + (i * 17 % 9) / 90)));
        mesh.instanceColor.needsUpdate = true;
      }
      if (batch.material === 'enamel') {
        const tint = new THREE.Color(), colours = [piece.gem, piece.gem2, '#fff4de'];
        batch.records.forEach((_, i) => mesh.setColorAt(i, tint.set(colours[i % 3])));
        mesh.instanceColor.needsUpdate = true;
      }
      batches.push({ ...batch, mesh, moving: batch.records.map((r, i) => r.drop ? i : -1).filter((i) => i >= 0) });
      group.add(mesh);
    }
    if (flares) {
      glints = new THREE.InstancedMesh(once('jewel-glint-plane', () => new THREE.PlaneGeometry(1, 1)),
        new THREE.MeshBasicMaterial({ map: starTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), 3);
      glints.name = 'Subtle gemstone glints'; glints.frustumCulled = false; glints.userData.decorative = true;
      group.add(glints);
    }
    group.userData.necklace = {
      id: piece.id, style: piece.style, length: piece.length, detail, batches: batches.length,
      instances: batches.reduce((n, b) => n + b.records.length, 0), glintDrawCalls: flares ? 1 : 0,
    };
    return true;
  }

  function layout(drape, upright = false) {
    const d = THREE.MathUtils.clamp(drape ?? 1, 0, 1);
    if (Math.abs(lastDrape - d) < 0.0001 && lastUpright === upright) return false;
    lastDrape = d; lastUpright = upright;
    anchors.forEach((a) => {
      P.copy(a.flat.position).lerp(a.worn.position, d);
      Q.slerpQuaternions(a.flat.quaternion, a.worn.quaternion, upright && a.pendant ? 1 : d);
      SCALE.set(a.worn.scale, a.worn.scale, 1);
      a.matrix.compose(P, Q, SCALE);
    });
    batches.forEach((batch) => {
      batch.records.forEach((r, i) => batch.mesh.setMatrixAt(i, M.multiplyMatrices(anchors[r.anchor].matrix, r.matrix)));
      batch.mesh.instanceMatrix.needsUpdate = true;
      batch.mesh.computeBoundingSphere();
      batch.mesh.boundingSphere.radius += 0.04; // reserve the full pendulum excursion
    });
    return true;
  }

  function sway(time, drape = 1) {
    batches.forEach((batch) => {
      if (!batch.moving.length) return;
      batch.moving.forEach((i) => {
        const r = batch.records[i], p = r.drop.pivot;
        const angle = Math.sin(time * 1.4 + r.phase + r.drop.phase) * 0.04 * drape;
        A.makeTranslation(p[0], p[1], p[2]);
        TURN.makeRotationZ(angle); A.multiply(TURN);
        B.makeTranslation(-p[0], -p[1], -p[2]); A.multiply(B).multiply(r.matrix);
        M.multiplyMatrices(anchors[r.anchor].matrix, A);
        batch.mesh.setMatrixAt(i, M);
      });
      batch.mesh.instanceMatrix.needsUpdate = true;
    });
    if (glints) {
      for (let i = 0; i < 3; i++) {
        const pulse = Math.pow(Math.max(0, Math.sin(time * (0.8 + i * 0.17) + i * 2.1)), 20);
        A.compose(P.set((i - 1) * 0.28, i === 1 ? -0.06 : -0.52, 0.25), Q.identity(), SCALE.setScalar(pulse * 0.12));
        glints.setMatrixAt(i, M.multiplyMatrices(anchors[pendantAnchor].matrix, A));
      }
      glints.instanceMatrix.needsUpdate = true;
    }
  }

  function inspect() {
    const flatBounds = new THREE.Box3();
    let minimumClearance = Infinity, penetrations = 0;
    for (const a of anchors) {
      if (!a.samples) continue;
      const worn = frameMatrix(a.worn), flat = frameMatrix(a.flat);
      a.samples.forEach((p) => {
        const distance = bustDistance(P.copy(p).applyMatrix4(worn));
        minimumClearance = Math.min(minimumClearance, distance);
        if (distance < -0.001) penetrations++;
        flatBounds.expandByPoint(P.copy(p).applyMatrix4(flat));
      });
    }
    for (let i = 0; i < 480; i++) {
      const theta = i / 480 * TAU - Math.PI;
      const d = bustDistance(wornPoint(theta, current.length));
      minimumClearance = Math.min(minimumClearance, d);
      if (d < -0.001) penetrations++;
      flatBounds.expandByPoint(flatPoint(theta, current.length));
    }
    return {
      ...group.userData.necklace, minimumClearance, penetrations,
      flatBounds: { min: flatBounds.min.toArray(), max: flatBounds.max.toArray() },
      fitsBox: flatBounds.min.x >= -1.71 && flatBounds.max.x <= 1.71 && flatBounds.min.z >= -1.33 && flatBounds.max.z <= 2.09,
    };
  }

  return { group, setPiece, layout, sway, inspect, dispose: clear };
}

const checked = new Set();
export function checkNecklace(rig, piece) {
  if (checked.has(piece.id)) return;
  checked.add(piece.id);
  const report = rig.inspect();
  if (report.penetrations || !report.fitsBox) console.warn('[jewellery] Fitting check failed', report);
}
