import { z } from 'zod';

const decimalStringRegex = /^\d+(\.\d{1,8})?$/;
const symbolRegex = /^[A-Z0-9._-]{1,32}$/;

export const paperDecimalSchema = z
	.string()
	.trim()
	.regex(decimalStringRegex, 'Expected a decimal string with up to 8 decimal places');

export const paperPositiveDecimalSchema = paperDecimalSchema.refine(
	(value) => Number(value) > 0,
	'Value must be greater than zero'
);

export const paperSymbolSchema = z
	.string()
	.trim()
	.toUpperCase()
	.regex(symbolRegex, 'Use uppercase ticker symbols like AAPL, TSLA, or SPY');

export const paperTradeSideSchema = z.enum(['buy', 'sell']);
export const paperAccountTypeSchema = z.enum(['market_data_only', 'demo_trader', 'live_trader']);
export const paperKycStatusSchema = z.enum([
	'not_started',
	'pending',
	'approved',
	'rejected',
	'resubmission_required',
]);

export const paperAccountResponseSchema = z.object({
	userId: z.string().uuid(),
	clerkId: z.string().nullable(),
	accountType: paperAccountTypeSchema,
	kycStatus: paperKycStatusSchema,
	canTrade: z.boolean(),
	balance: paperDecimalSchema,
	updatedAt: z.string().datetime(),
});

export const paperMarketDataResponseSchema = z.object({
	symbol: paperSymbolSchema,
	baseSymbol: z.string(),
	instrumentId: z.string(),
	exchange: z.string(),
	currency: z.string().nullable(),
	instrumentName: z.string().nullable(),
	lastPrice: paperDecimalSchema,
	lastPriceSource: z.enum(['websocket', 'rest']),
	marketDataFeed: z.string(),
	asOf: z.string().datetime(),
});

export const paperTradeRequestSchema = z.object({
	symbol: paperSymbolSchema,
	side: paperTradeSideSchema,
	quantity: paperPositiveDecimalSchema,
});

export const paperTradeResponseSchema = z.object({
	tradeId: z.string().uuid(),
	userId: z.string().uuid(),
	symbol: paperSymbolSchema,
	side: paperTradeSideSchema,
	quantity: paperDecimalSchema,
	marketPrice: paperDecimalSchema,
	executionPrice: paperDecimalSchema,
	slippagePct: paperDecimalSchema,
	grossAmount: paperDecimalSchema,
	cashBalance: paperDecimalSchema,
	timestamp: z.string().datetime(),
});

export const paperStatusResponseSchema = z.object({
	userId: z.string().uuid(),
	accountType: paperAccountTypeSchema,
	kycStatus: paperKycStatusSchema,
	canActivateDemo: z.boolean(),
	canTradeDemo: z.boolean(),
	hasDemoAccount: z.boolean(),
});

export const paperUserParamsSchema = z.object({
	userId: z.string().uuid(),
});

export const paperSymbolParamsSchema = z.object({
	symbol: paperSymbolSchema,
});

export const paperHoldingSnapshotSchema = z.object({
	id: z.string().uuid(),
	symbol: paperSymbolSchema,
	instrumentId: z.string(),
	instrumentName: z.string().nullable(),
	quantity: paperDecimalSchema,
	avgPrice: paperDecimalSchema,
	currentPrice: paperDecimalSchema,
	marketValue: paperDecimalSchema,
	costBasis: paperDecimalSchema,
	pnlAmount: paperDecimalSchema,
	pnlPercent: paperDecimalSchema,
});

export const paperHoldingsResponseSchema = z.object({
	userId: z.string().uuid(),
	cash: paperDecimalSchema,
	holdings: z.array(paperHoldingSnapshotSchema),
	totals: z.object({
		holdingsValue: paperDecimalSchema,
		totalValue: paperDecimalSchema,
		totalPnl: paperDecimalSchema,
		totalPnlPercent: paperDecimalSchema,
	}),
});

export const paperPortfolioResponseSchema = z.object({
	userId: z.string().uuid(),
	cash: paperDecimalSchema,
	holdingsValue: paperDecimalSchema,
	totalValue: paperDecimalSchema,
	totalPnl: paperDecimalSchema,
});

export const paperTradeHistoryItemSchema = z.object({
	id: z.string().uuid(),
	symbol: paperSymbolSchema,
	instrumentId: z.string().uuid(),
	side: paperTradeSideSchema,
	quantity: paperDecimalSchema,
	price: paperDecimalSchema,
	notional: paperDecimalSchema,
	timestamp: z.string().datetime(),
});

export const paperTradeHistoryResponseSchema = z.object({
	userId: z.string().uuid(),
	trades: z.array(paperTradeHistoryItemSchema),
});

export const paperHistoryPeriodSchema = z.enum(['1D', '1W', '1M', '3M', '1Y']);

export const paperHistoryQuerySchema = z.object({
	period: paperHistoryPeriodSchema.catch('1M'),
});

export type PaperHistoryPeriod = z.infer<typeof paperHistoryPeriodSchema>;

export type PaperAccountResponse = z.infer<typeof paperAccountResponseSchema>;
export type PaperMarketDataResponse = z.infer<typeof paperMarketDataResponseSchema>;
export type PaperTradeRequest = z.infer<typeof paperTradeRequestSchema>;
export type PaperTradeResponse = z.infer<typeof paperTradeResponseSchema>;
export type PaperStatusResponse = z.infer<typeof paperStatusResponseSchema>;
export type PaperHoldingSnapshot = z.infer<typeof paperHoldingSnapshotSchema>;
export type PaperHoldingsResponse = z.infer<typeof paperHoldingsResponseSchema>;
export type PaperPortfolioResponse = z.infer<typeof paperPortfolioResponseSchema>;
export type PaperTradeHistoryItem = z.infer<typeof paperTradeHistoryItemSchema>;
export type PaperTradeHistoryResponse = z.infer<typeof paperTradeHistoryResponseSchema>;
