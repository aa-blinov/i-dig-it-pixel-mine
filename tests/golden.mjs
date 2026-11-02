// Golden-master check: replays scripted games against the engine and compares
// a state hash taken on every tick with a stored baseline. Any change in the
// rules, the animation timing or the runtime calls shows up as a different hash.
//
//   node tests/golden.mjs --write   record the baseline
//   node tests/golden.mjs           compare with the baseline
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { bootGame, memoryStorage, bestVisibleMove } from './runtime.mjs';

const BASELINE = new URL('./golden-baseline.json', import.meta.url);
const write = process.argv.includes('--write');

function seeded(seed) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = text => createHash('sha1').update(text).digest('hex').slice(0, 16);

function view(rt, storage) {
  const e = rt.__m3;
  return {
    phase: e.phase, mode: e.mode, seed: e.seed, goal: e.goal === Infinity ? 'inf' : e.goal, contract: e.contract,
    score: e.score, moves: e.moves, chain: e.chain, finds: e.findCount, selected: e.selected, cursor: e.cursor, muted: e.muted,
    toast: e.toast, campMessage: e.campMessage, shopMessage: e.shopMessage, energyGranted: e.energyGranted,
    board: (e.cells || []).map(c => c && [c.colour, c.special, Math.round(c.inst.x), Math.round(c.inst.y), c.inst.opacity, c.inst.animationFrame]),
    ship: e.ship && [Math.round(e.ship.x), Math.round(e.ship.target)], flights: (e.flights || []).length, effects: (e.effects || []).length, cargo: e.cargo,
    buried: e.buried ? Array.from(e.buried) : null, inventory: e.inventory, profile: e.profile, result: e.lastResult,
    scan: (e.scanMarkers || []).length,
    statics: rt.statics.map(s => [s.type, s.text, s.isVisible, s.opacity]),
    storage: storage.getItem('pixel-mine.profile.v2'),
    created: rt.created.map(i => [i.type, Math.round(i.x), Math.round(i.y), i.destroyed ? 1 : 0, i.isVisible, i.text, Math.round((i.opacity ?? 1) * 100)]),
  };
}

// A scenario is a function that drives the game through `h`, which records.
function recorder(rt, storage) {
  const trace = { ticks: 0, chain: '', checkpoints: [] };
  return {
    rt, e: rt.__m3, storage, trace,
    mark(label) { const text = JSON.stringify(view(rt, storage)); trace.checkpoints.push({ label, hash: hash(text), score: rt.__m3.score, moves: rt.__m3.moves, phase: rt.__m3.phase }); },
    tick(dt) { rt.__m3.step(dt); trace.ticks++; trace.chain = hash(trace.chain + JSON.stringify(view(rt, storage))); },
    settle(dt = 1 / 60, limit = 4000) { for (let i = 0; i < limit && !['idle', 'base'].includes(this.e.phase); i++) this.tick(dt); assert.ok(['idle', 'base'].includes(this.e.phase), 'did not settle'); },
    play(turns, pick = bestVisibleMove, dt = 1 / 60) { for (let t = 0; t < turns && this.e.phase !== 'base'; t++) { const cells = pick(this.e); if (!cells) break; this.e.tap(cells[0]); this.e.tap(cells[1]); this.settle(dt); this.mark('turn ' + (t + 1)); } },
  };
}
const worst = e => { const d = e.dims, n = d.cols * d.rows, moves = []; for (let a = 0; a < n; a++) for (const b of [a + 1, a + d.cols]) { if (b >= n || (b === a + 1 && a % d.cols === d.cols - 1)) continue; const c = e.cells.map(g => g.colour); [c[a], c[b]] = [c[b], c[a]]; if (e.model.findGroups(c, d).some(g => g.includes(a) || g.includes(b))) moves.push([a, b]); } return moves[moves.length - 1]; };

const scenarios = {
  daily(h) { h.e.beginRound('daily', 'PM2-2026-11-01'); h.mark('start'); h.play(28); h.mark('end'); },
  dailyOtherCode(h) { h.e.beginRound('daily', 'PM2-2026-10-31'); h.play(28, worst, 0.03); h.mark('end'); },
  dailyReducedMotion(h) { h.e.beginRound('daily', 'PM2-2026-11-01'); h.play(8); h.mark('end'); },
  campaign(h) {
    const { e } = h; e.profile.credits = 1000; h.mark('rich');
    e.buy('battery'); e.buy('blast'); e.buy('scanner'); e.equip('blast'); e.equip('scanner'); e.buy('battery'); h.mark('shop');
    for (let c = 0; c < 4; c++) { e.beginRound('contract'); h.mark('contract ' + c); h.play(24); h.mark('after ' + c); if (e.phase !== 'base') e.openCamp(); h.mark('camp ' + c); }
  },
  failure(h) { const { e } = h; e.beginRound('contract'); h.play(24, worst); if (e.phase !== 'base') { e.moves = 0; h.settle(); } h.mark('failed'); e.finishRound(); h.mark('settled'); e.beginRound('contract'); e.openCamp(); h.mark('abort'); },
  keyboard(h) {
    const { rt, e } = h; e.beginRound('daily', 'PM2-2026-11-01');
    for (let t = 0; t < 6; t++) {
      const [a, b] = bestVisibleMove(e);
      const w = e.dims.cols;
      const go = target => { while (e.cursor % w < target % w) rt.key('ArrowRight'); while (e.cursor % w > target % w) rt.key('ArrowLeft'); while (Math.floor(e.cursor / w) < Math.floor(target / w)) rt.key('ArrowDown'); while (Math.floor(e.cursor / w) > Math.floor(target / w)) rt.key('ArrowUp'); };
      go(a); rt.key('Enter'); h.mark('picked'); rt.key('Escape'); h.mark('esc'); go(a); rt.key('Space'); go(b); rt.key('Enter'); h.settle(); h.mark('turn ' + t);
    }
    rt.key('KeyM'); h.mark('muted'); rt.key('KeyR'); h.mark('abort');
    for (const code of ['Digit1', 'Digit2', 'KeyQ', 'KeyW', 'KeyC', 'KeyV', 'KeyD']) { rt.key(code); h.mark(code); if (e.phase !== 'base') { h.play(2); e.openCamp(); } }
  },
  pointer(h) {
    const { rt, e } = h; e.beginRound('daily', 'PM2-2026-11-01');
    const press = (x, y) => (rt.listeners.pointerdown || []).forEach(fn => fn({ clientX: x, clientY: y }));
    const at = i => [e.board.x0 + (i % e.dims.cols) * e.board.cell + e.board.cell / 2, e.board.y0 + Math.floor(i / e.dims.cols) * e.board.cell + e.board.cell / 2];
    for (let t = 0; t < 5; t++) { const [a, b] = bestVisibleMove(e); press(...at(a)); h.mark('sel'); press(...at(b)); h.settle(); h.mark('turn ' + t); }
    press(288, 56); h.mark('mute'); press(500, 1180); h.mark('toBase');
    for (const [x, y] of [[560, 420], [560, 490], [100, 1000], [100, 1100], [100, 1170], [500, 1170], [560, 580], [560, 650]]) { press(x, y); h.mark('base click ' + x + ',' + y); if (e.phase !== 'base') { h.play(1); e.openCamp(); } }
  },
  classic(h) { h.e.reset(); h.mark('start'); h.play(10, bestVisibleMove); h.mark('end'); },
  uiText(h) { h.e.beginRound('daily', 'PM2-2026-11-01'); h.play(3); h.e.openCamp(); h.mark('camp'); },
  variableDt(h) { h.e.beginRound('daily', 'PM2-2026-11-01'); const dts = [0.05, 0.008, 0.033, 0.016, 0.2, 0, -1]; let i = 0; for (let t = 0; t < 10 && h.e.phase !== 'base'; t++) { const cells = bestVisibleMove(h.e); h.e.tap(cells[0]); h.e.tap(cells[1]); for (let k = 0; k < 4000 && !['idle', 'base'].includes(h.e.phase); k++) h.tick(dts[i++ % dts.length]); h.mark('turn ' + t); } },
};
const options = { classic: { campaign: false }, uiText: { ui: true }, dailyReducedMotion: { reducedMotion: true }, keyboard: { ui: true } };

export function runAll() {
  const out = {};
  for (const [name, fn] of Object.entries(scenarios)) {
    Math.random = seeded(12345);
    const storage = memoryStorage();
    const rt = bootGame({ ...(options[name] || {}), storage });
    const h = recorder(rt, storage); h.mark('boot');
    fn(h); h.mark('final');
    out[name] = { ticks: h.trace.ticks, chain: h.trace.chain, checkpoints: h.trace.checkpoints };
  }
  return out;
}

const result = runAll();
if (write) {
  writeFileSync(BASELINE, JSON.stringify(result, null, 1));
  console.log('baseline written: ' + Object.entries(result).map(([k, v]) => `${k}=${v.checkpoints.length}cp/${v.ticks}t`).join(' '));
} else {
  assert.ok(existsSync(BASELINE), 'no baseline: run with --write on a known-good engine');
  const expected = JSON.parse(readFileSync(BASELINE, 'utf8'));
  for (const name of Object.keys(expected)) {
    const a = expected[name], b = result[name];
    assert.ok(b, 'missing scenario ' + name);
    assert.equal(b.checkpoints.length, a.checkpoints.length, name + ': checkpoint count');
    a.checkpoints.forEach((cp, i) => assert.deepEqual(b.checkpoints[i], cp, `${name}: checkpoint ${i} (${cp.label}) differs`));
    assert.equal(b.ticks, a.ticks, name + ': tick count');
    assert.equal(b.chain, a.chain, name + ': per-tick state chain');
    console.log('ok   ' + name + ' (' + a.checkpoints.length + ' checkpoints, ' + a.ticks + ' ticks)');
  }
  console.log('golden master matches');
}
