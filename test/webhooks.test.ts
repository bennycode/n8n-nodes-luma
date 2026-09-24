import { describe, expect, it } from 'vitest';
import { normalizeEventTypes, sameEventTypes } from '../nodes/Luma/shared/webhooks';

describe('normalizeEventTypes', () => {
	it('collapses to the wildcard when it is selected', () => {
		expect(normalizeEventTypes(['event.created', '*'])).toEqual(['*']);
	});

	it('sorts and deduplicates', () => {
		expect(normalizeEventTypes(['guest.updated', 'event.created', 'guest.updated'])).toEqual([
			'event.created',
			'guest.updated',
		]);
	});
});

describe('sameEventTypes', () => {
	it('ignores order', () => {
		expect(sameEventTypes(['a', 'b'], ['b', 'a'])).toBe(true);
		expect(sameEventTypes(['a'], ['a', 'b'])).toBe(false);
	});
});
