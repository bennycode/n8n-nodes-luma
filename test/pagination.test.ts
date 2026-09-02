import { describe, expect, it } from 'vitest';
import { cursorPagination } from '../nodes/Luma/shared/pagination';

describe('cursorPagination', () => {
	it('continues while has_more is true and carries the cursor', () => {
		const pagination = cursorPagination(['event_id', 'pagination_limit']);
		expect(pagination.type).toBe('generic');
		expect(pagination.properties.continue).toBe('={{ $response.body?.has_more === true }}');
		expect(pagination.properties.request.qs).toEqual({
			pagination_cursor: '={{ $response.body?.next_cursor }}',
			event_id: '={{ $request.qs?.event_id }}',
			pagination_limit: '={{ $request.qs?.pagination_limit }}',
		});
	});
});
