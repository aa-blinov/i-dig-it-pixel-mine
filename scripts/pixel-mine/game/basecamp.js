// Actions on the base screen: choosing a cell, building, upgrading and
// collecting what the buildings earned. The rules are in model/base.js.
import { build, collect, upgrade } from "../model/base.js";
import { artifact, swapForMissing } from "../model/collections.js";
import { baseBonuses } from "../model/base.js";
import { claim, launch } from "../model/fleet.js";
import { makeGift } from "../model/gifts.js";
import { saveProfile } from "../model/profile.js";
import { playSfx } from "./audio.js";
import { updateInterface } from "../ui/canvas-ui.js";

function done(engine, result) {
  engine.baseMessage = result.message;
  saveProfile(engine);
  updateInterface(engine);
  if (result.ok) playSfx(engine, 'find');
  return result;
}

export function selectBaseCell(engine, x, y) {
  engine.baseCell = { x: x, y: y };
  engine.baseMessage = '';
  updateInterface(engine);
}

export function buildAt(engine, type) {
  if (!engine.baseCell) return { ok: false, message: 'Выбери клетку' };
  return done(engine, build(engine.profile, type, engine.baseCell.x, engine.baseCell.y, engine.host.now()));
}

export function upgradeBuilding(engine, id) {
  return done(engine, upgrade(engine.profile, id, engine.host.now()));
}

export function collectIncome(engine) {
  var amount = collect(engine.profile, engine.host.now());
  return done(engine, { ok: amount > 0, message: amount > 0 ? 'Забрано ' + amount + ' руды' : 'Пока нечего забирать' });
}

// The lab: take or drop an ability, within the slots the lab gives.
export function toggleAbility(engine, id, slots) {
  var list = engine.profile.abilities, at = list.indexOf(id);
  if (at >= 0) list.splice(at, 1);
  else if (list.length < slots) list.push(id);
  else { engine.labMessage = 'Все слоты заняты, сначала убери способность'; updateInterface(engine); return; }
  engine.labMessage = '';
  saveProfile(engine);
  updateInterface(engine);
}

export function swapArtifact(engine, id) {
  var result = swapForMissing(engine.profile.collection, id);
  engine.collectionMessage = result.message;
  saveProfile(engine);
  updateInterface(engine);
  if (result.ok) playSfx(engine, 'find');
}

// The fleet: send a ship with one miner, collect it when it is back.
export function sendShip(engine, shipId, layer, hours) {
  var result = launch(engine.profile, baseBonuses(engine.profile.base).ships, shipId, layer, hours, engine.host.now());
  engine.fleetMessage = result.message;
  saveProfile(engine);
  updateInterface(engine);
  if (result.ok) playSfx(engine, 'swap');
}

export function claimShip(engine, id) {
  var result = claim(engine.profile, id, engine.host.now());
  engine.fleetMessage = result.message + (result.artifact ? '. Привёз: ' + artifact(result.artifact).name : '');
  saveProfile(engine);
  updateInterface(engine);
  if (result.ok) playSfx(engine, 'find');
}

// A gift: one spare copy becomes a code, copied for the player to send.
export function giftArtifact(engine, id) {
  var result = makeGift(engine.profile, id, engine.host.now());
  engine.collectionMessage = result.ok ? 'Код подарка: ' + result.code + '. Отправь его другу' : result.message;
  saveProfile(engine);
  updateInterface(engine);
  if (result.ok && globalThis.navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(result.code).catch(function () {});
}

export function showTab(engine, tab) {
  engine.baseTab = tab;
  // A tab stays highlighted as new until the player opens it once.
  if (engine.profile.seenTabs.indexOf(tab) < 0) { engine.profile.seenTabs.push(tab); saveProfile(engine); }
  updateInterface(engine);
}
