const {chromium}=require('C:/Users/kalai/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://localhost:3000',{waitUntil:'networkidle'});await page.waitForTimeout(8000);
 await page.evaluate(()=>window.__lenis.scrollTo('#collection',{immediate:true}));await page.waitForTimeout(2500);
 console.log('render cost',await page.evaluate(()=>window.__jewellery.measureFrameCost()));
 const sample=()=>page.evaluate(()=>new Promise(resolve=>{let p;const a=[];function f(t){if(p)a.push(t-p);p=t;if(a.length<90)requestAnimationFrame(f);else{a.sort((x,y)=>x-y);resolve({median:a[45],p95:a[85]});}}requestAnimationFrame(f);}));
 console.log('before',await sample());
 await page.addStyleTag({content:'.grain {display:none} .pill {backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'});
 await page.waitForTimeout(800);
 console.log('without grain and backdrop blur',await sample());
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
