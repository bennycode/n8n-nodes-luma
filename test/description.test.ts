import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Luma } from '../nodes/Luma/Luma.node';
import { eventGetManyQueryParameters } from '../nodes/Luma/resources/event/getAll';
import { guestGetManyQueryParameters } from '../nodes/Luma/resources/guest/getAll';
import { contactGetManyQueryParameters } from '../nodes/Luma/resources/contact';
import lumaPaths from './fixtures/luma-paths.json';

const { description } = new Luma();
const properties = description.properties;

function isOptions(option: unknown): option is INodePropertyOptions {
	return typeof option === 'object' && option !== null && 'value' in option;
}

function operationsFor(resource: string) {
	const operation = properties.find(
		(property) =>
			property.name === 'operation' && property.displayOptions?.show?.resource?.includes(resource),
	);
	return (operation?.options ?? []).filter(isOptions);
}

type DocumentedEndpoints = Record<string, Record<string, { query: string[]; body: string[] }>>;

const documented: DocumentedEndpoints = lumaPaths;

type SentParameter = { type: 'query' | 'body'; property: string };

/** Collects `routing.send` declarations, including those nested in collections. */
function sendsIn(property: INodeProperties): SentParameter[] {
	const send = property.routing?.send;
	const own: SentParameter[] =
		(send?.type === 'query' || send?.type === 'body') && send.property
			? [{ type: send.type, property: send.property }]
			: [];

	const nested = (property.options ?? []).flatMap((option) => {
		if (typeof option !== 'object' || option === null) return [];
		// `collection` options are properties themselves; `fixedCollection` options
		// wrap their fields in `values`.
		const candidates = 'values' in option ? (option.values ?? []) : [option];
		return candidates
			.filter((candidate): candidate is INodeProperties => 'type' in candidate)
			.flatMap(sendsIn);
	});

	return [...own, ...nested];
}

/**
 * Every query and body parameter an operation puts on the wire: the ones the
 * operation's own routing sets, plus those contributed by the fields that are
 * visible for it.
 */
function parametersSentBy(resource: string, operation: INodePropertyOptions): SentParameter[] {
	const request = operation.routing?.request;
	const fromOperation: SentParameter[] = [
		...Object.keys(request?.qs ?? {}).map((property) => ({ type: 'query' as const, property })),
		...Object.keys((request?.body as Record<string, unknown>) ?? {}).map((property) => ({
			type: 'body' as const,
			property,
		})),
	];

	const fromFields = properties
		.filter((property) => {
			const show = property.displayOptions?.show;
			if (!show?.resource?.includes(resource)) return false;
			return !show.operation || show.operation.includes(operation.value);
		})
		.flatMap(sendsIn);

	return [...fromOperation, ...fromFields];
}

function queryPropertiesIn(collection: INodeProperties | undefined): string[] {
	return (collection?.options ?? [])
		.filter((option): option is INodeProperties => 'type' in option)
		.flatMap((option) => {
			const send = option.routing?.send;
			return send?.type === 'query' && send.property ? [send.property] : [];
		});
}

describe('Luma node description', () => {
	const resources = properties.find((property) => property.name === 'resource')?.options ?? [];
	const resourceValues = resources.filter(isOptions).map((option) => String(option.value));

	it('has an operation list with routing for every resource', () => {
		for (const resource of resourceValues) {
			const operations = operationsFor(resource);
			expect(operations.length, resource).toBeGreaterThan(0);
			for (const operation of operations) {
				expect(operation.routing?.request?.url, `${resource}.${operation.value}`).toMatch(
					/^\/v\d\//,
				);
				expect(operation.routing?.request?.ignoreHttpStatusErrors).toBe(true);
				expect(operation.routing?.output?.postReceive?.length).toBeGreaterThan(0);
			}
		}
	});

	it('only shows parameters for resources and operations that exist', () => {
		for (const property of properties) {
			const show = property.displayOptions?.show;
			if (!show) continue;
			for (const resource of show.resource ?? []) {
				expect(resourceValues, property.name).toContain(resource);
				for (const operation of show.operation ?? []) {
					expect(
						operationsFor(String(resource)).map((o) => o.value),
						property.name,
					).toContain(operation);
				}
			}
		}
	});

	it('repeats every filter query parameter during pagination', () => {
		const cases = [
			{ resource: 'event', expected: eventGetManyQueryParameters },
			{ resource: 'guest', expected: guestGetManyQueryParameters },
			{ resource: 'contact', expected: contactGetManyQueryParameters },
		];
		for (const { resource, expected } of cases) {
			const filters = properties.find(
				(property) =>
					property.name === 'filters' &&
					property.displayOptions?.show?.resource?.includes(resource),
			);
			for (const parameter of queryPropertiesIn(filters)) {
				expect(expected, `${resource} pagination misses ${parameter}`).toContain(parameter);
			}
		}
	});

	it('only calls endpoints and methods that exist in the Luma OpenAPI spec', () => {
		for (const resource of resourceValues) {
			for (const operation of operationsFor(resource)) {
				const { url, method } = operation.routing?.request ?? {};
				expect(
					documented,
					`${resource}.${operation.value} uses unknown path ${url}`,
				).toHaveProperty(String(url));
				expect(
					Object.keys(documented[String(url)]),
					`${resource}.${operation.value} ${method} ${url}`,
				).toContain(method);
			}
		}
	});

	it('only sends query and body parameters the endpoint accepts', () => {
		const problems: string[] = [];
		let checked = 0;
		for (const resource of resourceValues) {
			for (const operation of operationsFor(resource)) {
				const { url, method } = operation.routing?.request ?? {};
				const accepted = documented[String(url)]?.[String(method)];
				if (!accepted) continue; // covered by the endpoint test above

				for (const { type, property } of parametersSentBy(resource, operation)) {
					checked += 1;
					const allowed = type === 'query' ? accepted.query : accepted.body;
					if (!allowed.includes(property)) {
						problems.push(
							`${resource}.${String(operation.value)} sends ${type} "${property}", which ${method} ${url} does not accept`,
						);
					}
				}
			}
		}
		expect(problems).toEqual([]);
		// Guards against the collector silently walking past every field and
		// reporting a clean run because it found nothing at all.
		expect(checked).toBeGreaterThan(100);
	});

	it('ships an output schema for every operation', () => {
		// Catches an operation added without re-running `npm run sync:openapi`.
		// Globbed rather than read from disk: n8n Cloud community nodes may not
		// import `node:fs`, and the rule covers tests too.
		const shipped = new Set(
			Object.keys(import.meta.glob('../nodes/Luma/__schema__/v1.0.0/*/*.json')).map((path) =>
				path
					.split('/')
					.slice(-2)
					.join('/')
					.replace(/\.json$/, ''),
			),
		);
		expect(shipped.size).toBeGreaterThan(0);

		for (const resource of resourceValues) {
			for (const operation of operationsFor(resource)) {
				expect([...shipped]).toContain(`${resource}/${String(operation.value)}`);
			}
		}
	});

	it('uses the right indefinite article in every visible string', () => {
		const texts: string[] = [];
		const collect = (property: INodeProperties) => {
			texts.push(property.displayName, property.description ?? '', property.placeholder ?? '');
			for (const option of property.options ?? []) {
				if ('action' in option)
					texts.push(option.name, option.action ?? '', option.description ?? '');
				else if ('type' in option) collect(option);
			}
		};
		properties.forEach(collect);
		const wrong = texts
			.map((text) => text.replace(/<[^>]+>/g, ''))
			.filter((text) => /\ba [aeio]/i.test(text) || /\ban [^aeiou]/i.test(text));
		expect(wrong).toEqual([]);
	});

	it('registers the list search and load options methods it references', () => {
		const node = new Luma();
		const listSearchMethods = properties.flatMap((property) =>
			(property.modes ?? []).flatMap((mode) => {
				const method = mode.typeOptions?.searchListMethod;
				return method ? [method] : [];
			}),
		);
		expect(listSearchMethods.length).toBeGreaterThan(0);
		for (const method of listSearchMethods) {
			expect(node.methods.listSearch).toHaveProperty(method);
		}
		const loadOptionsMethods = properties.flatMap((property) => {
			const nested = (property.options ?? []).filter(
				(option): option is INodeProperties => 'type' in option,
			);
			return [property, ...nested].flatMap((candidate) => {
				const method = candidate.typeOptions?.loadOptionsMethod;
				return method ? [method] : [];
			});
		});
		expect(loadOptionsMethods.length).toBeGreaterThan(0);
		for (const method of loadOptionsMethods) {
			expect(node.methods.loadOptions).toHaveProperty(method);
		}
	});
});

describe('Luma Trigger node description', () => {
	it('is a webhook trigger with a full lifecycle', async () => {
		const { LumaTrigger } = await import('../nodes/LumaTrigger/LumaTrigger.node');
		const trigger = new LumaTrigger();
		expect(trigger.description.group).toEqual(['trigger']);
		expect(trigger.description.inputs).toEqual([]);
		expect(trigger.description.webhooks?.[0]?.httpMethod).toBe('POST');
		expect(Object.keys(trigger.webhookMethods.default).sort()).toEqual([
			'checkExists',
			'create',
			'delete',
		]);
	});
});
