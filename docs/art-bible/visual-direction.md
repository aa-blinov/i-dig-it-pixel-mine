# Pixel Mine visual direction

The user chose a pixel adaptation with ready CC0 assets on 2026-11-01.

The defining reference is I Dig It's world composition: surface/base above,
earth in cross-section, visible shafts, a drilling machine, and an industrial
cockpit below. The playfield belongs to the mine face. It is not a floating
dashboard card.

- Ready mining artwork by acdrnx supplies ground, surface, scenery, mineral
  deposits, relics and equipment. gearshocky's CC0 drill supplies the machine.
- Nearest-neighbour sampling and pixel rounding preserve source edges.
- Earth/wood: warm browns. Tunnels and steel: charcoal. Controls and selection:
  warm brass and cream. Mineral colors remain distinct from the background.
- UI lettering: self-hosted Golos Text, loaded locally via FontFace. Functional
  text is rendered independently of pixel-art textures. The review renderer
  draws type at the actual screen/device resolution, avoiding nearest-neighbour
  resampling of an entire low-resolution text bitmap.
- Main hierarchy: ore face → moves/score → discovered items/cargo → restart.
- No invented depth, fixed decorative progress bars or expedition statistics.
- The goal bar represents actual contract progress. The base workshop exposes
  next-level effects, exact prices, current levels and the two-slot limit.
- All crystals are replaced by material deposits; copper is a recolored CC0
  metal sprite, and coal/iron/gold/uranium retain their source forms.
- Discovery owns the animation beat: ore clears, the hidden object appears,
  the reward is collected, then ore falls. Reduced motion retains the reveal
  state without particles or expanded dissolves.
- Sound starts after user input; five bounded sample cues and a visible mute
  control. No unrequested background music.

The browser review adapter reads the actual project layout/assets and runs the
shipped engine. It is a development renderer, not a Construct HTML5 export.

## Responsive and accessible controls

The engine ships a semantic DOM workshop using the same charcoal, cream and
brass palette as the cockpit. Its typography stays at 16 CSS px, buttons at
least 48 CSS px, and narrow screens scroll instead of shrinking the workshop.
The next contract is above upgrades. Shared CSS tokens and normal document
flow replace separate drawing and hitbox coordinates for these controls.
The canvas workshop remains a fallback when DOM access is unavailable.

During play, a native score/move toolbar stays readable. «Управление» opens
the synchronized 8×8 material grid, material values and discovery rules.
Cells expose coordinates, material, value and selection; arrows move focus,
Enter selects, and a live region announces settled turns. Hidden canvas
controls are inert while the workshop or alternative field is open.
