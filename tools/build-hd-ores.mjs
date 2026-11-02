// Draws the ore sprites in high resolution from the Openclipart mineral and
// gem sets (OCAL, CC0, vector): every ore becomes a 256 px frame, the drill
// keeps its frame. Run after the art pipeline (apply-stage1, upscale-art).
// Needs @resvg/resvg-js: RESVG=<dir with node_modules> node tools/build-hd-ores.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const project = new URL('../', import.meta.url);
const require = createRequire((process.env.RESVG || '.') + '/');
const { Resvg } = require('@resvg/resvg-js');
const SIZE = 256, hd = new URL('../assets/source/hd/', import.meta.url);
// Ore id -> source file and an optional tint for the grey rock.
// Ores that share a layer get clearly different colours: a match-3 piece is read by colour first.
const SOURCES = {
  coal: ['mineral/scalable/ore_coal.svg'], copper: ['mineral/scalable/ore_grayscale.svg', '#ef7d22'],
  iron: ['mineral/scalable/ore_grayscale.svg', '#b8392f'], gold: ['mineral/scalable/ore_grayscale.svg', '#ffd23a'],
  llanite: ['mineral/scalable/krohnkite.svg'], silver: ['mineral/scalable/ore_silver.svg'],
  turquoise: ['gem/scalable/birthstone_beryl_01.svg', '#2fd0c0'], malachite: ['gem/scalable/birthstone_peridot_01.svg'],
  cinnabar: ['gem/scalable/birthstone_carnelian_01.svg', '#e0283a'], platinum: ['mineral/scalable/ore_grayscale.svg', '#a8d8ff'],
  bluetopaz: ['gem/scalable/birthstone_sapphire_01.svg'], citrine: ['gem/scalable/birthstone_topaz_01.svg', '#ff9a1a'],
  garnet: ['gem/scalable/birthstone_garnet_01.svg'], crystal: ['gem/scalable/diamond.svg'],
  amethyst: ['gem/scalable/birthstone_amethyst_01.svg'], emerald: ['gem/scalable/emerald.svg']
};
// A second cue besides colour: a small mark in the corner, different for
// every ore that shares a layer (circle, triangle, square, star, diamond, cross).
const MARKS = {
  coal: 'circle', copper: 'triangle', iron: 'square', gold: 'star', llanite: 'diamond', silver: 'cross',
  turquoise: 'circle', malachite: 'diamond', cinnabar: 'triangle', platinum: 'cross', bluetopaz: 'diamond',
  citrine: 'square', garnet: 'star', crystal: 'circle', amethyst: 'triangle', emerald: 'square'
};
const config = await readFile(new URL('scripts/pixel-mine/config.js', project), 'utf8');
const ids = [...config.slice(config.indexOf('export var ORES'), config.indexOf('];', config.indexOf('export var ORES'))).matchAll(/id: '(\w+)'/g)].map(m => m[1]);
for (const [index, id] of ids.entries()) {
  const [file, tint] = SOURCES[id];
  const svg = await readFile(new URL(file, hd), 'utf8');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE - 24 } }).render().asPng();
  const tmp = new URL(`../assets/source/hd/render-${id}.png`, import.meta.url);
  await writeFile(tmp, png);
  // Centre on a 256 square, tint the grey rock, keep the alpha.
  execFileSync('py', ['-c', `
import sys
from PIL import Image, ImageOps, ImageChops, ImageEnhance
src=Image.open(sys.argv[1]).convert('RGBA'); tint=sys.argv[3]
if tint:
    g=ImageOps.autocontrast(ImageOps.grayscale(src)).convert('RGB'); col=ImageEnhance.Brightness(ImageChops.multiply(g,Image.new('RGB',src.size,tint))).enhance(1.35).convert('RGBA'); col.putalpha(src.getchannel('A')); src=col
out=Image.new('RGBA',(${SIZE},${SIZE}),(0,0,0,0)); out.paste(src,((${SIZE}-src.width)//2,(${SIZE}-src.height)//2),src)
from PIL import ImageDraw
import math
d=ImageDraw.Draw(out); cx,cy,R=${SIZE}-34,${SIZE}-34,30
d.ellipse((cx-R,cy-R,cx+R,cy+R),fill=(17,23,25,235),outline=(250,240,207,255),width=4)
m=sys.argv[4]; w=(250,240,207,255); k=16
if m=='circle': d.ellipse((cx-k,cy-k,cx+k,cy+k),fill=w)
elif m=='square': d.rectangle((cx-k+2,cy-k+2,cx+k-2,cy+k-2),fill=w)
elif m=='triangle': d.polygon([(cx,cy-k-2),(cx+k+2,cy+k-2),(cx-k-2,cy+k-2)],fill=w)
elif m=='diamond': d.polygon([(cx,cy-k-3),(cx+k+1,cy),(cx,cy+k+3),(cx-k-1,cy)],fill=w)
elif m=='cross': d.rectangle((cx-5,cy-k-1,cx+5,cy+k+1),fill=w); d.rectangle((cx-k-1,cy-5,cx+k+1,cy+5),fill=w)
elif m=='star': d.polygon([(cx+math.cos(math.radians(-90+i*36))*(k+3 if i%2==0 else 8), cy+math.sin(math.radians(-90+i*36))*(k+3 if i%2==0 else 8)) for i in range(10)],fill=w)
out.save(sys.argv[2])
`, tmp.pathname.replace(/^\/(\w:)/, '$1'), new URL(`images/ore-animation 1-${String(index).padStart(3, '0')}.png`, project).pathname.replace(/^\/(\w:)/, '$1').replace(/%20/g, ' '), tint || '', MARKS[id]]);
}
const typePath = new URL('objectTypes/Ore.json', project);
const type = JSON.parse(await readFile(typePath, 'utf8'));
// Ore frames, and the drill frame, are drawn at 256 from now on.
const drill = type.animations.items[0].frames[ids.length];
const drillImage = new URL(`images/ore-animation 1-${String(ids.length).padStart(3, '0')}.png`, project).pathname.replace(/^\/(\w:)/, '$1').replace(/%20/g, ' ');
if (drill.width !== SIZE) execFileSync('py', ['-c', `from PIL import Image; import sys; i=Image.open(sys.argv[1]); i.resize((${SIZE},${SIZE}), Image.NEAREST).save(sys.argv[1])`, drillImage]);
for (const frame of type.animations.items[0].frames) { frame.width = SIZE; frame.height = SIZE; }
await writeFile(typePath, JSON.stringify(type, null, '\t'));
console.log('ok   ' + ids.length + ' ores drawn at ' + SIZE + ' px');
