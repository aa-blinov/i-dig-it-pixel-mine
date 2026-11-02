// Match-3 engine for Construct 3: the entry point.
//
// The event sheet calls start(runtime) when a layout starts (see
// scripts/importsForEvents.js). The engine keeps its state on the runtime
// object (runtime.__m3), so the state survives the ticks of the event sheet
// and is rebuilt per layout.
//
// Three layers:
//   model/ - pure board, economy and challenge rules; no runtime calls
//   game/  - instances, input and animation, through documented runtime interfaces
//   ui/    - the semantic DOM interface and the canvas labels
//
// A gem keeps its colour for its whole life: the colour is the type of the
// sprite instance, so a falling gem carries its colour with it.

import { START_MOVES } from "./config.js";
import { createHost } from "./host.js";
import { MODEL } from "./model/index.js";
import { loadProfile, buyModule, equipModule, saveProfile } from "./model/profile.js";
import { resolveTypes } from "./game/types.js";
import { updateTexts } from "./game/hud.js";
import { startGame } from "./game/board.js";
import { tap, step, useAbility } from "./game/turn.js";
import { pointer, pointerUp, key } from "./game/input.js";
import { openCamp, beginRound, finishRound, chooseContract } from "./game/round.js";
import { loadInterfaceFont, updateInterface } from "./ui/canvas-ui.js";

export function start(runtime) {
  var engine = runtime.__m3;
  if (!engine) {
    engine = runtime.__m3 = {
      model: MODEL,
      cells: [],
      score: 0,
      moves: START_MOVES,
      chain: 0,
      findCount: 0,
      phase: 'idle',
      selected: -1,
      swap: null,
      shown: {},
      clearFx: [],
      particles: [],
      toast: '',
      toastTimer: 0,
      rand: Math.random,
      tap: function (index) { tap(engine, index); },
      step: function (dt) { step(engine, dt); },
      pointer: function (event) { pointer(engine, event); },
      reset: function () { if (engine.campaignEnabled) beginRound(engine, engine.mode); else startGame(engine); }
    };
    engine.onTick = function () {
      step(engine, engine.runtime.dt);
      // The texts are written again every tick, so a write that had no
      // instance to write to lands as soon as the layout has one.
      updateTexts(engine);
    };
    engine.onPointer = function (event) {
      pointer(engine, event);
    };
    engine.onKey = function (event) { key(engine, event); };
    // The runtime outlives the layout, so the listeners are registered once
    // and the board is rebuilt whenever a layout starts.
    runtime.addEventListener('tick', engine.onTick);
    runtime.addEventListener('pointerdown', engine.onPointer);
    runtime.addEventListener('pointerup', function (event) { pointerUp(engine, event); });
    runtime.addEventListener('keydown', engine.onKey);
    runtime.addEventListener('afteranylayoutend', function () {
      engine.cells = [];
      engine.phase = 'idle';
      engine.selected = -1;
    });
  }
  engine.runtime = runtime;
  engine.host = createHost();
  engine.types = resolveTypes(runtime);
  engine.ship = { inst: null, x: 360, target: 360, thrust: 0, clock: 0, puff: 0, facing: 1 };
  engine.profile = engine.profile || loadProfile(engine.host.storage);
  // A new bourmaster hears the first radio call before the first contract.
  if (engine.storyBeat === undefined) engine.storyBeat = engine.profile.completed === 0 ? 0 : null;
  engine.campaignEnabled = !!runtime.objects.CampBackdrop;
  engine.beginRound = function (mode, challenge) { beginRound(engine, mode, challenge); };
  engine.openCamp = function () { openCamp(engine); };
  engine.buy = function (id) { if (engine.phase !== 'base') return { ok: false, message: 'Магазин доступен на базе.' }; var result = buyModule(engine.profile, id); saveProfile(engine); updateInterface(engine); return result; };
  engine.equip = function (id) { if (engine.phase !== 'base') return { ok: false, message: 'Сборка меняется на базе.' }; var result = equipModule(engine.profile, id); saveProfile(engine); updateInterface(engine); return result; };
  engine.finishRound = function () { finishRound(engine); };
  engine.chooseContract = function (number) { chooseContract(engine, number); };
  engine.useAbility = function (id) { return useAbility(engine, id); };
  loadInterfaceFont(engine);
  if (engine.campaignEnabled) openCamp(engine); else startGame(engine);
}
