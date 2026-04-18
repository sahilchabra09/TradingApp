import { z } from 'zod';

const decimalStringRegex = /^\d+(\.\d{1,8})?$/;
const symbolRegex = /^[A-Z0-9._-]{1,32}$/;

export const demoDecimalSchema = z
	.string()
	.trim()
	.regex(decimalStringRegex, 'Expected a decimal string with up to 8 decimal places');

export const demoPositiveDecimalSchema = demoDecimalSchema.refine(
	(value) => Number(value) > 0,
	'Value must be greater than zero'
);

export const demoSymbolSchema = z
	.string()
	.trim()
	.toUpperCase()
	.regex(symbolRegex, 'Use uppercase ticker symbols like AAPL, TSLA, or SPY');

export const demoTradeSideSchema = z.enum(['buy', 'sell']);
export const demoAccountTypeSchema = z.enum(['market_data_only', 'demo_trader', 'live_trader']);
export const demoKycStatusSchema = z.enum([
	'not_started',
	'pending',
	'approved',
	'rejected',
	'resubmission_required',
]);

export const demoAccountResponseSchema = z.object({
	userId: z.string().uuid(),
	clerkId: z.string().nullable(),
	accountType: demoAccountTypeSchema,
	kycStatus: demoKycStatusSchema,
	canTrade: z.boolean(),
	balance: demoDecimalSchema,
	updatedAt: z.string().datetime(),
});

export const demoMarketDataResponseSchema = z.object({
	symbol: demoSymbolSchema,
	baseSymbol: z.string(),
	instrumentId: z.string(),
	exchange: z.string(),
	currency: z.string().nullable(),
	instrumentName: z.string().nullable(),
	lastPrice: demoDecimalSchema,
	lastPriceSource: z.enum(['websocket', 'rest']),
	marketDataFeed: z.string(),
	asOf: z.string().datetime(),
});

export const demoTradeRequestSchema = z.object({
	symbol: demoSymbolSchema,
	side: demoTradeSideSchema,
	quantity: demoPositiveDecimalSchema,
});

export const demoTradeResponseSchema = z.object({
	tradeId: z.string().uuid(),
	userId: z.string().uuid(),
	symbol: demoSymbolSchema,
	side: demoTradeSideSchema,
	quantity: demoDecimalSchema,
	marketPrice: demoDecimalSchema,
	executionPrice: demoDecimalSchema,
	slippagePct: demoDecimalSchema,
	grossAmount: demoDecimalSchema,
	cashBalance: demoDecimalSchema,
	timestamp: z.string().datetime(),
});

export const demoStatusResponseSchema = z.object({
	userId: z.string().uuid(),
	accountType: demoAccountTypeSchema,
	kycStatus: demoKycStatusSchema,
	canActivateDemo: z.boolean(),
	canTradeDemo: z.boolean(),
	hasDemoAccount: z.boolean(),
});

export const demoUserParamsSchema = z.object({
	userId: z.string().uuid(),
});

export const demoSymbolParamsSchema = z.object({
	symbol: demoSymbolSchema,
});

export const demoHoldingSnapshotSchema = z.object({
	id: z.string().uuid(),
	symbol: demoSymbolSchema,
	instrumentId: z.string(),
	instrumentName: z.string().nullable(),
	quantity: demoDecimalSchema,
	avgPrice: demoDecimalSchema,
	currentPrice: demoDecimalSchema,
	marketValue: demoDecimalSchema,
	costBasis: demoDecimalSchema,
	pnlAmount: demoDecimalSchema,
	pnlPercent: demoDecimalSchema,
});

export const demoHoldingsResponseSchema = z.object({
	userId: z.string().uuid(),
	cash: demoDecimalSchema,
	holdings: z.array(demoHoldingSnapshotSchema),
	totals: z.object({
		holdingsValue: demoDecimalSchema,
		totalValue: demoDecimalSchema,
		totalPnl: demoDecimalSchema,
		totalPnlPercent: demoDecimalSchema,
	}),
});

export const demoPortfolioResponseSchema = z.object({
	userId: z.string().uuid(),
	cash: demoDecimalSchema,
	holdingsValue: demoDecimalSchema,
	totalValue: demoDecimalSchema,
	totalPnl: demoDecimalSchema,
});

export const demoTradeHistoryItemSchema = z.object({
	id: z.string().uuid(),
	symbol: demoSymbolSchema,
	instrumentId: z.string().uuid(),
	side: demoTradeSideSchema,
	quantity: demoDecimalSchema,
	price: demoDecimalSchema,
	notional: demoDecimalSchema,
	timestamp: z.string().datetime(),
});

export const demoTradeHistoryResponseSchema = z.object({
	userId: z.string().uuid(),
	trades: z.array(demoTradeHistoryItemSchema),
});

export const demoHistoryPeriodSchema = z.enum(['1D', '1W', '1M', '3M', '1Y']);

export const demoHistoryQuerySchema = z.object({
	period: demoHistoryPeriodSchema.catch('1M'),
});

export type DemoHistoryPeriod = z.infer<typeof demoHistoryPeriodSchema>;

export type DemoAccountResponse = z.infer<typeof demoAccountResponseSchema>;
export type DemoMarketDataResponse = z.infer<typeof demoMarketDataResponseSchema>;
export type DemoTradeRequest = z.infer<typeof demoTradeRequestSchema>;
export type DemoTradeResponse = z.infer<typeof demoTradeResponseSchema>;
export type DemoStatusResponse = z.infer<typeof demoStatusResponseSchema>;
export type DemoHoldingSnapshot = z.infer<typeof demoHoldingSnapshotSchema>;
export type DemoHoldingsResponse = z.infer<typeof demoHoldingsResponseSchema>;
export type DemoPortfolioResponse = z.infer<typeof demoPortfolioResponseSchema>;
export type DemoTradeHistoryItem = z.infer<typeof demoTradeHistoryItemSchema>;
export type DemoTradeHistoryResponse = z.infer<typeof demoTradeHistoryResponseSchema>;
