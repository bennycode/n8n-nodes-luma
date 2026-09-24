/**
 * A polling or streaming trigger registers timers, event listeners or
 * subscriptions in `trigger()`. Everything registered there has to be torn
 * down in `closeFunction`, otherwise each workflow deactivation leaks the
 * handle and the objects it closes over.
 */

const REGISTRATIONS = {
	setInterval: 'clearInterval',
	on: 'off / removeListener / removeAllListeners',
	addListener: 'removeListener / removeAllListeners',
	addEventListener: 'removeEventListener',
	subscribe: 'unsubscribe',
};

const CLEANUPS = new Set([
	'clearInterval',
	'off',
	'removeListener',
	'removeAllListeners',
	'removeEventListener',
	'unsubscribe',
	'close',
	'destroy',
	'disconnect',
	'end',
	'quit',
	'stop',
	'terminate',
]);

function calledName(node) {
	const callee = node.callee;
	if (callee.type === 'Identifier') return callee.name;
	if (
		callee.type === 'MemberExpression' &&
		!callee.computed &&
		callee.property.type === 'Identifier'
	) {
		return callee.property.name;
	}
	return undefined;
}

/** Matches `async trigger() {}` in a class as well as `trigger: async function () {}` in an object. */
const TRIGGER = ':matches(MethodDefinition[key.name="trigger"], Property[key.name="trigger"])';

export const requireListenerCleanup = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require trigger() implementations that register timers, listeners or subscriptions to clean them up in closeFunction.',
		},
		messages: {
			missingCloseFunction:
				'`trigger()` registers `{{name}}` but returns no `closeFunction`. Every timer, listener or subscription created here leaks when the workflow is deactivated. Return `{ closeFunction }` and release the handle there.',
			missingCleanup:
				'`{{name}}` is registered in `trigger()` but nothing in the method releases it. Call `{{cleanup}}` (or close the underlying client) inside `closeFunction`.',
		},
		schema: [],
	},
	create(context) {
		/** State for the trigger method currently being visited, or undefined. */
		let current;

		return {
			[TRIGGER](node) {
				current = { node, registrations: [], hasCleanup: false, hasCloseFunction: false };
			},

			[`${TRIGGER} CallExpression`](node) {
				if (!current) return;
				const name = calledName(node);
				if (!name) return;
				if (name in REGISTRATIONS) current.registrations.push({ node, name });
				if (CLEANUPS.has(name)) current.hasCleanup = true;
			},

			[`${TRIGGER} Property[key.name="closeFunction"]`]() {
				if (current) current.hasCloseFunction = true;
			},

			[`${TRIGGER}:exit`]() {
				if (!current) return;
				const { node, registrations, hasCleanup, hasCloseFunction } = current;
				current = undefined;
				if (registrations.length === 0) return;

				if (!hasCloseFunction) {
					context.report({
						node: node.key,
						messageId: 'missingCloseFunction',
						data: { name: registrations[0].name },
					});
					return;
				}

				if (!hasCleanup) {
					for (const registration of registrations) {
						context.report({
							node: registration.node,
							messageId: 'missingCleanup',
							data: { name: registration.name, cleanup: REGISTRATIONS[registration.name] },
						});
					}
				}
			},
		};
	},
};
