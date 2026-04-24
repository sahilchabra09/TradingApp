/**
 * AI Research API Client
 * Mirrors the server's /api/ai-research routes.
 */

type TokenGetter = () => Promise<string | null>;

type ApiEnvelope<T> = {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	code?: string;
};

const API_BASE_URL = (process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3004').replace(
	/\/+$/,
	''
);

async function aiResearchRequest<T>(
	path: string,
	tokenGetter: TokenGetter,
	init: RequestInit = {}
): Promise<T> {
	const url = `${API_BASE_URL}${path}`;
	const token = await tokenGetter();

	if (!token) throw new Error('Please sign in to access AI Research.');

	const res = await fetch(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'ngrok-skip-browser-warning': '1',
			Authorization: `Bearer ${token}`,
			...(init.headers || {}),
		},
	});

	const rawText = await res.text();
	let payload: ApiEnvelope<T>;
	try {
		payload = JSON.parse(rawText) as ApiEnvelope<T>;
	} catch {
		throw new Error(
			`Server returned invalid response (status ${res.status}). ` +
				'If using ngrok, ensure the tunnel is active.'
		);
	}

	if (!res.ok || !payload.success || payload.data === undefined) {
		throw new Error(payload.error || payload.message || 'AI Research request failed.');
	}

	return payload.data;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type KBStatus =
	| 'not_started'
	| 'creating'
	| 'uploading'
	| 'processing'
	| 'ready'
	| 'error';

export type KBListItem = {
	symbol: string;
	status: KBStatus;
	knowledgeBaseId: string;
	lastUpdatedAt: string | null;
	errorMessage: string | null;
};

export type InitResearchResponse = {
	symbol: string;
	status: KBStatus;
	knowledgeBaseId: string;
	autosageKbId: string;
	lastFullUpdateAt: string | null;
	lastNewsUpdateAt: string | null;
	errorMessage: string | null;
};

export type ResearchStatusResponse = {
	symbol: string;
	status: KBStatus;
	knowledgeBaseId: string | null;
	autosageKbId?: string;
	lastFullUpdateAt?: string | null;
	lastNewsUpdateAt?: string | null;
	errorMessage?: string | null;
};

export type CreateChatResponse = {
	chatId: string;
	autosageChatId: string;
	symbol: string;
	title: string | null;
	isExisting: boolean;
};

export type ChatMessage = {
	id: string;
	chat_id: string;
	role: 'user' | 'assistant';
	content: string;
	created_at?: string;
};

export type ChatMessagesResponse = {
	chatId: string;
	symbol: string;
	messages: ChatMessage[];
};

export type ChatListItem = {
	chatId: string;
	autosageChatId: string;
	symbol: string;
	title: string | null;
	createdAt: string;
};

export type ChatsListResponse = {
	symbol: string;
	chats: ChatListItem[];
};

export type AllChatsResponse = {
	chats: ChatListItem[];
};

export type KnowledgeBasesResponse = {
	knowledgeBases: KBListItem[];
};

export type SyncMessageResponse = ChatMessage;

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Initialize research for a symbol. Creates/reuses the shared KB.
 */
export function initResearch(
	symbol: string,
	tokenGetter: TokenGetter
): Promise<InitResearchResponse> {
	return aiResearchRequest<InitResearchResponse>(
		'/api/ai-research/init',
		tokenGetter,
		{
			method: 'POST',
			body: JSON.stringify({ symbol: symbol.trim().toUpperCase() }),
		}
	);
}

/**
 * Check KB status for a symbol.
 */
export function getResearchStatus(
	symbol: string,
	tokenGetter: TokenGetter
): Promise<ResearchStatusResponse> {
	return aiResearchRequest<ResearchStatusResponse>(
		`/api/ai-research/status/${encodeURIComponent(symbol.trim().toUpperCase())}`,
		tokenGetter
	);
}

/**
 * Create a new chat for the current user + symbol.
 * If one already exists, returns the existing chat.
 */
export function createResearchChat(
	symbol: string,
	tokenGetter: TokenGetter
): Promise<CreateChatResponse> {
	return aiResearchRequest<CreateChatResponse>(
		'/api/ai-research/chat',
		tokenGetter,
		{
			method: 'POST',
			body: JSON.stringify({ symbol: symbol.trim().toUpperCase() }),
		}
	);
}

/**
 * Get all messages for a chat.
 */
export function getChatMessages(
	chatId: string,
	tokenGetter: TokenGetter
): Promise<ChatMessagesResponse> {
	return aiResearchRequest<ChatMessagesResponse>(
		`/api/ai-research/chat/${encodeURIComponent(chatId)}/messages`,
		tokenGetter
	);
}

/**
 * Send a message (non-streaming). Returns the assistant response.
 */
export function sendChatMessageSync(
	chatId: string,
	message: string,
	tokenGetter: TokenGetter
): Promise<SyncMessageResponse> {
	return aiResearchRequest<SyncMessageResponse>(
		`/api/ai-research/chat/${encodeURIComponent(chatId)}/message/sync`,
		tokenGetter,
		{
			method: 'POST',
			body: JSON.stringify({ message }),
		}
	);
}

/**
 * Send a message with streaming (SSE). Returns the raw fetch Response.
 */
export async function sendChatMessageStream(
	chatId: string,
	message: string,
	tokenGetter: TokenGetter
): Promise<Response> {
	const url = `${API_BASE_URL}/api/ai-research/chat/${encodeURIComponent(chatId)}/message`;
	const token = await tokenGetter();

	if (!token) throw new Error('Please sign in to access AI Research.');

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'text/event-stream',
			'ngrok-skip-browser-warning': '1',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ message }),
	});

	if (!res.ok) {
		const text = await res.text();
		let errorMsg = 'Streaming request failed.';
		try {
			const parsed = JSON.parse(text);
			errorMsg = parsed.error || parsed.message || errorMsg;
		} catch {}
		throw new Error(errorMsg);
	}

	return res;
}

/**
 * List all chats for the current user across all symbols.
 */
export function listAllChats(
	tokenGetter: TokenGetter
): Promise<AllChatsResponse> {
	return aiResearchRequest<AllChatsResponse>(
		'/api/ai-research/chats',
		tokenGetter
	);
}

/**
 * List all available knowledge bases (stocks with research data).
 */
export function listKnowledgeBases(
	tokenGetter: TokenGetter
): Promise<KnowledgeBasesResponse> {
	return aiResearchRequest<KnowledgeBasesResponse>(
		'/api/ai-research/knowledge-bases',
		tokenGetter
	);
}

/**
 * List all chats the current user has for a given symbol.
 */
export function listChatsForSymbol(
	symbol: string,
	tokenGetter: TokenGetter
): Promise<ChatsListResponse> {
	return aiResearchRequest<ChatsListResponse>(
		`/api/ai-research/chats/${encodeURIComponent(symbol.trim().toUpperCase())}`,
		tokenGetter
	);
}
