/**
 * User API client
 * Mirrors the server's /api/v1/users routes.
 */

type TokenGetter = () => Promise<string | null>;

/** Safely extract a human-readable message from an unknown error value.
 *  Handles infrastructure errors (e.g. Vercel) that return `error` as an
 *  object instead of a plain string, which would otherwise produce "[object Object]".
 */
function extractErrorMessage(val: unknown, fallback: string): string {
	if (typeof val === 'string' && val.length > 0) return val;
	if (val !== null && typeof val === 'object') {
		const msg = (val as Record<string, unknown>).message;
		if (typeof msg === 'string' && msg.length > 0) return msg;
	}
	return fallback;
}

const API_BASE_URL = (process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3004').replace(
	/\/+$/,
	''
);

type ApiEnvelope<T> = {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
};

async function userRequest<T>(
	path: string,
	tokenGetter: TokenGetter,
	init: RequestInit = {}
): Promise<T> {
	const token = await tokenGetter();
	if (!token) throw new Error('Not authenticated.');

	const res = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'ngrok-skip-browser-warning': '1',
			Authorization: `Bearer ${token}`,
			...(init.headers ?? {}),
		},
	});

	const rawText = await res.text();
	let payload: ApiEnvelope<T>;
	try {
		payload = JSON.parse(rawText) as ApiEnvelope<T>;
	} catch {
		throw new Error(`Server returned invalid response (status ${res.status}).`);
	}

	if (!res.ok || !payload.success) {
		throw new Error(extractErrorMessage(payload.error, extractErrorMessage(payload.message, 'Request failed.')));
	}

	return payload.data as T;
}

/**
 * Permanently deletes the authenticated user's account from the database
 * and from Clerk. This is irreversible.
 */
export function deleteAccount(tokenGetter: TokenGetter): Promise<null> {
	return userRequest<null>('/api/v1/users/account', tokenGetter, { method: 'DELETE' });
}
