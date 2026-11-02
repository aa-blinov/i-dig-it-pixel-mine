// Installs the stage 1 art in the Construct project: one Ore sprite with a
// frame per ore, special badges, field tiles, explosion frames, a pulse ring
// and the floating points text; retires the five per-colour gem sprites;
// replaces the backdrop; moves the ship into its tunnel and the status line
// into the cockpit. Run tools/build-stage1-art.ps1 first.
//
// Usage: node tools/apply-stage1.mjs
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { withConstruct } from './lib/construct-client.mjs';

const project = new URL('../', import.meta.url);
const art = new URL('../assets/generated/pixel-mine/', import.meta.url);
const png = async file => (await readFile(new URL(file, art))).toString('base64');

const SPRITES = [
  { name: 'Ore', frames: Array.from({ length: 17 }, (_, i) => `ore-${String(i).padStart(2, '0')}.png`), size: 64 },
  { name: 'SpecialMark', frames: ['special-0.png', 'special-1.png', 'special-2.png'], size: 64 },
  { name: 'BoardTile', frames: ['tile-0.png', 'tile-1.png'], size: 64 },
  { name: 'Blast', frames: Array.from({ length: 10 }, (_, i) => `blast-${i}.png`), size: 64 },
  { name: 'Ring', frames: ['ring.png'], size: 64 },
  { name: 'Cage', frames: ['cage.png'], size: 64 },
  { name: 'Miner', frames: ['miner-0.png', 'miner-1.png'], size: 48 },
];
const RETIRED = ['GemRed', 'GemGreen', 'GemBlue', 'GemYellow', 'GemPurple'];

await withConstruct(async ({ call }) => {
  const listed = (await call('list_objects')).objects;
  for (const sprite of SPRITES) {
    if (!listed.includes(sprite.name)) await call('create_object', { name: sprite.name, pluginId: 'Sprite' });
    const details = await call('get_object_details', { name: sprite.name });
    const animation = details.animations.items[0].name;
    for (let i = details.animations.items[0].frames.length; i < sprite.frames.length; i++) {
      await call('add_frame_to_animation', { objectName: sprite.name, animationName: animation, width: sprite.size, height: sprite.size });
    }
    for (const [index, file] of sprite.frames.entries()) {
      await call('replace_sprite_image', { objectName: sprite.name, animationName: animation, frameIndex: index, pngBase64: await png(file), width: sprite.size, height: sprite.size });
    }
    console.log(`ok   ${sprite.name}: ${sprite.frames.length} frames`);
  }
  if (!listed.includes('PopText')) await call('create_object', { name: 'PopText', pluginId: 'Text' });
  for (const name of RETIRED) if (listed.includes(name)) { await call('delete_object', { name }); console.log(`ok   retired ${name}`); }
  await call('replace_sprite_image', { objectName: 'Backdrop', animationName: 'Animation 1', frameIndex: 0, pngBase64: await png('backdrop.png'), width: 720, height: 1280 });
  console.log('ok   backdrop');
});

// The pixel fonts (SIL OFL) ship as project files with their licences, cut down
// to Latin, Cyrillic and punctuation (pyftsubset) to keep the download small.
const fonts = new URL('../assets/source/fonts-game/', import.meta.url);
const projectFile = new URL('project.c3proj', project);
const metadata = JSON.parse(await readFile(projectFile, 'utf8'));
const shipped = [['PressStart2P-ru.ttf', 'font/ttf', fonts], ['Handjet-ru.ttf', 'font/ttf', fonts], ['pressstart2p-OFL.txt', 'text/plain', fonts], ['handjet-OFL.txt', 'text/plain', fonts]];
// Building icons for the page interface of the base.
for (const id of ['storage', 'smelter', 'autodrill', 'generator', 'quarters', 'lift', 'lab', 'museum', 'dock', 'lantern', 'cart', 'rails', 'statue']) shipped.push(['b-' + id + '.png', 'image/png', art]);
for (const [name, type, from] of shipped) {
  await copyFile(new URL(name, from), new URL('files/' + name, project));
  if (!metadata.rootFileFolders.general.items.some(item => item.name === name)) metadata.rootFileFolders.general.items.push({ name, type, sid: Number(BigInt('0x' + randomBytes(6).toString('hex'))), 'file-info': { purpose: 'none' } });
}
const rawProject = await readFile(projectFile, 'utf8');
await writeFile(projectFile, JSON.stringify(metadata, null, '\t').replace(/\n/g, rawProject.includes('\r\n') ? '\r\n' : '\n') + (rawProject.endsWith('\n') ? (rawProject.includes('\r\n') ? '\r\n' : '\n') : ''));
console.log('ok   pixel fonts registered');

// MCP has no Text-instance property setter, so the layout is edited directly.
const layoutPath = new URL('layouts/Play.json', project);
const layout = JSON.parse(await readFile(layoutPath, 'utf8'));
const place = {
  MineDrill: { x: 360, y: 940 },
  StatusText: { x: 292, y: 1018, width: 370, height: 36, size: 12 },
  LootText: { x: 292, y: 1126, width: 370, height: 22 },
};
for (const layer of layout.layers) for (const instance of layer.instances) {
  const option = place[instance.type];
  if (!option) continue;
  for (const key of ['x', 'y', 'width', 'height']) if (option[key] !== undefined) instance.world[key] = option[key];
  if (option.size) instance.properties.size = option.size;
}
const raw = await readFile(layoutPath, 'utf8');
await writeFile(layoutPath, JSON.stringify(layout, null, '\t') + (raw.endsWith('\n') ? '\n' : ''));
console.log('ok   layout: ship in the tunnel, status in the cockpit');
