// The pure model, bundled as one object. It reaches the runtime through
// engine.model, which the tests use to check the rules without a game.

import { CONTRACTS, DAILY, FIND_DEFS, LAYERS, MODULES, ORES } from "../config.js";
import { seededRandom, validChallengeCode } from "./challenge.js";
import { comboCells, effectCells, expandEffects, mostCommonColour, resolveMatches, ROW, COLUMN, CHARGE, DRILL } from "./effects.js";
import { dealFinds, findCount } from "./finds.js";
import {
  EMPTY, DRILL as DRILL_COLOUR, areAdjacent, cellCount, cellIndex, colOf, rowOf, makeBoard, findRuns, findGroups,
  clearedCells, hasGroupAt, wouldSwap, isMove, hasAnyMove, collapse
} from "./grid.js";
import { freshProfile, sanitizeProfile, buyModule, equipModule } from "./profile.js";
import { contractSetup, oreValue } from "./contracts.js";

export var MODEL = {
  EMPTY: EMPTY, DRILL_COLOUR: DRILL_COLOUR,
  specials: { ROW: ROW, COLUMN: COLUMN, CHARGE: CHARGE, DRILL: DRILL },
  cellIndex: cellIndex, colOf: colOf, rowOf: rowOf, cellCount: cellCount, areAdjacent: areAdjacent,
  makeBoard: makeBoard, findRuns: findRuns, findGroups: findGroups, clearedCells: clearedCells,
  hasGroupAt: hasGroupAt, wouldSwap: wouldSwap, isMove: isMove, hasAnyMove: hasAnyMove, collapse: collapse,
  resolveMatches: resolveMatches, expandEffects: expandEffects, effectCells: effectCells, comboCells: comboCells, mostCommonColour: mostCommonColour,
  dealFinds: dealFinds, findCount: findCount, findDefinitions: FIND_DEFS,
  freshProfile: freshProfile, sanitizeProfile: sanitizeProfile, buyModule: buyModule, equipModule: equipModule,
  seededRandom: seededRandom, validChallengeCode: validChallengeCode,
  contracts: CONTRACTS, daily: DAILY, layers: LAYERS, ores: ORES, modules: MODULES,
  contractSetup: contractSetup, oreValue: oreValue
};
