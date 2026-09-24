/**
 * `Promise.all(items.map(...))` starts one request per input item at once and
 * keeps every response in memory until the slowest one finishes. With a few
 * thousand items that is enough to take an instance down.
 */

const CONCURRENT_COMBINATORS = new Set(['all', 'allSettled']);
const ITEM_PARAMETER_NAMES = new Set(['items', 'inputItems', 'inputData']);

function isGetInputDataCall(node) {
	return (
		node?.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		!node.callee.computed &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === 'getInputData'
	);
}

/** Walks `a.filter(...).map(...)` down to `a`, stopping at `this.getInputData()` itself. */
function rootOfChain(node) {
	let current = node;
	for (;;) {
		if (isGetInputDataCall(current)) {
			return current;
		}
		if (current.type === 'CallExpression') {
			current = current.callee;
		} else if (current.type === 'MemberExpression') {
			current = current.object;
		} else {
			return current;
		}
	}
}

function isMapCall(node) {
	return (
		node?.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		!node.callee.computed &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === 'map'
	);
}

export const noUnboundedItemConcurrency = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Promise.all / Promise.allSettled over every input item, which runs an unbounded number of requests concurrently.',
		},
		messages: {
			unboundedConcurrency:
				'`Promise.{{method}}` over every input item runs an unbounded number of operations at once and holds all results in memory. Process items sequentially or in bounded batches.',
		},
		schema: [],
	},
	create(context) {
		const sourceCode = context.sourceCode;

		function derivesFromInputItems(node) {
			if (!isMapCall(node)) return false;
			const root = rootOfChain(node.callee.object);
			if (isGetInputDataCall(root)) return true;
			if (root.type !== 'Identifier') return false;

			const scope = sourceCode.getScope(root);
			const variable = findVariable(scope, root.name);
			if (!variable) return ITEM_PARAMETER_NAMES.has(root.name);

			for (const definition of variable.defs) {
				if (definition.type === 'Parameter') {
					return ITEM_PARAMETER_NAMES.has(root.name);
				}
				if (definition.type === 'Variable' && isGetInputDataCall(definition.node.init)) {
					return true;
				}
			}
			return false;
		}

		return {
			CallExpression(node) {
				const callee = node.callee;
				if (
					callee.type !== 'MemberExpression' ||
					callee.computed ||
					callee.object.type !== 'Identifier' ||
					callee.object.name !== 'Promise' ||
					callee.property.type !== 'Identifier' ||
					!CONCURRENT_COMBINATORS.has(callee.property.name)
				) {
					return;
				}

				const [argument] = node.arguments;
				if (!derivesFromInputItems(argument)) return;

				context.report({
					node,
					messageId: 'unboundedConcurrency',
					data: { method: callee.property.name },
				});
			},
		};
	},
};

function findVariable(scope, name) {
	for (let current = scope; current; current = current.upper) {
		const variable = current.set.get(name);
		if (variable) return variable;
	}
	return undefined;
}
