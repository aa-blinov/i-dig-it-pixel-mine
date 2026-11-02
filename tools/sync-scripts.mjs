// Brings the Construct project in line with the script files in scripts/:
// lists them in project.c3proj and makes the "On start of layout" block of the
// Game event sheet call the engine.
//
// The sheet holds no engine code. It holds one line, PixelMine.start(runtime),
// which the "Imports for events" script (scripts/importsForEvents.js) resolves.
//
// Usage: node tools/sync-scripts.mjs

import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { withConstruct } from './lib/construct-client.mjs';
import { PROJECT, START_SCRIPT, registerScripts, scriptFiles } from './lib/scripts.mjs';

// The project file is edited first: the server reads it again for every call.
const registered = registerScripts();
console.log(`ok   project.c3proj lists ${registered.files} script files${registered.changed ? ' (updated)' : ''}`);

const sheetPath = `${PROJECT}/eventSheets/Game.json`;
const readSheet = async () => JSON.parse(await readFile(sheetPath, 'utf8'));
const scriptAction = block => (block.actions ?? []).find(action => action.type === 'script');

const sheet = await readSheet();
const block = sheet.events.find(event => event.eventType === 'block' && scriptAction(event));
assert.ok(block, 'no block with a script action in eventSheets/Game.json');

const current = scriptAction(block).script;
const lines = Array.isArray(current) ? current : String(current).split('\n');
if (JSON.stringify(lines) === JSON.stringify(START_SCRIPT)) {
  console.log('ok   the event sheet already calls the engine');
} else {
  await withConstruct(async ({ call }) => {
    await call('update_event_block', {
      sheetName: 'Game', sid: block.sid,
      removeActionIndices: block.actions.flatMap((action, index) => action.type === 'script' ? [index] : []),
      addActions: [{ type: 'script', language: 'javascript', script: START_SCRIPT }],
    });
  });
  const written = scriptAction((await readSheet()).events.find(event => event.sid === block.sid));
  assert.deepEqual(written.script, START_SCRIPT, 'the event sheet does not hold the engine call');
  console.log('ok   the event sheet calls PixelMine.start(runtime)');
}
console.log(`ok   ${scriptFiles().length} script files on disk`);
