import { startEngine } from './load-engine.mjs';
export function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
}
// The object types of the Play layout. Sprites created by the engine.
export const SPRITES = ['Ore', 'SpecialMark', 'BoardTile', 'Blast', 'Ring', 'Spark', 'Selection', 'ScanMark', 'GoalFill', 'RelicRing', 'RelicIdol', 'RelicFossil', 'BoostFuel', 'BoostDynamite', 'BoostDrill'];
// Instances placed in the layout itself.
export const PLACED = ['ScoreText', 'MovesText', 'StatusText', 'LootText', 'GaugeNeedle', 'MineDrill', 'SoundButton'];
export function bootGame({ campaign = true, storage = memoryStorage(), ui = false, reducedMotion = false } = {}) {
  const created = [], listeners = {}, statics = [];
  class Instance {
    constructor(type, x = 0, y = 0) { Object.assign(this, { type, x, y, width: 64, height: 64, opacity: 1, isVisible: true, text: '', animationFrame: 0 }); }
    setPosition(x, y) { this.x = x; this.y = y; }
    setSize(width, height) { this.width = width; this.height = height; }
    destroy() { this.destroyed = true; }
    moveToTop() {}
    setAutoResolutionMode() {}
  }
  const types = [...SPRITES, 'PopText', ...PLACED];
  if (campaign) types.push('CampBackdrop');
  if (ui) types.push('UIText');
  for (const name of [...PLACED, ...(campaign ? ['CampBackdrop'] : [])]) statics.push(new Instance(name));
  const runtime = {
    dt: 1 / 60, created, statics, listeners,
    objects: Object.fromEntries(types.map(name => [name, {
      createInstance(layer, x, y) { const inst = new Instance(name, x, y); inst.layer = layer; created.push(inst); return inst; },
      getFirstInstance() { return [...statics, ...created].find(i => i.type === name && !i.destroyed); },
    }])),
    layout: { getLayer: () => ({ cssPxToLayer: (x, y) => [x, y] }) },
    addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
    tick(count = 1) { for (let i = 0; i < count; i++) (listeners.tick || []).forEach(fn => fn()); },
    key(code) { (listeners.keydown || []).forEach(fn => fn({ code, preventDefault() {} })); },
  };
  startEngine(runtime, { storage, reducedMotion });
  return runtime;
}
export const liveOre = runtime => runtime.created.filter(i => i.type === 'Ore' && !i.destroyed);
// Every swap on the board that is a move, with the ore value its lines clear.
export function visibleMoves(engine) {
  const model = engine.model, dims = engine.dims;
  const grid = engine.cells.map(g => g.colour), specials = engine.cells.map(g => g.special);
  const moves = [], total = dims.cols * dims.rows;
  for (let a = 0; a < total; a++) for (const b of [a + 1, a + dims.cols]) {
    if (b >= total || (b === a + 1 && a % dims.cols === dims.cols - 1)) continue;
    if (!model.isMove(grid, specials, dims, a, b)) continue;
    const copy = grid.slice(); [copy[a], copy[b]] = [copy[b], copy[a]];
    const cleared = model.clearedCells(model.findGroups(copy, dims));
    let value = Object.keys(cleared).reduce((sum, index) => sum + model.oreValue(engine.palette, copy[index]), 0);
    if (specials[a] || specials[b] || grid[a] < 0 || grid[b] < 0) value += 400;
    moves.push({ cells: [a, b], value });
  }
  return moves;
}
export function bestVisibleMove(engine) { return visibleMoves(engine).sort((a, b) => b.value - a.value)[0]?.cells; }
export function settle(runtime, limit = 4000) {
  const e = runtime.__m3;
  for (let i = 0; i < limit && !['idle', 'base', 'over'].includes(e.phase); i++) e.step(1 / 60);
  return e.phase;
}
