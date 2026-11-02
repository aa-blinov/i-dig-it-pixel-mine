// Pure rules for specials: which special a match creates, what a special
// clears when it fires, and what two specials do when they are swapped.
//
// Specials live in a sparse array parallel to the board: specials[i] is one
// of ROW, COLUMN, CHARGE or DRILL, or empty. The diamond drill also has the
// colour DRILL on the board, so it never makes a line.
import { FIND_DEFS, MAX_SPECIALS } from "../config.js";
import { DRILL as DRILL_COLOUR, cellCount, cellIndex, colOf, findRuns, rowOf } from "./grid.js";

export var ROW = 'row';         // four in a row, swapped sideways: clears its row
export var COLUMN = 'column';   // four in a row, swapped up or down: clears its column
export var CHARGE = 'charge';   // an L, T or cross of five: clears 3 x 3
export var DRILL = 'drill';     // five in a row: clears every ore of one colour

// The lines a board holds, the cells they clear and the specials they leave.
// `swap` is the move that made them ({ a, b }, b where the moved ore landed),
// or null for a cascade. A special is created at the cell the player moved,
// or in the middle of the line, and that cell survives as the special.
export function resolveMatches(grid, dims, swap, specials) {
  var runs = findRuns(grid, dims), cleared = {}, creations = [], used = [];
  runs.forEach(function (run) { run.cells.forEach(function (cell) { cleared[cell] = true; }); });
  var onBoard = (specials || []).filter(Boolean).length;
  function pivot(run) {
    if (swap && run.cells.indexOf(swap.b) >= 0) return swap.b;
    if (swap && run.cells.indexOf(swap.a) >= 0) return swap.a;
    return run.cells[Math.floor((run.cells.length - 1) / 2)];
  }
  function create(index, special, colour, fromRuns) {
    fromRuns.forEach(function (run) { used[runs.indexOf(run)] = true; });
    if (onBoard + creations.length >= MAX_SPECIALS) return;
    if (creations.some(function (made) { return made.index === index; })) return;
    creations.push({ index: index, special: special, colour: colour });
  }
  runs.forEach(function (run, i) {
    if (!used[i] && run.cells.length >= 5) create(pivot(run), DRILL, DRILL_COLOUR, [run]);
  });
  runs.forEach(function (across, i) {
    if (!across.horizontal) return;
    runs.forEach(function (down, j) {
      if (down.horizontal || used[i] || used[j] || down.colour !== across.colour) return;
      var meet = across.cells.filter(function (cell) { return down.cells.indexOf(cell) >= 0; });
      if (meet.length) create(meet[0], CHARGE, across.colour, [across, down]);
    });
  });
  runs.forEach(function (run, i) {
    if (used[i] || run.cells.length !== 4) return;
    var sideways = swap ? Math.abs(swap.a - swap.b) === 1 : run.horizontal;
    create(pivot(run), sideways ? ROW : COLUMN, run.colour, [run]);
  });
  return { runs: runs, cleared: cleared, creations: creations };
}

// The colour most of the board holds; the drill takes this one when it is
// set off by something other than a swap with an ore.
export function mostCommonColour(grid) {
  var counts = {}, best = -1;
  grid.forEach(function (colour) {
    if (colour < 0) return;
    counts[colour] = (counts[colour] || 0) + 1;
    if (best < 0 || counts[colour] > counts[best] || (counts[colour] === counts[best] && colour < best)) best = colour;
  });
  return best;
}

function line(dims, index, horizontal) {
  var cells = [], col = colOf(dims, index), row = rowOf(dims, index);
  if (horizontal) for (var x = 0; x < dims.cols; x++) cells.push(cellIndex(dims, x, row));
  else for (var y = 0; y < dims.rows; y++) cells.push(cellIndex(dims, col, y));
  return cells;
}

export function square(dims, index, radius) {
  var cells = [], col = colOf(dims, index), row = rowOf(dims, index);
  for (var dy = -radius; dy <= radius; dy++) for (var dx = -radius; dx <= radius; dx++) {
    if (col + dx >= 0 && col + dx < dims.cols && row + dy >= 0 && row + dy < dims.rows) cells.push(cellIndex(dims, col + dx, row + dy));
  }
  return cells;
}

function ofColour(grid, colour) {
  var cells = [];
  grid.forEach(function (value, index) { if (value === colour) cells.push(index); });
  return cells;
}

// The cells a special clears when it fires at `index`.
export function effectCells(special, index, dims, grid) {
  if (special === ROW) return line(dims, index, true);
  if (special === COLUMN) return line(dims, index, false);
  if (special === CHARGE) return square(dims, index, 1);
  if (special === DRILL) return ofColour(grid, mostCommonColour(grid)).concat([index]);
  return [index];
}

// The cells a buried blast find clears.
export function blastCells(kind, index, dims) {
  return kind === 'column' ? line(dims, index, false) : square(dims, index, 1);
}

// Grows a set of cleared cells by everything that fires inside it: the
// specials on the board and the blast finds buried under it. Each fired
// special and blast is reported once, in order, for the animation. Cells in
// `protect` are not cleared (they become new specials); cells in `spent`
// are cleared but do not fire (a special that was used up by a combo).
export function expandEffects(cells, dims, grid, specials, buried, protect, spent) {
  var queue = Object.keys(cells).map(Number), fired = [];
  protect = protect || {}; spent = spent || {};
  queue.forEach(function (index) { if (protect[index]) delete cells[index]; });
  function add(index) {
    if (index < 0 || index >= cellCount(dims) || cells[index] || protect[index]) return;
    cells[index] = true; queue.push(index);
  }
  for (var q = 0; q < queue.length; q++) {
    var index = queue[q];
    if (!cells[index]) continue;
    var special = specials && specials[index];
    if (special && !spent[index]) {
      fired.push({ index: index, special: special });
      effectCells(special, index, dims, grid).forEach(add);
    }
    var def = buried && FIND_DEFS[buried[index]];
    if (def && def.blast) {
      fired.push({ index: index, blast: def.blast });
      blastCells(def.blast, index, dims).forEach(add);
    }
  }
  return { cells: cells, fired: fired };
}

// What a swap of `a` onto `b` clears when it uses the drill or joins two
// specials, or null when it is an ordinary swap that needs a line.
export function comboCells(grid, specials, dims, a, b) {
  var sa = specials && specials[a], sb = specials && specials[b];
  var cells = {};
  function take(list) { list.forEach(function (index) { cells[index] = true; }); }
  if (!sa && !sb) return null;
  if (sa === DRILL || sb === DRILL) {
    var other = sa === DRILL ? b : a, otherSpecial = sa === DRILL ? sb : sa;
    if (otherSpecial === DRILL) take(grid.map(function (_, index) { return index; }));
    else if (!otherSpecial) take(ofColour(grid, grid[other]));
    else { take(ofColour(grid, mostCommonColour(grid))); take(effectCells(otherSpecial, b, dims, grid)); }
    take([a, b]);
    return { cells: cells, kind: otherSpecial === DRILL ? 'wipe' : otherSpecial ? 'drill-special' : 'drill' };
  }
  if (!sa || !sb) return null;
  var rockets = Number(sa === ROW || sa === COLUMN) + Number(sb === ROW || sb === COLUMN);
  if (rockets === 2) { take(line(dims, b, true)); take(line(dims, b, false)); }
  else if (rockets === 1) {
    var col = colOf(dims, b), row = rowOf(dims, b);
    for (var d = -1; d <= 1; d++) {
      if (row + d >= 0 && row + d < dims.rows) take(line(dims, cellIndex(dims, col, row + d), true));
      if (col + d >= 0 && col + d < dims.cols) take(line(dims, cellIndex(dims, col + d, row), false));
    }
  } else take(square(dims, b, 2));
  take([a, b]);
  return { cells: cells, kind: rockets === 2 ? 'cross' : rockets === 1 ? 'wide-cross' : 'big-blast' };
}
