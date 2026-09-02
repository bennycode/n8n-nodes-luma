import type { IDataObject, IN8nRequestOperationPaginationGeneric } from 'n8n-workflow';

/**
 * Luma lists are cursor based: every page carries `has_more` and `next_cursor`.
 *
 * n8n replaces the whole query string with the one given here on every
 * paginated request, so each query parameter the operation may send has to be
 * carried over from `$request.qs` explicitly. Parameters that are not set
 * resolve to undefined and are dropped from the URL.
 */
export function cursorPagination(queryParameters: string[]): IN8nRequestOperationPaginationGeneric {
	const qs: IDataObject = {
		pagination_cursor: '={{ $response.body?.next_cursor }}',
	};
	for (const parameter of queryParameters) {
		qs[parameter] = `={{ $request.qs?.${parameter} }}`;
	}

	return {
		type: 'generic',
		properties: {
			continue: '={{ $response.body?.has_more === true }}',
			request: { qs },
		},
	};
}
