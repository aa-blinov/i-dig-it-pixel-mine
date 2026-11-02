// The shift cycle: base, contract or daily round, settlement, shop and sharing.
import { CONTRACTS, MODULES, UNLOCKS } from "../config.js";
import { replayRate, settleShift } from "../model/economy.js";
import { baseBonuses } from "../model/base.js";
import { loadout } from "../model/abilities.js";
import { completedSets } from "../model/collections.js";
import { playSfx } from "./audio.js";
import { disposeRound, startGame } from "./board.js";
import { contractSetup } from "../model/contracts.js";
import { dailyCode, seededRandom, validChallengeCode } from "../model/challenge.js";
import { dailyCard, moveGains } from "../model/daily-card.js";
import { buyModule, equipModule, saveProfile } from "../model/profile.js";
import { updateInterface } from "../ui/canvas-ui.js";

export function openCamp(engine, message) {
  disposeRound(engine);
  if (engine.goalFill) { engine.goalFill.destroy(); engine.goalFill = null; }
  engine.selected = -1; engine.cursor = 0; engine.swap = null;
  engine.toast = ''; engine.toastTimer = 0; engine.pendingFinds = []; engine.revealTimer = 0;
  engine.phase = 'base'; engine.campMessage = message || engine.campMessage || ''; engine.shopMessage = '';
  setCampVisible(engine, true); updateInterface(engine);
}

export function beginRound(engine, mode, challenge) {
  engine.mode = mode === 'daily' ? 'daily' : 'contract';
  // The next contract, or an earlier one the player chose to replay.
  var next = Math.min(CONTRACTS.length, engine.profile.completed + 1);
  engine.contract = engine.mode === 'contract' && engine.chosenContract >= 1 && engine.chosenContract <= next ? engine.chosenContract : next;
  engine.setup = contractSetup(engine.mode, engine.contract);
  engine.goal = engine.setup.quota;
  // The base helps contracts; the daily challenge is the same for everyone.
  engine.bonuses = engine.mode === 'daily' ? baseBonuses({ buildings: [] }) : baseBonuses(engine.profile.base);
  engine.abilities = loadout(engine.profile.abilities, engine.bonuses.abilitySlots);
  engine.roundModules = {};
  Object.keys(MODULES).forEach(function (id) { engine.roundModules[id] = engine.mode !== 'daily' && engine.profile.equipped.indexOf(id) >= 0 ? engine.profile.upgrades[id] : 0; });
  engine.seed = engine.mode === 'daily' ? (validChallengeCode(challenge || '') ? challenge : 'PM2-' + dailyCode()) : 'C' + engine.contract + '-' + Math.floor(Math.random() * 0x7fffffff).toString(16);
  engine.rand = seededRandom(engine.seed); engine.profile.attempts++; saveProfile(engine);
  engine.campMessage = ''; engine.shopMessage = ''; engine.storyBeat = null; startGame(engine);
}

// The first request arms the exit and says what it costs; a second one within
// three seconds leaves. Classic mode simply restarts the board.
export function requestLeave(engine) {
  if (!engine.campaignEnabled) { startGame(engine); return; }
  if (engine.quotaMet && engine.phase === 'idle') { engine.phase = 'ending'; engine.endTimer = 0.6; updateInterface(engine); return; }
  if (engine.leaveTimer > 0) { engine.leaveTimer = 0; openCamp(engine, 'Смена прервана, награда не начислена'); return; }
  engine.leaveTimer = 3;
  engine.toast = 'Нажми ещё раз, чтобы уйти на базу\nДобыча этой смены пропадёт';
  engine.toastTimer = 3;
  updateInterface(engine);
}

export function finishRound(engine) {
  if (engine.rewardSettled || engine.phase === 'base' || !engine.mode) return;
  engine.rewardSettled = true;
  var daily = engine.mode === 'daily', won = !daily && engine.score >= engine.goal;
  var used = engine.setup.moves + (engine.bonuses ? engine.bonuses.fuel : 0) + engine.energyGranted - engine.moves;
  var firstWin = won && engine.contract > engine.profile.completed, replay = won && !firstWin;
  var replays = replay ? (engine.profile.replays[engine.contract] || 0) : null;
  var museumPct = engine.bonuses ? engine.bonuses.museum * completedSets(engine.profile.collection).length : 0;
  var pay = settleShift({ museumPct: museumPct, daily: daily, won: won, contract: engine.contract, score: engine.score, quota: engine.goal, finds: engine.findCount, fuelAtQuota: engine.fuelAtQuota === undefined || engine.fuelAtQuota === null ? engine.moves : engine.fuelAtQuota, used: used, replays: replays });
  var reward = pay.reward, before = engine.profile.completed;
  if (replay) engine.profile.replays[engine.contract] = replays + 1;
  engine.profile.credits = Math.min(999999, engine.profile.credits + reward);
  if (won) engine.profile.completed = Math.max(engine.profile.completed, engine.contract);
  if (firstWin) engine.storyBeat = engine.contract;
  (engine.relics || []).forEach(function (id) { engine.profile.collection[id] = (engine.profile.collection[id] || 0) + 1; });
  if (daily) { var date = engine.seed.slice(4); engine.profile.dailyBest[date] = Math.max(engine.profile.dailyBest[date] || 0, engine.score); Object.keys(engine.profile.dailyBest).sort().slice(0, -30).forEach(function (key) { delete engine.profile.dailyBest[key]; }); }
  var stars = pay.stars;
  engine.lastResult = { pay: pay, mode: engine.mode, contract: engine.contract, goal: engine.goal, score: engine.score, moves: engine.moves, seed: engine.seed, finds: engine.findCount, won: won, stars: stars, credits: reward, modules: engine.profile.equipped.map(function (id) { return MODULES[id].name + ' ' + engine.profile.upgrades[id]; }) };
  var message = daily ? 'Шахта дня: добыто ' + engine.score + ', лучший результат ' + engine.profile.dailyBest[engine.seed.slice(4)] + '. Код этой шахты можно отправить другу'
    : won ? 'Контракт ' + engine.contract + ' выполнен, мастерство ' + stars + ' из 3. Норма ' + engine.goal + ', сверх нормы ' + pay.excess + ' руды. Награда ' + reward + ' кр.' + (replay ? ' Это повтор, награда ' + Math.round(pay.rate * 100) + '%.' : '') + unlockNote(before, engine.profile.completed)
    : 'Топливо закончилось: до цели не хватило ' + Math.max(0, engine.goal - engine.score) + ' руды. ' + (reward ? 'За смену начислено ' + reward + ' кр. ' : '') + 'Контракт можно начать снова, находки и кредиты остаются';
  if (daily) { engine.lastResult.gains = moveGains(engine.moveMarks, engine.score, engine.findCount); engine.shareMessage = ''; }
  engine.lastResult.unlocks = unlockList(before, engine.profile.completed);
  engine.lastResult.replay = replay;
  saveProfile(engine);
  engine.campMessage = message;
  // With the page interface the result is a small window over the mine;
  // without it (tests, no DOM) the player goes straight to the base.
  if (engine.nativeUI) { engine.phase = 'result'; updateInterface(engine); }
  else openCamp(engine, message);
}

// A line for each system the win opened.
function unlockNote(before, after) {
  var notes = unlockList(before, after);
  return notes.length ? ' ' + notes.join('. ') : '';
}

function unlockList(before, after) {
  var notes = [];
  if (before < UNLOCKS.daily && after >= UNLOCKS.daily) notes.push('Открыта шахта дня и повтор пройденных контрактов');
  if (before < UNLOCKS.base && after >= UNLOCKS.base) notes.push('Открыта база. Плавильня приносит кредиты, подъёмник открывает места в трюме');
  if (before < UNLOCKS.workshop && after >= UNLOCKS.workshop) notes.push('Открыта мастерская. Модули для корабля и генератор с топливом');
  if (before < UNLOCKS.miners && after >= UNLOCKS.miners) notes.push('Открыто общежитие. Шахтёры спускаются с топливом');
  if (before < UNLOCKS.lab && after >= UNLOCKS.lab) notes.push('Открыта Лаборатория. Возьми динамит в смену');
  if (before < UNLOCKS.museum && after >= UNLOCKS.museum) notes.push('Открыта коллекция. Собирай наборы находок для музея');
  if (before < UNLOCKS.fleet && after >= UNLOCKS.fleet) notes.push('Открыт флот. Построй док и отправь корабль в рейс');
  if (after >= CONTRACTS.length && before < CONTRACTS.length) notes.push('Лицензия мастера получена');
  return notes;
}

// The main button of the result window: the next contract after a win, the
// same contract again after a miss, the same mine again after a daily.
export function resultNext(engine) {
  var last = engine.lastResult;
  if (!last) { openCamp(engine); return; }
  if (last.mode === 'daily') { beginRound(engine, 'daily', last.seed); return; }
  engine.chosenContract = last.won ? null : last.contract;
  beginRound(engine, 'contract');
}

// The rate a contract would pay now: 1 for the next contract, less for replays.
export function contractRate(engine, number) {
  return number > engine.profile.completed ? 1 : replayRate(engine.profile.replays[number] || 0);
}

export function chooseContract(engine, number) {
  engine.chosenContract = number;
  updateInterface(engine);
}

export function shopAction(engine, index, equip) {
  var id = ['battery', 'blast', 'scanner'][index];
  var result = equip ? equipModule(engine.profile, id) : buyModule(engine.profile, id);
  engine.shopMessage = result.message; saveProfile(engine); updateInterface(engine);
  if (result.ok) playSfx(engine, 'find');
}

export function shareResult(engine) {
  var result = engine.lastResult;
  if (!result) { engine.shopMessage = 'Сначала заверши смену'; updateInterface(engine); return; }
  if (result.mode === 'daily') { shareDaily(engine, result); return; }
  var text = 'I Dig It: Pixel Mine v2\n' + (result.mode === 'daily' ? 'Шахта дня, одинаковые условия' : 'Контракт ' + result.contract + ', ' + (result.won ? 'выполнен' : 'попытка'))
    + '\nДобыча: ' + result.score + '\nНаходки: ' + result.finds
    + (result.mode === 'daily' ? '\nКод: ' + result.seed : '\nМастерство: ' + result.stars + '/3. Шахта дня: PM2-' + dailyCode())
    + '\n' + (result.mode === 'daily' ? 'Без улучшений. Сможешь добыть больше?' : 'Сборка: ' + (result.modules.join(', ') || 'без модулей'));
  engine.shareText = text;
  if (globalThis.navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { engine.shopMessage = 'Итог скопирован, отправь его сам'; updateInterface(engine); }).catch(function () { engine.shopMessage = shareFallback(result); updateInterface(engine); });
  else { engine.shopMessage = shareFallback(result); updateInterface(engine); }
}

// The daily card goes to the phone's share sheet, or to the clipboard where
// there is none. Closing the sheet is not an error and says nothing.
function shareDaily(engine, result) {
  var text = engine.shareText = dailyCard(result);
  function done(message) { engine.shopMessage = engine.shareMessage = message; updateInterface(engine); }
  function copy() {
    if (globalThis.navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done('Итог скопирован, вставь его в чат'); }).catch(function () { done(legacyCopy(text) ? 'Итог скопирован, вставь его в чат' : shareFallback(result)); });
    else done(legacyCopy(text) ? 'Итог скопирован, вставь его в чат' : shareFallback(result));
  }
  if (globalThis.navigator && navigator.share) navigator.share({ text: text }).then(function () { done('Итог отправлен'); }).catch(function (error) { if (!error || error.name !== 'AbortError') copy(); });
  else copy();
}

// Older WebViews have no clipboard API but still copy a selected text field.
function legacyCopy(text) {
  if (!globalThis.document || !document.body || !document.execCommand) return false;
  var area = document.createElement('textarea');
  area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
  document.body.appendChild(area); area.select();
  var ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  area.remove();
  return ok;
}

// When nothing can be copied, show the one thing a friend can use: a mine code, worded as a step, not a failure.
function shareFallback(result) {
  return result.mode === 'daily' ? 'Отправь другу код ' + result.seed + ', и он сыграет это же поле' : 'Позови друга в шахту дня, код PM2-' + dailyCode();
}

export function setCampVisible(engine, visible) {
  var type = engine.runtime.objects.CampBackdrop, backdrop = type && type.getFirstInstance();
  if (backdrop) backdrop.isVisible = visible;
  if (visible && backdrop && !engine.campLayered) {
    if (backdrop.moveToTop) backdrop.moveToTop();
    Object.keys(engine.ui || {}).forEach(function (key) { if (engine.ui[key].moveToTop) engine.ui[key].moveToTop(); });
    var sound = engine.runtime.objects.SoundButton && engine.runtime.objects.SoundButton.getFirstInstance();
    if (sound && sound.moveToTop) sound.moveToTop();
    engine.campLayered = true;
  }
  if (!visible) engine.campLayered = false;
  ['ScoreText', 'MovesText', 'StatusText', 'LootText', 'GaugeNeedle', 'MineDrill'].forEach(function (name) {
    var instance = engine.runtime.objects[name] && engine.runtime.objects[name].getFirstInstance();
    if (instance) instance.isVisible = !visible;
  });
}
