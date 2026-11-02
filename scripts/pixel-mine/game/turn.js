// One turn: tapping, clearing lines and what fires inside them, creating
// specials, revealing finds and sending them to the hold, and the phase
// machine driven every tick.
import { BOARD, ECONOMY, FIND_DEFS } from "../config.js";
import { CHARGE, COLUMN, DRILL, ROW, comboCells, expandEffects, resolveMatches } from "../model/effects.js";
import { ABILITIES, CHARGE_MAX, abilityCells } from "../model/abilities.js";
import { FIND_RARITY, artifact, pickArtifact } from "../model/collections.js";
import { oreValue } from "../model/contracts.js";
import { areAdjacent, cellCount, hasAnyMove } from "../model/grid.js";
import { energyBudget, moduleLevel } from "../model/profile.js";
import { playSfx } from "./audio.js";
import { addEffect, animate, shipDrill, spawnOreSparks, spawnSparks } from "./animation.js";
import { boardColours, boardSpecials, cellCenterX, cellCenterY, collapseBoard, destroyEntry, reshuffle, setSelected, setSpecial, swapCells } from "./board.js";
import { updateTexts } from "./hud.js";
import { finishRound } from "./round.js";

var CARGO_SLOTS = [338, 454, 570], CARGO_Y = 1092, GAUGE = { x: 133, y: 1154 };
var SPECIAL_NAMES = {};
SPECIAL_NAMES[ROW] = 'Ракета по строке'; SPECIAL_NAMES[COLUMN] = 'Ракета по столбцу';
SPECIAL_NAMES[CHARGE] = 'Заряд 3×3'; SPECIAL_NAMES[DRILL] = 'Алмазный бур';
export { SPECIAL_NAMES };

// Room in the hold: the base slots plus what the lift adds.
export function cargoSlots(engine) {
  return ECONOMY.cargoSlots + (engine.bonuses ? engine.bonuses.cargo : 0);
}

// Every fifth move a miner from the quarters comes down the ladder with fuel.
function minerTurn(engine) {
  engine.rushActive = engine.rushMoves > 0;
  if (engine.rushMoves > 0) engine.rushMoves--;
  if (engine.seismo > 0) { engine.seismo--; if (!engine.seismo) hideSeismo(engine); }
  if (!engine.minersLeft || engine.turns % 5 !== 0) return;
  engine.minersLeft--;
  engine.moves++;
  engine.minerDelivery = (engine.minerDelivery || 0) + 1;
  engine.toast = 'Горняк спустился с топливом: +1';
  engine.toastTimer = 1.8;
}

export function tap(engine, index) {
  engine.lastActionAt = Date.now();
  if (engine.phase !== 'idle') return;
  if (index < 0 || index >= cellCount(engine.dims) || !engine.cells[index]) return;
  if (engine.aiming) { fireAbility(engine, engine.aiming, index); return; }
  engine.cursor = index;
  playSfx(engine, 'select');
  if (engine.selected < 0) { setSelected(engine, index); return; }
  if (engine.selected === index) { setSelected(engine, -1); return; }
  if (!areAdjacent(engine.dims, engine.selected, index)) { setSelected(engine, index); return; }
  var from = engine.selected;
  setSelected(engine, -1);
  swapCells(engine, from, index);
  engine.swap = { a: from, b: index };
  engine.phase = 'swapping';
  playSfx(engine, 'swap');
}

// Clears what the lines of a match hold. The cells that become specials stay.
function clearMatch(engine, match) {
  var protect = {};
  match.creations.forEach(function (made) { protect[made.index] = true; });
  clearCells(engine, match.cleared, protect, {}, match.creations);
}

function clearCells(engine, cells, protect, spent, creations) {
  var colours = boardColours(engine), specials = boardSpecials(engine);
  var original = {};
  Object.keys(cells).forEach(function (index) { if (!protect[index]) original[index] = true; });
  var result = expandEffects(cells, engine.dims, colours, specials, engine.buried, protect, spent);
  var materialPoints = 0, extraPoints = 0, discoveries = [], sumX = 0, sumY = 0, count = 0;
  Object.keys(result.cells).forEach(function (key) {
    var index = Number(key), gem = engine.cells[index];
    if (!gem) return;
    var value = oreValue(engine.palette, gem.colour);
    materialPoints += value;
    if (!original[index]) extraPoints += value;
    var findId = engine.buried[index];
    if (findId) {
      engine.buried[index] = null;
      var found = FIND_RARITY[findId] ? pickArtifact(engine.setup.layer, findId, engine.relicRand) : null;
      discoveries.push({ id: findId, index: index, artifact: found });
      engine.scanMarkers = engine.scanMarkers.filter(function (mark) { if (mark.index !== index) return true; mark.inst.destroy(); return false; });
      var findType = engine.types.finds[findId];
      if (findType) {
        var icon = findType.createInstance('Game', cellCenterX(engine, index), cellCenterY(engine, index));
        icon.setSize(BOARD.cell, BOARD.cell);
        engine.finds.push({ inst: icon, id: findId, artifact: found, x: cellCenterX(engine, index), y: cellCenterY(engine, index), age: 0 });
      }
    }
    spawnOreSparks(engine, index);
    if (engine.reducedMotion) destroyEntry(gem);
    else {
      gem.clearTime = 0;
      gem.inst.setSize(BOARD.cell * 1.12, BOARD.cell * 1.12);
      gem.inst.opacity = 1;
      engine.clearFx.push(gem);
    }
    engine.cells[index] = null;
    sumX += cellCenterX(engine, index); sumY += cellCenterY(engine, index); count++;
  });
  result.fired.forEach(function (fired) { showFired(engine, fired); });
  creations.forEach(function (made) {
    var gem = engine.cells[made.index];
    if (!gem) return;
    setSpecial(engine, gem, made.special);
    addEffect(engine, 'ring', gem.x, gem.y, { size: BOARD.cell * 1.3 });
  });

  engine.chain++;
  var earned = materialPoints * engine.chain + Math.floor(extraPoints * engine.chain * moduleLevel(engine, 'blast') * 0.2);
  if (engine.rushActive) earned = Math.round(earned * 1.5);
  if (engine.abilities && engine.abilities.length) engine.charge = Math.min(CHARGE_MAX, (engine.charge || 0) + count);
  engine.score += earned;
  if (count) {
    addEffect(engine, 'pop', sumX / count, sumY / count, { text: '+' + earned });
    shipDrill(engine, sumX / count);
  }
  if (result.fired.length || engine.chain >= 3) engine.shake = 0.3;
  engine.toast = creations.length ? 'Новая спецфишка: ' + SPECIAL_NAMES[creations[0].special].toLowerCase()
    : engine.chain > 1 ? 'Каскад ×' + engine.chain + ', +' + earned
    : '+' + earned + ' руды';
  engine.toastTimer = 0.95;
  playSfx(engine, result.fired.length ? 'boost' : 'dig');

  if (discoveries.length) {
    engine.pendingFinds = discoveries;
    engine.revealTimer = engine.reducedMotion ? 0.4 : 1.05;
    engine.phase = 'revealing';
    engine.toast = describeFind(discoveries[0].id, engine, discoveries[0].artifact) + (discoveries.length > 1 ? '\nИ ещё находок: ' + (discoveries.length - 1) : '');
    engine.toastTimer = 2.7;
    playSfx(engine, discoveries.some(function (found) { return FIND_DEFS[found.id].blast; }) ? 'boost' : 'find');
  } else finishClear(engine);
}

// What a special or a blast looks like when it goes off.
function showFired(engine, fired) {
  var x = cellCenterX(engine, fired.index), y = cellCenterY(engine, fired.index);
  var cols = engine.dims.cols, rows = engine.dims.rows, x0 = engine.board.x0, y0 = engine.board.y0;
  if (fired.special === ROW) {
    for (var c = 0; c < cols; c++) spawnSparks(engine, x0 + c * BOARD.cell + BOARD.cell / 2, y, 2, 40, 90);
    addEffect(engine, 'ring', x, y, { size: BOARD.cell * 1.6 });
  } else if (fired.special === COLUMN || fired.blast === 'column') {
    for (var r = 0; r < rows; r++) spawnSparks(engine, x, y0 + r * BOARD.cell + BOARD.cell / 2, 2, 40, 90);
    addEffect(engine, 'ring', x, y, { size: BOARD.cell * 1.6 });
  } else if (fired.special === DRILL) {
    addEffect(engine, 'ring', x, y, { size: BOARD.cell * 2.4 });
    spawnSparks(engine, x, y, 10, 90, 140);
  } else {
    addEffect(engine, 'blast', x, y, { size: BOARD.cell * 3 });
  }
}

// Abilities: charge from cleared ore, spent on a tool. Targeted tools wait
// for a tap on the field; the rest work at once. None of them costs fuel.
export function useAbility(engine, id) {
  var def = ABILITIES[id];
  if (!def || engine.phase !== 'idle' || (engine.abilities || []).indexOf(id) < 0) return false;
  if (engine.aiming === id) { engine.aiming = null; engine.toast = ''; updateTexts(engine); return false; }
  if ((engine.charge || 0) < def.cost) { engine.toast = def.name + ': нужно ' + def.cost + ' заряда'; engine.toastTimer = 1.6; updateTexts(engine); return false; }
  setSelected(engine, -1);
  if (def.target) { engine.aiming = id; engine.toast = def.name + ': выбери клетку'; engine.toastTimer = 0; updateTexts(engine); return true; }
  fireAbility(engine, id, -1);
  return true;
}

function fireAbility(engine, id, index) {
  var def = ABILITIES[id];
  engine.aiming = null;
  engine.charge -= def.cost;
  playSfx(engine, 'boost');
  if (def.target) {
    var cells = {};
    abilityCells(id, index, engine.dims, boardColours(engine)).forEach(function (i) { cells[i] = true; });
    showFired(engine, { index: index, special: id === 'cutter' ? ROW : id === 'borer' ? COLUMN : id === 'magnet' ? DRILL : CHARGE });
    engine.chain = 0;
    clearCells(engine, cells, {}, {}, []);
    engine.toast = def.name + ': ' + engine.toast;
  } else if (id === 'seismo') {
    engine.seismo = 3; showSeismo(engine);
    engine.toast = 'Сейсмозонд: тайники видны 3 хода'; engine.toastTimer = 2;
  } else if (id === 'shuffle') {
    reshuffle(engine);
    engine.toast = 'Руда перемешана'; engine.toastTimer = 1.6;
  } else if (id === 'reserve') {
    engine.moves += 2;
    engine.toast = 'Запас топлива: +2'; engine.toastTimer = 1.6;
  } else if (id === 'rush') {
    engine.rushMoves = 2;
    engine.toast = 'Лихорадка: два хода с +50% руды'; engine.toastTimer = 2;
  }
  updateTexts(engine);
}

// The seismic probe marks every buried find for a few moves.
function showSeismo(engine) {
  if (!engine.runtime.objects.ScanMark) return;
  hideSeismo(engine);
  engine.buried.forEach(function (id, index) {
    if (!id || engine.scanMarkers.some(function (m) { return m.index === index; })) return;
    var mark = engine.runtime.objects.ScanMark.createInstance('Game', cellCenterX(engine, index), cellCenterY(engine, index));
    mark.setSize(BOARD.cell, BOARD.cell); engine.scanMarkers.push({ inst: mark, index: index, seismo: true });
  });
}

function hideSeismo(engine) {
  engine.scanMarkers = engine.scanMarkers.filter(function (m) { if (!m.seismo) return true; m.inst.destroy(); return false; });
}

export function describeFind(id, engine, artifactId) {
  var def = FIND_DEFS[id], art = artifactId && artifact(artifactId);
  if (art) return art.name + ': +' + def.value;
  if (def.moves) { var remaining = Math.min(def.moves + moduleLevel(engine, 'battery'), energyBudget(engine) - engine.energyGranted); return remaining > 0 ? def.name + ': +' + remaining + ' топлива' : 'Бак полон: +50 руды'; }
  if (def.blast === 'area') return 'Динамит: вскрыта область 3×3';
  if (def.blast === 'column') return 'Бур: вскрыт столбец';
  return def.name + ': +' + def.value;
}

// The finds pay out and leave their cells: valuables fly into the hold,
// energy flies into the moves gauge, a used-up blast fades where it went off.
export function collectFinds(engine) {
  engine.pendingFinds.forEach(function (found) {
    var def = FIND_DEFS[found.id];
    engine.score += def.value || 0;
    if (def.moves) {
      var granted = Math.max(0, Math.min(def.moves + moduleLevel(engine, 'battery'), energyBudget(engine) - engine.energyGranted));
      engine.energyGranted += granted; engine.moves += granted;
      if (!granted) engine.score += 50;
    }
    engine.inventory[found.id] = (engine.inventory[found.id] || 0) + 1;
    engine.findCount++;
    engine.history.push(found.id);
  });
  engine.pendingFinds = [];
  // The first-ever hold explanation stays up for the rest of this batch of finds.
  var explained = false;
  engine.finds.forEach(function (icon) {
    var def = FIND_DEFS[icon.id], target;
    if (def.value && engine.cargo.length >= cargoSlots(engine)) {
      // Sold: the points stay, the collection does not grow.
      // A find that does not fit the hold reads as a bonus, not as a loss.
      if (!explained) engine.toast = 'Находка: ' + (icon.artifact ? artifact(icon.artifact).name : def.name) + '\n+' + def.value + ' к добыче, трюм уже полон';
      if (!explained) engine.toastTimer = 2.2;
      target = { x: icon.inst.x, y: icon.inst.y - 30, size: BOARD.cell * 0.6, fade: true };
    } else if (def.value) {
      engine.cargo.push(icon.id);
      if (icon.artifact) engine.relics.push(icon.artifact);
      // The first find ever explains the hold, once.
      if (engine.profile && !engine.profile.holdSeen) {
        engine.profile.holdSeen = true;
        explained = true;
        engine.toast = 'Находка летит в трюм\nЭто грузовой отсек корабля внизу, на базе она попадёт в коллекцию';
        engine.toastTimer = 3.5;
      }
      var slot = Math.min(engine.cargo.length, CARGO_SLOTS.length) - 1;
      target = { x: CARGO_SLOTS[slot], y: CARGO_Y, size: 54, onLand: function () { layoutCargo(engine); } };
    } else if (def.moves) target = { x: GAUGE.x, y: GAUGE.y, size: 30, fade: true, onLand: function () { updateTexts(engine); } };
    else target = { x: icon.inst.x, y: icon.inst.y - 24, size: BOARD.cell * 1.4, fade: true };
    engine.flights.push({ inst: icon.inst, age: 0, fromX: icon.inst.x, fromY: icon.inst.y, toX: target.x, toY: target.y, fromSize: BOARD.cell, toSize: target.size, arc: target.fade ? 40 : def.value ? 140 : 60, fade: !!target.fade, onLand: target.onLand });
    if (icon.inst.moveToTop) icon.inst.moveToTop();
  });
  engine.finds = [];
}

// The hold shows the last valuables found, newest on the right.
export function layoutCargo(engine) {
  // The cage in the shaft takes the find up to the base.
  engine.cageTrips = (engine.cageTrips || 0) + 1;
  engine.cargoSprites.forEach(function (icon) { icon.inst.destroy(); });
  engine.cargoSprites = [];
  engine.cargo.slice(-CARGO_SLOTS.length).forEach(function (id, index) {
    var type = engine.types.finds[id];
    if (!type) return;
    var icon = type.createInstance('Game', CARGO_SLOTS[index], CARGO_Y);
    icon.setSize(54, 54);
    engine.cargoSprites.push({ inst: icon });
  });
  updateTexts(engine);
}

export function finishClear(engine) {
  collapseBoard(engine);
  engine.phase = 'falling';
}

export function step(engine, dt) {
  if (!dt || dt <= 0) dt = 1 / 60;
  if (dt > 0.05) dt = 0.05;
  if (engine.phase === 'base') return;
  if (engine.leaveTimer > 0) engine.leaveTimer = Math.max(0, engine.leaveTimer - dt);
  if (engine.toastTimer > 0) {
    engine.toastTimer = Math.max(0, engine.toastTimer - dt);
    if (engine.toastTimer === 0) engine.toast = '';
  }
  var settled = animate(engine, dt);
  if (engine.phase === 'ending') {
    // The shift is over: let the last finds land and the banner be read.
    engine.endTimer -= dt;
    if (engine.endTimer <= 0) finishRound(engine);
    return;
  }
  if (engine.phase === 'revealing') {
    engine.revealTimer -= dt;
    if (engine.revealTimer <= 0) { collectFinds(engine); finishClear(engine); updateTexts(engine); }
    return;
  }
  if (!settled) return;

  if (engine.phase === 'swapping') {
    var colours = boardColours(engine), specials = boardSpecials(engine), swap = engine.swap;
    var combo = comboCells(colours, specials, engine.dims, swap.a, swap.b);
    if (combo) {
      // A swap with the drill, or of two specials, is always a move.
      engine.moves--; engine.turns++; minerTurn(engine);
      engine.swap = null;
      var spent = {}; spent[swap.a] = true; spent[swap.b] = true;
      showFired(engine, { index: swap.b, special: combo.kind === 'big-blast' ? CHARGE : DRILL });
      clearCells(engine, combo.cells, {}, spent, []);
    } else {
      var match = resolveMatches(colours, engine.dims, swap, specials);
      if (match.runs.length) {
        // The move is only spent when the swap really makes a line.
        engine.moves--; engine.turns++; minerTurn(engine);
        engine.swap = null;
        clearMatch(engine, match);
      } else {
        // The swap was pointless: put the ore back where it was.
        swapCells(engine, swap.a, swap.b);
        engine.phase = 'unswapping';
      }
    }
    updateTexts(engine);
    return;
  }
  if (engine.phase === 'unswapping') {
    engine.swap = null;
    engine.phase = 'idle';
    updateTexts(engine);
    return;
  }
  if (engine.phase === 'falling') {
    var cascade = resolveMatches(boardColours(engine), engine.dims, null, boardSpecials(engine));
    if (cascade.runs.length) clearMatch(engine, cascade);
    else {
      engine.chain = 0;
      if (!hasAnyMove(boardColours(engine), engine.dims, boardSpecials(engine))) reshuffle(engine);
      if (engine.campaignEnabled && engine.mode !== 'daily' && !engine.quotaMet && engine.score >= engine.goal) {
        engine.quotaMet = true;
        engine.fuelAtQuota = engine.moves;
        engine.toast = 'Норма выполнена\nВсё сверх нормы идёт в карман';
        engine.toastTimer = 2.6;
        engine.shake = 0.3;
        playSfx(engine, 'find');
      }
      var won = engine.quotaMet;
      if (engine.campaignEnabled && engine.moves <= 0) {
        engine.phase = 'ending';
        engine.endTimer = engine.reducedMotion ? 0.6 : 1.5;
        engine.toast = '';
        playSfx(engine, won ? 'find' : 'select');
      } else {
        engine.phase = engine.moves <= 0 ? 'over' : 'idle';
        if (engine.phase === 'idle' && engine.moves > 0 && engine.moves <= 3) { engine.toast = 'Топливо на исходе: ' + engine.moves; engine.toastTimer = 1.6; }
      }
    }
    updateTexts(engine);
  }
}
