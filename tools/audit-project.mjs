import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { withConstruct } from './lib/construct-client.mjs';
import { PROJECT, START_SCRIPT, registeredScripts, scriptFiles } from './lib/scripts.mjs';
import { badFrames } from './fix-collision-polys.mjs';
const sheet = JSON.parse(await readFile(new URL('../eventSheets/Game.json', import.meta.url), 'utf8'));
const shipped = sheet.events.flatMap(event => event.actions || []).find(action => action.type === 'script').script;
assert.deepEqual(shipped, START_SCRIPT, 'The event sheet must call PixelMine.start(runtime) and hold no engine code.');
const metadata = JSON.parse(await readFile(new URL('../project.c3proj', import.meta.url), 'utf8'));
assert.deepEqual(registeredScripts(metadata), scriptFiles(PROJECT), 'project.c3proj must list exactly the files in scripts/ (run node tools/sync-scripts.mjs).');
assert.deepEqual(badFrames(), [], 'Sprite frames with an invalid collision polygon crash the editor on Preview (run node tools/fix-collision-polys.mjs).');
const imports = await readFile(new URL('../scripts/importsForEvents.js', import.meta.url), 'utf8');
assert.match(imports, /import \* as PixelMine from "\.\/pixel-mine\/index\.js"/, 'importsForEvents.js must expose PixelMine.');
assert.ok(!/^\s*export\b/m.test(imports), 'importsForEvents.js must not export anything.');
const results = await withConstruct(async ({ call }) => {
  const results = {};
  for (const name of ['validate_project', 'find_runtime_traps', 'find_orphaned_objects', 'analyze_performance']) results[name] = await call(name);
  return results;
});
// find_orphaned_objects does not read project script files, so the objects the
// engine names as runtime.objects.X would all look unused. Count those uses here.
const usedByScripts = new Set();
for (const path of scriptFiles(PROJECT)) {
  const text = await readFile(new URL(`../scripts/${path}`, import.meta.url), 'utf8');
  for (const match of text.matchAll(/\bruntime\.objects\.(\w+)/g)) usedByScripts.add(match[1]);
}
const reported = results.find_orphaned_objects.orphanedObjects.map(object => object.name);
const orphans = reported.filter(name => !usedByScripts.has(name));
const objects = { totalObjects: results.find_orphaned_objects.totalObjects, reportedByTool: reported.length, usedByScripts: reported.length - orphans.length, orphanedObjects: orphans };
await writeFile(new URL('../build/reports/project-audit.json', import.meta.url), JSON.stringify({ ...results, objects }, null, 2));
assert.equal(results.validate_project.valid, true, 'Construct integrity validation failed.');
assert.equal(results.validate_project.complete, true, 'Some project files were not checked.');
assert.deepEqual(orphans, [], 'Objects that neither the events, the layout nor the scripts use.');
console.log(JSON.stringify({ scriptsRegistered: scriptFiles(PROJECT).length, eventSheetCallsEngine: true, validation: results.validate_project.summary, runtimeTraps: results.find_runtime_traps.summary, objects, performance: results.analyze_performance.summary }, null, 2));
