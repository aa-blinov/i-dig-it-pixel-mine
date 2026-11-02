// Pure rules for the base: placing and upgrading buildings on the grid, the
// income they make per hour, how long it can pile up, and what the base gives
// to a shift. Time is passed in (milliseconds), never read here.
import { BASE_SIZE, BUILDINGS, ECONOMY, NO_STORAGE_CAP_HOURS, UNLOCKS } from "../config.js";

var HOUR = 3600000;

export function freshBase() {
  return { buildings: [], last: null, seq: 0 };
}

export function isOpen(type, completed) {
  return completed >= UNLOCKS[BUILDINGS[type].opens];
}

// The building covering a cell, if any.
export function buildingAt(base, x, y) {
  for (var i = 0; i < base.buildings.length; i++) {
    var b = base.buildings[i], w = BUILDINGS[b.type].w;
    if (y === b.y && x >= b.x && x < b.x + w) return b;
  }
  return null;
}

export function canPlace(base, type, x, y) {
  var def = BUILDINGS[type];
  if (!def || x < 0 || y < 0 || y >= BASE_SIZE || x + def.w > BASE_SIZE) return false;
  for (var k = 0; k < def.w; k++) if (buildingAt(base, x + k, y)) return false;
  return true;
}

// The cells next to a building (not under it).
function neighbours(base, b) {
  var w = BUILDINGS[b.type].w, out = [];
  for (var x = b.x - 1; x <= b.x + w; x++) for (var y = b.y - 1; y <= b.y + 1; y++) {
    if (x < 0 || y < 0 || x >= BASE_SIZE || y >= BASE_SIZE) continue;
    if (y === b.y && x >= b.x && x < b.x + w) continue;
    if (Math.abs(y - b.y) + (x < b.x ? b.x - x : x >= b.x + w ? x - (b.x + w - 1) : 0) !== 1) continue;
    var other = buildingAt(base, x, y);
    if (other && out.indexOf(other) < 0) out.push(other);
  }
  return out;
}

// Income of one building per hour, with its neighbour bonus.
export function buildingIncome(base, b) {
  var def = BUILDINGS[b.type];
  if (!def.income) return 0;
  var rate = def.income[b.level - 1];
  if (def.likes && neighbours(base, b).some(function (n) { return n.type === def.likes; })) rate *= b.type === 'smelter' ? 1.2 : 1.25;
  return rate;
}

export function incomePerHour(base) {
  return Math.round(base.buildings.reduce(function (sum, b) { return sum + buildingIncome(base, b); }, 0) * 10) / 10;
}

export function capHours(base) {
  var store = base.buildings.filter(function (b) { return b.type === 'storage'; });
  return store.length ? Math.max.apply(null, store.map(function (b) { return BUILDINGS.storage.capHours[b.level - 1]; })) : NO_STORAGE_CAP_HOURS;
}

// Credits waiting to be collected at time `now`.
export function pending(base, now) {
  if (base.last === null || base.last === undefined) return 0;
  var hours = Math.max(0, Math.min(capHours(base), (now - base.last) / HOUR));
  return Math.floor(hours * incomePerHour(base));
}

export function hoursToFull(base, now) {
  if (base.last === null || base.last === undefined) return capHours(base);
  return Math.max(0, capHours(base) - (now - base.last) / HOUR);
}

export function collect(profile, now) {
  var amount = pending(profile.base, now);
  profile.credits = Math.min(ECONOMY.wallet, profile.credits + amount);
  profile.base.last = now;
  return amount;
}

// Building: pays the first level, takes the cells, starts the clock.
export function build(profile, type, x, y, now) {
  var def = BUILDINGS[type];
  if (!def) return { ok: false, message: 'Такой постройки нет' };
  if (!isOpen(type, profile.completed)) return { ok: false, message: 'Откроется позже' };
  if (!canPlace(profile.base, type, x, y)) return { ok: false, message: def.w > 1 ? 'Нужны две свободные клетки рядом' : 'Клетка занята' };
  if (profile.credits < def.costs[0]) return { ok: false, message: 'Нужно ещё ' + (def.costs[0] - profile.credits) + ' руды' };
  // Collect first, so a new building does not earn for the hours before it existed.
  if (profile.base.last !== null && profile.base.last !== undefined) collect(profile, now); else profile.base.last = now;
  profile.credits -= def.costs[0];
  profile.base.seq += 1;
  profile.base.buildings.push({ id: profile.base.seq, type: type, x: x, y: y, level: 1 });
  return { ok: true, message: def.name + ': построено' };
}

export function upgrade(profile, id, now) {
  var b = profile.base.buildings.filter(function (item) { return item.id === id; })[0];
  if (!b) return { ok: false, message: 'Постройка не найдена' };
  var def = BUILDINGS[b.type];
  if (b.level >= def.costs.length) return { ok: false, message: 'Максимальный уровень' };
  var cost = def.costs[b.level];
  if (profile.credits < cost) return { ok: false, message: 'Нужно ещё ' + (cost - profile.credits) + ' руды' };
  collect(profile, now);
  profile.credits -= cost;
  b.level += 1;
  return { ok: true, message: def.name + ': уровень ' + b.level };
}

function best(base, type, key) {
  return base.buildings.filter(function (b) { return b.type === type; }).reduce(function (top, b) { return Math.max(top, BUILDINGS[type][key][b.level - 1]); }, 0);
}

// What the base gives a shift.
export function baseBonuses(base) {
  return {
    fuel: best(base, 'generator', 'fuel'),
    cargo: best(base, 'lift', 'cargo'),
    miners: best(base, 'quarters', 'miners'),
    abilitySlots: best(base, 'lab', 'slots'),
    museum: best(base, 'museum', 'bonus'),
    ships: best(base, 'dock', 'ships')
  };
}

export function sanitizeBase(raw) {
  var base = freshBase();
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.buildings)) return base;
  raw.buildings.forEach(function (b) {
    if (!b || !BUILDINGS[b.type]) return;
    var level = Math.max(1, Math.min(BUILDINGS[b.type].costs.length, Math.floor(Number(b.level) || 1)));
    var x = Math.floor(Number(b.x)), y = Math.floor(Number(b.y));
    if (!canPlace(base, b.type, x, y)) return;
    base.seq += 1;
    base.buildings.push({ id: base.seq, type: b.type, x: x, y: y, level: level });
  });
  base.last = typeof raw.last === 'number' && isFinite(raw.last) ? raw.last : null;
  return base;
}
