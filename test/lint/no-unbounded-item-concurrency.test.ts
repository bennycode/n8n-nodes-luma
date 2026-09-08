import { noUnboundedItemConcurrency } from '../../lint/memory/rules/no-unbounded-item-concurrency.mjs';
import { ruleTester } from './helpers';

ruleTester.run('no-unbounded-item-concurrency', noUnboundedItemConcurrency, {
	valid: [
		// Sequential processing keeps one request in flight.
		`export async function execute(this: any) {
			const items = this.getInputData();
			for (const item of items) { await this.helpers.httpRequest(item.json); }
		}`,
		// A fixed, small set of parallel calls is not the problem this rule targets.
		`async function load(a: () => Promise<void>, b: () => Promise<void>) { await Promise.all([a(), b()]); }`,
		// Mapping a bounded batch is fine.
		`export async function execute(this: any) {
			const items = this.getInputData();
			for (let i = 0; i < items.length; i += 10) {
				const batch = items.slice(i, i + 10);
				await Promise.all(batch.map((item: any) => this.helpers.httpRequest(item.json)));
			}
		}`,
		// Arrays that are not the input items are out of scope.
		`async function run(urls: string[]) { await Promise.all(urls.map((url) => fetch(url))); }`,
	],
	invalid: [
		{
			code: `export async function execute(this: any) {
				const items = this.getInputData();
				await Promise.all(items.map((item: any) => this.helpers.httpRequest(item.json)));
			}`,
			errors: [{ messageId: 'unboundedConcurrency', data: { method: 'all' } }],
		},
		{
			code: `export async function execute(this: any) {
				await Promise.allSettled(this.getInputData().map((item: any) => this.helpers.httpRequest(item.json)));
			}`,
			errors: [{ messageId: 'unboundedConcurrency', data: { method: 'allSettled' } }],
		},
		{
			// Chained filter/map still fans out over all items.
			code: `export async function execute(this: any) {
				const items = this.getInputData();
				await Promise.all(items.filter((i: any) => i.json.id).map((item: any) => this.helpers.httpRequest(item.json)));
			}`,
			errors: [{ messageId: 'unboundedConcurrency', data: { method: 'all' } }],
		},
		{
			// postReceive hooks receive the items as a parameter.
			code: `export async function enrich(this: any, items: any[]) {
				return await Promise.all(items.map((item) => this.helpers.httpRequest({ url: item.json.url })));
			}`,
			errors: [{ messageId: 'unboundedConcurrency', data: { method: 'all' } }],
		},
	],
});
