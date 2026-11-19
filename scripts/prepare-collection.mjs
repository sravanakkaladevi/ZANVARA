import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Mechanical matting for these white-background catalogue photos. No image
// generation, colour grading, symmetry correction, warping or detail synthesis.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'docs/collection-sources.json'), 'utf8'));
const outputArg = process.argv.indexOf('--output');
const outputDir = path.resolve(root, outputArg < 0 ? 'public/collection' : process.argv[outputArg + 1]);
const idArg = process.argv.indexOf('--id');
const products = idArg < 0 ? manifest.products : manifest.products.filter(p => p.id === process.argv[idArg + 1]);
assert(products.length, 'No matching products');
const originalDir = path.join(root, 'docs/collection/originals');
await fs.mkdir(originalDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

function chroma(data, i) {
  return Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
}

function matte(data, width, height, removeAttachedShadow = false) {
  const count = width * height;
  const labels = new Int32Array(count);
  const queue = new Int32Array(count);
  const components = [null];
  // Include faint pearl edges as well as coloured metal. Neutral, disconnected
  // floor shadows are rejected by the connected-component pass below.
  for (let p = 0; p < count; p++) {
    const i = p * 3;
    if (Math.min(data[i], data[i + 1], data[i + 2]) <= 251) labels[p] = -1;
  }
  for (let p = 0; p < count; p++) {
    if (labels[p] !== -1) continue;
    const label = components.length;
    const component = { area: 0, coloured: 0, strongColour: 0, minX: width, minY: height, maxX: -1, maxY: -1 };
    let head = 0, tail = 1;
    queue[0] = p;
    labels[p] = label;
    while (head < tail) {
      const current = queue[head++];
      const x = current % width, y = Math.floor(current / width);
      component.area++;
      if (chroma(data, current * 3) >= 14) component.coloured++;
      if (chroma(data, current * 3) >= 25) component.strongColour++;
      component.minX = Math.min(component.minX, x); component.maxX = Math.max(component.maxX, x);
      component.minY = Math.min(component.minY, y); component.maxY = Math.max(component.maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const next = current + dy * width + dx;
        if (labels[next] === -1) { labels[next] = label; queue[tail++] = next; }
      }
    }
    components.push(component);
  }

  const kept = new Uint8Array(components.length);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  components.forEach((component, label) => {
    if (!component || component.strongColour < 12 || component.area < 20) return;
    kept[label] = 1;
    minX = Math.min(minX, component.minX); maxX = Math.max(maxX, component.maxX);
    minY = Math.min(minY, component.minY); maxY = Math.max(maxY, component.maxY);
  });
  assert(maxX > minX && maxY > minY, 'No jewellery silhouette found');
  // Preserve detached pearl components and fine details inside the strong
  // jewellery bounds. The disconnected floor shadow lies below these bounds.
  components.forEach((component, label) => {
    if (!component || kept[label] || component.area < 8 || component.area > 15000) return;
    if (component.minX < minX || component.maxX > maxX || component.minY < minY || component.maxY > maxY) return;
    kept[label] = 1;
  });

  const mask = new Uint8Array(count);
  for (let p = 0; p < count; p++) mask[p] = kept[labels[p]] || 0;

  // Two source shadows touch their pendants through almost-white pixels.
  // Bound the mask by the actual coloured jewellery plus a six-pixel rim.
  // This keeps the antialiasing and pearl surfaces, and excludes those shadows.
  let colourMinX = width, colourMinY = height, colourMaxX = -1, colourMaxY = -1;
  for (let p = 0; p < count; p++) {
    if (!mask[p] || chroma(data, p * 3) < 20) continue;
    const x = p % width, y = Math.floor(p / width);
    colourMinX = Math.min(colourMinX, x); colourMaxX = Math.max(colourMaxX, x);
    colourMinY = Math.min(colourMinY, y); colourMaxY = Math.max(colourMaxY, y);
  }
  if (removeAttachedShadow) {
    // In the two reviewed photos with touching shadows, remove neutral pixels
    // near the pendant base unless they belong to the immediate jewellery rim.
    // Coloured stones and gold are copied unchanged; no new details are drawn.
    for (let y = Math.max(0, colourMaxY - 96); y <= Math.min(height - 1, colourMaxY + 6); y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (!mask[p] || chroma(data, p * 3) >= 20) continue;
        let nearColour = false;
        for (let dy = -6; dy <= 6 && !nearColour; dy++) for (let dx = -6; dx <= 6; dx++) {
          if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
          const next = p + dy * width + dx;
          if (mask[next] && chroma(data, next * 3) >= 20) { nearColour = true; break; }
        }
        if (!nearColour) mask[p] = 0;
      }
    }
  }
  minX = width; minY = height; maxX = -1; maxY = -1;
  for (let p = 0; p < count; p++) {
    if (!mask[p]) continue;
    const x = p % width, y = Math.floor(p / width);
    if (x < colourMinX - 6 || x > colourMaxX + 6 || y < colourMinY - 6 || y > colourMaxY + 6) { mask[p] = 0; continue; }
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }

  const rgba = Buffer.alloc(count * 4);
  let sourceColoured = 0, retainedColoured = 0, opaque = 0, modifiedOpaque = 0;
  for (let p = 0; p < count; p++) {
    const input = p * 3, output = p * 4;
    if (chroma(data, input) >= 20) { sourceColoured++; if (mask[p]) retainedColoured++; }
    if (!mask[p]) continue;
    const x = p % width, y = Math.floor(p / width);
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height || !mask[p + dy * width + dx]) { edge = true; break; }
    }
    const distance = 255 - Math.min(data[input], data[input + 1], data[input + 2]);
    const alpha = edge ? Math.min(1, Math.max(0, (distance - 1) / 16)) : 1;
    rgba[output + 3] = Math.round(alpha * 255);
    for (let channel = 0; channel < 3; channel++) {
      // Unmatte only the partially covered rim to remove white edge halos.
      rgba[output + channel] = alpha < 1 ? Math.round(Math.max(0, Math.min(255, (data[input + channel] - 255 * (1 - alpha)) / (alpha || 1)))) : data[input + channel];
      if (alpha === 1 && rgba[output + channel] !== data[input + channel]) modifiedOpaque++;
    }
    if (alpha === 1) opaque++;
  }
  assert.equal(modifiedOpaque, 0, 'Opaque source colours must be unchanged');
  assert(retainedColoured / sourceColoured > 0.999, 'Matte discarded coloured jewellery details');
  return { rgba, bounds: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }, sourceColoured, retainedColoured, opaque };
}

const reports = [];
for (const product of products) {
  const name = `bhima-${product.id}`;
  const originalPath = path.join(originalDir, `${name}.webp`);
  let original;
  try { original = await fs.readFile(originalPath); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(manifest.imageBaseUrl + product.image, { signal: AbortSignal.timeout(30000) });
    assert(response.ok, `${name}: download returned ${response.status}`);
    original = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(original).metadata();
    assert(metadata.width >= manifest.outputSize && metadata.height >= manifest.outputSize, `${name}: insufficient source resolution`);
    await fs.writeFile(originalPath, original);
  }
  const { data, info } = await sharp(original).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { rgba, bounds, sourceColoured, retainedColoured, opaque } = matte(data, info.width, info.height, product.removeAttachedShadow);
  const target = Math.round(manifest.outputSize * manifest.frameFill);
  const scale = target / Math.max(bounds.width, bounds.height);
  assert(scale <= 1, `${name}: source would need upscaling`);
  const targetWidth = Math.round(bounds.width * scale), targetHeight = Math.round(bounds.height * scale);
  const resized = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(bounds).resize(targetWidth, targetHeight).png().toBuffer();
  const output = path.join(outputDir, `${name}.png`);
  await sharp({ create: { width: manifest.outputSize, height: manifest.outputSize, channels: 4, background: '#00000000' } })
    .composite([{ input: resized, left: Math.floor((manifest.outputSize - targetWidth) / 2), top: Math.floor((manifest.outputSize - targetHeight) / 2) }])
    .png({ compressionLevel: 9 }).toFile(output);
  const metadata = await sharp(output).metadata(), stats = await sharp(output).stats();
  assert.equal(metadata.width, manifest.outputSize);
  assert.equal(metadata.height, manifest.outputSize);
  assert(metadata.hasAlpha && stats.channels[3].min === 0 && stats.channels[3].max === 255);
  const report = {
    id: product.id, sku: product.sku, title: product.title,
    file: path.relative(root, output).split(path.sep).join('/'), src: `/collection/${name}.png`,
    productUrl: `https://www.bhimagold.com/products/${encodeURI(product.productPath)}?sku=${product.sku}`,
    imageUrl: manifest.imageBaseUrl + product.image,
    originalFile: path.relative(root, originalPath).split(path.sep).join('/'),
    sourceSha256: createHash('sha256').update(original).digest('hex'),
    originalSize: [info.width, info.height], outputSize: [metadata.width, metadata.height],
    sourceCrop: bounds, frameFill: Math.max(targetWidth, targetHeight) / manifest.outputSize,
    foregroundSize: [targetWidth, targetHeight],
    centreOffset: [(Math.floor((manifest.outputSize - targetWidth) / 2) + targetWidth / 2) - manifest.outputSize / 2,
      (Math.floor((manifest.outputSize - targetHeight) / 2) + targetHeight / 2) - manifest.outputSize / 2],
    sourceColouredPixels: sourceColoured, retainedColouredPixels: retainedColoured,
    preservedOpaquePixels: opaque, outputBytes: (await fs.stat(output)).size
  };
  reports.push(report);
  console.log(`${name}.png: ${info.width} x ${info.height} -> ${metadata.width} x ${metadata.height}, ${(report.frameFill * 100).toFixed(1)}% frame, ${(retainedColoured / sourceColoured * 100).toFixed(3)}% coloured pixels retained`);
}
await fs.writeFile(path.join(outputDir, 'bhima-assets.json'), JSON.stringify({
  catalogueUrl: manifest.catalogueUrl, selection: manifest.selection,
  processing: 'Deterministic white-background matting, disconnected shadow removal, uniform downscaling and transparent padding. Opaque source RGB values are preserved before resizing. No generative edits.',
  products: reports
}, null, 2) + '\n');

if (products.length === manifest.products.length && outputDir === path.join(root, 'public/collection')) {
  const reviewDir = path.join(root, 'docs/collection');
  const relative = file => path.relative(reviewDir, path.resolve(root, file)).split(path.sep).join('/');
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const cards = reports.map(product => {
    const scale = Math.max(...product.foregroundSize) / Math.max(product.sourceCrop.width, product.sourceCrop.height);
    const paddingX = Math.floor((manifest.outputSize - product.foregroundSize[0]) / 2);
    const paddingY = Math.floor((manifest.outputSize - product.foregroundSize[1]) / 2);
    const percent = pixels => `${pixels / manifest.outputSize * 100}%`;
    const photoStyle = `width:${percent(product.originalSize[0] * scale)};height:${percent(product.originalSize[1] * scale)};left:${percent(paddingX - product.sourceCrop.left * scale)};top:${percent(paddingY - product.sourceCrop.top * scale)}`;
    return `<article data-search="${escape(product.id + ' ' + product.title)}">
      <h2>${escape(path.basename(product.file))}</h2><p>${escape(product.title)}</p>
      <div class="pair">
        <figure><div class="frame source"><img loading="lazy" style="${photoStyle}" src="${relative(product.originalFile)}" alt="Original Bhima photograph, product ${product.id}"></div><figcaption>Original photo, aligned for comparison</figcaption></figure>
        <figure><a class="frame cutout" href="${relative(product.file)}"><img loading="lazy" src="${relative(product.file)}" alt="Transparent cutout, product ${product.id}"></a><figcaption>Transparent PNG · 2048 × 2048</figcaption></figure>
      </div>
      <nav aria-label="Files for product ${product.id}"><a href="${relative(product.file)}" download>Download PNG</a><a href="${relative(product.originalFile)}">3000 × 3000 original</a><a href="${escape(product.productUrl)}" target="_blank" rel="noreferrer">Bhima product ↗</a></nav>
    </article>`;
  }).join('\n');
  await fs.writeFile(path.join(reviewDir, 'review.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bhima catalogue cutouts — source comparison</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f3ef;color:#17221e;font:15px/1.5 system-ui,sans-serif}header,main{max-width:1400px;margin:auto;padding:28px}h1{font-size:clamp(26px,4vw,42px);margin:0 0 12px}header p{max-width:850px}a{color:#185a42;text-underline-offset:3px}button,input{font:inherit}fieldset{display:inline-flex;gap:8px;border:0;margin:0;padding:0}legend{padding:0 0 8px}button{padding:8px 16px;border:1px solid #718579;background:transparent;border-radius:5px;cursor:pointer}button[aria-pressed=true]{color:white;background:#173d2b}input{display:block;margin-top:18px;padding:12px;width:min(100%,420px);border:1px solid #718579;border-radius:5px}main{padding-top:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{padding:20px;background:white;border:1px solid #deded4;border-radius:9px}article[hidden]{display:none}h2{font-size:19px;margin:0}article>p{min-height:46px;margin:8px 0 18px;color:#4b5751}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0;min-width:0}.frame{display:block;position:relative;overflow:hidden;aspect-ratio:1;border:1px solid #e4e4df;border-radius:5px}.source{background:white}.frame img{display:block;width:100%;height:100%;object-fit:contain}.source img{position:absolute;max-width:none}.cutout{background:var(--cutout-background,#14221e)}body[data-background=white]{--cutout-background:#fff}body[data-background=checker] .cutout{background-color:#fff;background-image:conic-gradient(#d4d7d4 25%,transparent 0 50%,#d4d7d4 0 75%,transparent 0);background-size:24px 24px}figcaption{font-size:12px;color:#4b5751;margin-top:8px}nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:18px;font-size:13px}@media(max-width:800px){main{grid-template-columns:1fr}header,main{padding:18px}article{padding:14px}article>p{min-height:0}}@media(prefers-reduced-motion:no-preference){button{transition:background .15s}}
</style></head><body data-background="charcoal"><header><h1>Bhima catalogue cutouts</h1>
<p>16 original product photos from the <a href="${manifest.catalogueUrl}">supplied catalogue</a>, exported as transparent 2048 × 2048 PNGs with approximately 85% frame fill. Compare the aligned photos and switch the cutout background to inspect edges and openings.</p>
<p>Processing uses a deterministic alpha mask and uniform downscaling. The photographed proportions, stones, motifs, clasps and colours are retained. No generative reconstruction or reshaping was used. Product-code filenames identify these photos; the existing procedural style and length variants have not been assigned or changed.</p>
<p><a href="${relative('public/collection/bhima-assets.json')}">Source URLs, runtime image paths and verification data</a> · <a href="contact-sheet.jpg">Contact sheet</a></p>
<fieldset><legend>Cutout background</legend><button type="button" data-background="charcoal" aria-pressed="true">Charcoal</button><button type="button" data-background="checker" aria-pressed="false">Checker</button><button type="button" data-background="white" aria-pressed="false">White</button></fieldset>
<label><span style="display:block;margin-top:18px">Find a product</span><input type="search" placeholder="Product code or description"></label></header><main>${cards}</main>
<script>document.querySelectorAll('button[data-background]').forEach(button=>button.addEventListener('click',()=>{document.body.dataset.background=button.dataset.background;document.querySelectorAll('button[data-background]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));}));document.querySelector('input').addEventListener('input',event=>{const query=event.target.value.trim().toLowerCase();document.querySelectorAll('article').forEach(article=>article.hidden=!article.dataset.search.toLowerCase().includes(query));});</script></body></html>\n`);
  const cells = [];
  for (let i = 0; i < reports.length; i++) {
    const product = reports[i], x = i % 4 * 400, y = Math.floor(i / 4) * 436;
    const photo = await sharp(path.join(root, product.file)).resize(400, 400).flatten({ background: '#14221e' }).png().toBuffer();
    const label = Buffer.from(`<svg width="400" height="36"><rect width="400" height="36" fill="#14221e"/><text x="12" y="25" fill="white" font-family="Arial" font-size="18">bhima-${product.id}.png</text></svg>`);
    cells.push({ input: photo, left: x, top: y }, { input: label, left: x, top: y + 400 });
  }
  await sharp({ create: { width: 1600, height: 1744, channels: 3, background: '#14221e' } })
    .composite(cells).jpeg({ quality: 94 }).toFile(path.join(reviewDir, 'contact-sheet.jpg'));
  console.log('Source comparison: docs/collection/review.html');
}
