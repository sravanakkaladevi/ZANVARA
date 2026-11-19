import * as THREE from 'three';
import { bustDistance } from './necklacePaths.js';

// Sample actual rendered geometry, independently of the fitting template's boxes.
export function sampleInstances(group, visit, detailed = false) {
  const instance = new THREE.Matrix4(), p = new THREE.Vector3();
  group.children.forEach((mesh) => {
    if (!mesh.isInstancedMesh || mesh.userData.decorative) return;
    const positions = mesh.geometry.attributes.position;
    const stride = Math.max(1, Math.floor(positions.count / (detailed ? 240 : 24)));
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, instance);
      for (let j = 0; j < positions.count; j += stride) {
        p.fromBufferAttribute(positions, j).applyMatrix4(instance);
        visit(p, mesh, i);
      }
    }
  });
}

export function surfaceReport(rig, offsetY = 0) {
  let minimum = Infinity, penetrations = 0, sampled = 0;
  sampleInstances(rig.group, (p) => {
    p.y += offsetY;
    const distance = bustDistance(p);
    minimum = Math.min(minimum, distance);
    if (distance < -0.001) penetrations++;
    sampled++;
  }, true);
  return { minimum, penetrations, sampled };
}

export function cardReport(rig, frame) {
  const camera = new THREE.PerspectiveCamera(frame.fov, 1 / 1.08, 0.1, 60);
  camera.position.z = frame.z;
  camera.updateMatrixWorld();
  const rotation = new THREE.Euler(), matrix = new THREE.Matrix4(), offset = new THREE.Matrix4().makeTranslation(0, -frame.cy, 0);
  const min = new THREE.Vector2(Infinity, Infinity), max = new THREE.Vector2(-Infinity, -Infinity);
  for (const angle of [-0.42, 0, 0.42]) {
    matrix.compose(new THREE.Vector3(), new THREE.Quaternion().setFromEuler(rotation.set(frame.rx, angle, 0)), new THREE.Vector3().setScalar(frame.scale));
    matrix.multiply(offset);
    sampleInstances(rig.group, (p) => {
      p.applyMatrix4(matrix).project(camera);
      min.min(p); max.max(p);
    });
  }
  return { min: min.toArray(), max: max.toArray(), fits: min.x > -0.96 && min.y > -0.96 && max.x < 0.96 && max.y < 0.96 };
}
