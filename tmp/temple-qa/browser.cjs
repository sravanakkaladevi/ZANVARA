const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const out = __dirname;
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9335', '--user-data-dir=' + path.join(out, 'chrome-profile'),
  '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions',
  '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--window-size=1440,1000', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let log = '', ws, seq = 0;
const pending = new Map(), result = { errors: [], warnings: [] };
browser.stderr.on('data', d => { log += d; });
browser.on('error', e => { log += e.message; });
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 45000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}
async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data, 'base64'));
  console.log('Saved ' + name + '.png');
}
(async () => {
  let targets;
  for (let i = 0; i < 50; i++) { try { targets = await (await fetch('http://127.0.0.1:9335/json/list')).json(); break; } catch { await delay(200); } }
  if (!targets) throw Error('Browser failed: ' + log.slice(-1500));
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { const p = pending.get(message.id); if (!p) return; clearTimeout(p.timer); pending.delete(message.id); message.error ? p.reject(Error(message.error.message)) : p.resolve(message.result); return; }
    if (message.method === 'Runtime.exceptionThrown') result.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) result[message.params.type === 'error' ? 'errors' : 'warnings'].push(message.params.args.map(a => a.value || a.description || '').join(' '));
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') result.errors.push(message.params.entry.text + ' ' + message.params.entry.url);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) console.log('Failed resource:', message.params.response.status, message.params.response.url);
  };
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable'), send('Log.enable')]);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/temple-qa' });
  let ready;
  for (let i = 0; i < 100; i++) {
    ready = await evaluate(`!!window.__templePreview?.scene.getObjectByName('temple-necklace')`);
    if (ready) break;
    if (i % 20 === 0) console.log('Waiting for temple preview...',await evaluate(`({url:location.href,body:document.body.innerText.slice(0,200),preview:!!window.__templePreview})`));
    await delay(300);
  }
  if (!ready) {await shot('startup-failure');throw Error('Temple scene did not mount: ' + JSON.stringify(result.errors));}
  await delay(1500);
  await evaluate(`{
    const {scene}=window.__templePreview;
    const root=scene.getObjectByName('temple-necklace');
    window.__templeMeasured={frames:{},version:root.userData.rig.layoutVersion};
    root.traverse(o=>{if(!o.isMesh&&!o.isSprite)return;const old=o.onBeforeRender;o.onBeforeRender=function(renderer,...args){old.call(this,renderer,...args);const f=renderer.info.render.frame;const frames=window.__templeMeasured.frames;frames[f]=(frames[f]||0)+1;};});
  }`);
  await delay(1500);
  result.front = await evaluate(`(()=>{
    const {scene,gl,THREE}=window.__templePreview;
    const root=scene.getObjectByName('temple-necklace');
    let triangles=0,batches=0,instances=0;
    root.traverse(o=>{if(!o.isMesh)return;batches++;instances+=o.isInstancedMesh?o.count:1;const g=o.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
    return {batches,instances,triangles,drawCallsPerFrame:Object.values(window.__templeMeasured.frames).slice(1,-1),idleLayoutUnchanged:root.userData.rig.layoutVersion===window.__templeMeasured.version,renderer:gl.getContext().getParameter(gl.getContext().RENDERER),bounds:new THREE.Box3().setFromObject(root).toJSON?.()};
  })()`);
  await shot('temple-front');
  await evaluate(`document.querySelectorAll('button')[1].click()`);
  await delay(800);
  await shot('temple-dori');
  await evaluate(`document.querySelectorAll('button')[1].click();document.querySelectorAll('button')[0].click()`);
  await delay(2300);
  result.flat = await evaluate(`(()=>{
    const {scene,S,THREE}=window.__templePreview;
    const root=scene.getObjectByName('temple-necklace');
    const box=new THREE.Box3();const m=new THREE.Matrix4();const bounds=new THREE.Box3();
    root.updateWorldMatrix(true,true);
    root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;g.computeBoundingBox();if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);bounds.copy(g.boundingBox).applyMatrix4(m);box.union(bounds);}}else box.union(bounds.copy(g.boundingBox).applyMatrix4(o.matrixWorld));});
    return {drape:S.drape,layoutVersion:root.userData.rig.layoutVersion,worldBounds:{min:box.min.toArray(),max:box.max.toArray()}};
  })()`);
  await shot('temple-box');
  await evaluate(`document.querySelectorAll('button')[0].click();window.__templePreview.mats.gem.color.set('#0c8f50');window.__templePreview.mats.gold.color.set('#efb59a')`);
  await delay(2000);
  result.variant = await evaluate(`(()=>{const root=window.__templePreview.scene.getObjectByName('temple-necklace');return {primary:root.getObjectByName('temple-main-kemp').material.color.getHexString(),secondary:root.getObjectByName('temple-secondary-kemp').material.color.getHexString(),gold:root.getObjectByName('temple-peacock-segments').material.color.getHexString()};})()`);
  await shot('temple-variant');
  result.errors = [...new Set(result.errors)]; result.warnings = [...new Set(result.warnings)];
  fs.writeFileSync(path.join(out, 'model-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result,null,2));
  if(result.errors.length)throw Error('Browser errors');
  if(!result.front.idleLayoutUnchanged)throw Error('Idle layout changed');
  if(Math.max(...result.front.drawCallsPerFrame)>150)throw Error('Draw-call budget exceeded');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(ws?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch{}ws.close();}browser.kill();
});
