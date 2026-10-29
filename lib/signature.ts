import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies the X-Zonna-Signature header (t=<unix>,v1=<hex>) of a ZonnaGPS webhook:
 * HMAC-SHA256 of "t.raw_body" with the secret, constant-time comparison, and a timestamp
 * tolerance (five minutes by default).
 */
export function verifyZonnaSignature(rawBody: string | Buffer, header: string | undefined, secret: string, toleranceSeconds = 300, now = Date.now()): boolean {
	if (!header || !secret) return false;
	const parts: Record<string, string> = {};
	for (const piece of header.split(',')) {
		const [key, ...rest] = piece.split('=');
		if (key) parts[key.trim()] = rest.join('=').trim();
	}
	const timestamp = Number(parts.t);
	if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;
	const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
	const expected = createHmac('sha256', secret).update(`${parts.t}.`).update(body).digest('hex');
	const given = parts.v1 ?? '';
	return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function apiBase(baseUrl: string | undefined): string {
	return `${(baseUrl || 'https://app.zonnagps.es').replace(/\/+$/, '')}/api/public/v1`;
}
