// What the engine takes from the page it runs in. It is read once when the
// engine starts, so a test can hand every game its own storage and media query.

export function createHost() {
  var storage = null;
  try { storage = globalThis.localStorage || null; } catch (_) { /* storage can be blocked */ }
  var media = globalThis.matchMedia;
  return {
    storage: storage,
    now: function () { return Date.now(); },
    prefersReducedMotion: function () {
      return typeof media === 'function' && media.call(globalThis, '(prefers-reduced-motion: reduce)').matches;
    }
  };
}
