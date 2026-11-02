// Pure rules for the fleet: the dock gives ships, a ship takes one miner on
// an expedition to a layer and brings back credits and maybe an artifact.
// The haul is decided when the ship leaves, so reloading changes nothing.
import { ECONOMY } from "../config.js";
import { seededRandom } from "./challenge.js";
import { pickArtifact } from "./collections.js";

export var SHIPS = [
  { id: 'mole', name: 'Крот', about: 'Маленький и надёжный', pay: 1, luck: 0 },
  { id: 'probe', name: 'Зонд', about: 'Чаще приносит находки', pay: 0.8, luck: 0.15 },
  { id: 'tug', name: 'Тягач', about: 'Везёт больше руды', pay: 1.4, luck: -0.05 }
];
export var TRIP_HOURS = [0.25, 1, 4, 8];
var HOUR = 3600000;

export function freshFleet() {
  return { seq: 0, trips: [] };
}

export function ship(id) {
  return SHIPS.filter(function (s) { return s.id === id; })[0] || null;
}

// Credits and the find for a trip, from its seed alone.
export function haul(shipId, layer, hours, seed) {
  var s = ship(shipId), rand = seededRandom(seed);
  var credits = Math.round((400 + layer * 200) * hours * s.pay * (0.85 + rand() * 0.3));
  var roll = rand(), chance = Math.min(0.9, 0.1 + 0.08 * hours + s.luck);
  var kind = roll < chance * 0.1 ? 'idol' : roll < chance * 0.35 ? 'ring' : roll < chance ? 'fossil' : null;
  return { credits: credits, artifact: kind ? pickArtifact(layer, kind, rand) : null };
}

export function busyShips(fleet) {
  return fleet.trips.map(function (t) { return t.ship; });
}

export function launch(profile, shipCount, shipId, layer, hours, now) {
  var fleet = profile.fleet, unlocked = SHIPS.slice(0, shipCount);
  if (!unlocked.some(function (s) { return s.id === shipId; })) return { ok: false, message: 'Этого корабля в доке нет' };
  if (busyShips(fleet).indexOf(shipId) >= 0) return { ok: false, message: 'Корабль уже в пути' };
  if (TRIP_HOURS.indexOf(hours) < 0 || layer < 0 || layer > Math.min(3, Math.floor(profile.completed / 3))) return { ok: false, message: 'Сюда пока не добраться' };
  fleet.seq += 1;
  var trip = { id: fleet.seq, ship: shipId, layer: layer, hours: hours, start: now };
  var h = haul(shipId, layer, hours, 'trip-' + fleet.seq + '-' + now);
  trip.credits = h.credits; trip.artifact = h.artifact;
  fleet.trips.push(trip);
  return { ok: true, message: ship(shipId).name + ' ушёл в экспедицию' };
}

export function timeLeft(trip, now) {
  return Math.max(0, trip.start + trip.hours * HOUR - now);
}

export function claim(profile, id, now) {
  var trip = profile.fleet.trips.filter(function (t) { return t.id === id; })[0];
  if (!trip) return { ok: false, message: 'Экспедиция не найдена' };
  if (timeLeft(trip, now) > 0) return { ok: false, message: 'Корабль ещё в пути' };
  profile.fleet.trips = profile.fleet.trips.filter(function (t) { return t !== trip; });
  profile.credits = Math.min(ECONOMY.wallet, profile.credits + trip.credits);
  if (trip.artifact) profile.collection[trip.artifact] = (profile.collection[trip.artifact] || 0) + 1;
  return { ok: true, message: ship(trip.ship).name + ' вернулся: +' + trip.credits + ' руды', artifact: trip.artifact };
}

export function sanitizeFleet(raw) {
  var fleet = freshFleet();
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.trips)) return fleet;
  fleet.seq = Math.max(0, Math.floor(Number(raw.seq)) || 0);
  raw.trips.forEach(function (t) {
    if (!t || !ship(t.ship) || TRIP_HOURS.indexOf(t.hours) < 0 || !isFinite(t.start)) return;
    if (fleet.trips.some(function (o) { return o.ship === t.ship; })) return;
    fleet.trips.push({ id: Math.floor(Number(t.id)) || 0, ship: t.ship, layer: Math.max(0, Math.min(3, Math.floor(Number(t.layer)) || 0)), hours: t.hours, start: Number(t.start), credits: Math.max(0, Math.min(999999, Math.floor(Number(t.credits)) || 0)), artifact: typeof t.artifact === 'string' ? t.artifact : null });
  });
  return fleet;
}
