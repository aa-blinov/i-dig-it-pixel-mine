// Ore on the board: the field geometry, creating, selecting, swapping and
// reshuffling. The field is dims.cols x dims.rows cells of BOARD.cell pixels,
// centred between the ladder and the shaft.
import { BOARD, BOARD_AREA, BOARD_CENTER_X, BOARD_TOP, CELL_MAX, DRILL_FRAME } from "../config.js";
import { CHARGE, COLUMN, DRILL, ROW } from "../model/effects.js";
import { dealFinds } from "../model/finds.js";
import { DRILL as DRILL_COLOUR, cellCount, colOf, rowOf, makeBoard, hasAnyMove, findRuns, collapse } from "../model/grid.js";
import { contractSetup } from "../model/contracts.js";
import { seededRandom } from "../model/challenge.js";
import { moduleLevel } from "../model/profile.js";
import { setCampVisible } from "./round.js";
import { updateTexts } from "./hud.js";

var SPECIAL_FRAMES = {};
SPECIAL_FRAMES[ROW] = 0; SPECIAL_FRAMES[COLUMN] = 1; SPECIAL_FRAMES[CHARGE] = 2;

// What the round leaves behind on the layout and has to dispose of.
export var ROUND_PARTS = ['cells', 'clearFx', 'particles', 'finds', 'cargoSprites', 'scanMarkers', 'tiles', 'effects', 'flights', 'minerSprites'];

export function disposeRound(engine) {
  ROUND_PARTS.forEach(function (name) {
    (engine[name] || []).forEach(function (entry) { if (entry) destroyEntry(entry); });
    engine[name] = [];
  });
  if (engine.marker) { engine.marker.destroy(); engine.marker = null; }
  if (engine.cage) { engine.cage.inst.destroy(); engine.cage = null; }
  engine.cageTrips = 0; engine.minerDelivery = 0;
}

export function destroyEntry(entry) {
  if (entry.inst) entry.inst.destroy();
  if (entry.mark) entry.mark.destroy();
}

export function layoutBoard(engine, dims) {
  engine.dims = dims;
  var cell = BOARD.cell = Math.min(CELL_MAX, Math.floor(BOARD_AREA / Math.max(dims.cols, dims.rows)));
  engine.board = { cell: cell, x0: BOARD_CENTER_X - dims.cols * cell / 2, y0: BOARD_TOP + (BOARD_AREA - dims.rows * cell) / 2 };
}

export function cellCenterX(engine, index) {
  return engine.board.x0 + colOf(engine.dims, index) * BOARD.cell + BOARD.cell / 2;
}

export function cellCenterY(engine, index) {
  return engine.board.y0 + rowOf(engine.dims, index) * BOARD.cell + BOARD.cell / 2;
}

export function boardBottom(engine) {
  return engine.board.y0 + engine.dims.rows * BOARD.cell;
}

// The cell under a layout point, or -1.
export function cellAt(engine, x, y) {
  if (!engine.dims) return -1;
  var col = Math.floor((x - engine.board.x0) / BOARD.cell), row = Math.floor((y - engine.board.y0) / BOARD.cell);
  if (col < 0 || col >= engine.dims.cols || row < 0 || row >= engine.dims.rows) return -1;
  return row * engine.dims.cols + col;
}

// The colours of the board, -1 for an empty cell. The gems live in
// engine.cells: one entry per cell, holding the instance that draws it, so
// the board and the picture cannot drift apart.
export function boardColours(engine) {
  var colours = [];
  for (var index = 0; index < cellCount(engine.dims); index++) colours.push(engine.cells[index] ? engine.cells[index].colour : -1);
  return colours;
}

export function boardSpecials(engine) {
  var specials = [];
  for (var index = 0; index < cellCount(engine.dims); index++) specials.push(engine.cells[index] ? engine.cells[index].special : null);
  return specials;
}

export function oreFrame(engine, colour) {
  return colour === DRILL_COLOUR ? DRILL_FRAME : engine.palette[colour];
}

export function makeGem(engine, index, colour, startY) {
  var x = cellCenterX(engine, index);
  var instance = engine.types.ore.createInstance('Game', x, startY);
  instance.animationFrame = oreFrame(engine, colour);
  instance.setSize(BOARD.cell, BOARD.cell);
  instance.isVisible = startY >= engine.board.y0 + BOARD.cell / 2;
  return { inst: instance, mark: null, colour: colour, special: null, cell: index, x: x, y: startY, targetX: x, targetY: cellCenterY(engine, index), land: 0 };
}

// Turns a gem into a special. The drill loses its colour; the other
// specials keep their ore and carry a badge.
export function setSpecial(engine, gem, special) {
  gem.special = special;
  if (special === DRILL) {
    gem.colour = DRILL_COLOUR;
    gem.inst.animationFrame = DRILL_FRAME;
    return;
  }
  if (!engine.types.special) return;
  gem.mark = engine.types.special.createInstance('Game', gem.x, gem.y);
  gem.mark.animationFrame = SPECIAL_FRAMES[special];
  gem.mark.setSize(BOARD.cell, BOARD.cell);
}

// Called when a round starts. The instances of the previous round are
// disposed of explicitly: a restart happens inside the layout.
export function startGame(engine) {
  disposeRound(engine);
  // Without the campaign (the bare classic board) the first layer is played on a 7×7 field.
  var setup = engine.setup || Object.assign(contractSetup('contract', 1), { dims: { cols: 7, rows: 7 } });
  engine.setup = setup;
  engine.palette = setup.palette;
  layoutBoard(engine, setup.dims);
  engine.score = 0;
  var bonuses = engine.bonuses || { fuel: 0, cargo: 0, miners: 0 };
  engine.moves = setup.moves + bonuses.fuel;
  // A miner on an expedition is not in the shaft.
  engine.lastActionAt = Date.now();
  engine.minersCrew = engine.minersLeft = Math.max(0, bonuses.miners - ((engine.profile && engine.profile.fleet) ? engine.profile.fleet.trips.length : 0));
  engine.chain = 0;
  engine.phase = 'idle';
  engine.selected = -1;
  engine.swap = null;
  engine.shown = {};
  engine.toast = '';
  engine.toastTimer = 0;
  engine.cursor = 0;
  engine.buried = dealFinds(engine.rand, setup.dims);
  engine.inventory = {};
  engine.relics = [];
  // Which artifact a find turns out to be follows the round's seed, apart from the board's draws.
  engine.relicRand = seededRandom((engine.seed || 'classic') + '-relics');
  engine.history = [];
  engine.cargo = [];
  engine.findCount = 0;
  engine.pendingFinds = [];
  engine.revealTimer = 0;
  engine.energyGranted = 0;
  engine.rewardSettled = false;
  engine.turns = 0;
  engine.charge = 0; engine.aiming = null; engine.rushMoves = 0; engine.rushActive = false; engine.seismo = 0;
  engine.quotaMet = false;
  engine.fuelAtQuota = null;
  engine.leaveTimer = 0;
  engine.endTimer = 0;
  engine.shake = 0;
  engine.reducedMotion = engine.host.prefersReducedMotion();
  engine.marker = engine.types.marker ? engine.types.marker.createInstance('Game', 0, 0) : null;
  if (engine.marker) engine.marker.isVisible = false;

  if (engine.types.tile) {
    for (var t = 0; t < cellCount(setup.dims); t++) {
      var tile = engine.types.tile.createInstance('Game', cellCenterX(engine, t), cellCenterY(engine, t));
      tile.animationFrame = (colOf(setup.dims, t) + rowOf(setup.dims, t)) % 2;
      tile.setSize(BOARD.cell, BOARD.cell);
      engine.tiles.push({ inst: tile });
    }
  }
  var colours = makeBoard(engine.rand, setup.dims, engine.palette.length);
  for (var deal = 0; deal < 20 && !hasAnyMove(colours, setup.dims); deal++) colours = makeBoard(engine.rand, setup.dims, engine.palette.length);
  for (var index = 0; index < cellCount(setup.dims); index++) {
    engine.cells[index] = makeGem(engine, index, colours[index], cellCenterY(engine, index));
  }
  var scanner = moduleLevel(engine, 'scanner');
  if (scanner && engine.runtime.objects.ScanMark) {
    engine.buried.map(function (id, index) { return id ? index : -1; }).filter(function (index) { return index >= 0; }).slice(0, scanner + 1).forEach(function (index) {
      var mark = engine.runtime.objects.ScanMark.createInstance('Game', cellCenterX(engine, index), cellCenterY(engine, index));
      mark.setSize(BOARD.cell, BOARD.cell); engine.scanMarkers.push({ inst: mark, index: index });
    });
  }
  if (engine.ship) engine.ship.target = engine.ship.x;
  setCampVisible(engine, false);
  updateTexts(engine);
}

export function setSelected(engine, index) {
  if (engine.selected >= 0 && engine.cells[engine.selected]) engine.cells[engine.selected].inst.setSize(BOARD.cell, BOARD.cell);
  engine.selected = index;
  if (index >= 0 && engine.cells[index]) engine.cells[index].inst.setSize(BOARD.cell * 1.15, BOARD.cell * 1.15);
  showMarker(engine, index);
}

export function showMarker(engine, index) {
  if (!engine.marker) return;
  engine.marker.isVisible = index >= 0;
  if (index >= 0) { engine.marker.setPosition(cellCenterX(engine, index), cellCenterY(engine, index)); engine.marker.setSize(BOARD.cell, BOARD.cell); }
  if (index >= 0 && engine.marker.moveToTop) engine.marker.moveToTop();
}

// Swaps the two cells: the gems trade places, so their colours travel with
// them and the board reads the same before and after.
export function swapCells(engine, a, b) {
  var gemA = engine.cells[a], gemB = engine.cells[b];
  engine.cells[a] = gemB; engine.cells[b] = gemA;
  gemA.cell = b; gemB.cell = a;
  gemA.tween = { x0: gemA.x, y0: gemA.y, age: 0 };
  gemB.tween = { x0: gemB.x, y0: gemB.y, age: 0 };
  gemA.targetX = cellCenterX(engine, b); gemA.targetY = cellCenterY(engine, b);
  gemB.targetX = cellCenterX(engine, a); gemB.targetY = cellCenterY(engine, a);
}

// Gravity: survivors fall to the bottom of their column, new ore drops in
// from above the field.
export function collapseBoard(engine) {
  var result = collapse(boardColours(engine), engine.dims, engine.rand, engine.palette.length);
  result.falls.forEach(function (fall) {
    var falling = engine.cells[fall.from];
    engine.cells[fall.from] = null;
    engine.cells[fall.to] = falling;
    falling.cell = fall.to;
    falling.targetX = cellCenterX(engine, fall.to);
    falling.targetY = cellCenterY(engine, fall.to);
  });
  result.spawns.forEach(function (spawn) {
    engine.cells[spawn.index] = makeGem(engine, spawn.index, spawn.colour, cellCenterY(engine, spawn.index) - spawn.distance * BOARD.cell);
  });
}

// A board can run out of moves. Deal the plain ore out again until the board
// has no line and at least one move left; specials keep their cells.
export function reshuffle(engine) {
  var colours = boardColours(engine), specials = boardSpecials(engine);
  var plain = [];
  colours.forEach(function (colour, index) { if (!specials[index] && colour >= 0) plain.push(index); });
  for (var attempt = 0; attempt < 200; attempt++) {
    var next = colours.slice();
    var values = plain.map(function (index) { return colours[index]; });
    for (var i = values.length - 1; i > 0; i--) {
      var j = Math.floor(engine.rand() * (i + 1)), swap = values[i];
      values[i] = values[j]; values[j] = swap;
    }
    plain.forEach(function (index, k) { next[index] = values[k]; });
    if (findRuns(next, engine.dims).length === 0 && hasAnyMove(next, engine.dims, specials)) {
      applyColours(engine, next);
      return;
    }
  }
}

// A gem's ore is its frame, so a new colour is a frame change in place.
export function applyColours(engine, colours) {
  for (var index = 0; index < cellCount(engine.dims); index++) {
    var gem = engine.cells[index];
    if (!gem || gem.special || gem.colour === colours[index]) continue;
    gem.colour = colours[index];
    gem.inst.animationFrame = oreFrame(engine, gem.colour);
  }
}
