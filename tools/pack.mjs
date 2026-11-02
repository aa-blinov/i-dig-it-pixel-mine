// Packs the game into a .c3p the Construct 3 editor opens.
//
// The .c3p holds the game alone: the project file, the object types, the
// event sheet, the layout, the scripts, the images and the icons. The dev tooling in
// tools/ stays out of it, and the runtime bridge is not injected, so the
// archive is the shipped game.
//
// Usage: node tools/pack.mjs [outputPath]

import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const SERVER = 'E:/pet/tools/construct3-mcp/dist/index.js';
const OUTPUT = resolve(process.argv[2] ?? join(PROJECT, 'build', 'pixel-mine.c3p'));

// The folders and files the game consists of. Everything else in the project
// folder is the dev tooling and stays out of the archive.
const GAME_PATHS = ['project.c3proj', 'objectTypes', 'eventSheets', 'layouts', 'scripts', 'images', 'icons', 'files'];

// A copy of the game without the tooling, which the server opens to pack it.
const STAGE = join(PROJECT, '.pack-stage');
if (dirname(resolve(STAGE)).toLowerCase() !== resolve(PROJECT).toLowerCase() || basename(STAGE) !== '.pack-stage') {
	throw new Error('Refusing a staging path outside the project workspace');
}

function copyGame() {
	rmSync(STAGE, { recursive: true, force: true });
	mkdirSync(STAGE, { recursive: true });
	for (const path of GAME_PATHS) {
		const from = join(PROJECT, path);
		if (!existsSync(from)) continue;
		cpSync(from, join(STAGE, path), { recursive: true });
	}
	// The backups the writer leaves behind are not part of the game.
	for (const dir of ['objectTypes', 'eventSheets', 'layouts', 'images']) {
		const full = join(STAGE, dir);
		if (!existsSync(full)) continue;
		for (const name of readdirSync(full)) {
			if (name.endsWith('.bak')) rmSync(join(full, name));
		}
	}
}

copyGame();
mkdirSync(dirname(OUTPUT), { recursive: true });

const server = spawn('node', [SERVER, STAGE], { stdio: ['pipe', 'pipe', 'inherit'] });

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
	clientInfo: { name: 'pack', version: '1.0' },
});

let failures = 0;

async function call(tool, args = {}) {
	const response = await send('tools/call', { name: tool, arguments: args });
	const text = (response.result?.content ?? []).map((part) => part.text ?? '').join('\n');
	if (response.result?.isError) {
		failures++;
		console.log(`FAIL ${tool} ${JSON.stringify(args).slice(0, 160)}`);
		console.log(`     ${text.slice(0, 600)}`);
		return null;
	}
	console.log(`ok   ${tool}`);
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

// The staged copy has to be a valid project on its own.
const validation = await call('validate_project', {});
if (!validation || !validation.valid || !validation.complete) {
	failures++;
	console.log('FAIL the staged copy did not pass complete integrity validation');
}

await call('pack_project', { outputPath: OUTPUT, injectBridge: false });

const size = statSync(OUTPUT).size;
console.log(`\n${OUTPUT} written: ${size} bytes`);

server.kill();
rmSync(STAGE, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
