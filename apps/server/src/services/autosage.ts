/**
 * AutoSage API Client Service
 *
 * Wraps the AutoSage RAG-as-a-service API for:
 * - Knowledge Base CRUD
 * - Document upload (presign → PUT to S3)
 * - Chat create / send / stream / list messages
 */

import { AppError } from '../types/api';

// ─── Configuration ────────────────────────────────────────────────────────────

const AUTOSAGE_BASE_URL =
	process.env.AUTOSAGE_BASE_URL || 'https://alpha-api.autosage.ai';
const AUTOSAGE_API_KEY =
	process.env.AUTOSAGE_API_KEY || '';
const AUTOSAGE_TENANT_ID =
	process.env.AUTOSAGE_TENANT_ID || '';

// Default model used for all chat requests
const DEFAULT_MODEL = 'openai/gpt-5.4';

function getHeaders(): Record<string, string> {
	if (!AUTOSAGE_API_KEY) {
		throw new AppError('AUTOSAGE_API_KEY is not configured', 503, 'AUTOSAGE_CONFIG_ERROR');
	}
	return {
		Authorization: `Bearer ${AUTOSAGE_API_KEY}`,
		'Content-Type': 'application/json',
		Accept: 'application/json',
	};
}

async function autosageRequest<T>(
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const url = `${AUTOSAGE_BASE_URL}${path}`;

	let res: Response;
	try {
		res = await fetch(url, {
			method,
			headers: getHeaders(),
			body: body ? JSON.stringify(body) : undefined,
		});
	} catch (err) {
		throw new AppError(
			'Failed to reach AutoSage API',
			502,
			'AUTOSAGE_NETWORK_ERROR',
			{ message: err instanceof Error ? err.message : String(err) }
		);
	}

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new AppError(
			`AutoSage API returned ${res.status}`,
			502,
			'AUTOSAGE_API_ERROR',
			{ status: res.status, body: text.slice(0, 500), path }
		);
	}

	const text = await res.text();
	if (!text) return {} as T;

	try {
		return JSON.parse(text) as T;
	} catch {
		return text as unknown as T;
	}
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutosageKnowledgeBase = {
	id: string;
	name: string;
	tenantId?: string;
	description?: string;
	status?: string;
	createdAt?: string;
};

export type AutosagePresignResponse = {
	document_id: string;
	upload_url: string;
	s3_key?: string;
	expires_at?: string;
};

export type AutosageChat = {
	id: string;
	knowledge_base_id?: string;
	knowledgeBaseId?: string;
	tenant_id?: string;
	model?: string;
	title?: string;
	created_at?: string;
	createdAt?: string;
};

export type AutosageMessage = {
	id: string;
	chatId?: string;
	chat_id?: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	createdAt?: string;
	created_at?: string;
};

// ─── Prompts ──────────────────────────────────────────────────────────────────

const FINANCIAL_ANALYST_PERSONA = `You are a senior financial analyst specializing in equity research. You provide comprehensive, data-driven analysis of stocks using the market data, pricing history, and news articles available in your knowledge base.

Your analysis style:
- Lead with key metrics and price action
- Identify trends, support/resistance levels, and momentum indicators from the OHLCV data
- Assess news sentiment and its likely impact on the stock
- Provide balanced bull/bear cases
- Note risks and catalysts
- Use precise numbers from the data — never fabricate figures

When generating an initial research report, structure it as:
1. Executive Summary (2-3 sentences)
2. Price Analysis (current price, recent trend, key levels, volume analysis)
3. News Sentiment Analysis (summarize key themes from recent articles)
4. Technical Outlook (based on available price history)
5. Key Risks & Catalysts
6. Conclusion & Outlook

Always cite the data source when making claims.`;

const FINANCIAL_ANALYST_CUSTOM_PROMPT = `You have access to three types of documents in this knowledge base:
1. Historical + current pricing data (OHLCV bars and latest snapshot)
2. Historical news articles about this stock
3. Real-time/latest news articles

When answering questions:
- Cross-reference pricing data with news events to identify correlations
- If asked about price movements, always check the pricing data first
- For sentiment questions, analyze the news articles
- Provide specific dates, prices, and article references
- If the data doesn't contain the answer, say so clearly — don't guess`;

// ─── Knowledge Base Operations ────────────────────────────────────────────────

export async function createKnowledgeBase(
	symbol: string
): Promise<AutosageKnowledgeBase> {
	const name = `Stock Research: ${symbol.toUpperCase()}`;
	const description = `Comprehensive market research data for ${symbol.toUpperCase()} including pricing history, historical news, and real-time news updates.`;

	// Response shape: { knowledgeBase: {...}, message: "..." }
	const response = await autosageRequest<{ knowledgeBase: AutosageKnowledgeBase; message?: string }>(
		'POST',
		'/api/v1/knowledge-bases/',
		{
			tenant_id: AUTOSAGE_TENANT_ID,
			name,
			description,
			persona: FINANCIAL_ANALYST_PERSONA,
			customPrompt: FINANCIAL_ANALYST_CUSTOM_PROMPT,
		}
	);

	if (!response.knowledgeBase?.id) {
		throw new AppError(
			`AutoSage returned unexpected KB response: ${JSON.stringify(response).slice(0, 200)}`,
			502,
			'AUTOSAGE_KB_RESPONSE_ERROR'
		);
	}

	return response.knowledgeBase;
}

export async function getKnowledgeBase(
	kbId: string
): Promise<AutosageKnowledgeBase> {
	const response = await autosageRequest<{ knowledgeBase: AutosageKnowledgeBase }>(
		'GET',
		`/api/v1/knowledge-bases/${kbId}`
	);
	return response.knowledgeBase;
}

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
	await autosageRequest<void>('DELETE', `/api/v1/knowledge-bases/${kbId}`);
}

// ─── Document Upload ──────────────────────────────────────────────────────────

/**
 * Presign a document upload.
 * Required fields: kb_id, tenant_id, filename, mime_type, size_bytes
 */
export async function presignDocumentUpload(
	kbId: string,
	fileName: string,
	content: string,
	mimeType: string = 'text/plain'
): Promise<AutosagePresignResponse> {
	const sizeBytes = Buffer.byteLength(content, 'utf-8');

	return autosageRequest<AutosagePresignResponse>(
		'POST',
		'/api/v1/documents/presign',
		{
			kb_id: kbId,
			tenant_id: AUTOSAGE_TENANT_ID,
			filename: fileName,
			mime_type: mimeType,
			size_bytes: sizeBytes,
		}
	);
}

/**
 * Upload file content to the presigned S3 URL.
 */
export async function uploadToPresignedUrl(
	uploadUrl: string,
	content: string,
	contentType: string = 'text/plain'
): Promise<void> {
	let res: Response;
	try {
		res = await fetch(uploadUrl, {
			method: 'PUT',
			headers: { 'Content-Type': contentType },
			body: content,
		});
	} catch (err) {
		throw new AppError(
			'Failed to upload document to S3',
			502,
			'AUTOSAGE_UPLOAD_ERROR',
			{ message: err instanceof Error ? err.message : String(err) }
		);
	}

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new AppError(
			`S3 upload returned ${res.status}`,
			502,
			'AUTOSAGE_S3_ERROR',
			{ status: res.status, body: text.slice(0, 300) }
		);
	}
}

/**
 * Full flow: presign → upload content → return document_id.
 */
export async function uploadDocument(
	kbId: string,
	fileName: string,
	content: string,
	mimeType: string = 'text/plain'
): Promise<string> {
	const presign = await presignDocumentUpload(kbId, fileName, content, mimeType);
	await uploadToPresignedUrl(presign.upload_url, content, mimeType);
	return presign.document_id;
}

// ─── Document Status & Polling ────────────────────────────────────────────────

export type AutosageDocumentStatus =
	| 'pending_upload'
	| 'queued'
	| 'processing'
	| 'processed'
	| 'failed'
	| 'deleted';

export type AutosageDocumentStatusResponse = {
	document_id: string;
	filename?: string;
	status: AutosageDocumentStatus;
	is_processing: boolean;
	created_at?: string;
	processed_at?: string | null;
};

/**
 * Fetch the processing status of a single document from AutoSage.
 */
export async function getDocumentStatus(
	documentId: string
): Promise<AutosageDocumentStatusResponse> {
	return autosageRequest<AutosageDocumentStatusResponse>(
		'GET',
		`/api/v1/documents/status?document_id=${documentId}`
	);
}

/**
 * Poll a list of document IDs until all reach 'processed' (or any fail).
 *
 * @param documentIds  IDs returned from presignDocumentUpload
 * @param intervalMs   How often to poll (default 5 s)
 * @param timeoutMs    Give up after this long (default 5 min)
 */
export async function pollDocumentsReady(
	documentIds: string[],
	intervalMs = 5_000,
	timeoutMs = 5 * 60_000
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	const pending = new Set(documentIds);

	while (pending.size > 0) {
		if (Date.now() > deadline) {
			throw new AppError(
				`Timed out waiting for documents to be processed: ${[...pending].join(', ')}`,
				502,
				'AUTOSAGE_DOCUMENT_TIMEOUT'
			);
		}

		// Check all pending docs in parallel
		const results = await Promise.all(
			[...pending].map((id) => getDocumentStatus(id))
		);

		for (const doc of results) {
			if (doc.status === 'processed') {
				pending.delete(doc.document_id);
			} else if (doc.status === 'failed' || doc.status === 'deleted') {
				throw new AppError(
					`Document ${doc.document_id} (${doc.filename ?? 'unknown'}) entered status: ${doc.status}`,
					502,
					'AUTOSAGE_DOCUMENT_FAILED'
				);
			}
			// pending_upload | queued | processing → keep waiting
		}

		if (pending.size > 0) {
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
	}
}

// ─── Chat Operations ──────────────────────────────────────────────────────────

/**
 * Create a new chat session.
 * Response shape: { chat: {...}, response: {...} }
 * Initial message field: "message" (not "initial_message")
 */
export async function createChat(
	chatId: string,
	kbId: string,
	initialMessage?: string
): Promise<AutosageChat> {
	const body: Record<string, unknown> = {
		id: chatId,
		knowledge_base_id: kbId,
		tenant_id: AUTOSAGE_TENANT_ID,
		model: DEFAULT_MODEL,
		agent_mode: 'quick',
	};

	if (initialMessage) {
		body.message = initialMessage;
	}

	const response = await autosageRequest<{ chat: AutosageChat; response?: unknown }>(
		'POST',
		'/api/v1/chats/',
		body
	);

	if (!response.chat?.id) {
		throw new AppError(
			`AutoSage returned unexpected chat response: ${JSON.stringify(response).slice(0, 200)}`,
			502,
			'AUTOSAGE_CHAT_RESPONSE_ERROR'
		);
	}

	return response.chat;
}

/**
 * Send a message to an existing chat.
 * Response shape: { user_message: {...}, assistant_message: {...}, usage: {...} }
 * Required fields: content, model
 */
export async function sendMessage(
	chatId: string,
	message: string
): Promise<AutosageMessage> {
	const response = await autosageRequest<{
		user_message?: AutosageMessage;
		assistant_message?: AutosageMessage;
		usage?: unknown;
	}>(
		'POST',
		`/api/v1/chats/${chatId}/messages`,
		{
			content: message,
			model: DEFAULT_MODEL,
			agent_mode: 'quick',
		}
	);

	const assistantMsg = response.assistant_message;
	if (!assistantMsg) {
		throw new AppError(
			`AutoSage message response missing assistant_message: ${JSON.stringify(response).slice(0, 200)}`,
			502,
			'AUTOSAGE_MESSAGE_RESPONSE_ERROR'
		);
	}

	return assistantMsg;
}

/**
 * Stream a message response via SSE.
 * Required fields: content, model
 */
export async function streamMessage(
	chatId: string,
	message: string
): Promise<Response> {
	const url = `${AUTOSAGE_BASE_URL}/api/v1/chats/${chatId}/messages/stream`;

	let res: Response;
	try {
		res = await fetch(url, {
			method: 'POST',
			headers: {
				...getHeaders(),
				Accept: 'text/event-stream',
			},
		body: JSON.stringify({
			content: message,
			model: DEFAULT_MODEL,
			agent_mode: 'quick',
		}),
	});
	} catch (err) {
		throw new AppError(
			'Failed to stream message from AutoSage',
			502,
			'AUTOSAGE_STREAM_ERROR',
			{ message: err instanceof Error ? err.message : String(err) }
		);
	}

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new AppError(
			`AutoSage stream returned ${res.status}`,
			502,
			'AUTOSAGE_STREAM_ERROR',
			{ status: res.status, body: text.slice(0, 300) }
		);
	}

	return res;
}

/**
 * Get all messages for a chat.
 * Response shape: { messages: [...], chat: {...} }
 */
export async function getChatMessages(
	chatId: string
): Promise<AutosageMessage[]> {
	const result = await autosageRequest<{ messages?: AutosageMessage[]; chat?: unknown }>(
		'GET',
		`/api/v1/chats/${chatId}/messages`
	);
	return result.messages || [];
}
