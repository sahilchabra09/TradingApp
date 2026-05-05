/**
 * User API client
 * Mirrors the server's /api/v1/users routes.
 */

type TokenGetter = () => Promise<string | null>;

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
		throw new Error(payload.error || payload.message || 'Request failed.');
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
