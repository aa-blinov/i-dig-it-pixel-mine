// The saved profile: wallet, modules and equipment. Storage is passed in by the host.
import { CONTRACTS, MODULES, PROFILE_KEY } from "../config.js";
import { freshBase, sanitizeBase } from "./base.js";
import { DEFAULT_LOADOUT, loadout } from "./abilities.js";
import { sanitizeCollection } from "./collections.js";
import { freshFleet, sanitizeFleet } from "./fleet.js";

export function freshProfile() {
  return { version: 2, credits: 0, completed: 0, upgrades: { battery: 0, blast: 0, scanner: 0 }, equipped: [], collection: {}, dailyBest: {}, attempts: 0, replays: {}, base: freshBase(), fleet: freshFleet(), redeemed: [], introSeen: false, holdSeen: false, seenTabs: ['shift'], abilities: DEFAULT_LOADOUT.slice() };
}

export function sanitizeProfile(raw) {
  var p = freshProfile();
  if (!raw || raw.version !== 2) return p;
  function integer(value, max) { return typeof value === 'number' && isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0; }
  p.credits = integer(raw.credits, 999999); p.completed = integer(raw.completed, CONTRACTS.length); p.attempts = integer(raw.attempts, 999999);
  Object.keys(MODULES).forEach(function (id) { p.upgrades[id] = integer(raw.upgrades && raw.upgrades[id], 2); });
  (Array.isArray(raw.equipped) ? raw.equipped : []).forEach(function (id) { if (MODULES[id] && p.upgrades[id] && p.equipped.indexOf(id) < 0 && p.equipped.length < 2) p.equipped.push(id); });
  p.collection = sanitizeCollection(raw.collection);
  p.fleet = sanitizeFleet(raw.fleet);
  p.introSeen = raw.introSeen === true || p.completed > 0;
  p.holdSeen = raw.holdSeen === true || p.completed > 0;
  p.seenTabs = Array.isArray(raw.seenTabs) ? raw.seenTabs.filter(function (t) { return ['shift', 'base', 'lab', 'collection', 'fleet'].indexOf(t) >= 0; }) : ['shift'];
  p.redeemed = Array.isArray(raw.redeemed) ? raw.redeemed.filter(function (c) { return typeof c === 'string'; }).slice(0, 500) : [];
  if (raw.replays && typeof raw.replays === 'object') Object.keys(raw.replays).forEach(function (n) { if (/^\d{1,2}$/.test(n) && Number(n) >= 1 && Number(n) <= CONTRACTS.length) p.replays[n] = integer(raw.replays[n], 9999); });
  p.base = sanitizeBase(raw.base);
  p.abilities = loadout(raw.abilities, 3);
  if (raw.dailyBest && typeof raw.dailyBest === 'object') Object.keys(raw.dailyBest).slice(-30).forEach(function (id) { if (/^\d{4}-\d{2}-\d{2}$/.test(id)) p.dailyBest[id] = integer(raw.dailyBest[id], 9999999); });
  return p;
}

export function loadProfile(storage) { try { return sanitizeProfile(JSON.parse(storage.getItem(PROFILE_KEY))); } catch (_) { return freshProfile(); } }

export function saveProfile(engine) { try { engine.host.storage.setItem(PROFILE_KEY, JSON.stringify(engine.profile)); } catch (_) {} }

export function buyModule(profile, id) {
  if (!MODULES[id]) return { ok: false, message: 'Неизвестный модуль' };
  var level = profile.upgrades[id], cost = MODULES[id].costs[level];
  if (level >= 2) return { ok: false, message: 'Модуль уже на максимальном уровне' };
  if (profile.credits < cost) return { ok: false, message: 'Нужно ещё ' + (cost - profile.credits) + ' кредитов' };
  profile.credits -= cost; profile.upgrades[id]++;
  var placed = profile.equipped.indexOf(id) >= 0;
  if (!placed && profile.equipped.length < 2) { profile.equipped.push(id); placed = true; }
  return { ok: true, message: MODULES[id].name + ': уровень ' + profile.upgrades[id] + (placed ? ', установлен, занято слотов ' + profile.equipped.length + ' из 2' : ', оба слота заняты: сними другой модуль, чтобы установить этот') };
}

export function equipModule(profile, id) {
  if (!MODULES[id] || !profile.upgrades[id]) return { ok: false, message: 'Сначала купи этот модуль' };
  var at = profile.equipped.indexOf(id);
  if (at >= 0) { profile.equipped.splice(at, 1); return { ok: true, message: 'Модуль снят, слот свободен' }; }
  if (profile.equipped.length >= 2) return { ok: false, message: 'Заняты оба слота, сними один модуль' };
  profile.equipped.push(id); return { ok: true, message: 'Модуль установлен' };
}

export function moduleLevel(engine, id) { if (engine.mode === 'daily') return 0; if (engine.roundModules) return engine.roundModules[id] || 0; return !engine.profile || engine.profile.equipped.indexOf(id) < 0 ? 0 : engine.profile.upgrades[id]; }

export function energyBudget(engine) { var level = moduleLevel(engine, 'battery'); return level ? 4 + level : 3; }
