import * as THREE from 'three';
import { makeJewelleryMaterials } from './assets.js';
import { createNecklaceRig } from './necklaceRig.js';
import { bustDistance } from './necklacePaths.js';
import { cardReport, sampleInstances } from './necklaceChecks.js';
import { VARIANTS, FLY, S, cardFrame, cardSway, variantStore } from '../../lib/store.js';

export function installJewelleryDiagnostics({ get, root, bust, wrap, flyer, residentPiece, incomingPiece }) {
  const api = {
    variants: VARIANTS, fly: FLY, state: S,
    exportStill(index, size = 2048) {
      const piece = VARIANTS[index], { gl, scene } = get();
      const saved = {
        target: gl.getRenderTarget(), viewport: gl.getViewport(new THREE.Vector4()),
        scissor: gl.getScissor(new THREE.Vector4()), scissorTest: gl.getScissorTest(),
        color: gl.getClearColor(new THREE.Color()), alpha: gl.getClearAlpha(),
      };
      const mats = makeJewelleryMaterials(piece), rig = createNecklaceRig(mats);
      const target = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
      target.texture.colorSpace = THREE.SRGBColorSpace;
      try {
        rig.setPiece(piece); rig.layout(1);
        const testScene = new THREE.Scene(); testScene.environment = scene.environment;
        testScene.add(rig.group);
        scene.traverse((object) => { if (object.isLight) testScene.add(object.clone()); });
        const bounds = new THREE.Box3().setFromObject(rig.group), dimensions = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const span = Math.max(dimensions.x / 0.88, dimensions.y / 0.85);
        const camera = new THREE.OrthographicCamera(-span / 2, span / 2, span / 2, -span / 2, 0.1, 60);
        camera.position.set(center.x, center.y, bounds.max.z + 12); camera.lookAt(center); camera.updateMatrixWorld();
        // RenderTarget.viewport is in physical pixels, independent of adaptive canvas DPR.
        gl.setRenderTarget(target); gl.setScissorTest(false); gl.setClearColor(0x000000, 0); gl.clear();
        gl.render(testScene, camera);
        const pixels = new Uint8Array(size * size * 4);
        gl.readRenderTargetPixels(target, 0, 0, size, size, pixels);
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
        const context = canvas.getContext('2d'), data = context.createImageData(size, size), stride = size * 4;
        for (let y = 0; y < size; y++) data.data.set(pixels.subarray((size - y - 1) * stride, (size - y) * stride), y * stride);
        context.putImageData(data, 0, 0);
        return { id: piece.id, dataUrl: canvas.toDataURL('image/png') };
      } finally {
        gl.setRenderTarget(saved.target); gl.setViewport(saved.viewport); gl.setScissor(saved.scissor); gl.setScissorTest(saved.scissorTest);
        gl.setClearColor(saved.color, saved.alpha); target.dispose(); rig.dispose(); Object.values(mats).forEach((m) => m.dispose());
      }
    },
    async measureFrameCost(frames = 90) {
      const { gl } = get(), context = gl.getContext();
      const extension = context.getExtension('EXT_disjoint_timer_query_webgl2');
      const original = gl.render, records = [];
      let frame = 0;
      gl.render = function (...args) {
        const query = extension ? context.createQuery() : null;
        if (query) context.beginQuery(extension.TIME_ELAPSED_EXT, query);
        const start = performance.now();
        try { return original.apply(this, args); }
        finally {
          if (query) context.endQuery(extension.TIME_ELAPSED_EXT);
          records.push({ frame, cpu: performance.now() - start, query });
        }
      };
      try {
        await new Promise((resolve) => {
          const tick = () => { if (++frame >= frames) resolve(); else requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        });
      } finally { gl.render = original; }
      if (extension) {
        for (let attempt = 0; attempt < 120 && records.some((r) => !context.getQueryParameter(r.query, context.QUERY_RESULT_AVAILABLE)); attempt++) {
          await new Promise(requestAnimationFrame);
        }
      }
      const totals = new Map();
      records.forEach((r) => {
        if (!totals.has(r.frame)) totals.set(r.frame, { cpu: 0, gpu: 0, views: 0 });
        const t = totals.get(r.frame); t.cpu += r.cpu; t.views++;
        if (r.query && context.getQueryParameter(r.query, context.QUERY_RESULT_AVAILABLE)) t.gpu += context.getQueryParameter(r.query, context.QUERY_RESULT) / 1e6;
        if (r.query) context.deleteQuery(r.query);
      });
      const samples = [...totals.values()];
      const median = (key) => samples.map((v) => v[key]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
      return { cpuMedianMs: median('cpu'), gpuMedianMs: extension ? median('gpu') : null, viewsPerFrame: median('views'), disjoint: extension ? context.getParameter(extension.GPU_DISJOINT_EXT) : null };
    },
    select: (i) => { variantStore.set(i); window.dispatchEvent(new Event('verdelle:shown')); },
    snapshot() {
      const g = wrap.current?.children[0], f = flyer.current?.children[0];
      return {
        selected: VARIANTS[variantStore.index].id, resident: residentPiece.id, incoming: incomingPiece.id,
        residentRig: g?.userData.necklace, flyerRig: f?.userData.necklace,
        flyerVisible: flyer.current?.visible, flying: FLY.active, k: FLY.k, out: FLY.out,
        residentMatrix: g?.matrixWorld.toArray(), flyerMatrix: f?.matrixWorld.toArray(),
        renderer: { calls: get().gl.info.render.calls, triangles: get().gl.info.render.triangles, dpr: get().gl.getPixelRatio() },
      };
    },
    geometryReport() {
      return VARIANTS.map((piece) => {
        const mats = makeJewelleryMaterials(piece), rig = createNecklaceRig(mats);
        rig.setPiece(piece); rig.layout(1);
        const report = { ...rig.inspect(), card: cardReport(rig, cardFrame(piece.length)) };
        rig.dispose(); Object.values(mats).forEach((m) => m.dispose());
        return report;
      });
    },
    flightClearance() {
      root.current.updateWorldMatrix(true, true);
      flyer.current.updateWorldMatrix(true, true);
      bust.current.updateWorldMatrix(true, true);
      const inverse = bust.current.matrixWorld.clone().invert();
      const reports = [];
      for (const [name, outer] of [['resident', wrap.current], ['incoming', flyer.current]]) {
        if (!outer.visible || !outer.children[0]) continue;
        const rig = outer.children[0], matrix = new THREE.Matrix4().multiplyMatrices(inverse, rig.matrixWorld);
        let minimum = Infinity, penetrations = 0;
        sampleInstances(rig, (p) => {
          const d = bustDistance(p.applyMatrix4(matrix));
          minimum = Math.min(minimum, d); if (d < -0.002) penetrations++;
        });
        reports.push({ name, minimum, penetrations });
      }
      return reports;
    },
    takeoffError() {
      const frame = cardFrame(incomingPiece.length), r = FLY.rect;
      const camera = new THREE.PerspectiveCamera(frame.fov, r.width / r.height, 0.1, 60);
      camera.position.z = frame.z; camera.updateMatrixWorld();
      const pose = new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromEuler(
        new THREE.Euler(frame.rx, cardSway(FLY.renderTime, FLY.phase), 0)
      ), new THREE.Vector3().setScalar(frame.scale));
      pose.multiply(new THREE.Matrix4().makeTranslation(0, -frame.cy, 0));
      const stageCamera = get().camera;
      flyer.current.updateWorldMatrix(true, true);
      let error = 0;
      sampleInstances(flyer.current.children[0], (p) => {
        const source = p.clone().applyMatrix4(pose).project(camera);
        const target = p.applyMatrix4(flyer.current.matrixWorld).project(stageCamera);
        const sourceX = r.left + (source.x + 1) * r.width / 2;
        const sourceY = r.top + (1 - source.y) * r.height / 2;
        const targetX = (target.x + 1) * window.innerWidth / 2;
        const targetY = (1 - target.y) * window.innerHeight / 2;
        error = Math.max(error, Math.hypot(sourceX - targetX, sourceY - targetY));
      });
      return error;
    },
    measureDrawCalls() {
      const { gl, scene } = get();
      const saved = {
        target: gl.getRenderTarget(), viewport: gl.getViewport(new THREE.Vector4()),
        scissor: gl.getScissor(new THREE.Vector4()), scissorTest: gl.getScissorTest(),
        color: gl.getClearColor(new THREE.Color()), alpha: gl.getClearAlpha(), autoReset: gl.info.autoReset,
      };
      const target = new THREE.WebGLRenderTarget(64, 64);
      const results = [];
      try {
        for (const style of ['temple', 'kundan', 'guttapusalu', 'haram']) {
          const piece = VARIANTS.find((p) => p.style === style && p.length === 'opera') || VARIANTS.find((p) => p.style === style);
          const mats = makeJewelleryMaterials(piece), rig = createNecklaceRig(mats);
          rig.setPiece(piece); rig.layout(1); rig.sway(0, 1);
          const testScene = new THREE.Scene(); testScene.environment = scene.environment;
          testScene.add(rig.group, new THREE.AmbientLight(0xffffff, 0.25));
          const light = new THREE.DirectionalLight(0xfff4e0, 1.8); light.position.set(3, 6, 5); testScene.add(light);
          const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60); camera.position.set(0, 0, 12);
          gl.setRenderTarget(target); gl.setViewport(0, 0, 64, 64); gl.setScissorTest(false);
          gl.info.autoReset = false; gl.info.reset();
          gl.render(testScene, camera);
          results.push({ style, length: piece.length, batches: rig.group.children.length, drawCalls: gl.info.render.calls, residentDrawCalls: gl.info.render.calls + 1, triangles: gl.info.render.triangles });
          rig.dispose(); Object.values(mats).forEach((m) => m.dispose());
        }
      } finally {
        gl.setRenderTarget(saved.target); gl.setViewport(saved.viewport); gl.setScissor(saved.scissor); gl.setScissorTest(saved.scissorTest);
        gl.setClearColor(saved.color, saved.alpha); gl.info.autoReset = saved.autoReset; target.dispose();
      }
      return results;
    },
  };
  window.__jewellery = api;
  return () => { if (window.__jewellery === api) delete window.__jewellery; };
}
