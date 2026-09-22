#!/usr/bin/env node
/**
 * Regenerates everything this repository derives from Luma's OpenAPI document:
 *
 * - `test/fixtures/luma-paths.json`: every documented path, its methods and the
 *   query and body parameters each accepts, used by the description test to
 *   prove the node only calls endpoints and parameters that exist.
 * - `nodes/Luma/__schema__/v1.0.0/<resource>/<operation>.json`: the output schema
 *   n8n shows when a node has not run yet.
 *
 * Run it after Luma changes their API:
 *
 *     npm run build && npm run sync:openapi
 *
 * The node's routing table is the source of truth for which endpoint belongs to
 * which resource and operation, so this reads the built node rather than
 * repeating the mapping here. Build first.
 */
import { createRequire } from 'node:module';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_URL = 'https://public-api.luma.com/openapi.json';
const SCHEMA_DIR = join(repoRoot, 'nodes/Luma/__schema__/v1.0.0');
const PATHS_FIXTURE = join(repoRoot, 'test/fixtures/luma-paths.json');
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/** Follows `$ref`, merges composition keywords and drops annotations n8n ignores. */
function resolveSchema(schema, spec, seen = new Set()) {
	if (!schema || typeof schema !== 'object') return undefined;

	if (schema.$ref) {
		if (seen.has(schema.$ref)) return { type: 'object' }; // recursive schema, stop here
		const target = schema.$ref
			.replace(/^#\//, '')
			.split('/')
			.reduce((node, key) => node?.[key], spec);
		return resolveSchema(target, spec, new Set([...seen, schema.$ref]));
	}

	const branches = schema.allOf ?? schema.oneOf ?? schema.anyOf;
	if (branches) {
		const resolved = branches
			.map((branch) => resolveSchema(branch, spec, seen))
			.filter((branch) => branch && branch.type !== 'null');

		// A union of object shapes cannot be expressed in n8n's schema files, so
		// the branches are merged: a superset is more useful for field suggestions
		// than picking an arbitrary branch.
		const objects = resolved.filter((branch) => branch.properties);
		if (objects.length > 0) {
			const properties = Object.assign({}, ...objects.map((branch) => branch.properties));
			return { type: 'object', properties };
		}

		// Nullable scalars and arrays (`anyOf: [{...}, {type: "null"}]`) reduce to
		// their one real branch. Returning undefined here would silently drop the
		// property from its parent.
		return resolved[0];
	}

	if (schema.type === 'array') {
		const items = resolveSchema(schema.items, spec, seen);
		return items ? { type: 'array', items } : { type: 'array' };
	}

	if (schema.properties) {
		const properties = {};
		for (const [name, value] of Object.entries(schema.properties)) {
			const resolved = resolveSchema(value, spec, seen);
			if (resolved) properties[name] = resolved;
		}
		return { type: 'object', properties };
	}

	// `type` can be a list like ["string", "null"] in OpenAPI 3.1.
	const type = Array.isArray(schema.type)
		? schema.type.find((entry) => entry !== 'null')
		: schema.type;
	return type ? { type } : undefined;
}

function successSchema(spec, path, method) {
	const operation = spec.paths?.[path]?.[method.toLowerCase()];
	const content = operation?.responses?.['200']?.content?.['application/json']?.schema;
	return resolveSchema(content, spec);
}

/**
 * postReceive handlers that leave the successful response shape alone, so the
 * schema can be taken straight from the OpenAPI document.
 */
const SHAPE_PRESERVING_HANDLERS = new Set(['handleLumaError']);

/**
 * Operations whose postReceive builds a response the API never returns. These
 * cannot be derived from the spec, so the shape is declared here instead.
 */
const OUTPUT_OVERRIDES = {
	'image.upload': {
		type: 'object',
		properties: {
			file_url: { type: 'string' },
			content_type: { type: 'string' },
			file_name: { type: 'string' },
			size: { type: 'number' },
		},
	},
};

/** Mirrors what the node emits: a `rootProperty` postReceive unwraps the envelope. */
function unwrapProperty(postReceive = []) {
	const unwrap = postReceive.find(
		(step) => typeof step === 'object' && step.type === 'rootProperty',
	);
	return unwrap?.properties?.property;
}

function returnsSuccessFlag(postReceive = []) {
	return postReceive.some((step) => typeof step === 'function' && step.name === 'returnSuccess');
}

function routedOperations(description) {
	const operations = [];
	for (const property of description.properties) {
		if (property.name !== 'operation') continue;
		const resources = property.displayOptions?.show?.resource ?? [];
		for (const option of property.options ?? []) {
			if (!option.routing?.request) continue;
			for (const resource of resources) {
				operations.push({ resource, operation: option.value, routing: option.routing });
			}
		}
	}
	return operations;
}

const response = await fetch(SPEC_URL);
if (!response.ok) throw new Error(`Could not download ${SPEC_URL}: HTTP ${response.status}`);
const spec = await response.json();

const paths = {};
for (const [path, methods] of Object.entries(spec.paths ?? {})) {
	for (const method of HTTP_METHODS.filter((candidate) => candidate in methods)) {
		const operation = methods[method];
		const body = resolveSchema(operation.requestBody?.content?.['application/json']?.schema, spec);
		paths[path] ??= {};
		paths[path][method.toUpperCase()] = {
			query: (operation.parameters ?? [])
				.filter((parameter) => parameter.in === 'query')
				.map((parameter) => parameter.name)
				.sort(),
			body: Object.keys(body?.properties ?? {}).sort(),
		};
	}
}
await writeFile(PATHS_FIXTURE, `${JSON.stringify(paths, null, '\t')}\n`);
console.log(`${PATHS_FIXTURE}: ${Object.keys(paths).length} paths`);

const { Luma } = require(join(repoRoot, 'dist/nodes/Luma/Luma.node.js'));
await rm(SCHEMA_DIR, { recursive: true, force: true });

let written = 0;
let skipped = [];
for (const { resource, operation, routing } of routedOperations(new Luma().description)) {
	const { url, method } = routing.request;
	const postReceive = routing.output?.postReceive;

	const key = `${resource}.${operation}`;
	const reshapes = (postReceive ?? []).filter(
		(step) =>
			typeof step === 'function' &&
			!SHAPE_PRESERVING_HANDLERS.has(step.name) &&
			step.name !== 'returnSuccess',
	);
	if (reshapes.length > 0 && !(key in OUTPUT_OVERRIDES)) {
		throw new Error(
			`${key} runs ${reshapes.map((step) => step.name).join(', ')}, which changes the response ` +
				'shape. Add an entry to OUTPUT_OVERRIDES describing what the node emits.',
		);
	}

	let schema;
	if (OUTPUT_OVERRIDES[key]) {
		schema = OUTPUT_OVERRIDES[key];
	} else {
		schema = successSchema(spec, url, method);
		const property = unwrapProperty(postReceive);
		if (property) {
			const unwrapped = schema?.properties?.[property];
			schema = unwrapped?.type === 'array' ? unwrapped.items : unwrapped;
		}

		// `returnSuccess` only rewrites responses that came back empty, so the
		// documented body wins whenever there is one.
		const documentsNothing = !schema?.properties || Object.keys(schema.properties).length === 0;
		if (documentsNothing && returnsSuccessFlag(postReceive)) {
			schema = { type: 'object', properties: { success: { type: 'boolean' } } };
		}
	}

	if (!schema?.properties || Object.keys(schema.properties).length === 0) {
		skipped.push(`${resource}.${operation}`);
		continue;
	}

	const file = join(SCHEMA_DIR, resource, `${operation}.json`);
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, `${JSON.stringify({ ...schema, version: 1 }, null, '\t')}\n`);
	written += 1;
}

console.log(`${SCHEMA_DIR}: ${written} schemas`);
if (skipped.length > 0) console.log(`no documented response body: ${skipped.join(', ')}`);
