import tseslint from 'typescript-eslint';
import { memoryPlugin } from './lint/memory/index.mjs';

/**
 * Memory-safety lint for node sources. Runs separately from `n8n-node lint`
 * because `eslint.config.mjs` must stay at the CLI default in strict mode.
 *
 *   npm run lint:memory
 */
export default [
	{ ignores: ['dist'] },
	{
		files: ['nodes/**/*.ts', 'credentials/**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			ecmaVersion: 2022,
			sourceType: 'module',
		},
		...memoryPlugin.configs.recommended,
	},
	{
		// Luma only accepts JPEG and PNG cover images, which are small, and the
		// pre-signed PUT needs a known Content-Length. In n8n's default in-memory
		// binary mode there is no stream to hand over anyway.
		files: ['nodes/Luma/shared/image.ts'],
		rules: { 'n8n-memory/no-full-binary-buffer': 'off' },
	},
];
