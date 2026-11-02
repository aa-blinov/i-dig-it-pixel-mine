// The game's script files and how the Construct project refers to them.
//
// The engine is a set of ES modules in scripts/. Construct needs them listed in
// project.c3proj (rootFileFolders.script); the "Imports for events" script
// makes them available to the event sheet, which only has to call START_CALL.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, posix } from 'node:path';

export const PROJECT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '');
export const START_CALL = 'PixelMine.start(runtime);';
export const START_SCRIPT = [START_CALL];
export const IMPORTS_FOR_EVENTS = 'importsForEvents.js';

const newSid = () => Number(BigInt('0x' + randomBytes(6).toString('hex')));

// The script files on disk as project-relative paths such as "pixel-mine/game/turn.js".
export function scriptFiles(project = PROJECT) {
  const root = join(project, 'scripts');
  const found = [];
  const walk = (dir, prefix) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, prefix + name + '/');
      else if (name.endsWith('.js')) found.push(prefix + name);
    }
  };
  walk(root, '');
  return found;
}

// The script paths a project.c3proj lists.
export function registeredScripts(metadata) {
  const found = [];
  const walk = (folder, prefix) => {
    for (const item of folder.items ?? []) found.push(prefix + item.name);
    for (const sub of folder.subfolders ?? []) walk(sub, prefix + sub.name + '/');
  };
  walk(metadata.rootFileFolders.script, '');
  return found.sort();
}

// Makes rootFileFolders.script list exactly the files on disk, keeping the
// SID of every file that was already listed.
export function registerScripts(project = PROJECT) {
  const file = join(project, 'project.c3proj');
  const raw = readFileSync(file, 'utf8');
  const metadata = JSON.parse(raw);
  const known = new Map();
  const collect = (folder, prefix) => {
    for (const item of folder.items ?? []) known.set(prefix + item.name, item.sid);
    for (const sub of folder.subfolders ?? []) collect(sub, prefix + sub.name + '/');
  };
  collect(metadata.rootFileFolders.script, '');

  const tree = { items: [], subfolders: [] };
  for (const path of scriptFiles(project)) {
    const parts = path.split('/');
    let folder = tree;
    for (const name of parts.slice(0, -1)) {
      let sub = folder.subfolders.find(entry => entry.name === name);
      if (!sub) { sub = { name, items: [], subfolders: [] }; folder.subfolders.push(sub); }
      folder = sub;
    }
    const name = parts[parts.length - 1];
    const purpose = path === IMPORTS_FOR_EVENTS ? 'imports-for-events' : 'none';
    folder.items.push({ name, type: 'application/javascript', sid: known.get(path) ?? newSid(), 'script-info': { purpose } });
  }
  metadata.rootFileFolders.script = tree;

  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const text = JSON.stringify(metadata, null, '\t').replace(/\n/g, eol) + (/\n$/.test(raw) ? eol : '');
  const changed = text !== raw;
  if (changed) writeFileSync(file, text);
  return { changed, files: scriptFiles(project).length };
}

export { posix };
