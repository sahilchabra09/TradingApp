/**
 * AI Research Routes
 *
 * POST   /init                   — Initialize research for a symbol (create/reuse KB, upload data)
 * GET    /status/:symbol         — Check KB status for a symbol
 * POST   /chat                   — Create a new chat for current user + symbol
 * POST   /chat/:chatId/message   — Send message & stream response (SSE)
 * GET    /chat/:chatId/messages  — Get all messages for a chat
 * GET    /chats/:symbol          — List user's chats for a symbol
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, eq, and } from '../db';
import { aiResearchKnowledgeBases, aiResearchChats } from '../db/schema';
import { requireAuth } from '../middleware/clerk-auth';
import { ResponseHelper } from '../utils/response';
import { AppError, NotFoundError, ValidationError } from '../types/api';
import * as autosage from '../services/autosage';
import {
	buildPricingDocument,
	buildHistoricalNewsDocument,
	buildRealtimeNewsDocument,
} from '../services/ai-research-data';

const aiResearchRoutes = new Hono();

// All routes require authentication
aiResearchRoutes.use('*', requireAuth);

// ─── Constants ────────────────────────────────────────────────────────────────

/** 30 minutes in milliseconds — news refresh threshold */
const NEWS_FRESHNESS_MS = 30 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNewsFresh(lastNewsUpdateAt: Date | null): boolean {
	if (!lastNewsUpdateAt) return false;
	return Date.now() - lastNewsUpdateAt.getTime() < NEWS_FRESHNESS_MS;
}

/**
 * Get or create the shared KB for a symbol.
 * Handles the full pipeline: create KB → upload 3 docs → mark ready.
 */
async function ensureKnowledgeBase(symbol: string) {
	const sym = symbol.toUpperCase();

	// Check if KB already exists
	let kb = await db.query.aiResearchKnowledgeBases.findFirst({
		where: eq(aiResearchKnowledgeBases.symbol, sym),
	});

	if (kb && kb.status === 'ready' && isNewsFresh(kb.lastNewsUpdateAt)) {
		// KB is ready and news is fresh — nothing to do
		return kb;
	}

	if (kb && kb.status === 'ready' && !isNewsFresh(kb.lastNewsUpdateAt)) {
		// KB is ready but news is stale — refresh only real-time news
		try {
			const realtimeNews = await buildRealtimeNewsDocument(sym);
			const newDocId = await autosage.uploadDocument(
				kb.autosageKbId,
				`${sym}_realtime_news.txt`,
				realtimeNews
			);

			const [updated] = await db
				.update(aiResearchKnowledgeBases)
				.set({
					realtimeNewsDocId: newDocId,
					lastNewsUpdateAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(aiResearchKnowledgeBases.id, kb.id))
				.returning();

			return updated;
		} catch (err) {
			console.error(`[AI Research] Failed to refresh news for ${sym}:`, err);
			// Return existing KB even if refresh fails
			return kb;
		}
	}

	if (kb && (kb.status === 'creating' || kb.status === 'uploading' || kb.status === 'processing')) {
		// KB is in progress — return current state
		return kb;
	}

	if (kb && kb.status === 'error') {
		// Previous attempt failed — delete and retry
		try {
			await db.delete(aiResearchKnowledgeBases).where(eq(aiResearchKnowledgeBases.id, kb.id));
		} catch { /* ignore */ }
		kb = undefined;
	}

	// ── Create new KB ─────────────────────────────────────────────────────────
	if (!kb) {
		// Create in AutoSage
		const autosageKb = await autosage.createKnowledgeBase(sym);

		const [newKb] = await db
			.insert(aiResearchKnowledgeBases)
			.values({
				symbol: sym,
				autosageKbId: autosageKb.id,
				autosageKbName: autosageKb.name,
				status: 'uploading',
			})
			.returning();

		kb = newKb;
	}

	// ── Upload documents (async — don't block the response) ───────────────────
	// We run this in the background so the user gets a quick response
	uploadDocumentsInBackground(kb.id, kb.autosageKbId, sym).catch((err) => {
		console.error(`[AI Research] Background upload failed for ${sym}:`, err);
	});

	return kb;
}

/**
 * Background document upload pipeline.
 * Uploads all 3 docs, then polls AutoSage until every document
 * reaches 'processed' status before marking the KB as ready.
 */
async function uploadDocumentsInBackground(
	kbRecordId: string,
	autosageKbId: string,
	symbol: string
): Promise<void> {
	try {
		// Build all 3 documents in parallel
		const [pricingDoc, historicalNewsDoc, realtimeNewsDoc] = await Promise.all([
			buildPricingDocument(symbol),
			buildHistoricalNewsDocument(symbol),
			buildRealtimeNewsDocument(symbol),
		]);

		await db
			.update(aiResearchKnowledgeBases)
			.set({ status: 'uploading', updatedAt: new Date() })
			.where(eq(aiResearchKnowledgeBases.id, kbRecordId));

		// Upload all 3 documents to AutoSage S3
		const [pricingDocId, historicalNewsDocId, realtimeNewsDocId] = await Promise.all([
			autosage.uploadDocument(autosageKbId, `${symbol}_pricing.txt`, pricingDoc),
			autosage.uploadDocument(autosageKbId, `${symbol}_historical_news.txt`, historicalNewsDoc),
			autosage.uploadDocument(autosageKbId, `${symbol}_realtime_news.txt`, realtimeNewsDoc),
		]);

		// Save doc IDs and flip status to 'processing' so the frontend knows
		// the files are uploaded and AutoSage is indexing them
		await db
			.update(aiResearchKnowledgeBases)
			.set({
				status: 'processing',
				pricingDocId,
				historicalNewsDocId,
				realtimeNewsDocId,
				updatedAt: new Date(),
			})
			.where(eq(aiResearchKnowledgeBases.id, kbRecordId));

		console.log(`[AI Research] Waiting for AutoSage to process documents for ${symbol}…`);

		// Poll AutoSage until all 3 documents are fully indexed (status: 'processed')
		// Polls every 5 s, gives up after 5 minutes
		await autosage.pollDocumentsReady([pricingDocId, historicalNewsDocId, realtimeNewsDocId]);

		// All documents are indexed — mark KB ready
		await db
			.update(aiResearchKnowledgeBases)
			.set({
				status: 'ready',
				lastFullUpdateAt: new Date(),
				lastNewsUpdateAt: new Date(),
				errorMessage: null,
				updatedAt: new Date(),
			})
			.where(eq(aiResearchKnowledgeBases.id, kbRecordId));

		console.log(`[AI Research] KB ready for ${symbol}`);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error during upload';
		console.error(`[AI Research] Upload pipeline failed for ${symbol}:`, message);

		await db
			.update(aiResearchKnowledgeBases)
			.set({
				status: 'error',
				errorMessage: message,
				updatedAt: new Date(),
			})
			.where(eq(aiResearchKnowledgeBases.id, kbRecordId));
	}
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /init
 * Initialize AI research for a stock symbol.
 * Creates/reuses the shared KB, returns current status.
 */
aiResearchRoutes.post('/init', async (c) => {
	const body = await c.req.json();
	const schema = z.object({ symbol: z.string().min(1).max(32) });
	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		throw new ValidationError('Invalid symbol', { errors: parsed.error.flatten() });
	}

	const { symbol } = parsed.data;
	const kb = await ensureKnowledgeBase(symbol);

	return ResponseHelper.success(c, {
		symbol: kb.symbol,
		status: kb.status,
		knowledgeBaseId: kb.id,
		autosageKbId: kb.autosageKbId,
		lastFullUpdateAt: kb.lastFullUpdateAt?.toISOString() || null,
		lastNewsUpdateAt: kb.lastNewsUpdateAt?.toISOString() || null,
		errorMessage: kb.errorMessage,
	});
});

/**
 * GET /status/:symbol
 * Check KB status for a given symbol.
 */
aiResearchRoutes.get('/status/:symbol', async (c) => {
	const symbol = c.req.param('symbol').toUpperCase();

	const kb = await db.query.aiResearchKnowledgeBases.findFirst({
		where: eq(aiResearchKnowledgeBases.symbol, symbol),
	});

	if (!kb) {
		return ResponseHelper.success(c, {
			symbol,
			status: 'not_started',
			knowledgeBaseId: null,
		});
	}

	return ResponseHelper.success(c, {
		symbol: kb.symbol,
		status: kb.status,
		knowledgeBaseId: kb.id,
		autosageKbId: kb.autosageKbId,
		lastFullUpdateAt: kb.lastFullUpdateAt?.toISOString() || null,
		lastNewsUpdateAt: kb.lastNewsUpdateAt?.toISOString() || null,
		errorMessage: kb.errorMessage,
	});
});

/**
 * POST /chat
 * Create a new chat for the current user + symbol.
 * Sends the initial research prompt to generate a report.
 */
aiResearchRoutes.post('/chat', async (c) => {
	const userId = c.get('userId');
	const body = await c.req.json();

	const schema = z.object({
		symbol: z.string().min(1).max(32),
	});
	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		throw new ValidationError('Invalid request', { errors: parsed.error.flatten() });
	}

	const symbol = parsed.data.symbol.toUpperCase();

	// Find the KB for this symbol
	const kb = await db.query.aiResearchKnowledgeBases.findFirst({
		where: eq(aiResearchKnowledgeBases.symbol, symbol),
	});

	if (!kb || kb.status !== 'ready') {
		throw new AppError(
			`Knowledge base for ${symbol} is not ready. Current status: ${kb?.status || 'not_started'}`,
			400,
			'KB_NOT_READY'
		);
	}

	// Check if user already has a chat for this KB
	const existingChat = await db.query.aiResearchChats.findFirst({
		where: and(
			eq(aiResearchChats.userId, userId),
			eq(aiResearchChats.knowledgeBaseId, kb.id)
		),
	});

	if (existingChat) {
		return ResponseHelper.success(c, {
			chatId: existingChat.id,
			autosageChatId: existingChat.autosageChatId,
			symbol: existingChat.symbol,
			title: existingChat.title,
			isExisting: true,
		});
	}

	// Create a new chat in AutoSage (no initial message — the client sends it after entering the chat)
	const chatUuid = uuidv4();

	const autosageChat = await autosage.createChat(
		chatUuid,
		kb.autosageKbId
		// no initialPrompt: client auto-sends it once it enters the ready state
	);

	// Save to our DB
	const [chat] = await db
		.insert(aiResearchChats)
		.values({
			userId,
			knowledgeBaseId: kb.id,
			symbol,
			autosageChatId: autosageChat.id || chatUuid,
			title: `${symbol} Research Report`,
		})
		.returning();

	return ResponseHelper.created(c, {
		chatId: chat.id,
		autosageChatId: chat.autosageChatId,
		symbol: chat.symbol,
		title: chat.title,
		isExisting: false,
	});
});

/**
 * POST /chat/:chatId/message
 * Send a follow-up message and stream the response via SSE.
 */
aiResearchRoutes.post('/chat/:chatId/message', async (c) => {
	const userId = c.get('userId');
	const chatId = c.req.param('chatId');

	const body = await c.req.json();
	const schema = z.object({ message: z.string().min(1).max(5000) });
	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		throw new ValidationError('Invalid message', { errors: parsed.error.flatten() });
	}

	// Verify this chat belongs to the user
	const chat = await db.query.aiResearchChats.findFirst({
		where: and(
			eq(aiResearchChats.id, chatId),
			eq(aiResearchChats.userId, userId)
		),
	});

	if (!chat) {
		throw new NotFoundError('Chat not found');
	}

	const { message } = parsed.data;

	// Stream the response via SSE
	const autosageResponse = await autosage.streamMessage(chat.autosageChatId, message);

	// Set SSE headers and pipe through
	c.header('Content-Type', 'text/event-stream');
	c.header('Cache-Control', 'no-cache');
	c.header('Connection', 'keep-alive');

	const body2 = autosageResponse.body;
	if (!body2) {
		throw new AppError('No response body from AutoSage stream', 502, 'AUTOSAGE_STREAM_ERROR');
	}

	return new Response(body2 as ReadableStream, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		},
	});
});

/**
 * POST /chat/:chatId/message/sync
 * Send a follow-up message and get the full response (non-streaming).
 */
aiResearchRoutes.post('/chat/:chatId/message/sync', async (c) => {
	const userId = c.get('userId');
	const chatId = c.req.param('chatId');

	const body = await c.req.json();
	const schema = z.object({ message: z.string().min(1).max(5000) });
	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		throw new ValidationError('Invalid message', { errors: parsed.error.flatten() });
	}

	const chat = await db.query.aiResearchChats.findFirst({
		where: and(
			eq(aiResearchChats.id, chatId),
			eq(aiResearchChats.userId, userId)
		),
	});

	if (!chat) {
		throw new NotFoundError('Chat not found');
	}

	const response = await autosage.sendMessage(chat.autosageChatId, parsed.data.message);
	return ResponseHelper.success(c, response);
});

/**
 * GET /chat/:chatId/messages
 * Get all messages for a chat.
 */
aiResearchRoutes.get('/chat/:chatId/messages', async (c) => {
	const userId = c.get('userId');
	const chatId = c.req.param('chatId');

	const chat = await db.query.aiResearchChats.findFirst({
		where: and(
			eq(aiResearchChats.id, chatId),
			eq(aiResearchChats.userId, userId)
		),
	});

	if (!chat) {
		throw new NotFoundError('Chat not found');
	}

	const messages = await autosage.getChatMessages(chat.autosageChatId);
	return ResponseHelper.success(c, {
		chatId: chat.id,
		symbol: chat.symbol,
		messages,
	});
});

/**
 * GET /knowledge-bases
 * List all knowledge bases (by status). Used by the AI screen stock dropdown.
 * Not user-specific — KBs are shared across all users.
 */
aiResearchRoutes.get('/knowledge-bases', async (c) => {
	const kbs = await db.query.aiResearchKnowledgeBases.findMany({
		orderBy: (t, { desc }) => [desc(t.updatedAt)],
	});

	return ResponseHelper.success(c, {
		knowledgeBases: kbs.map((kb) => ({
			symbol: kb.symbol,
			status: kb.status,
			knowledgeBaseId: kb.id,
			lastUpdatedAt: (kb.lastNewsUpdateAt ?? kb.lastFullUpdateAt ?? kb.updatedAt)?.toISOString() ?? null,
			errorMessage: kb.errorMessage,
		})),
	});
});

/**
 * GET /chats
 * List ALL chats for the current user across all symbols.
 * Used by the chat history panel in the AI Research screen.
 */
aiResearchRoutes.get('/chats', async (c) => {
	const userId = c.get('userId');

	const chats = await db.query.aiResearchChats.findMany({
		where: eq(aiResearchChats.userId, userId),
		orderBy: (t, { desc }) => [desc(t.createdAt)],
	});

	return ResponseHelper.success(c, {
		chats: chats.map((chat) => ({
			chatId: chat.id,
			autosageChatId: chat.autosageChatId,
			symbol: chat.symbol,
			title: chat.title,
			createdAt: chat.createdAt.toISOString(),
		})),
	});
});


aiResearchRoutes.get('/chats/:symbol', async (c) => {
	const userId = c.get('userId');
	const symbol = c.req.param('symbol').toUpperCase();

	const chats = await db.query.aiResearchChats.findMany({
		where: and(
			eq(aiResearchChats.userId, userId),
			eq(aiResearchChats.symbol, symbol)
		),
		orderBy: (chats, { desc }) => [desc(chats.createdAt)],
	});

	return ResponseHelper.success(c, {
		symbol,
		chats: chats.map((chat) => ({
			chatId: chat.id,
			autosageChatId: chat.autosageChatId,
			title: chat.title,
			createdAt: chat.createdAt.toISOString(),
		})),
	});
});

export default aiResearchRoutes;
