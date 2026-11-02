// The shift cockpit: page elements laid exactly over the canvas header and
// bottom panel, so the numbers, buttons and icons are drawn at the screen's
// own resolution. Positions are in layout units (720 x 1280).
import { ABILITIES, CHARGE_MAX } from "../model/abilities.js";
import { baseBonuses } from "../model/base.js";
import { cargoSlots, useAbility } from "../game/turn.js";
import { statusLine } from "../game/hud.js";
import { requestLeave } from "../game/round.js";
import { boardColours, boardSpecials } from "../game/board.js";
import { firstMove } from "../model/grid.js";

var HINT_IDLE_MS = 6000;

var HOLD_X = [306, 422, 538], HOLD_Y = 1060, HOLD_MAX = 3;

function box(x, y, w, h) {
  return 'left:' + (x / 7.2) + '%;top:' + (y / 12.8) + '%;width:' + (w / 7.2) + '%;height:' + (h / 12.8) + '%';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

export var COCKPIT_CSS = [
  '#mine-cockpit{position:fixed;z-index:105;pointer-events:none;font-family:"Pixel Mine",Verdana,sans-serif;color:#faf0cf;-webkit-font-smoothing:none;--u:1px}',
  '#mine-cockpit[hidden],#mine-cockpit [hidden]{display:none!important}',
  '#mine-cockpit>*{position:absolute;box-sizing:border-box;pointer-events:auto}',
  '#mine-cockpit .ck-text{pointer-events:none;display:flex;flex-direction:column;justify-content:center}',
  '#mine-cockpit small{font-size:max(12px,calc(var(--u)*20));color:#9aa59f;line-height:1.1}',
  '#mine-cockpit b{font:max(16px,calc(var(--u)*34)) "Pixel Mine Title","Pixel Mine",monospace;color:#edc271;line-height:1.1;font-variant-numeric:tabular-nums}',
  '#mine-cockpit .ck-score{padding-left:calc(var(--u)*16)}',
  '#mine-cockpit .ck-finds{position:static;margin-right:auto;padding-left:calc(var(--u)*14)}',
  '#mine-cockpit .ck-actions{display:flex;align-items:center;justify-content:flex-end;gap:calc(var(--u)*10);padding-right:calc(var(--u)*10)}',
  '#mine-cockpit button{box-sizing:border-box;margin:0;border:calc(var(--u)*3) solid #111719;background:#263034;color:#faf0cf;box-shadow:inset 0 0 0 calc(var(--u)*2) #69736e;font:calc(var(--u)*20) "Pixel Mine Title","Pixel Mine",Verdana,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
  '#mine-cockpit button:focus-visible{outline:3px solid #ffe3a0;outline-offset:2px}',
  '#mine-cockpit .ck-icon{width:calc(var(--u)*56);height:calc(var(--u)*56);min-width:44px;min-height:44px}',
  '#mine-cockpit .ck-hand{height:calc(var(--u)*56);min-height:44px;padding:0 calc(var(--u)*16);background:#e0a43c;box-shadow:inset 0 0 0 calc(var(--u)*2) #ffe3a0;color:#1b1206;font-size:max(13px,calc(var(--u)*22))}',
  '#mine-cockpit .ck-hand-big{flex:1;height:calc(var(--u)*70);font-size:max(15px,calc(var(--u)*26))}',
  '#mine-cockpit .ck-menu span{display:block;width:calc(var(--u)*26);height:calc(var(--u)*4);background:#faf0cf;box-shadow:0 calc(var(--u)*-9) 0 #faf0cf,0 calc(var(--u)*9) 0 #faf0cf}',
  '#mine-cockpit .ck-fuel{align-items:center;text-align:center}',
  '#mine-cockpit .ck-fuel b{font-size:calc(var(--u)*44)}',
  '#mine-cockpit .ck-info{border-radius:50%;font-size:calc(var(--u)*24)}',
  // The hint is a bubble over the sky strip, which is scenery and has room.
  '#mine-cockpit .ck-status{align-items:center;justify-content:center;text-align:center;pointer-events:none}',
  '#mine-cockpit .ck-status span{background:rgba(17,23,25,.86);border:2px solid #69736e;padding:calc(var(--u)*10) calc(var(--u)*18);font-size:max(15px,calc(var(--u)*26));line-height:1.3;white-space:pre-line;color:#faf0cf;max-width:100%;box-sizing:border-box}',
  '#mine-cockpit .ck-status:empty{display:none}',
  '#mine-cockpit .ck-lock{background:rgba(17,23,25,.55);box-shadow:none;border:0}',
  '#mine-cockpit .ck-lock img{width:60%;height:60%;image-rendering:pixelated;opacity:.85}',
  '#mine-cockpit .ck-abilities{display:flex;align-items:center;gap:calc(var(--u)*10);padding:0 calc(var(--u)*10)}',
  '#mine-cockpit .ck-charge{flex:0 0 calc(var(--u)*96);white-space:nowrap;height:calc(var(--u)*56);display:flex;flex-direction:column;justify-content:center;pointer-events:none}',
  '#mine-cockpit .ck-charge i{display:block;height:calc(var(--u)*8);background:#111719;margin-top:calc(var(--u)*6)}',
  '#mine-cockpit .ck-charge i u{display:block;height:100%;background:#d9a85a}',
  '#mine-cockpit .ck-ability{position:relative;width:calc(var(--u)*64);height:calc(var(--u)*64);min-width:44px;min-height:44px}',
  '#mine-cockpit .ck-ability img{width:78%;height:78%}',
  '#mine-cockpit .ck-ability em{position:absolute;right:calc(var(--u)*-6);bottom:calc(var(--u)*-6);font:calc(var(--u)*16) "Pixel Mine Title",monospace;font-style:normal;background:#111719;color:#edc271;padding:calc(var(--u)*1) calc(var(--u)*4)}',
  '#mine-cockpit .ck-ability:disabled{opacity:.45;cursor:default}',
  '#mine-cockpit .ck-ability.ready{box-shadow:inset 0 0 0 calc(var(--u)*3) #d9a85a}',
  '#mine-cockpit .ck-ability[aria-pressed=true]{background:#8a5f2a}',
  '#mine-cockpit .ck-empty{pointer-events:none;font-size:calc(var(--u)*16);color:#9aa59f;align-items:center;text-align:center}',
  '#mine-cockpit .ck-ship{background:#1c2427;border:calc(var(--u)*3) solid #111719;box-shadow:inset 0 0 0 calc(var(--u)*2) #69736e;padding:calc(var(--u)*14) calc(var(--u)*18);font-size:max(14px,calc(var(--u)*24));line-height:1.4;z-index:2}',
  '#mine-cockpit .ck-ship h3{margin:0 0 calc(var(--u)*6);font:calc(var(--u)*22) "Pixel Mine Title",monospace;color:#edc271}',
  '#mine-cockpit .ck-ship p{margin:0}',
  '#mine-cockpit .ck-ship[hidden]{display:none}',
  // The coach: a pulsing frame on cells or on a cockpit element.
  '#mine-cockpit .ck-hint{pointer-events:none;border:calc(var(--u)*5) solid #ffe3a0;box-shadow:0 0 0 calc(var(--u)*3) #111719;animation:ck-pulse 1s ease-in-out infinite}',
  '#mine-cockpit .ck-coach{animation:ck-glow 1s ease-in-out infinite;outline:calc(var(--u)*4) solid #ffe3a0;outline-offset:calc(var(--u)*2)}',
  '@keyframes ck-glow{50%{outline-color:rgba(255,227,160,.25)}}',
  '@keyframes ck-pulse{50%{opacity:.45}}',
  '@media (prefers-reduced-motion:reduce){#mine-cockpit .ck-hint,#mine-cockpit .ck-coach{animation:none}}',
  '#mine-cockpit .ck-empty{font-size:max(14px,calc(var(--u)*20))}'
].join('');

export function setupCockpit(engine, onMenu) {
  var root = engine.cockpit = document.createElement('section');
  root.id = 'mine-cockpit'; root.hidden = true; root.setAttribute('aria-label', 'Кабина');
  root.innerHTML = '<div class="ck-text ck-score" style="' + box(22, 20, 302, 72) + '"><small data-ck-title></small><b data-ck-score></b></div>'
    + '<div class="ck-actions" style="' + box(345, 20, 353, 72) + '"><div class="ck-text ck-finds" data-ck-finds></div><button class="ck-hand" data-ck-hand hidden>Сдать смену</button><button class="ck-icon ck-menu" data-ck-menu aria-label="Меню: звук, справка, прервать смену"><span></span></button></div>'
    // The needle sweeps the upper half of the dial, so the number sits in the lower half.
    + '<div class="ck-text ck-fuel" style="' + box(63, 1166, 140, 66) + '"><b data-ck-fuel></b><small>топливо</small></div>'
    + '<div class="ck-text ck-status" role="status" data-ck-status style="' + box(40, 120, 640, 120) + '"></div>'
    + '<button class="ck-icon ck-info" data-ck-info style="' + box(196, 1022, 56, 56) + '" aria-label="Корабль: что он даёт" aria-expanded="false">i</button>'
    + HOLD_X.map(function (x, i) { return '<button class="ck-lock" data-ck-lock="' + i + '" style="' + box(x, HOLD_Y, 64, 64) + '" aria-label="Закрытое место в трюме"></button>'; }).join('')
    + '<div class="ck-abilities" data-ck-abilities style="' + box(286, 1146, 382, 86) + '"></div>'
    + '<div class="ck-hint" data-ck-hint="0" hidden></div><div class="ck-hint" data-ck-hint="1" hidden></div>'
    + '<div class="ck-ship" data-ck-ship hidden style="' + box(270, 1012, 430, 230) + '"></div>';
  document.body.appendChild(root);
  var q = function (s) { return root.querySelector(s); };
  q('[data-ck-menu]').addEventListener('click', onMenu);
  root.addEventListener('click', function (event) { var target = /** @type {Element} */ (event.target); if (target.closest('[data-ck-hand],[data-ck-hand2]')) requestLeave(engine); });
  q('[data-ck-info]').addEventListener('click', function () { engine.shipInfo = !engine.shipInfo; updateCockpit(engine, engine.cockpitIcon); });
  q('[data-ck-ship]').addEventListener('click', function () { engine.shipInfo = false; updateCockpit(engine, engine.cockpitIcon); });
  root.addEventListener('click', function (event) {
    var target = /** @type {Element} */ (event.target);
    var lock = target.closest('[data-ck-lock]');
    if (lock) { engine.toast = 'Это место в трюме пока закрыто\nПодъёмник на базе открывает ещё одно'; engine.toastTimer = 2.4; updateCockpit(engine, engine.cockpitIcon); return; }
    var use = target.closest('[data-use]');
    if (use) { useAbility(engine, use.getAttribute('data-use')); updateCockpit(engine, engine.cockpitIcon); }
  });
  window.addEventListener('resize', function () { placeCockpit(engine); });
}

// Lays the cockpit over the canvas, wherever letterboxing put it.
function placeCockpit(engine) {
  var layer = engine.runtime.layout && engine.runtime.layout.getLayer('Game'), a, b;
  if (layer && layer.layerToCssPx) { a = layer.layerToCssPx(0, 0); b = layer.layerToCssPx(720, 1280); }
  else { var c = document.querySelector('canvas'); if (!c) return; var r = c.getBoundingClientRect(); a = [r.left, r.top]; b = [r.right, r.bottom]; }
  var s = engine.cockpit.style, key = a.join() + b.join();
  if (engine.cockpitAt === key) return;
  engine.cockpitAt = key;
  s.left = a[0] + 'px'; s.top = a[1] + 'px'; s.width = (b[0] - a[0]) + 'px'; s.height = (b[1] - a[1]) + 'px';
  s.setProperty('--u', ((b[0] - a[0]) / 720) + 'px');
}

function set(node, html) { if (node.__html !== html) { node.__html = html; node.innerHTML = html; } }

// The first contract teaches by doing: each hint answers what just happened.
function tutorial(engine) {
  var none = { text: '', focus: '', move: false };
  var idle = engine.selected < 0 && !engine.aiming && engine.phase === 'idle' && Date.now() - (engine.lastActionAt || Date.now()) > HINT_IDLE_MS;
  if (!engine.profile || engine.profile.completed > 0 || engine.mode !== 'contract' || engine.contract !== 1) return { text: '', focus: '', move: idle };
  if (engine.phase !== 'idle') return none;
  if (engine.quotaMet) return { text: 'Норма есть\nКопай дальше за излишек или сдай смену', focus: 'ckHand', move: false };
  if (!engine.turns) return { text: 'Поменяй две руды в рамке\nТри в ряд уходят в добычу', focus: '', move: engine.selected < 0 };
  if (engine.turns < 3) return { text: 'Добыча растёт, норма ' + engine.goal + '\nКаждый ход стоит одно топливо', focus: 'ckScore ckFuel', move: false };
  return { text: '', focus: '', move: idle };
}

// The frame over the two cells of the nearest move, in layout units.
function placeHint(engine, root, show) {
  var frames = root.querySelectorAll('[data-ck-hint]'), move = show && engine.dims && engine.board ? firstMove(boardColours(engine), engine.dims, boardSpecials(engine)) : null;
  frames.forEach(function (frame, i) {
    frame.hidden = !move;
    if (!move) return;
    var cell = engine.board.cell, index = move[i], col = index % engine.dims.cols, row = Math.floor(index / engine.dims.cols);
    var style = box(engine.board.x0 + col * cell, engine.board.y0 + row * cell, cell, cell);
    if (frame.__style !== style) { frame.__style = style; frame.setAttribute('style', style); }
  });
}

export function updateCockpit(engine, icon) {
  var root = engine.cockpit;
  if (!root) return;
  engine.cockpitIcon = icon;
  var show = engine.phase !== 'base' && engine.phase !== 'result' && !!engine.dims;
  // The pause menu covers the shaft, so the cockpit steps aside.
  root.hidden = !show || !!engine.sheetOpen;
  if (root.hidden) return;
  placeCockpit(engine);
  var q = function (s) { return root.querySelector(s); };
  var daily = engine.mode === 'daily';
  set(q('[data-ck-title]'), escapeHtml(daily ? 'Шахта дня' : engine.quotaMet ? 'Норма есть, сверх нормы' : 'Контракт ' + engine.contract));
  set(q('[data-ck-score]'), escapeHtml(daily ? String(engine.score) : engine.quotaMet ? '+' + (engine.score - engine.goal) : engine.score + ' / ' + engine.goal));
  set(q('[data-ck-fuel]'), String(engine.moves));
  var tutor = tutorial(engine), hint = engine.toast ? statusLine(engine) : tutor.text || statusLine(engine);
  [['ckScore', '[data-ck-score]'], ['ckFuel', '[data-ck-fuel]'], ['ckHand', '[data-ck-hand]']].forEach(function (pair) { q(pair[1]).classList.toggle('ck-coach', tutor.focus.indexOf(pair[0]) >= 0); });
  placeHint(engine, root, tutor.move);
  set(q('[data-ck-status]'), hint ? '<span>' + escapeHtml(hint) + '</span>' : '');
  var handIn = engine.quotaMet && engine.phase === 'idle' && !daily;
  q('[data-ck-hand]').hidden = !handIn;
  q('[data-ck-finds]').hidden = handIn;
  set(q('[data-ck-finds]'), '<small>Находки</small><b>' + (engine.findCount || 0) + '</b>');

  var open = cargoSlots(engine);
  root.querySelectorAll('[data-ck-lock]').forEach(function (lock, i) {
    lock.hidden = i < open || i >= HOLD_MAX;
    var url = icon && icon('i-lock.png');
    set(lock, url ? '<img src="' + escapeHtml(url) + '" alt="">' : '');
  });

  var list = engine.abilities || [], charge = engine.charge || 0;
  // After the quota a big hand-in button waits at the thumb, before the abilities.
  var handBig = handIn ? '<button class="ck-hand ck-hand-big ck-coach" data-ck-hand2>Сдать смену</button>' : '';
  set(q('[data-ck-abilities]'), handBig + (!list.length && handIn ? '' : !list.length
    ? '<div class="ck-text ck-empty" style="position:static;width:100%;height:100%">Способности появятся с Лабораторией</div>'
    : '<div class="ck-charge" aria-label="Заряд ' + charge + ' из ' + CHARGE_MAX + '"><small>Заряд ' + charge + '</small><i><u style="width:' + Math.round(100 * Math.min(1, charge / CHARGE_MAX)) + '%"></u></i></div>'
      + list.map(function (id) {
        var a = ABILITIES[id], ready = charge >= a.cost && engine.phase === 'idle', url = icon && icon('i-' + id + '.png');
        return '<button class="ck-ability' + (ready ? ' ready' : '') + '" data-use="' + id + '" aria-pressed="' + (engine.aiming === id) + '"' + (ready || engine.aiming === id ? '' : ' disabled')
          + ' aria-label="' + escapeHtml(a.name + ', ' + a.cost + ' заряда, ' + a.about) + '" title="' + escapeHtml(a.name + ': ' + a.about) + '">'
          + (url ? '<img src="' + escapeHtml(url) + '" alt="">' : escapeHtml(a.name.slice(0, 3))) + '<em>' + a.cost + '</em></button>';
      }).join('')));

  var info = q('[data-ck-info]'), ship = q('[data-ck-ship]');
  info.setAttribute('aria-expanded', String(!!engine.shipInfo));
  ship.hidden = !engine.shipInfo;
  if (engine.shipInfo) {
    var b = engine.profile ? baseBonuses(engine.profile.base) : { fuel: 0, cargo: 0, miners: 0, abilitySlots: 0 };
    set(ship, '<h3>Корабль</h3>'
      + '<p>Находки за смену: ' + (engine.findCount || 0) + '</p>'
      + '<p>Трюм: ' + open + ' из ' + HOLD_MAX + ' мест' + (open < HOLD_MAX ? ', ещё даст подъёмник' : '') + '</p>'
      + '<p>Топливо на смену: ' + (engine.setup ? engine.setup.moves : engine.moves) + (b.fuel ? ' и +' + b.fuel + ' от генератора' : '') + '</p>'
      + '<p>Шахтёры: ' + (engine.minersCrew || 0) + (b.miners ? '' : ', их даёт общежитие') + '</p>'
      + '<p>Способности: ' + list.length + (b.abilitySlots ? ' из ' + b.abilitySlots : ', откроет лаборатория') + '</p>'
      + '<p class="muted" style="color:#9aa59f">Нажми, чтобы закрыть</p>');
  }
}
