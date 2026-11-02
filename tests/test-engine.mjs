// Runs the shipped game engine against a mock runtime and checks the rules.
//
// The engine is the set of modules in scripts/pixel-mine, the very files the
// Construct project ships, so this test covers the code the game actually runs.
//
// Usage: node tests/test-engine.mjs
import assert from 'node:assert/strict';
import { bootGame, liveOre, settle, bestVisibleMove } from './runtime.mjs';

let count = 0;
function check(name, condition, detail = '') { assert.ok(condition, name + (detail ? ' (' + detail + ')' : '')); count++; console.log('ok   ' + name); }

const probe = bootGame({ campaign: false }).__m3, M = probe.model, S = M.specials;
const D77 = { cols: 7, rows: 7 }, D78 = { cols: 7, rows: 8 }, D99 = { cols: 9, rows: 9 };
const empty = dims => new Array(dims.cols * dims.rows).fill(-1);
// A board where every cell gets its own colour except the ones set, so no
// accidental line forms.
function board(dims, set) {
  const grid = empty(dims).map((_, i) => 10 + i);
  for (const [index, colour] of Object.entries(set)) grid[index] = colour;
  return grid;
}

// ------------------------------------------------------------- the field
check('indexes follow the field width', M.cellIndex(D78, 3, 2) === 17 && M.colOf(D78, 17) === 3 && M.rowOf(D78, 17) === 2);
check('adjacency respects row ends', M.areAdjacent(D77, 6, 13) && !M.areAdjacent(D77, 6, 7));
for (const [n, c] of M.contracts.entries()) {
  const dims = { cols: c.cols, rows: c.rows }, rand = M.seededRandom('open' + n);
  const grid = M.makeBoard(rand, dims, M.layers[c.layer].ores.length);
  assert.ok(M.findRuns(grid, dims).length === 0, 'contract ' + (n + 1) + ' opens with a line');
}
check('every contract opens without a ready line', true);
check('every field fits between the ladder and the shaft', M.contracts.every(c => c.cols <= 7 && c.rows <= 7));
check('fields grow, quotas rise, moves stay within the first contract', M.contracts.every((c, i, all) => i === 0 || (c.cols * c.rows >= all[i - 1].cols * all[i - 1].rows && c.moves <= all[0].moves && c.quota >= all[i - 1].quota)) && M.contracts.at(-1).moves < M.contracts[0].moves);
check('every layer plays ores with distinct sprites', M.layers.every(layer => new Set(layer.ores).size === layer.ores.length && layer.ores.every(o => M.ores[o])));
check('a setup carries its field, moves and palette', (() => { const s = M.contractSetup('contract', 4); return s.dims.cols === 5 && s.moves === M.contracts[3].moves && s.palette.length === 5; })());

// ------------------------------------------------------------ the lines
{
  const g = board(D77, { 0: 1, 1: 1, 2: 1 });
  const runs = M.findRuns(g, D77);
  check('a row of three is one horizontal run', runs.length === 1 && runs[0].horizontal && runs[0].cells.join() === '0,1,2');
  const r = M.resolveMatches(g, D77, null, []);
  check('three in a row creates no special', r.creations.length === 0 && Object.keys(r.cleared).length === 3);
}
{
  const g = board(D77, { 0: 1, 1: 1, 2: 1, 3: 1 });
  const sideways = M.resolveMatches(g, D77, { a: 4, b: 3 }, []);
  check('four in a row swapped sideways makes a row rocket where the ore landed', sideways.creations.length === 1 && sideways.creations[0].special === S.ROW && sideways.creations[0].index === 3);
  const updown = M.resolveMatches(g, D77, { a: 10, b: 3 }, []);
  check('four in a row swapped vertically makes a column rocket', updown.creations[0].special === S.COLUMN);
  const cascade = M.resolveMatches(g, D77, null, []);
  check('a falling four makes a rocket along its line', cascade.creations[0].special === S.ROW && cascade.creations[0].index === 1);
}
{
  const g = board(D77, { 0: 2, 1: 2, 2: 2, 3: 2, 4: 2 });
  const r = M.resolveMatches(g, D77, { a: 9, b: 2 }, []);
  check('five in a row makes the diamond drill without a colour', r.creations.length === 1 && r.creations[0].special === S.DRILL && r.creations[0].colour === M.DRILL_COLOUR && r.creations[0].index === 2);
}
{
  // An L: row 0 cells 0-2 and column 0 rows 0-2.
  const g = board(D77, { 0: 3, 1: 3, 2: 3, 7: 3, 14: 3 });
  const r = M.resolveMatches(g, D77, null, []);
  check('an L makes a charge at the corner', r.creations.length === 1 && r.creations[0].special === S.CHARGE && r.creations[0].index === 0);
  const t = board(D77, { 0: 3, 1: 3, 2: 3, 8: 3, 15: 3 });
  check('a T makes a charge at the crossing', M.resolveMatches(t, D77, null, []).creations[0].index === 1);
}
{
  const g = board(D77, { 0: 1, 1: 1, 2: 1, 3: 1 });
  const full = [S.ROW, S.ROW, S.ROW, S.ROW];
  check('no new special when four are on the board', M.resolveMatches(g, D77, null, full).creations.length === 0);
}

// ------------------------------------------------------------ the effects
{
  const g = board(D77, {});
  const specials = []; specials[10] = S.ROW;
  const out = M.expandEffects({ 10: true }, D77, g, specials, [], {}, {});
  check('a row rocket clears its whole row', Object.keys(out.cells).length === 7 && Object.keys(out.cells).every(i => M.rowOf(D77, Number(i)) === 1));
  specials[12] = S.COLUMN;
  const chained = M.expandEffects({ 10: true }, D77, g, specials, [], {}, {});
  check('a rocket sets off the special it hits', chained.fired.length === 2 && Object.keys(chained.cells).length === 13);
  const spent = M.expandEffects({ 10: true }, D77, g, specials, [], {}, { 10: true });
  check('a spent special does not fire again', spent.fired.length === 0);
  const kept = M.expandEffects({ 10: true, 11: true }, D77, g, [], [], { 11: true }, {});
  check('the cell that becomes a special is not cleared', !kept.cells[11] && kept.cells[10]);
}
{
  const g = board(D77, {});
  const corner = new Array(49).fill(null); corner[0] = 'dynamite';
  check('corner dynamite does not wrap across the field edge', Object.keys(M.expandEffects({ 0: true }, D77, g, [], corner).cells).sort().join() === '0,1,7,8');
  const column = new Array(49).fill(null); column[3] = 'drill';
  const opened = M.expandEffects({ 3: true }, D77, g, [], column).cells;
  check('a buried drill opens exactly one column', Object.keys(opened).length === 7 && Object.keys(opened).every(i => Number(i) % 7 === 3));
  const chain = new Array(49).fill(null); chain[0] = 'dynamite'; chain[8] = 'drill';
  // 3×3 in the corner (0, 1, 7, 8) plus the drill's column 1: nine cells.
  check('dynamite sets off a buried drill', Object.keys(M.expandEffects({ 0: true }, D77, g, [], chain).cells).length === 9);
}
{
  const g = board(D77, { 5: 4, 20: 4, 33: 4 }); g[0] = M.DRILL_COLOUR;
  const sp = []; sp[0] = S.DRILL;
  const drill = M.comboCells(g, sp, D77, 0, 1);
  check('the drill swapped with ore takes all of that ore', drill && drill.cells[1] && drill.cells[0] && Object.keys(drill.cells).length === 2);
  const drillOnColour = M.comboCells(g, sp, D77, 0, 5);
  check('the drill clears every piece of the colour it meets', [5, 20, 33, 0].every(i => drillOnColour.cells[i]));
  const rockets = []; rockets[24] = S.ROW; rockets[25] = S.COLUMN;
  check('two rockets make a cross', Object.keys(M.comboCells(g, rockets, D77, 24, 25).cells).length === 13);
  const wide = []; wide[24] = S.ROW; wide[25] = S.CHARGE;
  check('a rocket and a charge make a three-wide cross', Object.keys(M.comboCells(g, wide, D77, 24, 25).cells).length === 33);
  const big = []; big[24] = S.CHARGE; big[25] = S.CHARGE;
  check('two charges blast 5×5', Object.keys(M.comboCells(g, big, D77, 24, 25).cells).length === 25);
  const both = []; both[0] = S.DRILL; both[1] = S.DRILL; g[1] = M.DRILL_COLOUR;
  check('two drills clear the whole field', Object.keys(M.comboCells(g, both, D77, 0, 1).cells).length === 49);
  const one = []; one[24] = S.ROW;
  check('a special swapped with plain ore needs a line', M.comboCells(g, one, D77, 24, 25) === null);
}
{
  const g = board(D77, {}); g[24] = M.DRILL_COLOUR;
  const sp = []; sp[24] = S.DRILL;
  check('a board with the drill always has a move', M.hasAnyMove(g, D77, sp) && !M.hasAnyMove(board(D77, {}), D77, []));
  const fall = M.collapse(g.map((c, i) => i === 31 ? -1 : c), D77, () => 0, 5);
  check('gravity keeps the drill and moves it down', fall.grid[31] === M.DRILL_COLOUR && fall.grid[24] !== M.DRILL_COLOUR);
}

// --------------------------------------------------------------- the game
const rt = bootGame({ campaign: false }), e = rt.__m3;
const cells = e.dims.cols * e.dims.rows;
e.buried.fill(null); // ordinary rule checks: no energy or blasts in the way
check('opening board is full', e.cells.length === cells && e.cells.every(g => g));
check('one Ore sprite per cell, framed by its ore', liveOre(rt).length === cells && e.cells.every(g => g.inst.animationFrame === e.palette[g.colour]));
check('the field has a rock tile under every cell', rt.created.filter(i => i.type === 'BoardTile' && !i.destroyed).length === cells);
check('the field is centred between the ladder and the shaft', e.board.x0 === 360 - e.dims.cols * e.board.cell / 2);
check('the moves come from the contract', e.moves === M.contracts[0].moves);
{
  // A pointless swap costs nothing and puts the ore back.
  const colours = () => e.cells.map(g => g.colour).join();
  let a = -1;
  for (let i = 0; i < cells - 1 && a < 0; i++) {
    if (i % e.dims.cols === e.dims.cols - 1) continue;
    if (!M.isMove(e.cells.map(g => g.colour), [], e.dims, i, i + 1)) a = i;
  }
  const before = colours(), moves = e.moves;
  e.tap(a); e.tap(a + 1); settle(rt);
  check('a pointless swap leaves the board and the moves alone', colours() === before && e.moves === moves);
}
{
  const move = bestVisibleMove(e), moves = e.moves, score = e.score;
  e.tap(move[0]); e.tap(move[1]); settle(rt);
  check('a real swap spends one move and scores', e.moves === moves - 1 && e.score > score);
  for (let i = 0; i < 120; i++) e.step(1 / 60); // the ship keeps rolling after the ore settles
  check('the ship rolls under the mined ore', Math.abs(e.ship.x - e.ship.target) < 1 && e.ship.target >= e.board.x0 && e.ship.target <= e.board.x0 + e.dims.cols * e.board.cell && !!e.ship.inst);
}
{
  // Stage a four: the special appears where the moved ore landed.
  const g = bootGame({ campaign: false }), x = g.__m3, dims = x.dims;
  x.buried.fill(null);
  const setColour = (i, c) => { x.cells[i].colour = c; x.cells[i].inst.animationFrame = x.palette[c]; };
  x.cells.forEach((gem, i) => setColour(i, (Math.floor(i / dims.cols) * 2 + i) % 5));
  // row 3: cells 0,1,2 colour 4 and cell 3 not; the ore above cell 3 is colour 4.
  const r = 3 * dims.cols;
  [0, 1, 2].forEach(k => setColour(r + k, 4)); setColour(r + 3, 0); setColour(r + 3 - dims.cols, 4); setColour(r + 4, 1);
  setColour(r - dims.cols + 2, 2); setColour(r + dims.cols + 3, 3);
  const before = x.moves;
  x.tap(r + 3 - dims.cols); x.tap(r + 3); settle(g);
  const special = x.cells.find(gem => gem.special);
  check('a four made in play leaves a rocket with a badge', !!special && (special.special === 'column') && !!special.mark && !special.mark.destroyed, JSON.stringify(x.cells.filter(c => c.special).map(c => c.special)));
  check('making a special still costs one move', x.moves === before - 1);
}
{
  // The drill swapped with ore clears every piece of that ore for one move.
  const g = bootGame({ campaign: false }), x = g.__m3;
  x.buried.fill(null);
  const target = x.cells[1].colour;
  x.cells[0].special = 'drill'; x.cells[0].colour = M.DRILL_COLOUR;
  const piecesBefore = x.cells.filter(c => c.colour === target).length, moves = x.moves, score = x.score;
  x.tap(0); x.tap(1); settle(g);
  check('the drill clears its colour for one move', x.moves === moves - 1 && x.score >= score + piecesBefore * M.oreValue(x.palette, target));
}
{
  // Finds: valuables fly into the hold, energy into the gauge.
  const g = bootGame({ campaign: false }), x = g.__m3;
  x.buried.fill(null);
  // Every cell hides a ring: a move that makes a special keeps one cell, so
  // finds under the move's two cells alone are not always revealed.
  const move = bestVisibleMove(x);
  x.buried.fill('ring');
  x.tap(move[0]); x.tap(move[1]);
  for (let i = 0; i < 120 && x.phase !== 'falling'; i++) x.step(1 / 60);
  check('a revealed find takes off towards the hold', x.flights.length > 0 && x.cargoSprites.length === 0);
  settle(g); for (let i = 0; i < 60; i++) x.step(1 / 60);
  check('the find lands in the hold', x.flights.length === 0 && x.cargoSprites.length >= 1 && x.cargo.includes('ring'));
}
{
  // A full hold sells the next valuable: the points stay, the collection does not grow.
  const g = bootGame({ campaign: false }), x = g.__m3;
  x.buried.fill(null); x.cargo = ['ring'];
  const move = bestVisibleMove(x);
  x.buried.fill('idol');
  x.tap(move[0]); x.tap(move[1]); settle(g); for (let i = 0; i < 60; i++) x.step(1 / 60);
  check('a full hold sells new valuables on the spot', x.cargo.length === 1 && !x.cargo.includes('idol') && x.relics.length === 0 && x.findCount >= 1);
}
{
  const g = bootGame({ campaign: false }), x = g.__m3;
  x.buried.fill('fuel');
  const move = bestVisibleMove(x), moves = x.moves;
  x.tap(move[0]); x.tap(move[1]); settle(g);
  check('energy uncovered extends the shift and stays out of the hold', x.moves > moves - 1 && x.cargo.length === 0);
}
{
  // No leaks: restarts and the base leave only the live board.
  const g = bootGame({ campaign: false }), x = g.__m3;
  for (let n = 0; n < 3; n++) { const move = bestVisibleMove(x); x.tap(move[0]); x.tap(move[1]); for (let i = 0; i < 30; i++) x.step(1 / 60); x.reset(); }
  const cellsNow = x.dims.cols * x.dims.rows;
  const live = g.created.filter(i => !i.destroyed && !['MineDrill'].includes(i.type));
  check('restart mid-turn leaves exactly the new board', liveOre(g).length === cellsNow && live.filter(i => i.type === 'BoardTile').length === cellsNow);
  check('restart releases specials, effects and flights', live.every(i => ['Ore', 'BoardTile', 'Selection'].includes(i.type)), [...new Set(live.map(i => i.type))].join());
}
{
  const calm = bootGame({ campaign: false, reducedMotion: true }), c = calm.__m3;
  c.buried.fill(null);
  const move = bestVisibleMove(c), moves = c.moves;
  c.tap(move[0]); c.tap(move[1]); settle(calm);
  check('reduced motion keeps the rules', c.moves === moves - 1 && c.score > 0);
  check('reduced motion makes no sparks', calm.created.filter(i => i.type === 'Spark').length === 0);
}
{
  const statusOf = g => g.statics.find(i => i.type === 'StatusText').text;
  const g = bootGame({ campaign: false }), x = g.__m3;
  g.tick(2);
  const idle = statusOf(g);
  x.tap(0); g.tick(1);
  const picked = statusOf(g);
  check('status lines carry no full stop at the end', !/\.\s*$/.test(idle) && !picked.split('\n').some(line => /\.\s*$/.test(line)), idle + ' | ' + picked);
}
{
  const g = bootGame({ campaign: false }), x = g.__m3;
  for (let i = 0; i < 20; i++) g.key('ArrowRight');
  for (let i = 0; i < 20; i++) g.key('ArrowDown');
  check('the keyboard cursor stops at the field corner', x.cursor === x.dims.cols * x.dims.rows - 1);
}
{
  const big = bootGame(), x = big.__m3;
  x.profile.completed = 9; x.openCamp(); x.beginRound('contract');
  check('a deep contract plays a 7×7 field of its own ores', x.dims.cols === 7 && x.dims.rows === 7 && liveOre(big).length === 49 && x.palette.join() === M.layers[3].ores.join());
  check('a 7×7 field still fits the screen', x.board.x0 >= 60 && x.board.x0 + 7 * x.board.cell <= 660 && x.board.y0 + 7 * x.board.cell <= 910);
  check('cells are big enough for a finger on a 375 px phone', x.board.cell * 375 / 720 >= 44);
}
{
  // Abilities: they need charge, cost no fuel, and do what they say.
  const g = bootGame({ campaign: false }), x = g.__m3;
  x.buried.fill(null);
  x.abilities = ['dynamite', 'reserve', 'rush', 'seismo', 'shuffle'];
  x.charge = 10;
  check('an ability without enough charge does nothing', x.useAbility('dynamite') === false && !x.aiming);
  x.charge = 60;
  const fuel = x.moves, score = x.score;
  check('a targeted ability waits for a cell', x.useAbility('dynamite') === true && x.aiming === 'dynamite');
  x.tap(24); settle(g);
  // The charge refills from the ore the blast clears, so only the fuel and the score are checked.
  check('dynamite opens 3×3 for charge, not fuel', x.moves === fuel && x.score > score && !x.aiming);
  const before = x.moves; x.charge = 60; x.useAbility('reserve');
  check('the fuel reserve adds two fuel', x.moves === before + 2);
  x.charge = 60; x.useAbility('rush');
  check('the rush lasts two moves', x.rushMoves === 2);
  x.charge = 60; x.buried[3] = 'ring'; x.useAbility('seismo');
  check('the seismic probe marks every buried find', x.scanMarkers.some(m => m.seismo && m.index === 3) && x.seismo === 3);
  x.charge = 60; const colours = x.cells.map(c => c.colour).join(); x.useAbility('shuffle');
  check('shuffle deals the ore again', x.cells.map(c => c.colour).join() !== colours && x.model.findRuns(x.cells.map(c => c.colour), x.dims).length === 0);
}
{
  // A swipe from an ore swaps it with the neighbour in that direction.
  const rt = bootGame({ campaign: false }), e = rt.__m3;
  settle(rt);
  const [a, b] = bestVisibleMove(e), C = e.dims.cols;
  const cx = i => e.board.x0 + (i % C) * e.board.cell + e.board.cell / 2, cy = i => e.board.y0 + Math.floor(i / C) * e.board.cell + e.board.cell / 2;
  const turns = e.turns, fire = (name, i, dx = 0, dy = 0) => (rt.listeners[name] || []).forEach(fn => fn({ clientX: cx(i) + dx, clientY: cy(i) + dy }));
  fire('pointerdown', a);
  fire('pointerup', a, b === a + 1 ? 40 : b === a - 1 ? -40 : 0, b === a + C ? 40 : b === a - C ? -40 : 0);
  rt.tick(400);
  check('a swipe makes the move', e.turns === turns + 1, e.turns + ' vs ' + turns);
  settle(rt);
  const before = e.turns;
  fire('pointerdown', 0); fire('pointerup', 0, 5, 3); rt.tick(60);
  check('a short wobble is a plain tap, not a swipe', e.turns === before && e.selected === 0);
}
{
  // The hint points at a real move, and finds none on a dead board.
  const G = await import('../scripts/pixel-mine/model/grid.js');
  const g = board(D77, { 0: 1, 1: 1, 9: 1 });
  const move = G.firstMove(g, D77, null);
  check('the hint finds a move that makes a line', !!move && G.isMove(g, null, D77, move[0], move[1]));
  check('the hint finds nothing on a board without moves', G.firstMove(board(D77, {}), D77, null) === null);
}
console.log('\n' + count + ' engine checks passed');
