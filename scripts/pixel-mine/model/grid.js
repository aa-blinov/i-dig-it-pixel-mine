// Pure board rules: indexes, board generation, line detection, gravity.
// No runtime calls. A board is a row-major array of colour indexes for a
// field of dims.cols x dims.rows cells:
//   -1  an empty cell
//   -2  the diamond drill, which belongs to no colour and never makes a line
//   0+  the colour of the ore, an index into the contract's ore palette

export var EMPTY = -1;
export var DRILL = -2;

export function cellIndex(dims, col, row) {
  return row * dims.cols + col;
}

export function colOf(dims, index) {
  return index % dims.cols;
}

export function rowOf(dims, index) {
  return (index - (index % dims.cols)) / dims.cols;
}

export function cellCount(dims) {
  return dims.cols * dims.rows;
}

export function areAdjacent(dims, a, b) {
  return Math.abs(colOf(dims, a) - colOf(dims, b)) + Math.abs(rowOf(dims, a) - rowOf(dims, b)) === 1;
}

// Refuses the colours that would already make a line of three, so the
// player never opens a board that is already won.
export function makeBoard(rand, dims, colours) {
  var grid = [];
  for (var row = 0; row < dims.rows; row++) {
    for (var col = 0; col < dims.cols; col++) {
      var banned = {};
      if (col >= 2 && grid[cellIndex(dims, col - 1, row)] === grid[cellIndex(dims, col - 2, row)]) banned[grid[cellIndex(dims, col - 1, row)]] = true;
      if (row >= 2 && grid[cellIndex(dims, col, row - 1)] === grid[cellIndex(dims, col, row - 2)]) banned[grid[cellIndex(dims, col, row - 1)]] = true;
      var colour;
      do { colour = Math.floor(rand() * colours); } while (banned[colour]);
      grid[cellIndex(dims, col, row)] = colour;
    }
  }
  return grid;
}

// Every straight run of three or more equal colours, with its direction.
export function findRuns(grid, dims) {
  var runs = [];
  function scan(lines, length, at, horizontal) {
    for (var line = 0; line < lines; line++) {
      var start = 0;
      while (start < length) {
        var colour = grid[at(line, start)];
        if (colour < 0) { start++; continue; }
        var end = start + 1;
        while (end < length && grid[at(line, end)] === colour) end++;
        if (end - start >= 3) {
          var cells = [];
          for (var k = start; k < end; k++) cells.push(at(line, k));
          runs.push({ cells: cells, colour: colour, horizontal: horizontal });
        }
        start = end;
      }
    }
  }
  scan(dims.rows, dims.cols, function (row, col) { return cellIndex(dims, col, row); }, true);
  scan(dims.cols, dims.rows, function (col, row) { return cellIndex(dims, col, row); }, false);
  return runs;
}

// Every group of three or more equal colours, as arrays of cell indexes.
export function findGroups(grid, dims) {
  return findRuns(grid, dims).map(function (run) { return run.cells; });
}

export function clearedCells(groups) {
  var cells = {};
  for (var i = 0; i < groups.length; i++) {
    for (var j = 0; j < groups[i].length; j++) cells[groups[i][j]] = true;
  }
  return cells;
}

export function hasGroupAt(grid, dims, index) {
  var groups = findGroups(grid, dims);
  for (var i = 0; i < groups.length; i++) {
    if (groups[i].indexOf(index) >= 0) return true;
  }
  return false;
}

export function wouldSwap(grid, dims, a, b) {
  var swap = grid[a]; grid[a] = grid[b]; grid[b] = swap;
  var hit = hasGroupAt(grid, dims, a) || hasGroupAt(grid, dims, b);
  swap = grid[a]; grid[a] = grid[b]; grid[b] = swap;
  return hit;
}

// Whether a swap of the two cells is a move: it makes a line, it uses the
// diamond drill, or it joins two specials.
export function isMove(grid, specials, dims, a, b) {
  if (grid[a] === DRILL || grid[b] === DRILL) return true;
  if (specials && specials[a] && specials[b]) return true;
  return wouldSwap(grid, dims, a, b);
}

export function hasAnyMove(grid, dims, specials) {
  for (var index = 0; index < cellCount(dims); index++) {
    var col = colOf(dims, index), row = rowOf(dims, index);
    if (col + 1 < dims.cols && isMove(grid, specials, dims, index, index + 1)) return true;
    if (row + 1 < dims.rows && isMove(grid, specials, dims, index, index + dims.cols)) return true;
  }
  return false;
}

// Lets the survivors of a column fall to the bottom and reports what has to
// happen: "falls" says which cell a survivor moved away from and where it
// lands, "spawns" are the cells that get a new ore, with its colour and the
// distance it travels to reach the cell.
export function collapse(grid, dims, rand, colours) {
  var next = grid.slice(), falls = [], spawns = [];
  for (var col = 0; col < dims.cols; col++) {
    var survivors = [];
    for (var row = dims.rows - 1; row >= 0; row--) {
      if (grid[cellIndex(dims, col, row)] !== EMPTY) survivors.push(cellIndex(dims, col, row));
    }
    var target = dims.rows - 1;
    for (var i = 0; i < survivors.length; i++) {
      var from = survivors[i], to = cellIndex(dims, col, target);
      next[to] = grid[from];
      if (from !== to) { next[from] = EMPTY; falls.push({ from: from, to: to }); }
      target--;
    }
    // The rows above the survivors get new ore. It arrives from above the
    // board, so every new piece of a column travels the same distance.
    var emptyRows = target + 1;
    for (row = target; row >= 0; row--) {
      var colour = Math.floor(rand() * colours);
      next[cellIndex(dims, col, row)] = colour;
      spawns.push({ index: cellIndex(dims, col, row), colour: colour, distance: emptyRows });
    }
  }
  return { grid: next, falls: falls, spawns: spawns };
}

// The first move on the board, scanning row by row: [a, b] or null. The hint
// shows it when the player has been still for a while.
export function firstMove(grid, dims, specials) {
  for (var index = 0; index < cellCount(dims); index++) {
    var col = colOf(dims, index), row = rowOf(dims, index);
    if (col + 1 < dims.cols && isMove(grid, specials, dims, index, index + 1)) return [index, index + 1];
    if (row + 1 < dims.rows && isMove(grid, specials, dims, index, index + dims.cols)) return [index, index + dims.cols];
  }
  return null;
}
