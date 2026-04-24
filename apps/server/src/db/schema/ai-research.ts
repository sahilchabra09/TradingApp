import {
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	uniqueIndex,
	varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const aiResearchKbStatusEnum = pgEnum('ai_research_kb_status', [
	'creating',
	'uploading',
	'processing',
	'ready',
	'error',
]);

// ─── Knowledge Bases ──────────────────────────────────────────────────────────
// One shared KB per stock symbol. Multiple users share the same KB,
// but each gets their own isolated chat.

export const aiResearchKnowledgeBases = pgTable(
	'ai_research_knowledge_bases',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		symbol: varchar('symbol', { length: 32 }).notNull().unique(),
		autosageKbId: varchar('autosage_kb_id', { length: 128 }).notNull(),
		autosageKbName: varchar('autosage_kb_name', { length: 255 }).notNull(),
		status: aiResearchKbStatusEnum('status').notNull().default('creating'),

		// Document IDs from AutoSage (for update/replace operations)
		pricingDocId: varchar('pricing_doc_id', { length: 128 }),
		historicalNewsDocId: varchar('historical_news_doc_id', { length: 128 }),
		realtimeNewsDocId: varchar('realtime_news_doc_id', { length: 128 }),

		// Freshness tracking
		lastFullUpdateAt: timestamp('last_full_update_at', { withTimezone: true }),
		lastNewsUpdateAt: timestamp('last_news_update_at', { withTimezone: true }),

		errorMessage: text('error_message'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		symbolIdx: index('ai_research_kb_symbol_idx').on(table.symbol),
		statusIdx: index('ai_research_kb_status_idx').on(table.status),
	})
);

// ─── Chats ────────────────────────────────────────────────────────────────────
// Per-user chat isolation. Each user gets their own chat(s) per KB.

export const aiResearchChats = pgTable(
	'ai_research_chats',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		knowledgeBaseId: uuid('knowledge_base_id')
			.notNull()
			.references(() => aiResearchKnowledgeBases.id, { onDelete: 'cascade' }),
		symbol: varchar('symbol', { length: 32 }).notNull(),
		autosageChatId: varchar('autosage_chat_id', { length: 128 }).notNull(),
		title: varchar('title', { length: 255 }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userKbIdx: uniqueIndex('ai_research_chats_user_kb_idx').on(
			table.userId,
			table.knowledgeBaseId
		),
		userSymbolIdx: index('ai_research_chats_user_symbol_idx').on(table.userId, table.symbol),
		symbolIdx: index('ai_research_chats_symbol_idx').on(table.symbol),
	})
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const aiResearchKnowledgeBasesRelations = relations(aiResearchKnowledgeBases, ({ many }) => ({
	chats: many(aiResearchChats),
}));

export const aiResearchChatsRelations = relations(aiResearchChats, ({ one }) => ({
	user: one(users, {
		fields: [aiResearchChats.userId],
		references: [users.id],
	}),
	knowledgeBase: one(aiResearchKnowledgeBases, {
		fields: [aiResearchChats.knowledgeBaseId],
		references: [aiResearchKnowledgeBases.id],
	}),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiResearchKnowledgeBase = typeof aiResearchKnowledgeBases.$inferSelect;
export type NewAiResearchKnowledgeBase = typeof aiResearchKnowledgeBases.$inferInsert;
export type AiResearchChat = typeof aiResearchChats.$inferSelect;
export type NewAiResearchChat = typeof aiResearchChats.$inferInsert;
