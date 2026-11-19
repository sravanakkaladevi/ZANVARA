const { chromium } = require('C:/Users/kalai/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve('tmp/catalogue-qa');
const watchdog = setTimeout(() => {console.error('QA timed out');process.exit(1)}, 180000);
const twoFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
  const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors = [], warnings = [], flights = [], filters = [], screens = [];
  page.on('pageerror', e => errors.push(e.stack));
  page.on('console', msg => { if(msg.type()==='error') errors.push(msg.text()); if(msg.type()==='warning') warnings.push(msg.text()); });
  page.setDefaultTimeout(15000);
  await page.goto('http://localhost:3000', {waitUntil:'networkidle'});
  await page.waitForFunction(() => window.__jewellery && document.querySelector('.pre').style.display === 'none');
  await page.waitForTimeout(2000);
  await page.screenshot({path:path.join(output,'hero.png')});
  const geometry = await page.evaluate(() => window.__jewellery.geometryReport());
  console.log('Geometry checked');
  assert(geometry.every(p => p.fitsBox && p.card.fits && p.penetrations === 0));
  const drawCalls = await page.evaluate(() => window.__jewellery.measureDrawCalls());
  console.log('Draw calls',JSON.stringify(drawCalls));
  assert(drawCalls.every(p => p.drawCalls < 150));
  const gpu = await page.locator('canvas').evaluate(c => {const g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)});
  await page.evaluate(() => window.__lenis.scrollTo('#collection', {immediate:true}));
  await page.waitForTimeout(2000);
  await page.screenshot({path:path.join(output,'collection-choker.png')});

  async function flyTo(id) {
    console.log('Flight',id,'click');
    const selector = `.models .card[data-id="${id}"]`;
    await page.locator(selector).evaluate(el => el.click());
    console.log('Clicked');
    await page.evaluate(() => {
      const api=window.__jewellery;
      window.__flightTimeline=window.__gsap.getTweensOf(api.fly)[0].parent;
      window.__flightTimeline.pause().time(0.1);
      api.fly.k=0;
    });
    await twoFrames(page);
    console.log('Paused at start');
    const takeoffError = await page.evaluate(() => window.__jewellery.takeoffError());
    console.log('Takeoff error',takeoffError);
    assert(takeoffError < 0.5, `${id}: subpixel takeoff error ${takeoffError}`);
    const samples=[];
    for(const time of [0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.40]) {
      await page.evaluate(t => {window.__flightTimeline.time(t);}, time);
      await twoFrames(page);
      samples.push(await page.evaluate(() => ({...window.__jewellery.snapshot(),clearance:window.__jewellery.flightClearance()})));
      console.log('Frame',time);
    }
    const last=samples[samples.length-1];
    assert(last.clearance.every(p=>p.penetrations===0), `${id}: landing clips`);
    assert(samples.every(s=>s.clearance.every(p=>p.penetrations===0)), `${id}: flight clips`);
    await page.screenshot({path:path.join(output,`flight-${id}.png`)});
    await page.evaluate(() => {window.__flightTimeline.time(window.__flightTimeline.duration());});
    await twoFrames(page);
    const landed=await page.evaluate(() => window.__jewellery.snapshot());
    assert.equal(landed.resident,id);
    assert.equal(landed.residentRig.id,id);
    assert.equal(landed.flying,false);
    assert.equal(landed.flyerVisible,false);
    const delta=Math.max(...landed.residentMatrix.map((v,i)=>Math.abs(v-last.flyerMatrix[i])));
    // The previous sample is 0.05s before the end. Its remaining displacement is reported.
    flights.push({id,takeoffError,preLandingDisplacement:delta,samples,landed});
    await page.waitForTimeout(300);
  }

  for(const id of ['kundan-collar','guttapusalu-princess','haram-opera','guttapusalu-choker']) {
    await flyTo(id);
    await page.screenshot({path:path.join(output,`collection-${id.split('-').pop()}.png`)});
  }
  // Prev also starts on a mounted card and returns to a different-length piece.
  await page.getByRole('button',{name:'Previous piece',exact:true}).click();
  await page.waitForFunction(() => !window.__jewellery.fly.active);
  assert.equal(await page.evaluate(() => window.__jewellery.snapshot().resident),'kundan-princess');
  const styles=[['Temple','temple'],['Kundan & Jadau','kundan'],['Guttapusalu','guttapusalu'],['Haram & Mango Mala','haram']];
  const lengths=[['Choker','choker'],['Collar','collar'],['Princess','princess'],['Opera','opera']];
  for(const [label,style] of styles) {
    await page.getByRole('group',{name:'Filter by style',exact:true}).getByRole('button',{name:label,exact:true}).click();
    for(const [lengthLabel,length] of lengths) {
      await page.getByRole('group',{name:'Filter by length',exact:true}).getByRole('button',{name:lengthLabel,exact:true}).click();
      const ids=await page.locator('.models .card').evaluateAll(els=>els.map(e=>e.dataset.id));
      const resident=await page.evaluate(() => window.__jewellery.snapshot().resident);
      assert(ids.every(id=>id===`${style}-${length}`));
      assert.equal(ids.length, resident===`${style}-${length}`?0:1);
      filters.push({style,length,ids});
    }
    await page.getByRole('group',{name:'Filter by length',exact:true}).getByRole('button',{name:'All',exact:true}).click();
  }
  // Cycling is restricted to the filtered set.
  await page.getByRole('button',{name:'Next piece',exact:true}).click();
  await page.waitForFunction(() => !window.__jewellery.fly.active);
  const filteredNext=await page.evaluate(() => window.__jewellery.snapshot().resident);
  assert(filteredNext.startsWith('haram-'));
  await page.getByRole('button',{name:'Previous piece',exact:true}).click();
  await page.waitForFunction(() => !window.__jewellery.fly.active);
  assert((await page.evaluate(() => window.__jewellery.snapshot().resident)).startsWith('haram-'));

  // Every length is laid in the actual scroll-driven case and examined with its lid open.
  for(const [_,length] of lengths) {
    await page.evaluate(length => {const a=window.__jewellery;a.select(a.variants.findIndex(p=>p.style==='temple'&&p.length===length)); const el=document.querySelector('.keepsake');window.__lenis.scrollTo(el.offsetTop+(el.offsetHeight-innerHeight)*0.32,{immediate:true});},length);
    await page.waitForTimeout(1000);
    const pose=await page.evaluate(() => ({drape:window.__S.drape,ny:window.__S.ny,lid:window.__S.lid}));
    assert(pose.drape<0.01);
    const filename=`case-${length}.png`;
    await page.screenshot({path:path.join(output,filename)});screens.push(filename);
  }
  await page.evaluate(() => {const el=document.querySelector('.keepsake');window.__lenis.scrollTo(el.offsetTop+(el.offsetHeight-innerHeight)*0.70,{immediate:true});});
  await page.waitForTimeout(700);
  await page.screenshot({path:path.join(output,'case-closed.png')});
  await page.evaluate(() => window.__lenis.scrollTo('#collection',{immediate:true}));
  await page.waitForTimeout(500);
  const frameTimes=await page.evaluate(() => new Promise(resolve => {const deltas=[];let last;function next(t){if(last)deltas.push(t-last);last=t;if(deltas.length<120)requestAnimationFrame(next);else resolve(deltas);}requestAnimationFrame(next);}));
  const sorted=[...frameTimes].sort((a,b)=>a-b);
  const performance={medianFrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],frames:sorted.length,dpr:await page.evaluate(()=>window.__jewellery.snapshot().renderer.dpr)};
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(() => {window.__ST.refresh();window.__lenis.scrollTo('#collection',{immediate:true});});
  await page.waitForTimeout(1000);
  await page.screenshot({path:path.join(output,'mobile-collection.png')});
  const mobile=await page.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth,filters:[...document.querySelectorAll('.models__filter-row')].map(e=>e.getBoundingClientRect().right<=innerWidth+1),canvas:!!document.querySelector('canvas')}));
  assert.equal(mobile.overflow,false);
  assert(mobile.filters.every(Boolean));
  await page.evaluate(() => window.__lenis.scrollTo(0,{immediate:true}));
  await page.waitForTimeout(900);
  await page.screenshot({path:path.join(output,'mobile-hero.png')});
  const report={errors,warnings:[...new Set(warnings)],gpu,geometry,drawCalls,flights,filters,filteredNext,performance,mobile,screens};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({errors:report.errors,warnings:report.warnings,gpu,drawCalls,flights:flights.map(f=>({id:f.id,takeoffError:f.takeoffError,maxPenetrations:Math.max(...f.samples.flatMap(s=>s.clearance.map(c=>c.penetrations)))})),filterChecks:filters.length,performance,mobile},null,2));
  await browser.close();
  clearTimeout(watchdog);
  assert.equal(errors.length,0);
})().catch(e=>{console.error(e);process.exit(1);});
