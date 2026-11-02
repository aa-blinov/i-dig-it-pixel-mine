// Canvas labels and the interface font.
import { CONTRACTS, MODULES } from "../config.js";
import { setCampVisible } from "../game/round.js";
import { contractCard, updateNativeInterface } from "./dom-ui.js";

export function uiText(engine, id, text, x, y, width, height, size, color, left) {
  if (!engine.runtime.objects.UIText) return;
  // The responsive semantic workshop replaces its old canvas labels.
  if (engine.nativeUI && id.indexOf('camp') === 0) return;
  engine.ui = engine.ui || {};
  var instance = engine.ui[id];
  if (!instance) {
    instance = engine.ui[id] = engine.runtime.objects.UIText.createInstance('Game', x, y);
    instance.setPosition(x, y); instance.setSize(width, height);
    instance.fontFace = engine.fontReady ? TITLE_FONT : 'Verdana';
    instance.sizePt = size; instance.isBold = false;
    instance.horizontalAlign = left ? 'left' : 'center'; instance.verticalAlign = 'center';
    if (instance.setAutoResolutionMode) instance.setAutoResolutionMode();
  }
  engine.uiColors = engine.uiColors || {};
  var tint = color || [0.98, 0.94, 0.81], tintKey = tint.join(',');
  if (instance.text !== text) instance.text = text;
  if (engine.uiColors[id] !== tintKey) { instance.fontColor = tint; engine.uiColors[id] = tintKey; }
  var visible = id.indexOf('camp') === 0 ? engine.phase === 'base' : engine.phase !== 'base';
  if (instance.isVisible !== visible) instance.isVisible = visible;
  return instance;
}

// Two game fonts (SIL OFL, shipped as project files): Press Start 2P for
// titles, numbers and buttons, Handjet for running text. Press Start 2P is very
// wide, so it is scaled down to the size the layout was drawn for.
export var TITLE_FONT = 'Pixel Mine Title', TEXT_FONT = 'Pixel Mine';
var FONT_FILES = [[TITLE_FONT, 'PressStart2P-ru.ttf', '62%'], [TEXT_FONT, 'Handjet-ru.ttf', '125%']];
var TITLE_TEXTS = ['ScoreText', 'MovesText'], BODY_TEXTS = ['StatusText', 'LootText'];

export function loadInterfaceFont(engine) {
  if (engine.fontRequested || !globalThis.FontFace || !globalThis.document || !engine.runtime.assets) return;
  engine.fontRequested = true;
  Promise.all(FONT_FILES.map(function (entry) {
    return Promise.resolve(engine.runtime.assets.getProjectFileUrl(entry[1])).then(function (url) {
      return new FontFace(entry[0], 'url("' + url + '")', /** @type {any} */ ({ sizeAdjust: entry[2] })).load();
    }).then(function (font) { document.fonts.add(font); });
  })).then(function () {
    engine.fontReady = true;
    Object.keys(engine.ui || {}).forEach(function (key) { engine.ui[key].fontFace = TITLE_FONT; });
    TITLE_TEXTS.concat(BODY_TEXTS).forEach(function (name) {
      var instance = engine.runtime.objects[name] && engine.runtime.objects[name].getFirstInstance();
      if (instance) { instance.fontFace = TITLE_TEXTS.indexOf(name) >= 0 ? TITLE_FONT : TEXT_FONT; if (instance.setAutoResolutionMode) instance.setAutoResolutionMode(); }
    });
  }).catch(function () {});
}

export function updateInterface(engine) {
  if (!engine.campaignEnabled || !engine.profile) return;
  updateNativeInterface(engine);
  var p = engine.profile, contract = Math.min(CONTRACTS.length, p.completed + 1);
  var base = engine.phase === 'base';
  setCampVisible(engine, base);
  var cockpit = !!engine.cockpit;
  uiText(engine, 'gameGoal', cockpit ? '' : engine.mode === 'daily' ? 'Шахта дня ' + engine.seed.slice(4) : engine.quotaMet ? 'Норма выполнена, сверх нормы ' + (engine.score - engine.goal) : 'Контракт ' + engine.contract + ': ' + engine.score + ' из ' + engine.goal, 104, 273, 512, 34, 17);
  uiText(engine, 'gameScoreLabel', cockpit ? '' : 'Добыча', 350, 25, 168, 60, 20);
  uiText(engine, 'gameMovesLabel', cockpit ? '' : 'Топливо', 24, 1026, 240, 38, 16);
  uiText(engine, 'gameBaseButton', cockpit ? '' : engine.quotaMet ? 'Сдать смену' : engine.leaveTimer > 0 ? 'Точно уйти?' : 'На базу', 300, 1160, 354, 54, 23);
  var banner = engine.phase === 'ending' ? (engine.quotaMet ? 'Смена сдана' : 'Топливо закончилось') : '';
  uiText(engine, 'gameBanner', banner, 60, 540, 600, 96, 34, engine.score >= engine.goal && engine.mode !== 'daily' ? [1, 0.88, 0.5] : [0.98, 0.94, 0.81]);
  if (engine.ui && engine.ui.gameBanner && engine.ui.gameBanner.moveToTop && banner && !engine.bannerRaised) { engine.ui.gameBanner.moveToTop(); engine.bannerRaised = true; }
  if (!banner) engine.bannerRaised = false;
  if (!base && !engine.goalFill && engine.runtime.objects.GoalFill) {
    engine.goalFill = engine.runtime.objects.GoalFill.createInstance('Game', 106, 305);
  }
  if (engine.goalFill) { engine.goalFill.isVisible = !base && engine.mode !== 'daily'; engine.goalFill.setSize(Math.max(2, 508 * Math.min(1, engine.score / engine.goal)), 5); }
  uiText(engine, 'campWallet', 'Кредиты: ' + p.credits, 350, 25, 340, 60, 21);
  uiText(engine, 'campTitle', p.completed === CONTRACTS.length ? 'Лицензия мастера получена' : 'База, контракт ' + contract, 44, 132, 632, 64, 27);
  var summary = contractCard(contract).join(', ') + '\n' + (engine.campMessage || 'Набери норму, а всё, что сверху, забирай себе');
  var collected = Object.keys(p.collection).length;
  uiText(engine, 'campSummary', summary + '\nКоллекция реликвий: ' + collected + '/3', 44, 206, 632, 124, 17);
  uiText(engine, 'campWorkshop', 'Мастерская · слоты ' + p.equipped.length + '/2', 44, 348, 632, 42, 21);
  ['battery', 'blast', 'scanner'].forEach(function (id, index) {
    var level = p.upgrades[id], next = Math.min(2, level + 1), y = 404 + index * 160;
    var preview = level < 2 ? 'След.: ' : '';
    var description = id === 'battery' ? preview + 'энергия +' + (3 + next) + ' топлива\nЗапас: +' + (4 + next) + ' за смену.'
      : id === 'blast' ? preview + '+' + (20 * next) + '% от взрыва.\nОбласть остаётся 3×3.'
      : preview + 'видно ' + (next + 1) + ' тайника.\nСодержимое не меняется.';
    uiText(engine, 'campModuleTitle' + index, MODULES[id].name + ' ' + level + '/2', 132, y + 8, 364, 40, 19, null, true);
    uiText(engine, 'campModuleBody' + index, description, 132, y + 54, 364, 74, 15.5, [0.81, 0.86, 0.82], true);
    var cost = MODULES[id].costs[level], affordable = level < 2 && p.credits >= cost;
    uiText(engine, 'campBuy' + index, level === 2 ? 'Максимум' : cost + ' кр.', 510, y + 12, 152, 50, 18, affordable ? [1, 0.89, 0.60] : [0.62, 0.68, 0.66]);
    uiText(engine, 'campEquip' + index, !level ? 'Закрыт' : p.equipped.indexOf(id) >= 0 ? 'Снять' : 'Надеть', 510, y + 80, 152, 48, 17, level ? [0.98, 0.94, 0.81] : [0.62, 0.68, 0.66]);
  });
  uiText(engine, 'campStatus', engine.shopMessage || 'Установи два модуля, у каждого до двух уровней', 44, 890, 632, 54, 15.5, [0.95, 0.84, 0.59]);
  uiText(engine, 'campStart', (p.completed >= CONTRACTS.length ? 'Повторить финал' : 'Начать контракт ' + contract), 44, 970, 632, 68, 25);
  uiText(engine, 'campDaily', 'Шахта дня, равные условия', 44, 1068, 632, 56, 20);
  uiText(engine, 'campShare', engine.lastResult ? 'Копировать итог' : 'Результата нет', 44, 1152, 304, 50, 18, engine.lastResult ? [0.98, 0.94, 0.81] : [0.62, 0.68, 0.66]);
  uiText(engine, 'campChallenge', 'Ввести код', 372, 1152, 304, 50, 18);
  uiText(engine, 'campHint', 'Прогресс хранится на этом устройстве', 44, 1220, 632, 34, 13, [0.81, 0.86, 0.82]);
}
