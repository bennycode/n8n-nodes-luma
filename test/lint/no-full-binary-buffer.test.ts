import { noFullBinaryBuffer } from '../../lint/memory/rules/no-full-binary-buffer.mjs';
import { ruleTester } from './helpers';

ruleTester.run('no-full-binary-buffer', noFullBinaryBuffer, {
	valid: [
		// Streaming the binary item keeps memory flat.
		`export async function upload(this: any, id: string) {
			const stream = await this.helpers.getBinaryStream(id);
			await this.helpers.httpRequest({ method: 'PUT', body: stream });
		}`,
		// Metadata access does not load the payload.
		`export function meta(this: any) { return this.helpers.assertBinaryData('data').mimeType; }`,
		// Streams from fs are fine.
		`import { createReadStream } from 'node:fs';
		 export function open(path: string) { return createReadStream(path); }`,
		// A readFile that is not from fs is not our concern.
		`const storage = { readFile: (key: string) => key };
		 export function load(key: string) { return storage.readFile(key); }`,
	],
	invalid: [
		{
			code: `export async function upload(this: any) { const buffer = await this.helpers.getBinaryDataBuffer('data'); return buffer; }`,
			errors: [{ messageId: 'binaryBuffer', data: { name: 'getBinaryDataBuffer' } }],
		},
		{
			code: `export async function collect(this: any, body: any) { return await this.helpers.binaryToBuffer(body); }`,
			errors: [{ messageId: 'binaryBuffer', data: { name: 'binaryToBuffer' } }],
		},
		{
			code: `import { readFileSync } from 'fs';
			 export function load(path: string) { return readFileSync(path); }`,
			errors: [{ messageId: 'fileBuffer', data: { name: 'readFileSync' } }],
		},
		{
			code: `import { readFile as read } from 'node:fs/promises';
			 export async function load(path: string) { return await read(path); }`,
			errors: [{ messageId: 'fileBuffer', data: { name: 'readFile' } }],
		},
		{
			code: `import * as fs from 'node:fs';
			 export async function load(path: string) { return await fs.promises.readFile(path); }`,
			errors: [{ messageId: 'fileBuffer', data: { name: 'readFile' } }],
		},
		{
			code: `const fs = require('fs');
			 export function load(path: string) { return fs.readFileSync(path); }`,
			errors: [{ messageId: 'fileBuffer', data: { name: 'readFileSync' } }],
		},
		{
			code: `const { readFileSync } = require('node:fs');
			 export function load(path: string) { return readFileSync(path); }`,
			errors: [{ messageId: 'fileBuffer', data: { name: 'readFileSync' } }],
		},
	],
});
