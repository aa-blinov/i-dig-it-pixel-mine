// The semantic DOM interface: base, workshop, radio, result window, toolbar,
// control sheet and the accessible field.
import { BASE_SIZE, BUILDINGS, CONTRACTS, LAYERS, MODULES, UNLOCKS } from "../config.js";
var LAYER_NAMES = LAYERS.map(function (layer) { return layer.name; });
import { buildingAt, canPlace, hoursToFull, incomePerHour, isOpen, pending } from "../model/base.js";
import { buildAt, claimShip, giftArtifact, collectIncome, selectBaseCell, sendShip, showTab, swapArtifact, toggleAbility, upgradeBuilding } from "../game/basecamp.js";
import { SHIPS, TRIP_HOURS, timeLeft } from "../model/fleet.js";
import { savePostcard } from "./postcard.js";
import { ABILITIES, CHARGE_MAX } from "../model/abilities.js";
import { ARTIFACTS, CHRONICLE, RARITY_NAMES, SPARES_FOR_SWAP, completedSets, ownedCount, setComplete, setOf, spares } from "../model/collections.js";
import { baseBonuses } from "../model/base.js";
import { useAbility } from "../game/turn.js";
import { INTERFACE_HTML, guideHtml, interfaceCss } from "./dom-markup.js";
import { unlockAudio } from "../game/audio.js";
import { setSelected } from "../game/board.js";
import { describeCell } from "../game/hud.js";
import { dailyCard } from "../model/daily-card.js";
import { beginRound, chooseContract, contractRate, openCamp, requestLeave, resultNext, shareResult, shopAction } from "../game/round.js";
import { tap } from "../game/turn.js";
import { contractSetup } from "../model/contracts.js";
import { colOf, rowOf } from "../model/grid.js";
import { CONTRACT_BRIEFS, storyLines } from "../story.js";
import { enterChallenge } from "./challenge-dialog.js";
import { COCKPIT_CSS, setupCockpit, updateCockpit } from "./cockpit.js";
import { SKYLINE_CSS } from "./skyline.js";
import { INTRO, howToHtml, introSlideHtml } from "./intro.js";
import { saveProfile } from "../model/profile.js";

// "1 ход", "3 хода", "5 ходов".
export function plural(n, one, few, many) {
  var t = Math.abs(n) % 100, u = t % 10;
  if (t > 10 && t < 20) return n + ' ' + many;
  if (u === 1) return n + ' ' + one;
  if (u >= 2 && u <= 4) return n + ' ' + few;
  return n + ' ' + many;
}

// The card of a contract: where, how big, how much fuel, how much ore,
// each value under its own label so no figure has to be guessed.
export function contractCard(number) {
  var setup = contractSetup('contract', number);
  return [{ label: 'Шахта', value: setup.layerName }, { label: 'Поле', value: setup.dims.cols + '×' + setup.dims.rows }, { label: 'Ходы', value: String(setup.moves) }, { label: 'Цель', value: setup.quota + ' руды' }];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

function renderIntro(engine) {
  var intro = engine.nativeUI.querySelector('.mine-intro'), show = engine.phase === 'base' && engine.profile && !engine.profile.introSeen;
  intro.hidden = !show;
  if (!show) return;
  var step = Math.min(engine.introStep || 0, INTRO.length - 1);
  if (intro.__step !== step) { intro.__step = step; intro.querySelector('[data-intro-body]').innerHTML = introSlideHtml(step); }
  intro.querySelector('[data-intro-next]').textContent = step === INTRO.length - 1 ? 'В шахту' : 'Дальше';
  // A single card has nothing to skip.
  intro.querySelector('[data-intro-skip]').hidden = INTRO.length === 1;
}

function radioHtml(lines) {
  return lines.map(function (line) { return '<p><span class="voice">' + escapeHtml(line.voice) + '</span>' + escapeHtml(line.text) + '</p>'; }).join('');
}

// The accessible field mirrors the board, so it is rebuilt when the board changes size.
function buildGrid(engine) {
  var grid = engine.nativeUI.querySelector('[data-grid]'), dims = engine.dims;
  grid.textContent = '';
  grid.setAttribute('aria-label', 'Поле шахты: ' + dims.rows + ' строк, ' + dims.cols + ' столбцов');
  engine.nativeCells = [];
  for (var rowIndex = 0; rowIndex < dims.rows; rowIndex++) {
    var gridRow = document.createElement('div'); gridRow.className = 'mine-row'; gridRow.setAttribute('role', 'row');
    gridRow.style.gridTemplateColumns = 'repeat(' + dims.cols + ',minmax(48px,1fr))';
    grid.appendChild(gridRow);
    for (var colIndex = 0; colIndex < dims.cols; colIndex++) (function (index) {
      var cell = document.createElement('button'); cell.setAttribute('role', 'gridcell'); cell.tabIndex = index ? -1 : 0;
      cell.addEventListener('click', function () { unlockAudio(engine); tap(engine, index); updateNativeInterface(engine); });
      cell.addEventListener('keydown', function (event) {
        var next = index, column = index % dims.cols, total = dims.cols * dims.rows;
        if (event.key === 'ArrowRight') next = column < dims.cols - 1 ? index + 1 : index;
        else if (event.key === 'ArrowLeft') next = column > 0 ? index - 1 : index;
        else if (event.key === 'ArrowDown') next = Math.min(total - 1, index + dims.cols);
        else if (event.key === 'ArrowUp') next = Math.max(0, index - dims.cols);
        else return;
        event.preventDefault(); cell.tabIndex = -1; engine.nativeCells[next].tabIndex = 0; engine.nativeCells[next].focus();
      });
      gridRow.appendChild(cell); engine.nativeCells.push(cell);
    })(rowIndex * dims.cols + colIndex);
  }
  engine.nativeDims = dims.cols + 'x' + dims.rows;
}

// A project file's URL for an <img>, resolved once; the page redraws when it arrives.
function icon(engine, file) {
  engine.iconCache = engine.iconCache || {};
  if (engine.iconCache[file] !== undefined) return engine.iconCache[file];
  engine.iconCache[file] = '';
  if (engine.runtime.assets) Promise.resolve(engine.runtime.assets.getProjectFileUrl(file)).then(function (url) {
    engine.iconCache[file] = url || '';
    engine.nativeSignature = null;
    updateNativeInterface(engine);
  }).catch(function () {});
  return '';
}

function iconHtml(engine, type, size) {
  var url = icon(engine, 'b-' + type + '.png');
  return url ? '<img src="' + escapeHtml(url) + '" alt="" width="' + size + '" height="' + size + '">' : '';
}

function hoursText(hours) {
  if (hours >= 1) return Math.round(hours) + ' ч';
  return Math.max(1, Math.round(hours * 60)) + ' мин';
}

// What a building does at a level, in one line.
export function buildingEffect(type, level) {
  var def = BUILDINGS[type], i = level - 1;
  if (def.income) return def.income[i] + ' руды в час';
  if (def.capHours) return 'копит доход до ' + def.capHours[i] + ' ч';
  if (def.fuel) return '+' + plural(def.fuel[i], 'ход', 'хода', 'ходов') + ' в начале смены';
  if (def.miners) return def.miners[i] + ' ' + (def.miners[i] === 1 ? 'горняк' : 'горняка') + ' на лестнице';
  if (def.cargo) return '+' + def.cargo[i] + ' места в трюме';
  if (def.slots) return def.slots[i] + ' слота способностей';
  if (def.bonus) return '+' + def.bonus[i] + '% к руде за полный набор';
  if (def.ships) return def.ships[i] + ' ' + (def.ships[i] === 1 ? 'корабль' : 'корабля') + ' для экспедиций';
  return def.about;
}

function renderBase(engine, text) {
  var n = engine.nativeNodes, p = engine.profile, base = p.base, now = engine.host.now();
  var rate = incomePerHour(base), waiting = pending(base, now);
  var left = hoursToFull(base, now);
  // An empty base opens with a cell already picked, so the list of buildings and prices is right there.
  if (!base.buildings.length && !engine.baseCell) engine.baseCell = { x: 2, y: 2 };
  text(n.income, rate ? 'Город добывает ' + rate + ' руды в час. ' + (left <= 0 ? 'Город полон, забери руду' : 'Город полон через ' + hoursText(left)) : 'Поставь плавильню: она бесплатная и добывает руду, даже когда ты не играешь');
  text(n.collect, 'Забрать ' + waiting + ' руды');
  n.collect.disabled = waiting <= 0;
  // Before the first building there is nothing to collect: the list of buildings comes first instead.
  n.collect.hidden = !base.buildings.length;
  var basePanel = engine.nativeUI.querySelector('[data-panel="base"]');
  basePanel.classList.toggle('is-empty', !base.buildings.length);
  var html = '';
  for (var y = 0; y < BASE_SIZE; y++) for (var x = 0; x < BASE_SIZE; x++) {
    var b = buildingAt(base, x, y);
    var picked = engine.baseCell && engine.baseCell.x === x && engine.baseCell.y === y;
    if (b && b.x !== x) continue;
    if (b) {
      var def = BUILDINGS[b.type];
      html += '<button role="gridcell" data-x="' + x + '" data-y="' + y + '" aria-pressed="' + (engine.baseCell && buildingAt(base, engine.baseCell.x, engine.baseCell.y) === b) + '" aria-label="' + escapeHtml(def.name + ', уровень ' + b.level) + '" style="grid-column:span ' + def.w + '">' + iconHtml(engine, b.type, 40) + (def.decor ? '' : '<span class="lvl">' + b.level + '</span>') + '</button>';
    } else {
      html += '<button role="gridcell" class="empty" data-x="' + x + '" data-y="' + y + '" aria-pressed="' + picked + '" aria-label="Пустая клетка, строка ' + (y + 1) + ', столбец ' + (x + 1) + '">+</button>';
    }
  }
  n.basegrid.innerHTML = html;
  // One goal for the town: the cheapest building the player has not put up yet.
  var nextType = Object.keys(BUILDINGS).filter(function (type) { return isOpen(type, p.completed) && !BUILDINGS[type].decor && !base.buildings.some(function (b) { return b.type === type; }); })
    .sort(function (a, b) { return BUILDINGS[a].costs[0] - BUILDINGS[b].costs[0]; })[0];
  var goal = nextType ? 'Следующее: ' + BUILDINGS[nextType].name.toLowerCase() + (BUILDINGS[nextType].costs[0] ? ' за ' + BUILDINGS[nextType].costs[0] + ' руды, у тебя ' + p.credits : ', бесплатно') : 'Выбери клетку, чтобы построить или улучшить';
  text(n.baseStatus, engine.baseMessage || goal);
  var cell = engine.baseCell;
  n.basecell.hidden = !cell;
  if (!cell) return;
  var here = buildingAt(base, cell.x, cell.y);
  if (here) {
    var d = BUILDINGS[here.type], max = here.level >= d.costs.length;
    n.basecell.innerHTML = '<h2>' + escapeHtml(d.name) + (d.decor ? '' : ', уровень ' + here.level) + '</h2><p class="muted">' + escapeHtml(d.about) + '</p>'
      + (d.decor ? '' : '<p>Сейчас: ' + escapeHtml(buildingEffect(here.type, here.level)) + (max ? '' : '<br>Дальше: ' + escapeHtml(buildingEffect(here.type, here.level + 1))) + '</p>'
      + '<div class="mine-actions"><button class="primary" data-upgrade="' + here.id + '"' + (max || p.credits < d.costs[here.level] ? ' disabled' : '') + '>' + (max ? 'Максимальный уровень' : 'Улучшить за ' + d.costs[here.level] + ' руды') + '</button></div>');
    return;
  }
  var options = Object.keys(BUILDINGS).filter(function (type) { return isOpen(type, p.completed); }).map(function (type) {
    var d2 = BUILDINGS[type], fits = canPlace(base, type, cell.x, cell.y), cost = d2.costs[0];
    var reason = !fits ? (d2.w > 1 ? 'нужны две клетки рядом' : 'не помещается') : p.credits < cost ? 'не хватает руды' : '';
    return '<div class="mine-build">' + iconHtml(engine, type, 48) + '<div><h3>' + escapeHtml(d2.name) + (d2.w > 1 ? ' <span class="muted">2 клетки</span>' : '') + '</h3><p>' + escapeHtml(d2.decor ? d2.about : buildingEffect(type, 1)) + '</p></div>'
      + '<button data-build="' + type + '"' + (reason ? ' disabled' : '') + ' aria-label="' + escapeHtml('Построить ' + d2.name + (reason ? ', ' + reason : '')) + '">' + (cost ? 'Построить за ' + cost + ' руды' : 'Построить бесплатно') + '</button></div>';
  });
  // The first building gets a recommendation: the free storage, then a smelter next to it.
  var tip = base.buildings.length ? '' : '<p class="mine-unlock">Совет: начни с бесплатной плавильни. Позже рядом с ней встанет склад, и вместе они добудут на 20% больше</p>';
  n.basecell.innerHTML = '<h2>' + (base.buildings.length ? 'Клетка ' + 'ABCDEF'.charAt(cell.x) + (cell.y + 1) : 'Что построить') + '</h2>' + tip + options.join('');
}

function renderLab(engine) {
  var panel = engine.nativeUI.querySelector('[data-panel="lab"]'), p = engine.profile, slots = baseBonuses(p.base).abilitySlots;
  if (!slots) { panel.innerHTML = '<section class="panel"><h2>Лаборатория</h2><p>Построй лабораторию на вкладке «База», и сюда можно будет брать способности для смены</p></section>'; return; }
  panel.innerHTML = '<section class="panel"><h2>Лаборатория</h2><p class="muted">Заряд копится от каждой убранной руды. Способности не тратят ходы. Взято ' + p.abilities.length + ' из ' + slots + '</p>'
    + Object.keys(ABILITIES).map(function (id) {
      var a = ABILITIES[id], taken = p.abilities.indexOf(id) >= 0;
      return '<div class="mine-build"><span class="mine-charge">' + a.cost + '</span><div><h3>' + escapeHtml(a.name) + '</h3><p>' + escapeHtml(a.about) + '</p></div><button data-ability="' + id + '" aria-pressed="' + taken + '"' + (!taken && p.abilities.length >= slots ? ' disabled' : '') + '>' + (taken ? 'Убрать' : 'Взять') + '</button></div>';
    }).join('') + '<p role="status">' + escapeHtml(engine.labMessage || '') + '</p></section>';
}

function renderCollection(engine) {
  var panel = engine.nativeUI.querySelector('[data-panel="collection"]'), p = engine.profile, c = p.collection;
  var museum = baseBonuses(p.base).museum, sets = completedSets(c);
  var html = '<section class="panel"><h2>Коллекция</h2><p class="muted">Найдено ' + ownedCount(c) + ' из ' + ARTIFACTS.length + '. '
    + (museum ? 'Музей даёт +' + museum + '% к излишку за каждый полный набор, сейчас +' + museum * sets.length + '%' : 'Построй музей на базе, и полные наборы станут приносить процент к излишку') + '</p>'
    + '<p role="status">' + escapeHtml(engine.collectionMessage || '') + '</p><div class="mine-actions"><button data-postcard>Открытка с базы</button></div></section>';
  [0, 1, 2, 3].forEach(function (layer) {
    var items = setOf(layer), have = items.filter(function (a) { return c[a.id] > 0; }).length, spare = spares(c, layer);
    html += '<section class="panel"><h2>' + escapeHtml(LAYER_NAMES[layer]) + ' <span class="muted">' + have + ' из ' + items.length + '</span></h2>'
      + items.map(function (a) {
        var n = c[a.id] || 0;
        if (n) return '<div class="mine-build"><span class="mine-charge">' + (n > 1 ? '×' + n : '') + '</span><div><h3>' + escapeHtml(a.name) + ' <span class="muted">' + RARITY_NAMES[a.rarity] + '</span></h3><p>' + escapeHtml(a.about) + '</p></div>' + (n > 1 ? '<button data-gift="' + a.id + '">Подарить</button>' : '<span></span>') + '</div>';
        return '<div class="mine-build"><span class="mine-charge">?</span><div><h3>Не найдено <span class="muted">' + RARITY_NAMES[a.rarity] + '</span></h3><p>Лежит где-то в этом слое</p></div><button data-swap="' + a.id + '"' + (spare >= SPARES_FOR_SWAP ? '' : ' disabled') + '>Обмен: ' + SPARES_FOR_SWAP + ' лишних</button></div>';
      }).join('')
      + (setComplete(c, layer) ? '<p class="mine-unlock">' + escapeHtml(CHRONICLE[layer]) + '</p>' : '') + '</section>';
  });
  var heard = [];
  for (var beat = 0; beat <= p.completed; beat++) heard = heard.concat(storyLines(beat));
  html += '<details class="panel"><summary>Летопись: что говорили по телеграфу</summary>' + radioHtml(heard) + '</details>';
  panel.innerHTML = html;
}

function hoursLabel(h) {
  return h < 1 ? Math.round(h * 60) + ' мин' : h + ' ч';
}

function renderFleet(engine) {
  var panel = engine.nativeUI.querySelector('[data-panel="fleet"]'), p = engine.profile, now = engine.host.now();
  var count = baseBonuses(p.base).ships, deepest = Math.min(3, Math.floor(p.completed / 3));
  var html = '<section class="panel"><h2>Флот</h2><p class="muted">' + (count ? 'Корабль берёт одного шахтёра и уходит в слой. Пока он в пути, в смене на одного шахтёра меньше' : 'Построй док на базе, и у тебя появится первый корабль') + '</p>'
    + '<p role="status">' + escapeHtml(engine.fleetMessage || '') + '</p></section>';
  SHIPS.slice(0, count).forEach(function (s) {
    var trip = p.fleet.trips.filter(function (t) { return t.ship === s.id; })[0];
    html += '<section class="panel"><h2>' + escapeHtml(s.name) + ' <span class="muted">' + escapeHtml(s.about) + '</span></h2>';
    if (trip) {
      var left = timeLeft(trip, now);
      html += '<p>' + escapeHtml(LAYER_NAMES[trip.layer]) + ', ' + hoursLabel(trip.hours) + '</p>'
        + (left > 0 ? '<p class="muted">Вернётся через ' + Math.ceil(left / 60000) + ' мин</p>' : '<button data-claim="' + trip.id + '">Разгрузить</button>');
    } else {
      var layer = engine.fleetLayer && engine.fleetLayer[s.id] !== undefined ? Math.min(engine.fleetLayer[s.id], deepest) : deepest;
      html += '<div class="mine-tabs">' + LAYER_NAMES.slice(0, deepest + 1).map(function (name, i) { return '<button data-layer="' + s.id + ':' + i + '" aria-pressed="' + (i === layer) + '">' + escapeHtml(name) + '</button>'; }).join('') + '</div>'
        + '<div class="mine-tabs">' + TRIP_HOURS.map(function (h) { return '<button data-send="' + s.id + ':' + layer + ':' + h + '">' + hoursLabel(h) + '</button>'; }).join('') + '</div>';
    }
    html += '</section>';
  });
  panel.innerHTML = html;
}

function renderAbilities(engine) {
  var box = engine.nativeUI.querySelector('[data-abilities]'), list = engine.abilities || [];
  if (!list.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<span class="mine-charge" aria-label="Заряд ' + (engine.charge || 0) + ' из ' + CHARGE_MAX + '">Заряд ' + (engine.charge || 0) + '</span>'
    + list.map(function (id) {
      var a = ABILITIES[id], ready = (engine.charge || 0) >= a.cost && engine.phase === 'idle';
      return '<button data-use="' + id + '" class="' + (ready ? 'ready' : '') + '" aria-pressed="' + (engine.aiming === id) + '"' + (ready || engine.aiming === id ? '' : ' disabled') + ' aria-label="' + escapeHtml(a.name + ', ' + a.cost + ' заряда, ' + a.about) + '">' + escapeHtml(a.name) + ' ' + a.cost + '</button>';
    }).join('');
}

function setup(engine) {
  var style = document.createElement('style');
  style.textContent = interfaceCss() + COCKPIT_CSS + SKYLINE_CSS;
  document.head.appendChild(style);
  var root = engine.nativeUI = document.createElement('section'); root.id = 'mine-interface';
  root.innerHTML = INTERFACE_HTML;
  document.body.appendChild(root);
  setupCockpit(engine, function () { /** @type {HTMLElement} */ (root.querySelector('[data-open-sheet]')).click(); });
  var q = function (selector) { return root.querySelector(selector); };
  engine.nativeNodes = {
    camp: q('.mine-camp'), tools: q('.mine-tools'), sheet: q('.mine-sheet'), title: q('#mine-camp-title'), wallet: q('[data-wallet]'),
    card: q('[data-card]'), summary: q('[data-summary]'), radio: q('[data-radio]'), collection: q('[data-collection]'), slots: q('[data-slots]'),
    shop: q('[data-shop-status]'), start: q('[data-start]'), share: q('[data-share]'), status: q('[data-game-status]'), announcement: q('[data-announcement]'),
    workshop: q('[data-workshop]'), contracts: q('[data-contracts]'), contractList: q('[data-contract-list]'),
    result: q('[data-result]'), resultTitle: q('[data-result-title]'), resultStars: q('[data-result-stars]'), resultRows: q('[data-result-rows]'),
    resultRadio: q('[data-result-radio]'), resultUnlock: q('[data-result-unlock]'), resultNext: q('[data-result-next]'), hud: q('[data-hud]'),
    resultCard: q('[data-result-card]'), resultShare: q('[data-result-share]'), resultShareNote: q('[data-result-share-note]'),
    tabs: q('[data-tabs]'), income: q('[data-income]'), collect: q('[data-collect]'), basegrid: q('[data-basegrid]'), baseStatus: q('[data-base-status]'), basecell: q('[data-basecell]')
  };
  q('[data-tabs]').addEventListener('click', function (event) { var b = event.target.closest('button[data-tab]'); if (b) showTab(engine, b.getAttribute('data-tab')); });
  q('[data-collect]').addEventListener('click', function () { collectIncome(engine); });
  q('[data-panel="lab"]').addEventListener('click', function (event) { var b = event.target.closest('button[data-ability]'); if (b) toggleAbility(engine, b.getAttribute('data-ability'), baseBonuses(engine.profile.base).abilitySlots); });
  q('[data-panel="fleet"]').addEventListener('click', function (event) {
    var b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-claim')) return claimShip(engine, Number(b.getAttribute('data-claim')));
    if (b.hasAttribute('data-layer')) { var l = b.getAttribute('data-layer').split(':'); engine.fleetLayer = engine.fleetLayer || {}; engine.fleetLayer[l[0]] = Number(l[1]); return showTab(engine, 'fleet'); }
    if (b.hasAttribute('data-send')) { var s = b.getAttribute('data-send').split(':'); sendShip(engine, s[0], Number(s[1]), Number(s[2])); }
  });
  q('[data-panel="collection"]').addEventListener('click', function (event) { var b = event.target.closest('button'); if (!b) return; if (b.hasAttribute('data-swap')) swapArtifact(engine, b.getAttribute('data-swap')); if (b.hasAttribute('data-gift')) giftArtifact(engine, b.getAttribute('data-gift')); if (b.hasAttribute('data-postcard')) savePostcard(engine); });
  q('[data-abilities]').addEventListener('click', function (event) { var b = event.target.closest('button[data-use]'); if (b) { useAbility(engine, b.getAttribute('data-use')); updateNativeInterface(engine); } });
  q('[data-basegrid]').addEventListener('click', function (event) { var b = event.target.closest('button[data-x]'); if (b) selectBaseCell(engine, Number(b.getAttribute('data-x')), Number(b.getAttribute('data-y'))); });
  q('[data-basecell]').addEventListener('click', function (event) {
    var b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-build')) buildAt(engine, b.getAttribute('data-build'));
    else if (b.hasAttribute('data-upgrade')) upgradeBuilding(engine, Number(b.getAttribute('data-upgrade')));
  });
  var guide = guideHtml();
  q('[data-guide-body]').innerHTML = guide; q('[data-game-guide]').innerHTML = guide;
  engine.nativeModules = {};
  Object.keys(MODULES).forEach(function (id) {
    var row = document.createElement('section'); row.className = 'mine-module';
    row.innerHTML = '<div><h3></h3><p></p></div><div class="mine-actions"><button></button><button></button></div>';
    q('[data-modules]').appendChild(row);
    var buttons = row.querySelectorAll('button');
    engine.nativeModules[id] = { title: row.querySelector('h3'), body: row.querySelector('p'), buy: buttons[0], equip: buttons[1] };
    buttons[0].addEventListener('click', function () { shopAction(engine, Object.keys(MODULES).indexOf(id), false); });
    buttons[1].addEventListener('click', function () { shopAction(engine, Object.keys(MODULES).indexOf(id), true); });
  });
  engine.nativeCells = [];
  function sound() { unlockAudio(engine); engine.muted = !engine.muted; updateNativeInterface(engine); }
  q('[data-sound]').addEventListener('click', sound); q('[data-game-sound]').addEventListener('click', sound);
  q('[data-start]').addEventListener('click', function () { unlockAudio(engine); beginRound(engine, 'contract'); });
  q('[data-daily]').addEventListener('click', function () { unlockAudio(engine); beginRound(engine, 'daily'); });
  q('[data-share]').addEventListener('click', function () { shareResult(engine); });
  q('[data-code]').addEventListener('click', function () { enterChallenge(engine); });
  q('[data-contract-list]').addEventListener('click', function (event) {
    var button = event.target.closest('button[data-number]');
    if (button) chooseContract(engine, Number(button.getAttribute('data-number')));
  });
  var menuMain = q('[data-menu-main]'), menuSub = q('[data-menu-sub]');
  function showMenu(page) {
    menuMain.hidden = !!page; menuSub.hidden = !page;
    if (page === 'howto') q('[data-menu-body]').innerHTML = howToHtml();
    if (page === 'story') { var heard = []; for (var beat = 0; beat <= engine.profile.completed; beat++) heard = heard.concat(storyLines(beat)); q('[data-menu-body]').innerHTML = '<h1>Сюжет</h1>' + radioHtml(heard); }
    var first = (page ? menuSub : menuMain).querySelector('button'); if (first) first.focus();
  }
  q('[data-open-sheet]').addEventListener('click', function () { engine.sheetOpen = true; engine.nativeNodes.sheet.hidden = false; document.querySelectorAll('canvas').forEach(function (c) { c.inert = true; }); showMenu(null); updateNativeInterface(engine); });
  q('[data-close-sheet]').addEventListener('click', function () { engine.sheetOpen = false; engine.nativeNodes.sheet.hidden = true; document.querySelectorAll('canvas').forEach(function (c) { c.inert = false; }); updateNativeInterface(engine); engine.cockpit.querySelector('[data-ck-menu]').focus(); });
  menuSub.addEventListener('click', function (event) { if (event.target.closest('[data-menu-back]')) showMenu(null); });
  menuMain.addEventListener('click', function (event) { var b = event.target.closest('[data-menu-page]'); if (b) showMenu(b.getAttribute('data-menu-page')); });
  // The intro before the first contract: three cards, then the base.
  function introDone() { engine.profile.introSeen = true; saveProfile(engine); engine.introStep = 0; updateNativeInterface(engine); }
  q('[data-intro-skip]').addEventListener('click', introDone);
  q('[data-intro-next]').addEventListener('click', function () { engine.introStep = (engine.introStep || 0) + 1; if (engine.introStep >= INTRO.length) introDone(); else renderIntro(engine); });
  q('[data-cancel-selection]').addEventListener('click', function () { setSelected(engine, -1); updateNativeInterface(engine); });
  q('[data-leave]').addEventListener('click', function () { requestLeave(engine); updateNativeInterface(engine); });
  q('[data-result-next]').addEventListener('click', function () { unlockAudio(engine); resultNext(engine); });
  q('[data-result-base]').addEventListener('click', function () { openCamp(engine); });
  q('[data-result-share]').addEventListener('click', function () { shareResult(engine); });
  return root;
}

// The result of a shift, as a short window: a title, stars, four numbers at
// most, the radio if the story moved on, and two buttons.
function renderResult(engine, text) {
  var n = engine.nativeNodes, last = engine.lastResult, pay = last.pay || {};
  var daily = last.mode === 'daily';
  text(n.resultTitle, daily ? 'Шахта дня' : last.won ? 'Смена сдана' : 'Ходы закончились');
  n.resultStars.hidden = daily || !last.won;
  n.resultStars.innerHTML = [1, 2, 3].map(function (k) { return '<span class="' + (k <= last.stars ? '' : 'off') + '">★</span>'; }).join('');
  n.resultStars.setAttribute('aria-label', 'Звёзд ' + last.stars + ' из 3');
  var rows = [['Добыто', last.score]];
  if (daily) {
    rows.push(['Лучший результат дня', engine.profile.dailyBest[last.seed.slice(4)] || last.score]);
  } else if (last.won) {
    if (pay.bonus) rows.push(['Прибавка за звёзды, +' + pay.bonusPct + '%', '+' + pay.bonus]);
    rows.push(['В город' + (last.replay ? ', повтор ' + Math.round(pay.rate * 100) + '%' : ''), '+' + last.credits, 'gold']);
    // The stars say what they are for, so one star does not read as a telling-off.
    rows.push(['Звёзды за ходы, которые остались к цели', '', 'note']);
  } else {
    rows.push(['До цели не хватило', Math.max(0, last.goal - last.score)]);
    if (last.credits) { rows.push(['В город', '+' + last.credits, 'gold']); rows.push(['Половина добычи всё равно едет в город', '', 'note']); }
  }
  n.resultRows.innerHTML = rows.map(function (row) {
    if (row[2] === 'note') return '<dt style="grid-column:1/-1;opacity:.75;font-size:.85em;margin-top:-4px">' + escapeHtml(row[0]) + '</dt>';
    return '<dt>' + escapeHtml(row[0]) + '</dt><dd' + (row[2] ? ' class="' + row[2] + '"' : '') + '>' + escapeHtml(row[1]) + '</dd>';
  }).join('');
  var lines = engine.storyBeat === null || engine.storyBeat === undefined ? [] : storyLines(engine.storyBeat);
  n.resultRadio.hidden = !lines.length;
  n.resultRadio.innerHTML = radioHtml(lines);
  n.resultUnlock.hidden = !(last.unlocks && last.unlocks.length);
  var unlocks = last.unlocks && last.unlocks.length ? last.unlocks.join('. ') : '';
  text(n.resultUnlock, unlocks ? 'Новое: ' + unlocks.charAt(0).toLowerCase() + unlocks.slice(1) : '');
  var nextNumber = Math.min(CONTRACTS.length, engine.profile.completed + 1);
  // The daily card is shown as it will be sent, so the player knows what a friend sees.
  n.resultCard.hidden = n.resultShare.hidden = !daily;
  text(n.resultCard, daily ? dailyCard(last).split('\n').slice(3, -2).join('\n') : '');
  text(n.resultShareNote, daily ? engine.shareMessage || 'Квадрат на каждый ход: ⬛ пусто, 🟦 мало, 🟨 хорошо, ⭐ много, 💎 находка' : '');
  n.resultNext.classList.toggle('primary', !daily);
  text(n.resultNext, daily ? 'Ещё раз' : last.won ? (last.contract >= CONTRACTS.length && !last.replay ? 'Сыграть финал снова' : 'Дальше: контракт ' + nextNumber) : 'Ещё раз');
}

export function updateNativeInterface(engine) {
  if (!globalThis.document || !document.body || !document.createElement) return;
  var root = engine.nativeUI || setup(engine);
  var nodes = engine.nativeNodes, p = engine.profile, base = engine.phase === 'base', inResult = engine.phase === 'result';
  var next = Math.min(CONTRACTS.length, p.completed + 1);
  var chosen = engine.chosenContract >= 1 && engine.chosenContract <= next ? engine.chosenContract : next;
  if (!base && engine.dims && engine.nativeDims !== engine.dims.cols + 'x' + engine.dims.rows) buildGrid(engine);
  var baseWaiting = p.base ? pending(p.base, engine.host.now()) : 0;
  // The cockpit runs every tick: its move hint waits on idle time, not on a change.
  updateCockpit(engine, function (file) { return icon(engine, file); });
  var signature = JSON.stringify([!!engine.sheetOpen, p.seenTabs, p.introSeen, engine.introStep, p.collection, engine.collectionMessage, engine.charge, engine.aiming, p.abilities, engine.labMessage, engine.baseTab, engine.baseCell, engine.baseMessage, baseWaiting, p.base, engine.iconCache && Object.keys(engine.iconCache).filter(function (k) { return engine.iconCache[k]; }).length, base, engine.phase, engine.turns, engine.leaveTimer > 0, engine.quotaMet, engine.mode, engine.seed, engine.score, engine.moves, engine.findCount, engine.selected, engine.muted, engine.toast, engine.campMessage, engine.shopMessage, engine.storyBeat, engine.nativeDims, chosen, p.credits, p.completed, p.upgrades, p.equipped, p.collection, p.replays, !!engine.lastResult, engine.cells.map(function (g) { return g ? g.colour + (g.special || '') : -1; })]);
  if (engine.nativeSignature === signature) return;
  engine.nativeSignature = signature;
  function text(node, value) { if (node.textContent !== value) node.textContent = value; }

  // The shift's numbers and buttons live in the cockpit over the canvas.
  nodes.camp.hidden = !base; nodes.tools.hidden = true;
  renderIntro(engine);
  if (base && engine.sheetOpen) { engine.sheetOpen = false; nodes.sheet.hidden = true; document.querySelectorAll('canvas').forEach(function (c) { c.inert = false; }); }
  if (base || inResult) nodes.sheet.hidden = true;
  nodes.result.hidden = !inResult;
  if (inResult) renderResult(engine, text);

  // Tabs: each opens with its system; the shift tab is always there.
  var tabsOpen = { shift: true, base: p.completed >= UNLOCKS.base, lab: p.completed >= UNLOCKS.lab, collection: p.completed >= UNLOCKS.museum, fleet: p.completed >= UNLOCKS.fleet };
  var tab = tabsOpen[engine.baseTab] ? engine.baseTab : 'shift';
  nodes.tabs.hidden = !tabsOpen.base;
  nodes.tabs.querySelectorAll('button[data-tab]').forEach(function (b) { var id = b.getAttribute('data-tab'); b.hidden = !tabsOpen[id]; b.setAttribute('aria-pressed', String(id === tab)); b.classList.toggle('is-new', tabsOpen[id] && p.seenTabs.indexOf(id) < 0); });
  root.querySelectorAll('[data-panel]').forEach(function (panel) { panel.hidden = panel.getAttribute('data-panel') !== tab; });
  if (base && tab === 'base') renderBase(engine, text);
  if (base && tab === 'lab') renderLab(engine);
  if (base && tab === 'collection') renderCollection(engine);
  if (base && tab === 'fleet') renderFleet(engine);
  if (!base && !inResult) renderAbilities(engine);

  // Base.
  text(nodes.title, p.completed === CONTRACTS.length && chosen === next ? 'Лицензия мастера' : 'Контракт ' + chosen);
  text(nodes.wallet, 'Руда ' + p.credits);
  var chips = contractCard(chosen), rate = contractRate(engine, chosen);
  if (rate < 1) chips.push({ label: 'Награда', value: Math.round(rate * 100) + '%' });
  nodes.card.innerHTML = chips.map(function (chip, i) { return '<li class="chip stat' + (rate < 1 && i === chips.length - 1 ? ' gold' : '') + '"><small>' + escapeHtml(chip.label) + '</small><b>' + escapeHtml(chip.value) + '</b></li>'; }).join('');
  text(nodes.summary, engine.campMessage || CONTRACT_BRIEFS.at(chosen - 1) || '');
  text(nodes.start, chosen < next || p.completed === CONTRACTS.length ? 'Повторить контракт ' + chosen : 'Начать контракт ' + chosen);
  var lines = !inResult && engine.storyBeat !== null && engine.storyBeat !== undefined ? storyLines(engine.storyBeat) : [];
  nodes.radio.hidden = !lines.length;
  nodes.radio.querySelector('[data-radio-lines]').innerHTML = radioHtml(lines);
  if (base) text(nodes.announcement, nodes.summary.textContent);
  // New systems appear when there is a reason for them, not all at once.
  root.querySelectorAll('[data-after-daily]').forEach(function (node) { node.hidden = p.completed < UNLOCKS.daily; });
  // Ship modules are retired; their work moved to the generator, the lift and the lab.
  nodes.workshop.hidden = true;
  nodes.contracts.hidden = p.completed < UNLOCKS.replay;
  var numbers = [];
  for (var k = 1; k <= next; k++) numbers.push(k);
  nodes.contractList.innerHTML = numbers.map(function (k) { return '<button data-number="' + k + '" aria-pressed="' + (k === chosen) + '" aria-label="Контракт ' + k + (k <= p.completed ? ', пройден' : ', следующий') + '">' + k + '</button>'; }).join('');
  var relics = ownedCount(p.collection);
  nodes.collection.hidden = !relics;
  text(nodes.collection, 'Коллекция: ' + relics + ' из ' + ARTIFACTS.length + ' находок');
  nodes.share.hidden = !engine.lastResult;
  text(nodes.slots, 'Мастерская, слоты ' + p.equipped.length + ' из 2');
  Object.keys(MODULES).forEach(function (id) {
    var n = engine.nativeModules[id], level = p.upgrades[id], nextLevel = Math.min(2, level + 1), equipped = p.equipped.indexOf(id) >= 0;
    n.title.innerHTML = escapeHtml(MODULES[id].name) + ' <span class="level">ур. ' + level + ' из 2</span>';
    var effect = id === 'battery' ? 'топливная ячейка даст +' + (3 + nextLevel) + ' топлива, всего до ' + (4 + nextLevel) + ' дополнительного топлива за смену' : id === 'blast' ? '+' + (20 * nextLevel) + '% к руде, которую вскрыли взрыв или спецфишка' : 'отмечает ' + (nextLevel + 1) + ' тайника на поле, что внутри, не видно';
    text(n.body, (level < 2 ? 'Следующий уровень: ' : 'Максимум: ') + effect);
    text(n.buy, level === 2 ? 'Максимальный уровень' : 'Улучшить за ' + MODULES[id].costs[level] + ' кр.');
    n.buy.disabled = level === 2 || p.credits < MODULES[id].costs[level];
    n.buy.setAttribute('aria-label', MODULES[id].name + ': ' + n.buy.textContent);
    text(n.equip, equipped ? 'Снять модуль' : 'Установить'); n.equip.disabled = !level || (!equipped && p.equipped.length >= 2);
    n.equip.setAttribute('aria-pressed', String(equipped)); n.equip.setAttribute('aria-label', MODULES[id].name + ': ' + n.equip.textContent);
  });
  text(nodes.shop, engine.shopMessage || 'Два слота, у каждого модуля до двух уровней');
  nodes.share.disabled = !engine.lastResult;
  root.querySelectorAll('[data-sound],[data-game-sound]').forEach(function (button) { text(button, engine.muted ? 'Звук выкл' : 'Звук вкл'); button.setAttribute('aria-pressed', String(!engine.muted)); });

  // In the shift.
  if (!base && engine.dims) {
    var dims = engine.dims;
    text(root.querySelector('[data-leave]'), engine.quotaMet ? 'Сдать смену' : engine.leaveTimer > 0 ? 'Точно выйти? Добыча пропадёт' : 'Выйти в город');
    nodes.hud.innerHTML = '<span>Добыча ' + engine.score + (engine.mode === 'daily' ? '' : ' из ' + engine.goal) + '</span><span>Ходы ' + engine.moves + '</span>';
    var status = (engine.mode === 'daily' ? 'Шахта дня: добыча ' + engine.score : 'Контракт ' + engine.contract + ': добыча ' + engine.score + ' из ' + engine.goal) + ', ходов ' + engine.moves + ', находок ' + engine.findCount
      + (engine.selected >= 0 ? ', выбрана строка ' + (rowOf(dims, engine.selected) + 1) + ', столбец ' + (colOf(dims, engine.selected) + 1) : '');
    text(nodes.status, status);
    if (engine.phase === 'idle') text(nodes.announcement, status + (engine.toast ? '. ' + engine.toast.replace(/\n/g, ', ') : ''));
    engine.nativeCells.forEach(function (button, i) {
      var gem = engine.cells[i];
      if (!gem) return;
      var label = describeCell(engine, i);
      text(button, label.split(', ')[0]);
      button.setAttribute('aria-label', 'Строка ' + (rowOf(dims, i) + 1) + ', столбец ' + (colOf(dims, i) + 1) + ': ' + label + (engine.scanMarkers.some(function (mark) { return mark.index === i; }) ? ', отмечен тайник' : ''));
      button.setAttribute('aria-selected', String(engine.selected === i));
      button.setAttribute('aria-disabled', String(engine.phase !== 'idle'));
    });
  }
  if (engine.nativeBase !== base) {
    engine.nativeBase = base;
    document.querySelectorAll('canvas').forEach(function (c) { c.inert = base; });
    root.querySelector('[data-open-sheet]').hidden = false;
    if (base) nodes.title.focus(); else engine.cockpit.querySelector('[data-ck-menu]').focus();
  }
  if (inResult && engine.nativeResultShown !== engine.seed) { engine.nativeResultShown = engine.seed; nodes.resultTitle.focus(); }
}
