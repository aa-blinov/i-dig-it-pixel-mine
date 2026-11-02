# Asset sources and licenses

Only the following selected sources are imported into the game. Candidate packs
and original-game screenshots in tools/ are research material, not shipped art.

| Source | Use | License |
| --- | --- | --- |
| [Mining Pixel Game Asset — acdrnx](https://opengameart.org/content/mining-pixel-game-asset) | Ground blocks, mountain/forest scene, base building, ore, relics, energy, dynamite, drill equipment and earth fragments | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| [Drill Game UI Concept — gearshocky](https://opengameart.org/content/drill-game-ui-concept) | Extracted vehicle sprite, rotated for side view; background color removed | CC0 |
| [Impact Sounds — Kenney](https://kenney.nl/assets/impact-sounds) | Selection, swap, mining, discovery and boost samples | CC0 |
| [CC0 Mineral Icons](https://opengameart.org/content/cc0-mineral-icons) and [CC0 Gem Icons](https://opengameart.org/content/cc0-gem-icons) — 7Soul1 (packaged by AntumDeluge) | All 16 ore frames, drawn at exactly 2× from 32 px | CC0 (license line on both pages) |
| [496 pixel art icons](https://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg) — 7Soul1 | Gold, silver and bronze bars (gold, silver, copper ore) | CC0 |
| [Tiny5](https://github.com/google/fonts/tree/main/ofl/tiny5) | Pixel font for titles, numbers and buttons, canvas and page | SIL Open Font License; font and license in files/ |
| [Ark Pixel](https://github.com/TakWolf/ark-pixel-font) (12 px proportional) | Pixel font for running text, canvas and page | SIL Open Font License; font and license in files/ |
| [Golos Text — Google Fonts](https://fonts.google.com/specimen/Golos+Text) | Earlier UI font, kept in files/ as a fallback for the canvas renderer | SIL Open Font License; font and license are included in files/ |

The selection brackets, gauge pointer, scanner marker, speaker control, special
badges and panel composition are project artwork.

Ore frames (tools/build-stage1-art.ps1): coal, iron (rock_mineral_red_02), gold
bar, silver bar, lazurite (rock_mineral_blue_02), cinnabar (crystal_02),
platinum (crystal_03), sapphire (crystal_01), garnet (ruby), diamond, amethyst
(amethist) are used as drawn. Five are hue-shifted CC0 derivatives: copper
(bronze bar), uranium (jade), malachite (agate), topaz (ruby) and emerald
(sapphire). Relic and tool sprites are fitted to a consistent 64 px cell. The
explosion frames, pulse ring, field tiles, ladder, lift cage and tunnel lamps
come from the acdrnx set.

## Sound mapping

| Game file in files/ | Kenney original |
| --- | --- |
| mine-select.ogg | impactGeneric_light_000.ogg |
| mine-swap.ogg | impactMetal_light_000.ogg |
| mine-dig.ogg | impactMining_000.ogg |
| mine-find.ogg | impactGlass_light_001.ogg |
| mine-boost.ogg | impactBell_heavy_001.ogg |

Audio is registered as general project files, resolved through Construct's asset
manager and played with Web Audio. It does not fetch a third-party audio URL.

## I Dig It reference collection

- Surface and underground comparison:
  [source image](https://iphoneac.com/images/idigit1.jpg).
- Surface, earth and cockpit:
  [source image](https://images.cgames.de/images/gsgp/287/i-dig-it_1254606.jpg).

Reference traits carried into the adaptation: a base on the surface, stratified
earth, vertical shafts, exposed deposits, a drill, valuable buried objects and
a lower cockpit with actual game state. The original game's images are not
included in the .c3p.

- Иконки кабины смены (динамит, сабля, бур, кирка, высотомер, блоки, энергетик, джетпак, замок, звук): набор Mining Gfx из `assets/source/mining-gfx`, CC0. Копируются в `files/i-*.png` скриптом `tools/ship-icons.mjs`.
- Шрифты: Press Start 2P (CodeMan38) и Handjet (Rosetta), SIL OFL, из Google Fonts. Урезаны до латиницы и кириллицы, лицензии лежат рядом в `files/`.
- Руды в высоком разрешении: наборы Openclipart (OCAL) «CC0 Mineral Icons» и «CC0 Gem Icons» с opengameart.org, CC0, векторные. Отрисованы в 256 px и перекрашены, чтобы руды одного слоя различались цветом; в углу у каждой значок (круг, треугольник, квадрат, звезда, ромб, крест), неповторяющийся в слое, для игроков с нарушением цветового зрения (`tools/build-hd-ores.mjs`). Бур остался пиксельным.
