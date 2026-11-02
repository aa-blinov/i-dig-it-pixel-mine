# Impeccable audit and cleanup — 2026-11-01

Method: Impeccable 4.8.0 context + audit/distill playbooks; deterministic HTML
scan and manual game/source review. This is not the dual-agent critique command.

## Scope and detector limits

The Impeccable CLI was actually run. `context --target project.c3proj` loaded the
project context. `detect --json tools/review/index.html` returned `[]`; raw output
is in impeccable-detector.json. The detector sees the review HTML, not the
Construct sprite/canvas contents. Its empty result is not a WCAG or visual
quality certificate for the game. Pixel composition and interaction were
reviewed separately. The original game's screenshots are collected in ../../docs/art-bible/assets.md.

## Implementation integrity verdict

The previous world failed the requested setting: generic gem-board UI, fake
depth/shift data and a static progress bar. The replacement uses an actual
surface/shaft/cockpit composition, ready CC0 mining art, meaningful counters,
discovered-item cargo and a gauge driven by remaining moves.

## Health scores (manual, using Impeccable's 0–4 dimensions)

| Dimension | Before | After | Evidence / remaining limit |
| --- | --- | --- | --- |
| Accessibility | 1 | 2 | Keyboard, selection brackets, reduced motion and mute added. Full screen-reader access to the Construct board remains open. |
| Performance | 3 | 3 | 64 ore cells; finite finds; particles expire; at most five sound voices. No measured Construct-device FPS claim. |
| Theming | 1 | 3 | A coherent selected pixel world; local source art and a documented palette. Generator still uses literal colors. |
| Responsive | 2 | 3 | Portrait letterboxing; 390 × 844 browser review fits without horizontal overflow. Cells are about 34.7 CSS px, below the preferred 44px target but above the 24px minimum. |
| Implementation integrity | 1 | 3 | Fake metrics removed; actual cargo/moves/score; restart releases old sprites; project validated. Construct-editor preview remains a separate release check. |
| Total | 8/20 | 14/20 | Good; accessibility remains the weakest dimension. |

## Findings and disposition

| Severity | Finding | Change |
| --- | --- | --- |
| P1 | Visual world did not express I Dig It | Replaced the abstract backdrop with a pixel surface, earth blocks, mine shafts, machine and steel cockpit. |
| P1 | Static depth, shift and progress implied nonexistent state | Removed all three; the gauge reads actual moves and cargo reads actual finds. |
| P1 | No restart affordance; reset could leave old instances | Working New Shift button and R shortcut; old ore, particle, discovery and cargo instances are destroyed. |
| P1 | Pointer-only operation | Arrow/Enter selection and exchange, Escape cancel and R restart added. |
| P2 | New ore could appear across the sky/HUD for a frame | Ore is hidden at creation until it reaches the mine face. |
| P2 | Weak selection and color-only feedback | Visible corner brackets plus selected-ore scaling; resource shapes and deposit patterns differ. |
| P2 | Motion had no reduced-motion alternative | Reduced-motion mode preserves rewards/state transitions with no decorative bursts. |
| P2 | Empty lower panel and mixed decorative English labels | Functional cockpit/cargo replaces the empty card; game controls/status use Russian. |
| P2 | Discovery overlap and stale rewards on restart | Explicit reveal phase, one-time grants, bounded cargo and cleanup tests. |
| P2 | Sound could be intrusive or overlap without bounds | Gesture-unlocked local samples, low gains, mute and five-voice cap. |
| P2 open | Canvas board is not fully exposed to screen readers in Construct | A dedicated accessible interaction layer is still needed. Review HTML semantics do not resolve the exported game's canvas semantics. |
| P2 open | Touch cells below the preferred 44px at narrow widths | Current 8-column board is retained; 390px viewport measured. Physical touch testing remains open. |

## Verification

- Final engine suite: **77 checks passed**. Construct MCP: **29 checks**, all
  complete, **0 errors / 0 warnings / 0 info**, **0 orphaned objects**. The
  packed .c3p was opened as a ZIP and verified to include all five audio files
  and the exact current engine (package-check.json).
- Rules, scoring, swaps, cascades, no-move reshuffle, keyboard, restart,
  particles, reduced motion and buried-find/boost behavior have automated tests.
- Finds: ten per shift; guaranteed relic and energy category; bounded corner
  blasts; column drill; chained boost; delayed grant; exact-once inventory;
  cargo limit; restart during reveal.
- Browser review exercised a successful match (30 points, one move spent),
  keyboard mute/unmute, new shift and the 390 × 844 portrait layout.
- The development renderer uses the exact shipped engine and real project
  images. It is not the Construct runtime. Final editor export, physical touch
  and device audio verification are not represented as completed here.
- Construct MCP integrity and runtime-trap reports: project-audit.json.

The cleanup is applied, not merely recommended. Backups and obsolete theme
scripts are kept in tools/ archives and excluded from the deliverable.

## Subsequent campaign/material pass

- Removed all crystal resources. The active field now uses copper, uranium,
  iron, gold and coal with values 12/14/10/20/8. Compared asset packs and licenses
  are recorded in tools/references/ASSET-SELECTION.md.
- Replaced rasterized functional labels with runtime Text and a bundled Golos
  Text font. Browser `document.fonts.check` confirmed it loaded. The review
  renderer now draws at actual device resolution, rather than scaling a single
  low-resolution text bitmap with nearest-neighbour sampling.
- Added six contracts, a persistent credit wallet/collection, shop transactions,
  two equipment slots, two levels per module and bounded energy reserves.
- Added equal-condition daily seeds, local best results, manual result copying
  and code replay. An unsupported native prompt was found in browser testing
  and replaced with an accessible in-page form with validation and cancellation.
- Fixed returning to base while ore is selected, guarded input while the code
  dialog is open, and added exact-once settlement/persistence tests.
- Current automated checks: **77 engine + 37 campaign = 114**. Balance research:
  **440 full simulated runs**, with explicit policy/limitations in ../../docs/archive/game-loop-v1.md.
- This is still a manual/source audit plus an HTML detector pass. Construct
  editor execution, physical mobile touch and human retention are not claimed
  as tested. Sharing codes is implemented; actual viral growth is not measured.
- Final package rebuilt: 914477 bytes; bundled font/license and five OGG files verified. Project audit: 29 checks, zero validation errors/warnings, no orphan objects.
- Additional isolated browser replay verified the first swap and a buried find, but did not complete: the second keyboard-driven move produced 360 instead of the harness plan's 494. Keyboard targeting versus direct test taps has not been reconciled. This is not recorded as a successful full browser replay; daily cross-runtime replay remains a follow-up QA item.
