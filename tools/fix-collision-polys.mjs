// Gives every sprite frame that uses a collision polygon a valid one.
//
// The editor refuses a polygon with fewer than three points ("must have at
// least three points in a collision poly") and fails when it loads the
// project resources, for instance on Preview. The points are normalised to the
// frame: a unit square, the editor's default.
//
// Usage: node tools/fix-collision-polys.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROJECT } from './lib/scripts.mjs';

export const UNIT_SQUARE = [0, 0, 1, 0, 1, 1, 0, 1];

// Frames whose collision polygon the editor would reject.
export function badFrames(project = PROJECT) {
  const found = [];
  for (const file of readdirSync(join(project, 'objectTypes')).filter(name => name.endsWith('.json'))) {
    const object = JSON.parse(readFileSync(join(project, 'objectTypes', file), 'utf8'));
    for (const animation of object.animations?.items ?? []) {
      animation.frames.forEach((frame, index) => {
        if (frame.useCollisionPoly && (frame.collisionPoly?.points?.length ?? 0) < 6) found.push(`${file} ${animation.name ?? ''}#${index}`);
      });
    }
  }
  return found;
}

if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1]?.endsWith('fix-collision-polys.mjs')) {
  let fixed = 0;
  for (const file of readdirSync(join(PROJECT, 'objectTypes')).filter(name => name.endsWith('.json'))) {
    const path = join(PROJECT, 'objectTypes', file);
    const raw = readFileSync(path, 'utf8');
    const object = JSON.parse(raw);
    let changed = false;
    for (const animation of object.animations?.items ?? []) {
      for (const frame of animation.frames) {
        if (frame.useCollisionPoly && (frame.collisionPoly?.points?.length ?? 0) < 6) {
          frame.collisionPoly = { points: UNIT_SQUARE.slice() };
          changed = true; fixed++;
        }
      }
    }
    if (changed) {
      const eol = raw.includes('\r\n') ? '\r\n' : '\n';
      writeFileSync(path, JSON.stringify(object, null, '\t').replace(/\n/g, eol) + (/\n$/.test(raw) ? eol : ''));
    }
  }
  console.log(`fixed ${fixed} frames; frames still invalid: ${badFrames().length}`);
}
