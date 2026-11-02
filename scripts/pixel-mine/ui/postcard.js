// A postcard of the base: a PNG the player saves and sends to friends.
// It shows the base grid, the collection and the contracts done.
import { BASE_SIZE, BUILDINGS, CONTRACTS } from "../config.js";
import { ARTIFACTS, ownedCount } from "../model/collections.js";
import { updateInterface } from "./canvas-ui.js";

var COLOURS = { storage: '#7a5a34', smelter: '#b5562f', autodrill: '#5f7480', generator: '#c79a3b', quarters: '#6d5a7a', lift: '#4f6d58', lab: '#3f6f8f', museum: '#8a6f4a', dock: '#355c6e' };

export function drawPostcard(ctx, profile) {
  var W = 720, cell = 88, x0 = (W - cell * BASE_SIZE) / 2, y0 = 150;
  ctx.fillStyle = '#1c2427'; ctx.fillRect(0, 0, W, 900);
  ctx.fillStyle = '#edc271'; ctx.font = '40px "Pixel Mine Title", monospace'; ctx.textAlign = 'center';
  ctx.fillText('Привет с базы', W / 2, 70);
  ctx.fillStyle = '#faf0cf'; ctx.font = '22px "Pixel Mine", monospace';
  ctx.fillText('I Dig It: Pixel Mine', W / 2, 108);
  for (var y = 0; y < BASE_SIZE; y++) for (var x = 0; x < BASE_SIZE; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#2b3438' : '#263034';
    ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
  }
  profile.base.buildings.forEach(function (b) {
    var def = BUILDINGS[b.type], w = def.w * cell;
    ctx.fillStyle = COLOURS[b.type] || '#4b5559';
    ctx.fillRect(x0 + b.x * cell + 4, y0 + b.y * cell + 4, w - 8, cell - 8);
    ctx.fillStyle = '#fff6dc'; ctx.font = '16px "Pixel Mine", monospace';
    ctx.fillText(def.name.slice(0, def.w > 1 ? 12 : 6), x0 + b.x * cell + w / 2, y0 + b.y * cell + cell / 2 + 6);
  });
  ctx.fillStyle = '#faf0cf'; ctx.font = '26px "Pixel Mine", monospace';
  ctx.fillText('Контрактов: ' + profile.completed + ' из ' + CONTRACTS.length, W / 2, 740);
  ctx.fillText('Коллекция: ' + ownedCount(profile.collection) + ' из ' + ARTIFACTS.length, W / 2, 784);
  ctx.fillStyle = '#9aa59f'; ctx.font = '20px "Pixel Mine", monospace';
  ctx.fillText('Копай со мной', W / 2, 850);
}

export function savePostcard(engine) {
  if (!globalThis.document) return;
  var canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 900;
  drawPostcard(canvas.getContext('2d'), engine.profile);
  var link = document.createElement('a');
  link.download = 'pixel-mine-base.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  engine.collectionMessage = 'Открытка сохранена, отправь её друзьям';
  updateInterface(engine);
}
