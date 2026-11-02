import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { withConstruct } from './lib/construct-client.mjs';

const project = new URL('../', import.meta.url);
const art = new URL('../assets/generated/pixel-mine/', import.meta.url);
import { START_SCRIPT, registerScripts } from './lib/scripts.mjs';
registerScripts();
await withConstruct(async ({ call }) => {
  const listed = await call('list_objects');
  for (const name of ['Selection', 'GaugeNeedle', 'MineDrill', 'RelicRing', 'RelicIdol', 'RelicFossil', 'BoostFuel', 'BoostDynamite', 'BoostDrill', 'SoundButton', 'CampBackdrop', 'ScanMark', 'GoalFill']) {
    if (!listed.objects.includes(name)) await call('create_object', { name, pluginId: 'Sprite' });
  }
  if (!listed.objects.includes('LootText')) await call('create_object', { name: 'LootText', pluginId: 'Text' });
  if (!listed.objects.includes('UIText')) await call('create_object', { name: 'UIText', pluginId: 'Text' });
  const assets = [
    ['Backdrop', 'backdrop.png', 720, 1280],
    ...['GemRed', 'GemGreen', 'GemBlue', 'GemYellow', 'GemPurple'].map(name => [name, `${name}.png`, 64, 64]),
    ['Selection', 'selection.png', 64, 64], ['GaugeNeedle', 'needle.png', 76, 8], ['MineDrill', 'drill.png', 63, 32],
    ['Spark', 'dust.png', 14, 14],
    ...['RelicRing', 'RelicIdol', 'RelicFossil', 'BoostFuel', 'BoostDynamite', 'BoostDrill'].map(name => [name, `${name}.png`, 64, 64]),
    ['SoundButton', 'sound-0.png', 64, 64],
    ['CampBackdrop', 'camp.png', 720, 1280], ['ScanMark', 'scan.png', 64, 64], ['GoalFill', 'goal.png', 4, 4],
  ];
  for (const [objectName, file, width, height] of assets) {
    const pngBase64 = (await readFile(new URL(file, art))).toString('base64');
    await call('replace_sprite_image', { objectName, animationName: 'Animation 1', frameIndex: 0, pngBase64, width, height });
    console.log(`Imported ${objectName}`);
  }
  const soundButton = await call('get_object_details', { name: 'SoundButton' });
  if (soundButton.animations.items[0].frames.length < 2) await call('add_frame_to_animation', { objectName: 'SoundButton', animationName: 'Animation 1', width: 64, height: 64 });
  await call('replace_sprite_image', { objectName: 'SoundButton', animationName: 'Animation 1', frameIndex: 1, pngBase64: (await readFile(new URL('sound-1.png', art))).toString('base64'), width: 64, height: 64 });
  await call('update_frame', { objectName: 'GaugeNeedle', animationName: 'Animation 1', frameIndex: 0, originX: 0, originY: 0.5 });
  await call('update_frame', { objectName: 'GoalFill', animationName: 'Animation 1', frameIndex: 0, originX: 0, originY: 0.5 });
  const layout = await call('get_layout_details', { name: 'Play' });
  const instances = layout.layers.flatMap(layer => layer.instances);
  for (const options of [
    { objectType: 'GaugeNeedle', x: 133, y: 1154, width: 76, height: 8, originX: 0, originY: 0.5 },
    { objectType: 'MineDrill', x: 535, y: 928, width: 126, height: 64 },
    { objectType: 'SoundButton', x: 288, y: 56, width: 64, height: 64 },
    { objectType: 'CampBackdrop', x: 360, y: 640, width: 720, height: 1280 },
    { objectType: 'LootText', x: 292, y: 1126, width: 388, height: 22, originX: 0, originY: 0, properties: { text: 'Находки скрыты под рудой', font: 'Verdana', size: 13, bold: false, color: [0.98, 0.94, 0.81, 1], 'horizontal-alignment': 'center', 'vertical-alignment': 'center' } },
  ]) {
    if (!instances.some(instance => instance.type === options.objectType)) {
      await call('add_instance_to_layout', { layoutName: 'Play', layerName: 'Game', ...options });
    }
  }
  const sheet = JSON.parse(await readFile(new URL('eventSheets/Game.json', project), 'utf8'));
  const block = sheet.events.find(event => event.actions?.some(action => action.type === 'script'));
  await call('update_event_block', {
    sheetName: 'Game', sid: block.sid,
    removeActionIndices: block.actions.flatMap((action, index) => action.type === 'script' ? [index] : []),
    addActions: [{ type: 'script', language: 'javascript', script: START_SCRIPT }],
  });
  await call('update_project_metadata', {
    name: 'I Dig It: Pixel Mine',
    description: 'Mining contracts, persistent workshop, capped upgrade builds and fair seeded daily challenges. CC0 material art by acdrnx and gearshocky; sounds by Kenney.',
  });
});

// MCP has no Text-instance property setter. Keep this small, explicit edit here.
const layoutPath = new URL('layouts/Play.json', project);
await copyFile(layoutPath, new URL('layouts/Play.json.bak', project));
const layout = JSON.parse(await readFile(layoutPath, 'utf8'));
const settings = {
  ScoreText: { x: 522, y: 20, width: 172, height: 72, size: 30, bold: true, text: '0' },
  MovesText: { x: 56, y: 1168, width: 154, height: 66, size: 34, bold: true, text: '20' },
  StatusText: { x: 126, y: 860, width: 330, height: 96, size: 16, bold: true, text: 'Выбери две соседние жилы.' },
  LootText: { x: 292, y: 1126, width: 388, height: 22, size: 13, bold: false, text: 'Находки скрыты под рудой' },
};
for (const layer of layout.layers) for (const instance of layer.instances) {
  const option = settings[instance.type];
  if (!option) continue;
  for (const key of ['x', 'y', 'width', 'height']) instance.world[key] = option[key];
  instance.world.color = [1, 1, 1, 1];
  Object.assign(instance.properties, { text: option.text, size: option.size, bold: option.bold, color: [0.98, 0.94, 0.81, 1] });
}
const gameLayer = layout.layers.find(layer => layer.name === 'Game');
const camp = gameLayer.instances.find(instance => instance.type === 'CampBackdrop');
const sound = gameLayer.instances.find(instance => instance.type === 'SoundButton');
gameLayer.instances = gameLayer.instances.filter(instance => !['CampBackdrop', 'SoundButton'].includes(instance.type));
gameLayer.instances.push(camp, sound);
await writeFile(layoutPath, JSON.stringify(layout, null, '\t') + '\n');
const projectPath = new URL('project.c3proj', project);
const metadata = JSON.parse(await readFile(projectPath, 'utf8'));
metadata.properties.sampling = 'nearest';
metadata.properties.pixelRounding = true;
await mkdir(new URL('files/', project), { recursive: true });
const samples = { select: 'impactGeneric_light_000.ogg', swap: 'impactMetal_light_000.ogg', dig: 'impactMining_000.ogg', find: 'impactGlass_light_001.ogg', boost: 'impactBell_heavy_001.ogg' };
for (const [cue, original] of Object.entries(samples)) {
  const name = `mine-${cue}.ogg`;
  await copyFile(new URL(`../assets/source/impact-sounds/Audio/${original}`, import.meta.url), new URL(`files/${name}`, project));
  if (!metadata.rootFileFolders.general.items.some(item => item.name === name)) metadata.rootFileFolders.general.items.push({
    name, type: 'audio/ogg', sid: Number(BigInt('0x' + randomBytes(6).toString('hex'))), 'file-info': { purpose: 'none' },
  });
}
await copyFile(new URL('../assets/source/GolosText.ttf', import.meta.url), new URL('files/GolosText.ttf', project));
if (!metadata.rootFileFolders.general.items.some(item => item.name === 'GolosText.ttf')) metadata.rootFileFolders.general.items.push({ name: 'GolosText.ttf', type: 'font/ttf', sid: Number(BigInt('0x' + randomBytes(6).toString('hex'))), 'file-info': { purpose: 'none' } });
await copyFile(new URL('../assets/source/GolosText-OFL.txt', import.meta.url), new URL('files/GolosText-OFL.txt', project));
if (!metadata.rootFileFolders.general.items.some(item => item.name === 'GolosText-OFL.txt')) metadata.rootFileFolders.general.items.push({ name: 'GolosText-OFL.txt', type: 'text/plain', sid: Number(BigInt('0x' + randomBytes(6).toString('hex'))), 'file-info': { purpose: 'none' } });
await writeFile(projectPath, JSON.stringify(metadata, null, '\t') + '\n');
console.log('Pixel mine installed; engine, layout and art agree.');
