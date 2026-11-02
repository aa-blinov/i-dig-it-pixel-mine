// What a round is played on: the field, the ores and the target.
import { CONTRACTS, DAILY, DRILL_VALUE, LAYERS, ORES } from "../config.js";

// The setup of contract `number` (1-based), or of the daily challenge.
export function contractSetup(mode, number) {
  var source = mode === 'daily' ? DAILY : CONTRACTS[Math.max(0, Math.min(CONTRACTS.length, number) - 1)];
  var layer = LAYERS[source.layer];
  return {
    quota: mode === 'daily' ? Infinity : source.quota,
    moves: source.moves,
    dims: { cols: source.cols, rows: source.rows },
    layer: source.layer,
    layerName: layer.name,
    palette: layer.ores.slice()
  };
}

// The points one piece of colour `colour` is worth in a palette; the drill
// has no colour and a fixed value.
export function oreValue(palette, colour) {
  return colour < 0 ? DRILL_VALUE : ORES[palette[colour]].value;
}
