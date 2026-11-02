// Per-tick movement: ore falling and landing, clear effects, sparks, blasts,
// pulse rings, floating points, finds flying to the hold, the shaking board
// and the drilling ship under the field. Only the ore decides whether the
// board has settled; everything else is decoration that runs alongside.
import { BOARD, CLEAR_FX_SECONDS, FALL_SPEED } from "../config.js";
import { cellCenterX, cellCenterY, destroyEntry } from "./board.js";

var BLAST_FRAMES = 10, BLAST_SECONDS = 0.42, RING_SECONDS = 0.36, POP_SECONDS = 0.85, FLIGHT_SECONDS = 0.6, LAND_SECONDS = 0.14;
var SWAP_SECONDS = 0.18, GRAVITY = 5200, FALL_START = 260;   // px/s² and px/s
var SHIP_Y = 940;   // the tunnel under the field, at the same depth for every field size

// Moves every gem towards its target and reports whether all of them arrived.
export function animate(engine, dt) {
  var settled = true, shakeX = 0, shakeY = 0;
  if (engine.shake > 0 && !engine.reducedMotion) {
    engine.shake = Math.max(0, engine.shake - dt);
    var power = 5 * engine.shake / 0.3;
    shakeX = Math.round(Math.sin(engine.shake * 90) * power);
    shakeY = Math.round(Math.cos(engine.shake * 70) * power * 0.6);
  }
  var top = engine.board ? engine.board.y0 + BOARD.cell / 2 : 0;
  engine.clock = (engine.clock || 0) + dt;
  for (var i = 0; i < engine.cells.length; i++) {
    var gem = engine.cells[i];
    if (!gem) continue;
    var dx = gem.targetX - gem.x, dy = gem.targetY - gem.y;
    if (gem.tween) {
      // A swap glides: it eases in and out instead of moving at one speed.
      settled = false;
      gem.tween.age += dt;
      var p = engine.reducedMotion ? 1 : Math.min(1, gem.tween.age / SWAP_SECONDS);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      gem.x = gem.tween.x0 + (gem.targetX - gem.tween.x0) * e;
      gem.y = gem.tween.y0 + (gem.targetY - gem.tween.y0) * e;
      if (p >= 1) { gem.x = gem.targetX; gem.y = gem.targetY; gem.tween = null; }
    } else if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      // Falling ore picks up speed like a weight, then lands with a squash.
      settled = false;
      gem.vy = Math.min(FALL_SPEED, (gem.vy || FALL_START) + GRAVITY * dt);
      var step = engine.reducedMotion ? Infinity : gem.vy * dt;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= step) {
        gem.x = gem.targetX; gem.y = gem.targetY; gem.vy = 0;
        if (dy > 8 && !engine.reducedMotion) gem.land = LAND_SECONDS;
      } else {
        gem.x += (dx / distance) * step; gem.y += (dy / distance) * step;
      }
    }
    // Landing: a short squash, so falling ore reads as weight.
    var height = BOARD.cell, width = BOARD.cell;
    if (gem.land > 0) {
      gem.land = Math.max(0, gem.land - dt);
      var squash = Math.sin((1 - gem.land / LAND_SECONDS) * Math.PI) * 0.12;
      height = BOARD.cell * (1 - squash); width = BOARD.cell * (1 + squash * 0.6);
    }
    // The selected ore breathes, so it is clear which one will move.
    if (engine.selected === gem.cell) {
      var breathe = engine.reducedMotion ? 1.12 : 1.1 + Math.sin(engine.clock * 7) * 0.04;
      width = BOARD.cell * breathe; height = BOARD.cell * breathe;
    }
    gem.inst.setSize(width, height);
    var x = gem.x + shakeX, y = gem.y + shakeY + (BOARD.cell - height) / 2;
    gem.inst.setPosition(x, y);
    // New ore enters from the mine face, never across the surface or HUD.
    gem.inst.isVisible = gem.y >= top;
    // When the shift ends the ore steps back, so the banner over it reads.
    var dim = engine.phase === 'ending' || engine.phase === 'result' ? 0.3 : 1;
    if (gem.inst.opacity !== dim) gem.inst.opacity = dim;
    if (gem.mark) { gem.mark.setPosition(x, y); gem.mark.isVisible = gem.inst.isVisible; gem.mark.opacity = dim; }
  }
  for (var fx = engine.clearFx.length - 1; fx >= 0; fx--) {
    var burst = engine.clearFx[fx];
    burst.clearTime += dt;
    var progress = Math.min(1, burst.clearTime / CLEAR_FX_SECONDS), ease = 1 - progress;
    burst.inst.setSize(BOARD.cell * (1.12 + progress * 0.42), BOARD.cell * (1.12 + progress * 0.42));
    burst.inst.opacity = ease * ease;
    if (burst.mark) burst.mark.opacity = ease * ease;
    if (progress >= 1) { destroyEntry(burst); engine.clearFx.splice(fx, 1); }
  }
  for (var pi = engine.particles.length - 1; pi >= 0; pi--) {
    var particle = engine.particles[pi];
    particle.age += dt;
    var particleProgress = Math.min(1, particle.age / particle.life);
    particle.vy += (particle.gravity === undefined ? 145 : particle.gravity) * dt;
    particle.x += particle.vx * dt; particle.y += particle.vy * dt;
    particle.inst.setPosition(particle.x, particle.y);
    particle.inst.opacity = 1 - particleProgress;
    var particleSize = particle.size * (1 - particleProgress * 0.58);
    particle.inst.setSize(particleSize, particleSize);
    if (particleProgress >= 1) { particle.inst.destroy(); engine.particles.splice(pi, 1); }
  }
  engine.finds.forEach(function (icon) {
    icon.age += dt;
    var rise = engine.reducedMotion ? 0 : Math.min(1, icon.age * 5) * 11;
    icon.inst.setPosition(icon.x, icon.y - rise);
  });
  animateEffects(engine, dt);
  animateFlights(engine, dt);
  animateShip(engine, dt);
  animateShaft(engine, dt);
  return settled;
}

// Blasts play their frames, rings grow and fade, points float up.
function animateEffects(engine, dt) {
  for (var i = engine.effects.length - 1; i >= 0; i--) {
    var effect = engine.effects[i];
    effect.age += dt;
    var t = Math.min(1, effect.age / effect.life);
    if (effect.kind === 'blast') {
      effect.inst.animationFrame = Math.min(BLAST_FRAMES - 1, Math.floor(t * BLAST_FRAMES));
    } else if (effect.kind === 'ring') {
      var size = effect.size * (0.6 + t * 0.9);
      effect.inst.setSize(size, size);
      effect.inst.opacity = 1 - t;
    } else if (effect.kind === 'pop') {
      effect.inst.setPosition(effect.x, effect.y - t * 46);
      effect.inst.opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    }
    if (t >= 1) { effect.inst.destroy(); engine.effects.splice(i, 1); }
  }
}

// A find leaves its cell on an arc and lands where it belongs: the hold, the
// moves gauge, or nowhere (a used-up blast just fades).
function animateFlights(engine, dt) {
  for (var i = engine.flights.length - 1; i >= 0; i--) {
    var flight = engine.flights[i];
    flight.age += dt;
    var t = engine.reducedMotion ? 1 : Math.min(1, flight.age / FLIGHT_SECONDS);
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    var x = flight.fromX + (flight.toX - flight.fromX) * ease;
    var y = flight.fromY + (flight.toY - flight.fromY) * ease - Math.sin(t * Math.PI) * flight.arc;
    flight.inst.setPosition(x, y);
    var size = flight.fromSize + (flight.toSize - flight.fromSize) * ease;
    flight.inst.setSize(size, size);
    if (flight.fade) flight.inst.opacity = 1 - t;
    if (t >= 1) {
      flight.inst.destroy();
      engine.flights.splice(i, 1);
      if (flight.onLand) flight.onLand();
    }
  }
}

export function addEffect(engine, kind, x, y, options) {
  var types = { blast: engine.types.blast, ring: engine.types.ring, pop: engine.types.pop };
  var type = types[kind];
  if (!type) return null;
  var inst = type.createInstance('Game', x, y);
  if (inst.setSize && kind !== 'pop') inst.setSize((options && options.size) || BOARD.cell, (options && options.size) || BOARD.cell);
  var effect = { kind: kind, inst: inst, x: x, y: y, age: 0, size: (options && options.size) || BOARD.cell, life: kind === 'blast' ? BLAST_SECONDS : kind === 'ring' ? RING_SECONDS : POP_SECONDS };
  if (kind === 'pop') {
    inst.text = options.text;
    inst.setSize(200, 40);
    inst.fontFace = engine.fontReady ? 'Pixel Mine Title' : 'Verdana';
    inst.sizePt = 18; inst.isBold = true;
    inst.fontColor = [1, 0.9, 0.55];
    inst.horizontalAlign = 'center'; inst.verticalAlign = 'center';
    if (inst.setAutoResolutionMode) inst.setAutoResolutionMode();
  } else {
    inst.setSize(effect.size, effect.size);
    if (kind === 'blast') inst.animationFrame = 0;
  }
  if (inst.moveToTop) inst.moveToTop();
  engine.effects.push(effect);
  return effect;
}

// Small warm fragments burst from mined ore, then drift and fade.
export function spawnOreSparks(engine, index) {
  if (!engine.types.spark || engine.reducedMotion) return;
  spawnSparks(engine, cellCenterX(engine, index), cellCenterY(engine, index), 2, 70, 105);
}

export function spawnSparks(engine, x, y, count, speedMin, speedRange, gravity) {
  if (!engine.types.spark || engine.reducedMotion) return;
  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2, speed = speedMin + Math.random() * speedRange;
    var inst = engine.types.spark.createInstance('Game', x, y), size = 9 + Math.random() * 7;
    inst.setSize(size, size);
    engine.particles.push({ inst: inst, x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 28, age: 0, life: 0.28 + Math.random() * 0.2, size: size, gravity: gravity });
  }
}

// The drilling ship lives in the tunnel under the field. It rolls to the
// column that was just mined, rocks on its springs while idle, pushes its
// drill up into the rock on every clear and leaves exhaust behind it.
export function animateShip(engine, dt) {
  var ship = engine.ship;
  if (!ship || !engine.board) return;
  // The ship is placed in the layout, so it can appear a tick after the start.
  if (!ship.inst) ship.inst = engine.types.ship && engine.types.ship.getFirstInstance();
  if (!ship.inst) return;
  ship.clock += dt;
  var baseY = SHIP_Y;
  var dx = ship.target - ship.x;
  if (Math.abs(dx) > 0.5) {
    var step = engine.reducedMotion ? Math.abs(dx) : Math.max(60, Math.abs(dx) * 6) * dt;
    ship.x += Math.sign(dx) * Math.min(Math.abs(dx), step);
  }
  if (ship.thrust > 0) ship.thrust = Math.max(0, ship.thrust - dt * 4);
  var bob = engine.reducedMotion ? 0 : Math.round(Math.sin(ship.clock * 3.1) * 2);
  var push = Math.sin(ship.thrust * Math.PI) * 12;
  var rumble = !engine.reducedMotion && Math.abs(dx) > 1 ? Math.round(Math.sin(ship.clock * 60)) : 0;
  ship.inst.setPosition(Math.round(ship.x) + rumble, Math.round(baseY + bob - push));
  ship.puff -= dt;
  if (ship.puff <= 0 && engine.types.spark && !engine.reducedMotion && engine.phase !== 'base') {
    ship.puff = Math.abs(dx) > 1 ? 0.07 : 0.32;
    var back = ship.x + 62 * (ship.facing || 1);
    var inst = engine.types.spark.createInstance('Game', back, baseY + 8), size = 7 + Math.random() * 5;
    inst.setSize(size, size);
    engine.particles.push({ inst: inst, x: back, y: baseY + 8, vx: 22 * (ship.facing || 1) + Math.random() * 10, vy: -18 - Math.random() * 14, age: 0, life: 0.55, size: size, gravity: -10 });
  }
}

// The lift cage runs in the shaft on the right; the miners wait on the ladder
// on the left and climb down to the ship with fuel.
var LADDER_X = 38, SHAFT_X = 682, SHAFT_TOP = 292, SHAFT_BOTTOM = 950;
export function animateShaft(engine, dt) {
  if (!engine.board) return;
  var types = engine.types, bonuses = engine.bonuses || { cargo: 0, miners: 0 };
  if (types.cage) {
    if (!engine.cage) {
      var cageInst = types.cage.createInstance('Game', SHAFT_X, SHAFT_TOP);
      cageInst.setSize(36, 36);
      engine.cage = { inst: cageInst, y: SHAFT_TOP, trip: 0 };
    }
    var cage = engine.cage;
    if (!cage.trip && engine.cageTrips > 0) { engine.cageTrips--; cage.trip = 1; }
    if (cage.trip) {
      var goal = cage.trip === 1 ? SHAFT_BOTTOM : SHAFT_TOP;
      var speed = engine.reducedMotion ? Infinity : (520 + 260 * bonuses.cargo) * dt;
      cage.y += Math.sign(goal - cage.y) * Math.min(Math.abs(goal - cage.y), speed);
      if (cage.y === goal) cage.trip = cage.trip === 1 ? 2 : 0;
    }
    cage.inst.setPosition(SHAFT_X, Math.round(cage.y));
  }
  if (types.miner && engine.minerSprites.length < (engine.minersCrew === undefined ? bonuses.miners : engine.minersCrew)) {
    var home = 300 + engine.minerSprites.length * 46;
    var minerInst = types.miner.createInstance('Game', LADDER_X, home);
    minerInst.setSize(32, 32);
    engine.minerSprites.push({ inst: minerInst, y: home, home: home, state: 'idle', clock: 0 });
  }
  if (engine.minerDelivery > 0) {
    var free = engine.minerSprites.filter(function (m) { return m.state === 'idle'; })[0];
    if (free) { free.state = 'down'; engine.minerDelivery--; }
  }
  engine.minerSprites.forEach(function (miner) {
    var target = miner.state === 'down' ? SHIP_Y - 16 : miner.home;
    if (miner.state !== 'idle') {
      miner.clock += dt;
      var climb = engine.reducedMotion ? Infinity : 300 * dt;
      miner.y += Math.sign(target - miner.y) * Math.min(Math.abs(target - miner.y), climb);
      miner.inst.animationFrame = Math.floor(miner.clock * 8) % 2;
      if (miner.y === target) miner.state = miner.state === 'down' ? 'up' : 'idle';
    }
    miner.inst.setPosition(LADDER_X, Math.round(miner.y));
  });
}

// Sends the ship to the column of a clear and drives the drill up.
export function shipDrill(engine, x) {
  if (!engine.ship) return;
  engine.ship.target = Math.max(engine.board.x0 + 40, Math.min(engine.board.x0 + engine.dims.cols * BOARD.cell - 40, x));
  engine.ship.thrust = 1;
  spawnSparks(engine, engine.ship.target, SHIP_Y - 30, 3, 50, 80);
}
