import { createHmac, timingSafeEqual } from 'node:crypto';

/** Deliveries older than this are treated as replays, as Luma's documentation recommends. */
export const MAX_TIMESTAMP_AGE_SECONDS = 300;

type ParsedSignature = {
	timestamp: string;
	signature: string;
};

/** Parses `t=<unix seconds>,v1=<hex digest>` from the `Webhook-Signature` header. */
export function parseSignatureHeader(header: unknown): ParsedSignature | undefined {
	if (typeof header !== 'string') return undefined;

	const parts = new Map<string, string>();
	for (const part of header.split(',')) {
		const separator = part.indexOf('=');
		if (separator === -1) continue;
		parts.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
	}

	const timestamp = parts.get('t');
	const signature = parts.get('v1');
	if (!timestamp || !signature) return undefined;
	return { timestamp, signature };
}

type VerifyOptions = {
	secret: string;
	rawBody: Buffer | string;
	signatureHeader: unknown;
	/** Current time in seconds, injectable for tests */
	nowSeconds?: number;
};

/**
 * Verifies a Luma webhook delivery. Luma signs `${timestamp}.${rawBody}` with
 * HMAC-SHA256 using the secret returned when the webhook was created.
 */
export function verifyLumaSignature({
	secret,
	rawBody,
	signatureHeader,
	nowSeconds = Math.floor(Date.now() / 1000),
}: VerifyOptions): boolean {
	const parsed = parseSignatureHeader(signatureHeader);
	if (!parsed) return false;

	const timestamp = Number(parsed.timestamp);
	if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_AGE_SECONDS) {
		return false;
	}

	const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
	const expected = createHmac('sha256', secret)
		.update(`${parsed.timestamp}.`)
		.update(body)
		.digest('hex');

	const expectedBuffer = Buffer.from(expected, 'hex');
	const actualBuffer = Buffer.from(parsed.signature, 'hex');
	return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
