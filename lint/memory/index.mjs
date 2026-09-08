import { noFullBinaryBuffer } from './rules/no-full-binary-buffer.mjs';
import { noModuleLevelMutableState } from './rules/no-module-level-mutable-state.mjs';
import { noUnboundedItemConcurrency } from './rules/no-unbounded-item-concurrency.mjs';
import { requireListenerCleanup } from './rules/require-listener-cleanup.mjs';

/**
 * ESLint rules that catch the code patterns behind most out-of-memory crashes
 * in community nodes. They are heuristics: they flag shapes that commonly
 * leak or load unbounded data, not proven leaks.
 *
 * The rules live outside `eslint.config.mjs` on purpose. That file has to stay
 * identical to the `@n8n/node-cli` default for the package to keep its n8n
 * Cloud eligibility, so these run through `eslint.memory.config.mjs` instead.
 */
export const memoryPlugin = {
	meta: { name: 'n8n-memory', version: '0.1.0' },
	rules: {
		'no-full-binary-buffer': noFullBinaryBuffer,
		'no-module-level-mutable-state': noModuleLevelMutableState,
		'no-unbounded-item-concurrency': noUnboundedItemConcurrency,
		'require-listener-cleanup': requireListenerCleanup,
	},
	configs: {},
};

memoryPlugin.configs.recommended = {
	plugins: { 'n8n-memory': memoryPlugin },
	rules: {
		'n8n-memory/no-full-binary-buffer': 'error',
		'n8n-memory/no-module-level-mutable-state': 'error',
		'n8n-memory/no-unbounded-item-concurrency': 'error',
		'n8n-memory/require-listener-cleanup': 'error',
	},
};
