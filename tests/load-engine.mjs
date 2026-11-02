// Starts the real engine modules (scripts/pixel-mine) against a mock runtime.
//
// The engine takes its storage and media query from the page when it starts,
// so they are put on globalThis for that one call and taken away again. Every
// game therefore keeps its own storage, however many are booted in a process.
import { start } from '../scripts/pixel-mine/index.js';

export function startEngine(runtime, { storage, reducedMotion = false } = {}) {
  const host = { localStorage: storage, matchMedia: () => ({ matches: reducedMotion }) };
  const saved = {};
  for (const [name, value] of Object.entries(host)) {
    saved[name] = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  try { start(runtime); } finally {
    for (const name of Object.keys(host)) {
      if (saved[name]) Object.defineProperty(globalThis, name, saved[name]); else delete globalThis[name];
    }
  }
}
