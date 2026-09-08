/**
 * Module scope lives for the whole n8n process. A Map, Set, array or object
 * declared there and filled from inside a function keeps growing across
 * workflow executions and is the most common memory leak in community nodes.
 */

const GROWING_METHODS = new Set(['push', 'unshift', 'splice', 'set', 'add']);
const CONTAINER_CONSTRUCTORS = new Set(['Map', 'Set', 'Array', 'Object']);

function isContainerInit(init) {
	if (!init) return false;
	if (init.type === 'ArrayExpression' || init.type === 'ObjectExpression') return true;
	return (
		init.type === 'NewExpression' &&
		init.callee.type === 'Identifier' &&
		CONTAINER_CONSTRUCTORS.has(init.callee.name)
	);
}

function isModuleScopeDeclaration(node) {
	const parent = node.parent;
	if (!parent) return false;
	if (parent.type === 'Program') return true;
	return parent.type === 'ExportNamedDeclaration' && parent.parent?.type === 'Program';
}

function isInsideFunction(scope) {
	for (let current = scope; current; current = current.upper) {
		if (current.type === 'function') return true;
		if (current.type === 'module' || current.type === 'global') return false;
	}
	return false;
}

/** Returns a short label for the mutation, or undefined when the reference is a plain read. */
function describeMutation(reference) {
	const identifier = reference.identifier;
	const parent = identifier.parent;

	if (
		reference.isWrite() &&
		parent?.type === 'AssignmentExpression' &&
		parent.left === identifier
	) {
		return 'reassigned';
	}

	if (parent?.type === 'MemberExpression' && parent.object === identifier) {
		const grandparent = parent.parent;
		if (grandparent?.type === 'AssignmentExpression' && grandparent.left === parent) {
			return 'assigned a new entry';
		}
		if (
			grandparent?.type === 'CallExpression' &&
			grandparent.callee === parent &&
			!parent.computed &&
			parent.property.type === 'Identifier' &&
			GROWING_METHODS.has(parent.property.name)
		) {
			return `grown with .${parent.property.name}()`;
		}
	}

	if (
		parent?.type === 'CallExpression' &&
		parent.arguments[0] === identifier &&
		parent.callee.type === 'MemberExpression' &&
		parent.callee.object.type === 'Identifier' &&
		parent.callee.object.name === 'Object' &&
		parent.callee.property.type === 'Identifier' &&
		parent.callee.property.name === 'assign'
	) {
		return 'extended with Object.assign()';
	}

	return undefined;
}

export const noModuleLevelMutableState = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow mutating module-level collections from inside functions. Such state lives for the whole n8n process and grows across executions.',
		},
		messages: {
			moduleLevelMutation:
				'`{{name}}` is declared at module level and {{mutation}} inside a function. Module-level state lives for the whole n8n process and accumulates across workflow executions. Keep the collection local to the function, use `this.getWorkflowStaticData()`, or bound its size.',
		},
		schema: [],
	},
	create(context) {
		const sourceCode = context.sourceCode;

		return {
			VariableDeclaration(node) {
				if (!isModuleScopeDeclaration(node)) return;

				for (const declarator of node.declarations) {
					if (declarator.id.type !== 'Identifier') continue;
					const tracksContainer = isContainerInit(declarator.init);
					const isReassignable = node.kind !== 'const';
					if (!tracksContainer && !isReassignable) continue;

					for (const variable of sourceCode.getDeclaredVariables(declarator)) {
						for (const reference of variable.references) {
							if (reference.init) continue;
							if (!isInsideFunction(reference.from)) continue;

							const mutation = describeMutation(reference);
							if (!mutation) continue;
							if (mutation === 'reassigned' && !isReassignable) continue;
							if (mutation !== 'reassigned' && !tracksContainer) continue;

							context.report({
								node: reference.identifier,
								messageId: 'moduleLevelMutation',
								data: { name: variable.name, mutation },
							});
						}
					}
				}
			},
		};
	},
};
