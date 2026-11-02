// Copies the cockpit icons (Mining Gfx, CC0) and the game font into the project files and
// registers them, the way apply-stage1 ships the building icons.
// Usage: node tools/ship-icons.mjs
import { copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const project = new URL('../', import.meta.url);
const from = new URL('../assets/source/mining-gfx/Mining-Gfx/AtlasSingle/', import.meta.url);
export const ICONS = {
  dynamite: 'item/item_dynamite0.png', cutter: 'item/item_sabber.png', borer: 'item/item_drill.png', magnet: 'item/item_goldenpick.png',
  seismo: 'item/item_altimeter.png', shuffle: 'item/item_blockgroup.png', reserve: 'item/item_energydrink.png', rush: 'item/item_jetpack.png',
  lock: 'item/r-overlay_locked.png', soundon: 'gui_soundon.png', soundoff: 'gui_soundoff.png'
};
const projectFile = new URL('project.c3proj', project);
const raw = await readFile(projectFile, 'utf8');
const metadata = JSON.parse(raw);
for (const [id, source] of Object.entries(ICONS)) {
  const name = 'i-' + id + '.png';
  await copyFile(new URL(source, from), new URL('files/' + name, project));
  if (!metadata.rootFileFolders.general.items.some(item => item.name === name)) metadata.rootFileFolders.general.items.push({ name, type: 'image/png', sid: Number(BigInt('0x' + randomBytes(6).toString('hex'))), 'file-info': { purpose: 'none' } });
}
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(projectFile, JSON.stringify(metadata, null, '\t').replace(/\n/g, eol) + (raw.endsWith('\n') ? eol : ''));
console.log('ok   ' + Object.keys(ICONS).length + ' cockpit icons shipped');

// The game fonts (Press Start 2P and Handjet, SIL OFL) replace Tiny5, Ark Pixel and Pixelify.
const fontDir = new URL('../assets/source/fonts-game/', import.meta.url);
const meta2 = JSON.parse(await readFile(projectFile, 'utf8'));
const retired = ['Tiny5-ru.ttf', 'ArkPixel12-ru.ttf', 'tiny5-OFL.txt', 'ark-pixel-OFL.txt', 'PixelifySans-Bold-ru.ttf', 'PixelifySans-ru.ttf', 'pixelify-OFL.txt'];
meta2.rootFileFolders.general.items = meta2.rootFileFolders.general.items.filter(item => !retired.includes(item.name));
for (const name of retired) await rm(new URL('files/' + name, project), { force: true });
for (const [name, type] of [['PressStart2P-ru.ttf', 'font/ttf'], ['Handjet-ru.ttf', 'font/ttf'], ['pressstart2p-OFL.txt', 'text/plain'], ['handjet-OFL.txt', 'text/plain']]) {
  await copyFile(new URL(name, fontDir), new URL('files/' + name, project));
  if (!meta2.rootFileFolders.general.items.some(item => item.name === name)) meta2.rootFileFolders.general.items.push({ name, type, sid: Number(BigInt('0x' + randomBytes(6).toString('hex'))), 'file-info': { purpose: 'none' } });
}
await writeFile(projectFile, JSON.stringify(meta2, null, '\t').replace(/\n/g, eol) + (raw.endsWith('\n') ? eol : ''));
console.log('ok   game fonts shipped, old fonts retired');
