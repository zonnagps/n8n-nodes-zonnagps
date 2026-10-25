import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Comprueba la cabecera X-Zonna-Signature (t=<unix>,v1=<hex>) de un webhook de ZonnaGPS:
 * HMAC-SHA256 de «t.cuerpo_original» con el secreto, comparación en tiempo constante y marca de
 * tiempo con una tolerancia (por defecto cinco minutos).
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
