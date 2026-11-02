// The object types of the project the game draws with. Every type is named
// one by one, so the tooling sees which objects the game needs.

export function resolveTypes(runtime) {
  return {
    // One sprite for every ore: the frame is the ore (config ORES), and the
    // last frame is the diamond drill.
    ore: runtime.objects.Ore,
    // The badge a special carries: frames row, column, charge.
    special: runtime.objects.SpecialMark,
    // The rock behind each cell of the field: two frames, checkered.
    tile: runtime.objects.BoardTile,
    // Ten frames of an explosion, and a pulse ring for new specials.
    blast: runtime.objects.Blast,
    ring: runtime.objects.Ring,
    // Floating "+120" over a cleared line.
    pop: runtime.objects.PopText,
    spark: runtime.objects.Spark,
    finds: {
      ring: runtime.objects.RelicRing, idol: runtime.objects.RelicIdol,
      fossil: runtime.objects.RelicFossil, fuel: runtime.objects.BoostFuel,
      dynamite: runtime.objects.BoostDynamite, drill: runtime.objects.BoostDrill
    },
    ship: runtime.objects.MineDrill,
    marker: runtime.objects.Selection,
    // The lift cage in the shaft and the miners on the ladder.
    cage: runtime.objects.Cage,
    miner: runtime.objects.Miner,
    // The texts of the HUD.
    texts: {
      ScoreText: runtime.objects.ScoreText,
      MovesText: runtime.objects.MovesText,
      StatusText: runtime.objects.StatusText
    }
  };
}
