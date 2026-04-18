import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import { zValidator } from '@hono/zod-validator';
import Decimal from 'decimal.js';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import {
	demoHoldings,
	demoInstruments,
	demoTradeAttempts,
	demoTrades,
	demoWallets,
	users,
} from '../db/schema';
import { requireAuth } from '../middleware/clerk-auth';
import {
	ensureAlpacaRealtimeSubscriptions,
	getAlpacaHistoricalBars,
	getAlpacaSnapshot,
	getAlpacaSnapshots,
	onAlpacaTradeTick,
	resolveAlpacaSymbols,
	searchAlpacaAssets,
} from '../services/alpaca';
import {
	type DemoHoldingSnapshot,
	demoSymbolParamsSchema,
	demoTradeRequestSchema,
	demoUserParamsSchema,
	demoHistoryQuerySchema,
} from '../types/demo';
import { AppError, ForbiddenError, InsufficientBalanceError, ValidationError } from '../types/api';
import { ResponseHelper } from '../utils/response';

const demoRoutes = new Hono();
const DEFAULT_DEMO_BALANCE = new Decimal('100000');
const DEFAULT_SLIPPAGE_PCT = new Decimal(process.env.DEMO_SLIPPAGE_PCT || '0.1');
const DB_SCALE = 8;
const STREAM_SYMBOL_LIMIT = 100;

function toDbDecimal(value: Decimal.Value) {
	return new Decimal(value).toDecimalPlaces(DB_SCALE, Decimal.ROUND_HALF_UP).toFixed(DB_SCALE);
}

function toApiDecimal(value: Decimal.Value) {
	return new Decimal(value).toDecimalPlaces(DB_SCALE, Decimal.ROUND_HALF_UP).toString();
}

function isKycApproved(status: string) {
	return status === 'approved';
}

function normalizeSymbolInput(raw: string) {
	return raw.trim().toUpperCase();
}

function parseSymbolList(value: unknown) {
	const symbols = Array.isArray(value) ? value : [];
	return symbols
		.filter((entry): entry is string => typeof entry === 'string')
		.map((entry) => normalizeSymbolInput(entry))
		.filter(Boolean)
		.slice(0, STREAM_SYMBOL_LIMIT);
}

function parseQuerySymbols(raw: string | undefined) {
	if (!raw) {
		return [];
	}

	return raw
		.split(',')
		.map((symbol) => normalizeSymbolInput(symbol))
		.filter(Boolean)
		.slice(0, STREAM_SYMBOL_LIMIT);
}

function safeParseClientMessage(raw: unknown) {
	if (typeof raw !== 'string') {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as {
			type?: string;
			symbols?: unknown;
		};

		if (!parsed?.type) {
			return null;
		}

		return {
			type: String(parsed.type),
			symbols: parseSymbolList(parsed.symbols),
		};
	} catch {
		return null;
	}
}

async function getDemoWallet(userId: string) {
	return db.query.demoWallets.findFirst({
		where: (wallet, { eq }) => eq(wallet.userId, userId),
	});
}

async function ensureDemoWallet(userId: string) {
	const existingWallet = await getDemoWallet(userId);
	if (existingWallet) {
		return existingWallet;
	}

	const [wallet] = await db
		.insert(demoWallets)
		.values({
			userId,
			balance: toDbDecimal(DEFAULT_DEMO_BALANCE),
			updatedAt: new Date(),
		})
		.onConflictDoNothing()
		.returning();

	if (wallet) {
		return wallet;
	}

	const retryWallet = await getDemoWallet(userId);
	if (!retryWallet) {
		throw new AppError('Unable to initialize a demo wallet', 500, 'DEMO_WALLET_INIT_FAILED');
	}

	return retryWallet;
}

async function getDemoEligibility(user: {
	id: string;
	kycStatus: string;
	accountType: 'market_data_only' | 'demo_trader' | 'live_trader';
}) {
	const wallet = await getDemoWallet(user.id);
	const hasDemoAccount = Boolean(wallet);
	const canActivateDemo = isKycApproved(user.kycStatus);
	const canTradeDemo =
		isKycApproved(user.kycStatus) && user.accountType === 'demo_trader' && hasDemoAccount;

	return {
		hasDemoAccount,
		canActivateDemo,
		canTradeDemo,
		wallet,
	};
}

async function updateAccountType(userId: string, accountType: 'market_data_only' | 'demo_trader' | 'live_trader') {
	await db
		.update(users)
		.set({
			accountType,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId));
}

async function logTradeAttempt(
	userId: string,
	payload: { symbol: string; side: 'buy' | 'sell'; quantity: string },
	reason:
		| 'kyc_not_approved'
		| 'demo_account_missing'
		| 'insufficient_balance'
		| 'insufficient_quantity'
		| 'validation_failed',
	details?: string
) {
	try {
		await db.insert(demoTradeAttempts).values({
			userId,
			symbol: payload.symbol,
			side: payload.side,
			quantity: toDbDecimal(payload.quantity),
			reason,
			details,
		});
	} catch (error) {
		console.warn('Unable to log demo trade attempt:', error);
	}
}

async function upsertInstrument(
	tx: any,
	quote: Awaited<ReturnType<typeof getAlpacaSnapshot>>
) {
	const existing = await tx.query.demoInstruments.findFirst({
		where: (instrument: typeof demoInstruments, { eq }: any) =>
			eq(instrument.symbol, quote.symbol),
	});

	if (existing) {
		await tx
			.update(demoInstruments)
			.set({
				providerId: quote.instrumentId,
				name: quote.instrumentName,
				exchange: quote.exchange,
				currency: quote.currency,
				lastPrice: toDbDecimal(quote.lastPrice),
				updatedAt: new Date(),
			})
			.where(eq(demoInstruments.id, existing.id));
		return existing.id;
	}

	const [instrument] = await tx
		.insert(demoInstruments)
		.values({
			symbol: quote.symbol,
			providerId: quote.instrumentId,
			name: quote.instrumentName,
			exchange: quote.exchange,
			currency: quote.currency,
			lastPrice: toDbDecimal(quote.lastPrice),
			updatedAt: new Date(),
		})
		.returning();

	return instrument.id;
}

function assertAuthorizedPortfolioAccess(
	requestedUserId: string,
	authenticatedUserId: string,
	isAdmin: boolean
) {
	if (requestedUserId !== authenticatedUserId && !isAdmin) {
		throw new ForbiddenError('You can only access your own demo portfolio');
	}
}

async function buildHoldingsSnapshot(userId: string) {
	const wallet = await getDemoWallet(userId);
	if (!wallet) {
		return {
			hasDemoAccount: false,
			cash: new Decimal(0),
			holdings: [] as DemoHoldingSnapshot[],
			holdingsValue: new Decimal(0),
			totalValue: new Decimal(0),
			totalPnl: new Decimal(0),
			totalPnlPercent: new Decimal(0),
		};
	}

	const holdings = await db.query.demoHoldings.findMany({
		where: (holding, { eq }) => eq(holding.userId, userId),
		with: {
			instrument: true,
		},
	});

	if (holdings.length === 0) {
		const cash = new Decimal(wallet.balance);
		return {
			hasDemoAccount: true,
			cash,
			holdings: [] as DemoHoldingSnapshot[],
			holdingsValue: new Decimal(0),
			totalValue: cash,
			totalPnl: new Decimal(0),
			totalPnlPercent: new Decimal(0),
		};
	}

	const marketData = await getAlpacaSnapshots(holdings.map((holding) => holding.symbol));
	const cash = new Decimal(wallet.balance);

	const holdingSnapshots = holdings
		.map((holding) => {
			const quote = marketData[holding.symbol];
			if (!quote) {
				throw new AppError(
					`Missing live market data for ${holding.symbol}`,
					502,
					'DEMO_MARKETDATA_UNAVAILABLE',
					{ symbol: holding.symbol }
				);
			}

			const quantity = new Decimal(holding.quantity);
			const avgPrice = new Decimal(holding.avgPrice);
			const currentPrice = new Decimal(quote.lastPrice);
			const costBasis = avgPrice.mul(quantity);
			const marketValue = currentPrice.mul(quantity);
			const pnlAmount = marketValue.minus(costBasis);
			const pnlPercent = costBasis.eq(0)
				? new Decimal(0)
				: pnlAmount.div(costBasis).mul(100);

			return {
				id: holding.id,
				symbol: holding.symbol,
				instrumentId: holding.instrument?.providerId || quote.instrumentId,
				instrumentName: holding.instrument?.name || quote.instrumentName || null,
				quantity: toApiDecimal(quantity),
				avgPrice: toApiDecimal(avgPrice),
				currentPrice: toApiDecimal(currentPrice),
				marketValue: toApiDecimal(marketValue),
				costBasis: toApiDecimal(costBasis),
				pnlAmount: toApiDecimal(pnlAmount),
				pnlPercent: toApiDecimal(pnlPercent),
				__sortPnlPercent: pnlPercent,
			};
		})
		.sort((left, right) => right.__sortPnlPercent.comparedTo(left.__sortPnlPercent))
		.map(({ __sortPnlPercent, ...snapshot }) => snapshot);

	const holdingsValue = holdingSnapshots.reduce(
		(sum, holding) => sum.plus(holding.marketValue),
		new Decimal(0)
	);
	const totalCostBasis = holdingSnapshots.reduce(
		(sum, holding) => sum.plus(holding.costBasis),
		new Decimal(0)
	);
	const totalPnl = holdingSnapshots.reduce(
		(sum, holding) => sum.plus(holding.pnlAmount),
		new Decimal(0)
	);
	const totalValue = cash.plus(holdingsValue);
	const totalPnlPercent = totalCostBasis.eq(0)
		? new Decimal(0)
		: totalPnl.div(totalCostBasis).mul(100);

	return {
		hasDemoAccount: true,
		cash,
		holdings: holdingSnapshots,
		holdingsValue,
		totalValue,
		totalPnl,
		totalPnlPercent,
	};
}

demoRoutes.get('/status', requireAuth, async (c) => {
	const user = c.get('user');
	const eligibility = await getDemoEligibility(user);

	return ResponseHelper.success(c, {
		userId: user.id,
		accountType: user.accountType,
		kycStatus: user.kycStatus,
		canActivateDemo: eligibility.canActivateDemo,
		canTradeDemo: eligibility.canTradeDemo,
		hasDemoAccount: eligibility.hasDemoAccount,
	});
});

demoRoutes.get('/account', requireAuth, async (c) => {
	const user = c.get('user');
	const wallet = await getDemoWallet(user.id);

	if (!wallet) {
		return ResponseHelper.notFound(c, 'Demo account is not activated yet');
	}

	return ResponseHelper.success(c, {
		userId: user.id,
		clerkId: user.clerkId || null,
		accountType: user.accountType,
		kycStatus: user.kycStatus,
		canTrade: isKycApproved(user.kycStatus) && user.accountType === 'demo_trader',
		balance: toApiDecimal(wallet.balance),
		updatedAt: wallet.updatedAt.toISOString(),
	});
});

demoRoutes.post('/account', requireAuth, async (c) => {
	try {
		const user = c.get('user');
		const eligibility = await getDemoEligibility(user);

		if (!eligibility.canActivateDemo) {
			throw new ForbiddenError('Complete KYC to activate demo trading', {
				kycStatus: user.kycStatus,
				accountType: user.accountType,
			});
		}

		const wallet = await ensureDemoWallet(user.id);
		if (user.accountType !== 'demo_trader') {
			await updateAccountType(user.id, 'demo_trader');
		}

		return ResponseHelper.created(c, {
			userId: user.id,
			clerkId: user.clerkId || null,
			accountType: 'demo_trader',
			kycStatus: user.kycStatus,
			canTrade: true,
			balance: toApiDecimal(wallet.balance),
			updatedAt: wallet.updatedAt.toISOString(),
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		console.error('Demo account init failed:', error);
		throw new AppError('Unable to initialize demo account', 500, 'DEMO_ACCOUNT_INIT_FAILED');
	}
});

// ─── Asset search ─────────────────────────────────────────────────────────────
// GET /assets?q=apple&limit=50
// Returns matching US equity assets from the cached Alpaca asset list.
demoRoutes.get('/assets', requireAuth, async (c) => {
	const q     = (c.req.query('q') || '').trim();
	const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10) || 50, 1), 100);

	try {
		const assets = await searchAlpacaAssets(q, limit);
		return ResponseHelper.success(c, assets);
	} catch (error) {
		if (error instanceof AppError) throw error;
		console.error('Asset search failed:', error);
		throw new AppError('Unable to search assets', 500, 'DEMO_ASSETS_SEARCH_FAILED');
	}
});

// ─── Batch market data ────────────────────────────────────────────────────────
// GET /marketdata/batch?symbols=AAPL,MSFT,...
// Returns live quotes for up to 100 symbols in a single request.
demoRoutes.get('/marketdata/batch', requireAuth, async (c) => {
	const raw = c.req.query('symbols') || '';
	const symbols = raw
		.split(',')
		.map((s) => normalizeSymbolInput(s))
		.filter(Boolean)
		.slice(0, 100);

	if (symbols.length === 0) {
		return ResponseHelper.success(c, []);
	}

	try {
		const snapshots = await getAlpacaSnapshots(symbols);

		// Persist instrument metadata without blocking the response
		void Promise.allSettled(
			Object.values(snapshots).map((quote) =>
				db
					.insert(demoInstruments)
					.values({
						symbol: quote.symbol,
						providerId: quote.instrumentId,
						name: quote.instrumentName,
						exchange: quote.exchange,
						currency: quote.currency,
						lastPrice: toDbDecimal(quote.lastPrice),
						updatedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: demoInstruments.symbol,
						set: {
							providerId: quote.instrumentId,
							name: quote.instrumentName,
							exchange: quote.exchange,
							currency: quote.currency,
							lastPrice: toDbDecimal(quote.lastPrice),
							updatedAt: new Date(),
						},
					})
			)
		);

		return ResponseHelper.success(c, Object.values(snapshots));
	} catch (error) {
		if (error instanceof AppError) throw error;
		console.error('Demo batch market data failed:', error);
		throw new AppError('Unable to fetch batch market data', 500, 'DEMO_BATCH_MARKETDATA_FAILED');
	}
});

// ─── Historical bars ──────────────────────────────────────────────────────────
// GET /marketdata/:symbol/history?period=1D|1W|1M|3M|1Y
demoRoutes.get(
	'/marketdata/:symbol/history',
	requireAuth,
	zValidator('param', demoSymbolParamsSchema),
	zValidator('query', demoHistoryQuerySchema),
	async (c) => {
		const { symbol } = c.req.valid('param');
		const { period } = c.req.valid('query');

		try {
			const bars = await getAlpacaHistoricalBars(symbol, period);
			return ResponseHelper.success(c, { symbol, period, bars });
		} catch (error) {
			if (error instanceof AppError) throw error;
			console.error('Demo historical bars failed:', error);
			throw new AppError('Unable to fetch historical bars', 500, 'DEMO_HISTORY_FAILED');
		}
	}
);

// ─── Single symbol market data ────────────────────────────────────────────────
demoRoutes.get(
	'/marketdata/:symbol',
	requireAuth,
	zValidator('param', demoSymbolParamsSchema),
	async (c) => {
		const { symbol } = c.req.valid('param');

		try {
			const quote = await getAlpacaSnapshot(symbol);
			await db
				.insert(demoInstruments)
				.values({
					symbol: quote.symbol,
					providerId: quote.instrumentId,
					name: quote.instrumentName,
					exchange: quote.exchange,
					currency: quote.currency,
					lastPrice: toDbDecimal(quote.lastPrice),
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: demoInstruments.symbol,
					set: {
						providerId: quote.instrumentId,
						name: quote.instrumentName,
						exchange: quote.exchange,
						currency: quote.currency,
						lastPrice: toDbDecimal(quote.lastPrice),
						updatedAt: new Date(),
					},
				});

			return ResponseHelper.success(c, quote);
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}

			console.error('Demo market data lookup failed:', error);
			throw new AppError('Unable to fetch demo market data', 500, 'DEMO_MARKETDATA_FAILED');
		}
	}
);

demoRoutes.post(
	'/trade',
	requireAuth,
	zValidator('json', demoTradeRequestSchema),
	async (c) => {
		const user = c.get('user');
		const payload = c.req.valid('json');
		const normalizedPayload = {
			...payload,
			symbol: payload.symbol.toUpperCase(),
		};

		try {
			const eligibility = await getDemoEligibility(user);
			if (!eligibility.canTradeDemo) {
				const reason = !isKycApproved(user.kycStatus)
					? 'kyc_not_approved'
					: 'demo_account_missing';
				await logTradeAttempt(
					user.id,
					normalizedPayload,
					reason,
					'Trade blocked until KYC is approved and demo account is activated.'
				);

				throw new ForbiddenError(
					'Trading is locked. Complete KYC, then activate your demo account.',
					{
						kycStatus: user.kycStatus,
						accountType: user.accountType,
						hasDemoAccount: eligibility.hasDemoAccount,
					}
				);
			}

			const quote = await getAlpacaSnapshot(normalizedPayload.symbol);
			const quantity = new Decimal(normalizedPayload.quantity);
			const marketPrice = new Decimal(quote.lastPrice);
			const slippageMultiplier =
				normalizedPayload.side === 'buy'
					? new Decimal(1).plus(DEFAULT_SLIPPAGE_PCT.div(100))
					: new Decimal(1).minus(DEFAULT_SLIPPAGE_PCT.div(100));
			const executionPrice = marketPrice.mul(slippageMultiplier);
			const grossAmount = executionPrice.mul(quantity);
			const timestamp = new Date();

			const tradeResult = await db.transaction(async (tx) => {
				const wallet = await tx.query.demoWallets.findFirst({
					where: (wallet, { eq }) => eq(wallet.userId, user.id),
				});
				if (!wallet) {
					throw new ForbiddenError('Activate your demo account before placing a trade');
				}

				const currentBalance = new Decimal(wallet.balance);
				if (normalizedPayload.side === 'buy' && currentBalance.lessThan(grossAmount)) {
					await tx.insert(demoTradeAttempts).values({
						userId: user.id,
						symbol: normalizedPayload.symbol,
						side: normalizedPayload.side,
						quantity: toDbDecimal(quantity),
						reason: 'insufficient_balance',
						details: `Required ${toApiDecimal(grossAmount)} but only ${toApiDecimal(currentBalance)} is available`,
					});
					throw new InsufficientBalanceError(
						toApiDecimal(grossAmount),
						toApiDecimal(currentBalance),
						'Insufficient demo cash to execute this order'
					);
				}

				const instrumentId = await upsertInstrument(tx, quote);
				const existingHolding = await tx.query.demoHoldings.findFirst({
					where: (holding, { eq, and }) =>
						and(eq(holding.userId, user.id), eq(holding.symbol, normalizedPayload.symbol)),
				});

				if (normalizedPayload.side === 'sell') {
					if (!existingHolding) {
						await tx.insert(demoTradeAttempts).values({
							userId: user.id,
							symbol: normalizedPayload.symbol,
							side: normalizedPayload.side,
							quantity: toDbDecimal(quantity),
							reason: 'insufficient_quantity',
							details: 'No existing holding to sell.',
						});
						throw new ValidationError(`No demo position found for ${normalizedPayload.symbol}`);
					}

					const existingQuantity = new Decimal(existingHolding.quantity);
					if (existingQuantity.lessThan(quantity)) {
						await tx.insert(demoTradeAttempts).values({
							userId: user.id,
							symbol: normalizedPayload.symbol,
							side: normalizedPayload.side,
							quantity: toDbDecimal(quantity),
							reason: 'insufficient_quantity',
							details: `Requested ${toApiDecimal(quantity)} but only ${toApiDecimal(existingQuantity)} is available.`,
						});
						throw new ValidationError(
							`Insufficient quantity to sell ${normalizedPayload.symbol}`,
							{
								availableQuantity: toApiDecimal(existingQuantity),
								requestedQuantity: normalizedPayload.quantity,
							}
						);
					}
				}

				const nextBalance =
					normalizedPayload.side === 'buy'
						? currentBalance.minus(grossAmount)
						: currentBalance.plus(grossAmount);

				await tx
					.update(demoWallets)
					.set({
						balance: toDbDecimal(nextBalance),
						updatedAt: timestamp,
					})
					.where(eq(demoWallets.userId, user.id));

				if (normalizedPayload.side === 'buy') {
					if (!existingHolding) {
						await tx.insert(demoHoldings).values({
							userId: user.id,
							symbol: normalizedPayload.symbol,
							instrumentId,
							quantity: toDbDecimal(quantity),
							avgPrice: toDbDecimal(executionPrice),
						});
					} else {
						const currentQuantity = new Decimal(existingHolding.quantity);
						const currentCost = currentQuantity.mul(existingHolding.avgPrice);
						const newQuantity = currentQuantity.plus(quantity);
						const newAvgPrice = currentCost.plus(grossAmount).div(newQuantity);

						await tx
							.update(demoHoldings)
							.set({
								instrumentId,
								quantity: toDbDecimal(newQuantity),
								avgPrice: toDbDecimal(newAvgPrice),
							})
							.where(eq(demoHoldings.id, existingHolding.id));
					}
				} else if (existingHolding) {
					const remainingQuantity = new Decimal(existingHolding.quantity).minus(quantity);
					if (remainingQuantity.lte(0)) {
						await tx.delete(demoHoldings).where(eq(demoHoldings.id, existingHolding.id));
					} else {
						await tx
							.update(demoHoldings)
							.set({
								quantity: toDbDecimal(remainingQuantity),
							})
							.where(eq(demoHoldings.id, existingHolding.id));
					}
				}

				const [trade] = await tx
					.insert(demoTrades)
					.values({
						userId: user.id,
						symbol: normalizedPayload.symbol,
						instrumentId,
						side: normalizedPayload.side,
						quantity: toDbDecimal(quantity),
						price: toDbDecimal(executionPrice),
						timestamp,
					})
					.returning();

				return {
					trade,
					nextBalance,
				};
			});

			return ResponseHelper.created(c, {
				tradeId: tradeResult.trade.id,
				userId: user.id,
				symbol: normalizedPayload.symbol,
				side: normalizedPayload.side,
				quantity: toApiDecimal(quantity),
				marketPrice: toApiDecimal(marketPrice),
				executionPrice: toApiDecimal(executionPrice),
				slippagePct: toApiDecimal(DEFAULT_SLIPPAGE_PCT),
				grossAmount: toApiDecimal(grossAmount),
				cashBalance: toApiDecimal(tradeResult.nextBalance),
				timestamp: tradeResult.trade.timestamp.toISOString(),
			});
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}

			console.error('Demo trade failed:', error);
			throw new AppError('Unable to execute demo trade', 500, 'DEMO_TRADE_FAILED');
		}
	}
);

demoRoutes.get(
	'/stream',
	requireAuth,
	upgradeWebSocket((c) => {
		const user = c.get('user');
		const initialRequestedSymbols = parseQuerySymbols(c.req.query('symbols'));
		const providerToRequested = new Map<string, Set<string>>();
		const requestedToProvider = new Map<string, string>();
		let unsubscribeTradeListener = () => {};

		const sendJson = (ws: { readyState: number; send: (data: string) => void }, payload: object) => {
			if (ws.readyState !== 1) {
				return;
			}

			ws.send(JSON.stringify(payload));
		};

		const subscribeSymbols = async (
			requestedSymbols: string[],
			ws: { readyState: number; send: (data: string) => void }
		) => {
			const uniqueRequested = [...new Set(requestedSymbols.map((symbol) => normalizeSymbolInput(symbol)).filter(Boolean))];
			if (!uniqueRequested.length) {
				return;
			}

			try {
				const resolvedSymbols = await resolveAlpacaSymbols(uniqueRequested);
				ensureAlpacaRealtimeSubscriptions(resolvedSymbols.map((item) => item.providerSymbol));

				for (const resolved of resolvedSymbols) {
					const existingProvider = requestedToProvider.get(resolved.requestedSymbol);
					if (existingProvider && existingProvider !== resolved.providerSymbol) {
						const oldSet = providerToRequested.get(existingProvider);
						oldSet?.delete(resolved.requestedSymbol);
						if (oldSet && oldSet.size === 0) {
							providerToRequested.delete(existingProvider);
						}
					}

					requestedToProvider.set(resolved.requestedSymbol, resolved.providerSymbol);
					const providerSet = providerToRequested.get(resolved.providerSymbol) || new Set<string>();
					providerSet.add(resolved.requestedSymbol);
					providerToRequested.set(resolved.providerSymbol, providerSet);
				}

				const snapshots = await getAlpacaSnapshots(uniqueRequested);
				for (const [symbol, quote] of Object.entries(snapshots)) {
					sendJson(ws, {
						type: 'snapshot',
						quote: {
							...quote,
							symbol,
						},
					});
				}

				sendJson(ws, {
					type: 'subscribed',
					symbols: uniqueRequested,
				});
			} catch (error) {
				sendJson(ws, {
					type: 'error',
					message:
						error instanceof AppError
							? error.message
							: 'Unable to subscribe to one or more symbols.',
				});
			}
		};

		const unsubscribeSymbols = (
			requestedSymbols: string[],
			ws: { readyState: number; send: (data: string) => void }
		) => {
			const removed: string[] = [];
			for (const symbol of requestedSymbols) {
				const requested = normalizeSymbolInput(symbol);
				const providerSymbol = requestedToProvider.get(requested);
				if (!providerSymbol) {
					continue;
				}

				requestedToProvider.delete(requested);
				const providerSet = providerToRequested.get(providerSymbol);
				providerSet?.delete(requested);
				if (providerSet && providerSet.size === 0) {
					providerToRequested.delete(providerSymbol);
				}
				removed.push(requested);
			}

			sendJson(ws, {
				type: 'unsubscribed',
				symbols: removed,
			});
		};

		return {
			onOpen: (_event, ws) => {
				sendJson(ws, {
					type: 'ready',
					userId: user.id,
					symbols: initialRequestedSymbols,
				});

				unsubscribeTradeListener = onAlpacaTradeTick((tick) => {
					const requestedSymbols = providerToRequested.get(tick.providerSymbol);
					if (!requestedSymbols || requestedSymbols.size === 0) {
						return;
					}

					for (const requestedSymbol of requestedSymbols) {
						sendJson(ws, {
							type: 'quote',
							quote: {
								symbol: requestedSymbol,
								lastPrice: tick.lastPrice,
								asOf: tick.asOf,
								exchange: tick.exchange,
								source: 'websocket',
							},
						});
					}
				});

				void subscribeSymbols(initialRequestedSymbols, ws);
			},
			onMessage: (event, ws) => {
				const message = safeParseClientMessage(event.data);
				if (!message) {
					sendJson(ws, {
						type: 'error',
						message: 'Invalid websocket payload.',
					});
					return;
				}

				switch (message.type) {
					case 'subscribe':
						void subscribeSymbols(message.symbols, ws);
						return;
					case 'unsubscribe':
						unsubscribeSymbols(message.symbols, ws);
						return;
					case 'ping':
						sendJson(ws, { type: 'pong', asOf: new Date().toISOString() });
						return;
					default:
						sendJson(ws, {
							type: 'error',
							message: `Unsupported websocket action "${message.type}".`,
						});
				}
			},
			onClose: () => {
				unsubscribeTradeListener();
			},
			onError: () => {
				unsubscribeTradeListener();
			},
		};
	})
);

demoRoutes.get(
	'/holdings/:userId',
	requireAuth,
	zValidator('param', demoUserParamsSchema),
	async (c) => {
		const authUser = c.get('user');
		const { userId } = c.req.valid('param');

		try {
			assertAuthorizedPortfolioAccess(userId, authUser.id, authUser.isAdmin);
			const snapshot = await buildHoldingsSnapshot(userId);
			return ResponseHelper.success(c, {
				userId,
				cash: toApiDecimal(snapshot.cash),
				holdings: snapshot.holdings,
				totals: {
					holdingsValue: toApiDecimal(snapshot.holdingsValue),
					totalValue: toApiDecimal(snapshot.totalValue),
					totalPnl: toApiDecimal(snapshot.totalPnl),
					totalPnlPercent: toApiDecimal(snapshot.totalPnlPercent),
				},
			});
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}

			console.error('Demo holdings lookup failed:', error);
			throw new AppError('Unable to fetch demo holdings', 500, 'DEMO_HOLDINGS_FAILED');
		}
	}
);

demoRoutes.get(
	'/portfolio/:userId',
	requireAuth,
	zValidator('param', demoUserParamsSchema),
	async (c) => {
		const authUser = c.get('user');
		const { userId } = c.req.valid('param');

		try {
			assertAuthorizedPortfolioAccess(userId, authUser.id, authUser.isAdmin);
			const snapshot = await buildHoldingsSnapshot(userId);

			return ResponseHelper.success(c, {
				userId,
				cash: toApiDecimal(snapshot.cash),
				holdingsValue: toApiDecimal(snapshot.holdingsValue),
				totalValue: toApiDecimal(snapshot.totalValue),
				totalPnl: toApiDecimal(snapshot.totalPnl),
			});
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}

			console.error('Demo portfolio lookup failed:', error);
			throw new AppError('Unable to fetch demo portfolio', 500, 'DEMO_PORTFOLIO_FAILED');
		}
	}
);

demoRoutes.get(
	'/trades/:userId',
	requireAuth,
	zValidator('param', demoUserParamsSchema),
	async (c) => {
		const authUser = c.get('user');
		const { userId } = c.req.valid('param');

		try {
			assertAuthorizedPortfolioAccess(userId, authUser.id, authUser.isAdmin);
			const trades = await db.query.demoTrades.findMany({
				where: (trade, { eq }) => eq(trade.userId, userId),
				orderBy: (trade) => [desc(trade.timestamp)],
				with: {
					instrument: true,
				},
			});

			return ResponseHelper.success(c, {
				userId,
				trades: trades.map((trade) => {
					const quantity = new Decimal(trade.quantity);
					const price = new Decimal(trade.price);
					return {
						id: trade.id,
						symbol: trade.symbol,
						instrumentId: trade.instrumentId,
						side: trade.side,
						quantity: toApiDecimal(quantity),
						price: toApiDecimal(price),
						notional: toApiDecimal(quantity.mul(price)),
						timestamp: trade.timestamp.toISOString(),
					};
				}),
			});
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}

			console.error('Demo trade history lookup failed:', error);
			throw new AppError('Unable to fetch demo trade history', 500, 'DEMO_TRADE_HISTORY_FAILED');
		}
	}
);

export default demoRoutes;
