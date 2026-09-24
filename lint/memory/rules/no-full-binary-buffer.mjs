/**
 * Reading a whole file or binary item into a Buffer means the node's memory
 * use is whatever the user throws at it. n8n offers `getBinaryStream()` and
 * Node offers streams for the same job.
 */

const FS_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises']);
const FS_BUFFER_FUNCTIONS = new Set(['readFileSync', 'readFile']);
const N8N_BUFFER_HELPERS = new Set(['getBinaryDataBuffer', 'binaryToBuffer']);

function isRequireOf(node, modules) {
	return (
		node?.type === 'CallExpression' &&
		node.callee.type === 'Identifier' &&
		node.callee.name === 'require' &&
		node.arguments[0]?.type === 'Literal' &&
		modules.has(node.arguments[0].value)
	);
}

export const noFullBinaryBuffer = {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow loading whole files or binary items into memory. Prefer streams so memory use does not scale with input size.',
		},
		messages: {
			binaryBuffer:
				'`{{name}}()` loads the whole binary item into memory. Prefer `this.helpers.getBinaryStream()` and stream the data, or check the size first. If a full buffer is unavoidable, turn the rule off for that file in eslint.memory.config.mjs and document why.',
			fileBuffer:
				'`{{name}}()` reads the whole file into memory. Use `fs.createReadStream()` or `fs.promises.open()` and stream the content instead.',
		},
		schema: [],
	},
	create(context) {
		/** Local identifiers bound to readFile / readFileSync, mapped to the original name. */
		const fsFunctionAliases = new Map();
		/** Local identifiers bound to an fs module namespace. */
		const fsNamespaces = new Set();

		function recordDestructured(pattern) {
			for (const property of pattern.properties) {
				if (
					property.type === 'Property' &&
					property.key.type === 'Identifier' &&
					FS_BUFFER_FUNCTIONS.has(property.key.name) &&
					property.value.type === 'Identifier'
				) {
					fsFunctionAliases.set(property.value.name, property.key.name);
				}
			}
		}

		function fsFunctionNameOf(callee) {
			if (callee.type === 'Identifier') {
				return fsFunctionAliases.get(callee.name);
			}
			if (
				callee.type !== 'MemberExpression' ||
				callee.computed ||
				callee.property.type !== 'Identifier'
			) {
				return undefined;
			}
			if (!FS_BUFFER_FUNCTIONS.has(callee.property.name)) return undefined;

			let object = callee.object;
			// fs.promises.readFile(...)
			if (
				object.type === 'MemberExpression' &&
				!object.computed &&
				object.property.type === 'Identifier' &&
				object.property.name === 'promises'
			) {
				object = object.object;
			}
			if (object.type === 'Identifier' && fsNamespaces.has(object.name)) {
				return callee.property.name;
			}
			return undefined;
		}

		return {
			ImportDeclaration(node) {
				if (!FS_MODULES.has(node.source.value)) return;
				for (const specifier of node.specifiers) {
					if (
						specifier.type === 'ImportSpecifier' &&
						specifier.imported.type === 'Identifier' &&
						FS_BUFFER_FUNCTIONS.has(specifier.imported.name)
					) {
						fsFunctionAliases.set(specifier.local.name, specifier.imported.name);
					} else if (
						specifier.type === 'ImportNamespaceSpecifier' ||
						specifier.type === 'ImportDefaultSpecifier'
					) {
						fsNamespaces.add(specifier.local.name);
					}
				}
			},

			VariableDeclarator(node) {
				if (!isRequireOf(node.init, FS_MODULES)) return;
				if (node.id.type === 'ObjectPattern') {
					recordDestructured(node.id);
				} else if (node.id.type === 'Identifier') {
					fsNamespaces.add(node.id.name);
				}
			},

			CallExpression(node) {
				const callee = node.callee;

				if (
					callee.type === 'MemberExpression' &&
					!callee.computed &&
					callee.property.type === 'Identifier' &&
					N8N_BUFFER_HELPERS.has(callee.property.name)
				) {
					context.report({
						node,
						messageId: 'binaryBuffer',
						data: { name: callee.property.name },
					});
					return;
				}

				const fsFunction = fsFunctionNameOf(callee);
				if (fsFunction) {
					context.report({ node, messageId: 'fileBuffer', data: { name: fsFunction } });
				}
			},
		};
	},
};
