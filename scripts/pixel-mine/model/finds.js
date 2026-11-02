// Pure rules for the finds buried under the ore.
import { FIND_DEFS } from "../config.js";
import { cellCount } from "./grid.js";

// About one find per six cells: the bigger the field, the more is buried.
export function findCount(dims) {
  return Math.max(6, Math.round(cellCount(dims) / 6.4));
}

export function dealFinds(rand, dims) {
  var total = cellCount(dims), positions = [], hidden = new Array(total).fill(null);
  for (var i = 0; i < total; i++) positions.push(i);
  var choices = [];
  Object.keys(FIND_DEFS).forEach(function (id) {
    for (var w = 0; w < FIND_DEFS[id].weight; w++) choices.push(id);
  });
  for (var n = 0; n < findCount(dims); n++) {
    var at = Math.floor(rand() * positions.length);
    var position = positions.splice(at, 1)[0];
    hidden[position] = n === 0 ? 'ring' : n === 1 ? 'fuel' : choices[Math.floor(rand() * choices.length)];
  }
  return hidden;
}
