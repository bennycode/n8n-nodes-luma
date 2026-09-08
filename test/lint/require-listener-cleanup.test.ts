import { requireListenerCleanup } from '../../lint/memory/rules/require-listener-cleanup.mjs';
import { ruleTester } from './helpers';

ruleTester.run('require-listener-cleanup', requireListenerCleanup, {
	valid: [
		// Interval cleared in closeFunction.
		`export class PollTrigger {
			async trigger(this: any) {
				const timer = setInterval(() => this.emit([]), 1000);
				return { closeFunction: async () => { clearInterval(timer); } };
			}
		}`,
		// Listener removed in closeFunction.
		`export class StreamTrigger {
			async trigger(this: any) {
				const client = createClient();
				const onMessage = (m: unknown) => this.emit([m]);
				client.on('message', onMessage);
				async function closeFunction() { client.off('message', onMessage); }
				return { closeFunction };
			}
		}`,
		// Closing the client releases everything registered on it.
		`export class StreamTrigger {
			async trigger(this: any) {
				const client = createClient();
				client.on('message', (m: unknown) => this.emit([m]));
				return { closeFunction: async () => { await client.close(); } };
			}
		}`,
		// Webhook triggers register nothing in-process.
		`export class WebhookTrigger {
			async webhook(this: any) { return { workflowData: [] }; }
		}`,
		// A trigger without registrations needs no cleanup.
		`export class ManualTrigger {
			async trigger(this: any) { return { manualTriggerFunction: async () => this.emit([]) }; }
		}`,
		// Registrations outside trigger() are not this rule's business.
		`export function attach(client: any) { client.on('data', () => {}); }`,
	],
	invalid: [
		{
			code: `export class PollTrigger {
				async trigger(this: any) {
					setInterval(() => this.emit([]), 1000);
					return {};
				}
			}`,
			errors: [{ messageId: 'missingCloseFunction', data: { name: 'setInterval' } }],
		},
		{
			code: `export class PollTrigger {
				async trigger(this: any) {
					const timer = setInterval(() => this.emit([]), 1000);
					return { closeFunction: async () => { this.logger.info('bye'); } };
				}
			}`,
			errors: [
				{ messageId: 'missingCleanup', data: { name: 'setInterval', cleanup: 'clearInterval' } },
			],
		},
		{
			code: `export class StreamTrigger {
				async trigger(this: any) {
					const client = createClient();
					client.on('message', (m: unknown) => this.emit([m]));
					client.addEventListener('error', () => {});
					return { closeFunction: async () => {} };
				}
			}`,
			errors: [
				{
					messageId: 'missingCleanup',
					data: { name: 'on', cleanup: 'off / removeListener / removeAllListeners' },
				},
				{
					messageId: 'missingCleanup',
					data: { name: 'addEventListener', cleanup: 'removeEventListener' },
				},
			],
		},
		{
			// Object-literal trigger definitions are checked too.
			code: `export const node = {
				trigger: async function (this: any) {
					const sub = bus.subscribe('topic', () => this.emit([]));
					return { closeFunction: async () => {} };
				},
			};`,
			errors: [
				{ messageId: 'missingCleanup', data: { name: 'subscribe', cleanup: 'unsubscribe' } },
			],
		},
	],
});
