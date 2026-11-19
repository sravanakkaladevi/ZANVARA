const { chromium } = require('C:/Users/kalai/node_modules/playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
  const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors = [], warnings = [];
  page.on('pageerror', e => errors.push(e.stack));
  page.on('console', msg => { if(msg.type()==='error') errors.push(msg.text()); if(msg.type()==='warning') warnings.push(msg.text()); });
  await page.goto('http://localhost:3000', {waitUntil:'networkidle'});
  await page.waitForTimeout(7000);
  await page.screenshot({path:path.resolve('tmp/catalogue-qa/hero.png')});
  await page.evaluate(() => window.__lenis.scrollTo('#collection', {immediate:true}));
  await page.waitForTimeout(4000);
  await page.screenshot({path:path.resolve('tmp/catalogue-qa/collection.png')});
  console.log(JSON.stringify({errors,warnings,dom:await page.locator('.models').evaluate(el=>({height:el.offsetHeight,panels:el.querySelectorAll('.card').length,info:el.querySelector('.models__info').innerText})),gpu:await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl2');return g.getParameter(g.RENDERER)})},null,2));
  await browser.close();
})();
