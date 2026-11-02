// Reopens the packed .c3p and checks that the editor will find a working
// game in it: the archive unpacks into a folder, the server opens that
// folder as a project and validates it.
//
// Usage: node tools/verify-pack.mjs [archivePath]

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { START_SCRIPT, registeredScripts, scriptFiles } from './lib/scripts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const SERVER = 'E:/pet/tools/construct3-mcp/dist/index.js';
const ARCHIVE = resolve(process.argv[2] ?? join(PROJECT, 'build', 'pixel-mine.c3p'));

// The archive is a zip with stored (uncompressed) entries, so it is read
// without a zip library: the central directory lists every entry.
function readEntries(path) {
	const buf = readFileSync(path);
	const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
	if (eocd < 0) throw new Error('not a zip file: no end-of-central-directory record');
	const count = buf.readUInt16LE(eocd + 10);
	let offset = buf.readUInt32LE(eocd + 16);
	const entries = [];
	for (let i = 0; i < count; i++) {
		if (buf.readUInt32LE(offset) !== 0x02014b50) throw new Error('bad central directory entry');
		const nameLength = buf.readUInt16LE(offset + 28);
		const extraLength = buf.readUInt16LE(offset + 30);
		const commentLength = buf.readUInt16LE(offset + 32);
		const localOffset = buf.readUInt32LE(offset + 42);
		const name = buf.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');

		const localNameLength = buf.readUInt16LE(localOffset + 26);
		const localExtraLength = buf.readUInt16LE(localOffset + 28);
		const size = buf.readUInt32LE(localOffset + 18);
		const dataStart = localOffset + 30 + localNameLength + localExtraLength;
		entries.push({ name, data: buf.subarray(dataStart, dataStart + size) });

		offset += 46 + nameLength + extraLength + commentLength;
	}
	return entries;
}

const OUT = mkdtempSync(join(tmpdir(), 'c3p-'));
let failures = 0;

function fail(message) {
	failures++;
	console.log(`FAIL ${message}`);
}

const entries = readEntries(ARCHIVE);
console.log(`${ARCHIVE}: ${entries.length} entries`);

for (const entry of entries) {
	const target = join(OUT, entry.name);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, entry.data);
}

// The game has to be complete: the project file, the object types, the event
// sheet, the layout and the images.
const names = entries.map((entry) => entry.name);
for (const required of [
	'project.c3proj',
	'eventSheets/Game.json',
	'layouts/Play.json',
	'scripts/importsForEvents.js',
	'scripts/pixel-mine/index.js',
	'objectTypes/Ore.json',
	'objectTypes/SpecialMark.json',
	'objectTypes/Backdrop.json',
	'objectTypes/ScoreText.json',
	'images/ore-animation 1-000.png',
	'images/ore-animation 1-016.png',
	'images/backdrop-animation 1-000.png',
]) {
	if (!names.includes(required)) fail(`${required} is missing from the archive`);
}

// The dev tooling has no business in the shipped game.
for (const entry of names) {
	if (/^(tools|tests|docs|specs|build|\.specify|\.claude|\.omp|\.git)\//.test(entry)) fail(`${entry} is dev tooling and must not ship`);
	if (entry.endsWith('.bak')) fail(`${entry} is a backup and must not ship`);
	if (entry.includes('c3-runtime-bridge')) fail(`${entry} is the runtime bridge and must not ship`);
}

// The engine ships as the script files of the project: every file on disk is
// in the archive, byte for byte, and the archived project lists exactly them.
const diskScripts = scriptFiles(PROJECT);
for (const path of diskScripts) {
	const archived = join(OUT, 'scripts', path);
	if (!existsSync(archived)) fail(`scripts/${path} is missing from the archive`);
	else if (!readFileSync(archived).equals(readFileSync(join(PROJECT, 'scripts', path)))) fail(`scripts/${path} in the archive differs from the project`);
}
const archivedScripts = names.filter((name) => name.startsWith('scripts/')).map((name) => name.slice('scripts/'.length)).sort();
if (JSON.stringify(archivedScripts) !== JSON.stringify(diskScripts)) fail('the archive holds scripts that differ from the project scripts');
const listed = registeredScripts(JSON.parse(readFileSync(join(OUT, 'project.c3proj'), 'utf8')));
if (JSON.stringify(listed) !== JSON.stringify(diskScripts)) fail('the archived project does not list exactly its script files');
else console.log(`ok   the archive holds the engine as ${diskScripts.length} script files, all listed in the project`);

// The event sheet has to call the engine and nothing else.
const sheet = JSON.parse(readFileSync(join(OUT, 'eventSheets', 'Game.json'), 'utf8'));
const script = sheet.events.flatMap((event) => event.actions ?? []).find((action) => action.type === 'script');
if (!script) fail('the event sheet of the archive holds no script action');
else if (JSON.stringify(script.script) !== JSON.stringify(START_SCRIPT)) fail('the event sheet of the archive does not call PixelMine.start(runtime)');
else console.log('ok   the event sheet of the archive calls PixelMine.start(runtime)');

// The server opens the unpacked folder as a project and validates it.
const server = spawn('node', [SERVER, OUT], { stdio: ['pipe', 'pipe', 'inherit'] });
let buffer = '';
const pending = new Map();
let nextId = 1;

server.stdout.on('data', (chunk) => {
	buffer += chunk.toString();
	let index;
	while ((index = buffer.indexOf('\n')) >= 0) {
		const line = buffer.slice(0, index).trim();
		buffer = buffer.slice(index + 1);
		if (!line) continue;
		const message = JSON.parse(line);
		if (message.id && pending.has(message.id)) {
			pending.get(message.id)(message);
			pending.delete(message.id);
		}
	}
});

function send(method, params) {
	const id = nextId++;
	return new Promise((resolve) => {
		pending.set(id, resolve);
		server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
	});
}

await new Promise((resolve) => setTimeout(resolve, 1200));
server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
await send('initialize', {
	protocolVersion: '2025-06-18',
	capabilities: {},
	clientInfo: { name: 'verify-pack', version: '1.0' },
});

async function call(tool, args = {}) {
	const response = await send('tools/call', { name: tool, arguments: args });
	const text = (response.result?.content ?? []).map((part) => part.text ?? '').join('\n');
	if (response.result?.isError) {
		fail(`${tool}: ${text.slice(0, 300)}`);
		return null;
	}
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

const validation = await call('validate_project', {});
if (validation) {
	console.log(`ok   validate_project: valid=${validation.valid} errors=${validation.errors.length} warnings=${validation.warnings.length}`);
	if (!validation.valid) fail('the unpacked archive is not a valid project');
	if (validation.errors.length > 0) fail(`the unpacked archive has ${validation.errors.length} error(s)`);
}

const objects = await call('list_objects', {});
if (objects) {
	const names = (objects.objects ?? objects).map((object) => object.name ?? object);
	console.log(`ok   the archive holds ${names.length} object types: ${names.join(', ')}`);
	for (const expected of ['Ore', 'SpecialMark', 'BoardTile', 'Blast', 'Ring', 'PopText', 'ScoreText', 'MovesText', 'StatusText', 'Backdrop']) {
		if (!names.includes(expected)) fail(`${expected} is missing from the unpacked archive`);
	}
}

const sheets = await call('list_eventsheets', {});
if (sheets) console.log(`ok   the archive holds the event sheets: ${(sheets.eventSheets ?? sheets).map((s) => s.name ?? s).join(', ')}`);

const layouts = await call('list_layouts', {});
if (layouts) console.log(`ok   the archive holds the layouts: ${(layouts.layouts ?? layouts).map((l) => l.name ?? l).join(', ')}`);

const traps = await call('find_runtime_traps', {});
if (traps) {
	const issues = traps.traps ?? traps.findings ?? [];
	console.log(`ok   find_runtime_traps: ${issues.length} finding(s)`);
	for (const issue of issues) console.log(`     ${issue.check ?? ''} ${issue.entity ?? ''} ${issue.message ?? ''}`);
}

server.kill();
rmSync(OUT, { recursive: true, force: true });

console.log(failures === 0 ? '\nthe archive holds the game' : `\n${failures} problem(s) with the archive`);
process.exit(failures === 0 ? 0 : 1);
