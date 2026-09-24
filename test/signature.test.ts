import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseSignatureHeader, verifyLumaSignature } from '../nodes/LumaTrigger/signature';

const secret = 'whsec_test_secret';
const body = JSON.stringify({ type: 'guest.registered', data: { id: 'gst-1' } });
const now = 1_700_000_000;

function sign(timestamp: number, payload = body, key = secret): string {
	const digest = createHmac('sha256', key).update(`${timestamp}.${payload}`).digest('hex');
	return `t=${timestamp},v1=${digest}`;
}

describe('parseSignatureHeader', () => {
	it('reads timestamp and signature', () => {
		expect(parseSignatureHeader('t=123,v1=abc')).toEqual({ timestamp: '123', signature: 'abc' });
	});

	it('rejects malformed headers', () => {
		expect(parseSignatureHeader(undefined)).toBeUndefined();
		expect(parseSignatureHeader('v1=abc')).toBeUndefined();
		expect(parseSignatureHeader('nonsense')).toBeUndefined();
	});
});

describe('verifyLumaSignature', () => {
	it('accepts a valid signature', () => {
		expect(
			verifyLumaSignature({ secret, rawBody: body, signatureHeader: sign(now), nowSeconds: now }),
		).toBe(true);
	});

	it('accepts a Buffer body', () => {
		expect(
			verifyLumaSignature({
				secret,
				rawBody: Buffer.from(body),
				signatureHeader: sign(now),
				nowSeconds: now + 60,
			}),
		).toBe(true);
	});

	it('rejects a tampered body', () => {
		expect(
			verifyLumaSignature({
				secret,
				rawBody: body.replace('gst-1', 'gst-2'),
				signatureHeader: sign(now),
				nowSeconds: now,
			}),
		).toBe(false);
	});

	it('rejects a wrong secret', () => {
		expect(
			verifyLumaSignature({
				secret: 'whsec_other',
				rawBody: body,
				signatureHeader: sign(now),
				nowSeconds: now,
			}),
		).toBe(false);
	});

	it('rejects old deliveries', () => {
		expect(
			verifyLumaSignature({
				secret,
				rawBody: body,
				signatureHeader: sign(now - 301),
				nowSeconds: now,
			}),
		).toBe(false);
	});

	it('rejects a missing header', () => {
		expect(verifyLumaSignature({ secret, rawBody: body, signatureHeader: undefined })).toBe(false);
	});
});
