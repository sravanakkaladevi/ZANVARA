const {chromium}=require('C:/Users/kalai/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
 page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text())});
 await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
 await page.waitForTimeout(3500);
 console.log('State',await page.evaluate(()=>({title:document.title,api:!!window.__jewellery,canvas:!!document.querySelector('canvas'),text:document.body.innerText.slice(0,80)})));
 await page.waitForFunction(()=>window.__jewellery);
 fs.mkdirSync('public/collection',{recursive:true});
 const pieces=await page.evaluate(()=>window.__jewellery.variants.map(p=>p.id));
 const results=[];
 for(let i=0;i<pieces.length;i++){
   const output=path.join('public/collection',pieces[i]+'.png');
   if(fs.existsSync(output))throw new Error('Refusing to replace '+output);
   const image=await page.evaluate(i=>window.__jewellery.exportStill(i),i);
   fs.writeFileSync(output,Buffer.from(image.dataUrl.split(',')[1],'base64'));
   const metadata=await sharp(output).metadata(), stats=await sharp(output).stats();
   if(metadata.width!==2048||metadata.height!==2048||!metadata.hasAlpha||stats.channels[3].min!==0)throw new Error('Invalid export '+output);
   results.push({file:output,width:metadata.width,height:metadata.height,alpha:true,bytes:fs.statSync(output).size});
   console.log(output,metadata.width,metadata.height,'transparent');
 }
 fs.writeFileSync('tmp/catalogue-qa/exports.json',JSON.stringify(results,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
