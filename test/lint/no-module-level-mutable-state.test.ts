import { noModuleLevelMutableState } from '../../lint/memory/rules/no-module-level-mutable-state.mjs';
import { ruleTester } from './helpers';

ruleTester.run('no-module-level-mutable-state', noModuleLevelMutableState, {
	valid: [
		// Constants that are only read are fine.
		`const SUPPORTED = ['image/png'];
		 export function check(type: string) { return SUPPORTED.includes(type); }`,
		// Mutation at module level during setup is fine, it runs once.
		`const options = new Map<string, string>();
		 options.set('a', 'b');`,
		// Collections local to the function are released with it.
		`export async function execute() { const cache = new Map(); cache.set('k', 'v'); return cache; }`,
		// Workflow static data is n8n's sanctioned place for state.
		`export async function run(this: any) { const data = this.getWorkflowStaticData('node'); data.cursor = 'x'; }`,
		// WeakMap does not keep its keys alive.
		`const seen = new WeakMap<object, boolean>();
		 export function mark(item: object) { seen.set(item, true); }`,
		// A module-level function is not a container.
		`const helper = () => 1;
		 export function use() { return helper(); }`,
	],
	invalid: [
		{
			code: `const cache = new Map<string, unknown>();
			 export async function execute(id: string, value: unknown) { cache.set(id, value); }`,
			errors: [
				{
					messageId: 'moduleLevelMutation',
					data: { name: 'cache', mutation: 'grown with .set()' },
				},
			],
		},
		{
			code: `const seen: string[] = [];
			 export function record(id: string) { seen.push(id); }`,
			errors: [
				{
					messageId: 'moduleLevelMutation',
					data: { name: 'seen', mutation: 'grown with .push()' },
				},
			],
		},
		{
			code: `export const responses: Record<string, unknown> = {};
			 export function remember(id: string, body: unknown) { responses[id] = body; }`,
			errors: [
				{
					messageId: 'moduleLevelMutation',
					data: { name: 'responses', mutation: 'assigned a new entry' },
				},
			],
		},
		{
			code: `let buffered: string[] = [];
			 export function add(line: string) { buffered = [...buffered, line]; }`,
			errors: [
				{ messageId: 'moduleLevelMutation', data: { name: 'buffered', mutation: 'reassigned' } },
			],
		},
		{
			code: `const state = {};
			 export function merge(extra: object) { Object.assign(state, extra); }`,
			errors: [
				{
					messageId: 'moduleLevelMutation',
					data: { name: 'state', mutation: 'extended with Object.assign()' },
				},
			],
		},
		{
			// Nested arrow functions count as "inside a function" too.
			code: `const ids = new Set<string>();
			 export const handler = { run: (items: string[]) => items.forEach((item) => ids.add(item)) };`,
			errors: [
				{ messageId: 'moduleLevelMutation', data: { name: 'ids', mutation: 'grown with .add()' } },
			],
		},
	],
});
