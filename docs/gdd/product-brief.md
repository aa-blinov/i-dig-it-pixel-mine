# I Dig It: Pixel Mine

<!-- impeccable:product-schema 1 -->

## Platform

web — Construct 3, portrait canvas, 720 × 1280, letterbox scaling.

## Purpose and confirmed scope

A playable match-3 mining game. The user requested a visual connection to I Dig It,
selected a pixel adaptation using ready-made CC0 assets, and requested sounds,
buried valuables and random boosts. Matching three adjacent mineral veins remains
the central mechanic. This is an adaptation of the mining setting.

## Capabilities and constraints

- 8 × 8 ore field; 20 initial moves. Unproductive swaps cost no move.
- Cascades multiply mining points. Ten randomly placed finds per shift.
- Coal, copper, iron, gold and uranium have different values and silhouettes.
- Relics award points; energy adds moves; dynamite mines a 3 × 3 area;
  a drill mines a column. Finds remain in spatial mine cells when ore swaps.
- Current inventory is per shift, with the last three items visible in cargo.
- Pointer, keyboard, restart, mute and reduced-motion support.
- One layout, two layers, one event sheet; local .c3p deliverable.
- Art and sound sources are recorded in art/assets.md.
- Six score contracts with a 20-move budget, success/failure settlement and a
  separate persistent credit wallet. Failure retries the same goal.
- Between rounds: three capped modules, two equipment slots and local saving.
- Daily seeded challenges disable upgrades; result copying and code entry let
  another player reproduce the same field and buried finds.
- Economy, reference research and simulation results: archive/game-loop-v1.md.

## Open decisions

Server-verified rankings, cloud saves, analytics and a full free-roaming drilling
game are not implemented. A synchronized semantic 8×8 field and native workshop
controls now provide an alternative to the canvas; actual screen-reader/device
testing and Construct runtime verification remain required. Human playtesting
is still required to validate pacing.
