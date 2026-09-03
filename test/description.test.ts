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
				expect(operation.routing?.request?.url, `${resource}.${operation.value}`).toMatch(/^\/v\d\//);
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
					expect(operationsFor(String(resource)).map((o) => o.value), property.name).toContain(operation);
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
					property.name === 'filters' && property.displayOptions?.show?.resource?.includes(resource),
			);
			for (const parameter of queryPropertiesIn(filters)) {
				expect(expected, `${resource} pagination misses ${parameter}`).toContain(parameter);
			}
		}
	});

	it('only calls endpoints and methods that exist in the Luma OpenAPI spec', () => {
		const documented: Record<string, string[]> = lumaPaths;
		for (const resource of resourceValues) {
			for (const operation of operationsFor(resource)) {
				const { url, method } = operation.routing?.request ?? {};
				expect(documented, `${resource}.${operation.value} uses unknown path ${url}`).toHaveProperty(String(url));
				expect(documented[String(url)], `${resource}.${operation.value} ${method} ${url}`).toContain(method);
			}
		}
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
			const nested = (property.options ?? []).filter((option): option is INodeProperties => 'type' in option);
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
