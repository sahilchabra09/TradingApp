/**
 * Common Database Operations - Quick Reference
 * FSC Mauritius Compliant Trading Platform
 */

import { db, eq, and, desc, sql, gte } from './index';
import * as schema from './schema';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NeonHttpQueryResultHKT } from 'drizzle-orm/neon-http';
import type { ExtractTablesWithRelations } from 'drizzle-orm';

// Type alias for transaction
type DbTransaction = PgTransaction<
	NeonHttpQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

// ============================================================================
// USER OPERATIONS
// ============================================================================

// Create user with wallet
export async function createUserWithWallet(userData: any) {
	return await db.transaction(async (tx) => {
		const [user] = await tx.insert(schema.users).values(userData).returning();
		
		const [wallet] = await tx.insert(schema.wallets).values({
			userId: user.id,
			currency: 'USD',
			availableBalance: '0',
			reservedBalance: '0',
			totalBalance: '0',
		}).returning();
		
		return { user, wallet };
	});
}

// Get user with complete portfolio
export async function getUserPortfolio(userId: string) {
	return await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
		with: {
			wallets: true,
			holdings: {
				with: {
					asset: true,
				},
			},
			trades: {
				where: sql`${schema.trades.status} IN ('open', 'pending', 'partially_filled')`,
				with: {
					asset: true,
				},
				orderBy: [desc(schema.trades.placedAt)],
				limit: 10,
			},
		},
	});
}

// ============================================================================
// TRADING OPERATIONS
// ============================================================================

// Place market order
export async function placeMarketOrder(
	userId: string,
	assetId: string,
	side: 'buy' | 'sell',
	quantity: string
) {
	return await db.transaction(async (tx: DbTransaction) => {
		// Verify user and asset
		const user = await tx.query.users.findFirst({
			where: eq(schema.users.id, userId),
		});
		
		const asset = await tx.query.assets.findFirst({
			where: eq(schema.assets.id, assetId),
		});
		
		if (!user || user.accountStatus !== 'active') {
			throw new Error('User account not active');
		}
		
		if (!asset || !asset.isTradable) {
			throw new Error('Asset not tradable');
		}
		
		// Create trade
		const [trade] = await tx.insert(schema.trades).values({
			userId,
			assetId,
			orderType: 'market',
			side,
			quantity,
			remainingQuantity: quantity,
			filledQuantity: '0',
			status: 'pending',
			timeInForce: 'day',
		}).returning();
		
		// Log audit
		await tx.insert(schema.auditLogs).values({
			userId,
			eventType: 'trade.placed',
			eventCategory: 'trading',
			severity: 'info',
			description: `${side.toUpperCase()} market order placed`,
			metadata: { tradeId: trade.id, asset: asset.symbol },
		});
		
		return trade;
	});
}

// Execute trade (partial or full)
export async function executeTrade(
	tradeId: string,
	executionPrice: string,
	executedQuantity: string
) {
	return await db.transaction(async (tx: DbTransaction) => {
		const trade = await tx.query.trades.findFirst({
			where: eq(schema.trades.id, tradeId),
		});
		
		if (!trade) throw new Error('Trade not found');
		
		const newFilledQuantity = (
			parseFloat(trade.filledQuantity) + parseFloat(executedQuantity)
		).toString();
		
		const newRemainingQuantity = (
			parseFloat(trade.quantity) - parseFloat(newFilledQuantity)
		).toString();
		
		const newStatus = 
			parseFloat(newRemainingQuantity) === 0 ? 'filled' : 'partially_filled';
		
		// Calculate average execution price
		const previousValue = parseFloat(trade.filledQuantity) * 
			(trade.averageExecutionPrice ? parseFloat(trade.averageExecutionPrice) : 0);
		const newValue = parseFloat(executedQuantity) * parseFloat(executionPrice);
		const totalQuantity = parseFloat(newFilledQuantity);
		const avgPrice = ((previousValue + newValue) / totalQuantity).toString();
		
		// Update trade
		const [updatedTrade] = await tx
			.update(schema.trades)
			.set({
				filledQuantity: newFilledQuantity,
				remainingQuantity: newRemainingQuantity,
				averageExecutionPrice: avgPrice,
				status: newStatus,
				executedAt: newStatus === 'filled' ? new Date() : trade.executedAt,
				updatedAt: new Date(),
			})
			.where(eq(schema.trades.id, tradeId))
			.returning();
		
		// Update or create holding
		if (newStatus === 'filled' || newStatus === 'partially_filled') {
			if (trade.side === 'buy') {
				await updateHoldingAfterBuy(tx, trade, executedQuantity, executionPrice);
			} else {
				await updateHoldingAfterSell(tx, trade, executedQuantity, executionPrice);
			}
		}
		
		return updatedTrade;
	});
}

// Helper: Update holding after buy
async function updateHoldingAfterBuy(
	tx: DbTransaction,
	trade: any,
	quantity: string,
	price: string
) {
	const existingHolding = await tx.query.holdings.findFirst({
		where: and(
			eq(schema.holdings.userId, trade.userId),
			eq(schema.holdings.assetId, trade.assetId)
		),
	});
	
	if (existingHolding) {
		const totalQuantity = parseFloat(existingHolding.quantity) + parseFloat(quantity);
		const totalInvested = 
			parseFloat(existingHolding.totalInvested) + 
			(parseFloat(quantity) * parseFloat(price));
		const avgPrice = totalInvested / totalQuantity;
		
		await tx
			.update(schema.holdings)
			.set({
				quantity: totalQuantity.toString(),
				averagePurchasePrice: avgPrice.toString(),
				totalInvested: totalInvested.toString(),
				updatedAt: new Date(),
			})
			.where(eq(schema.holdings.id, existingHolding.id));
	} else {
		const invested = parseFloat(quantity) * parseFloat(price);
		await tx.insert(schema.holdings).values({
			userId: trade.userId,
			assetId: trade.assetId,
			quantity,
			averagePurchasePrice: price,
			totalInvested: invested.toString(),
			currentValue: invested.toString(),
			unrealizedPnl: '0',
			realizedPnl: '0',
		});
	}
}

// Helper: Update holding after sell
async function updateHoldingAfterSell(
	tx: DbTransaction,
	trade: any,
	quantity: string,
	price: string
) {
	const holding = await tx.query.holdings.findFirst({
		where: and(
			eq(schema.holdings.userId, trade.userId),
			eq(schema.holdings.assetId, trade.assetId)
		),
	});
	
	if (!holding) throw new Error('Holding not found');
	
	const newQuantity = parseFloat(holding.quantity) - parseFloat(quantity);
	const costBasis = parseFloat(quantity) * parseFloat(holding.averagePurchasePrice);
	const saleValue = parseFloat(quantity) * parseFloat(price);
	const realizedPnl = saleValue - costBasis;
	
	if (newQuantity === 0) {
		// Close position
		await tx.delete(schema.holdings).where(eq(schema.holdings.id, holding.id));
	} else {
		await tx
			.update(schema.holdings)
			.set({
				quantity: newQuantity.toString(),
				totalInvested: (parseFloat(holding.totalInvested) - costBasis).toString(),
				realizedPnl: (parseFloat(holding.realizedPnl) + realizedPnl).toString(),
				updatedAt: new Date(),
			})
			.where(eq(schema.holdings.id, holding.id));
	}
}

// ============================================================================
// WALLET OPERATIONS
// ============================================================================

// Deposit funds
export async function depositFunds(
	userId: string,
	currency: string,
	amount: string,
	paymentMethod: 'bank_transfer' | 'card' | 'mcb_juice' | 'mips' | 'crypto' | 'mobile_money' | 'other',
	metadata: any = {}
) {
	return await db.transaction(async (tx) => {
		// Get wallet
		const wallet = await tx.query.wallets.findFirst({
			where: and(
				eq(schema.wallets.userId, userId),
				eq(schema.wallets.currency, currency)
			),
		});
		
		if (!wallet) throw new Error('Wallet not found');
		
		// Create deposit transaction
		const [deposit] = await tx.insert(schema.depositTransactions).values({
			userId,
			walletId: wallet.id,
			amount,
			currency,
			paymentMethod,
			status: 'pending',
			metadata,
		}).returning();
		
		// Log audit
		await tx.insert(schema.auditLogs).values({
			userId,
			eventType: 'deposit.initiated',
			eventCategory: 'financial',
			severity: 'info',
			description: `Deposit of ${amount} ${currency} initiated`,
			metadata: { depositId: deposit.id, amount, currency },
		});
		
		return deposit;
	});
}

// Clear deposit (funds available)
export async function clearDeposit(depositId: string) {
	return await db.transaction(async (tx: DbTransaction) => {
		const deposit = await tx.query.depositTransactions.findFirst({
			where: eq(schema.depositTransactions.id, depositId),
		});
		
		if (!deposit) throw new Error('Deposit not found');
		
		// Update wallet
		await tx
			.update(schema.wallets)
			.set({
				availableBalance: sql`${schema.wallets.availableBalance} + ${deposit.amount}`,
				totalBalance: sql`${schema.wallets.totalBalance} + ${deposit.amount}`,
				lastTransactionAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(schema.wallets.id, deposit.walletId));
		
		// Update deposit status
		const [clearedDeposit] = await tx
			.update(schema.depositTransactions)
			.set({
				status: 'cleared',
				settlementDate: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(schema.depositTransactions.id, depositId))
			.returning();
		
		return clearedDeposit;
	});
}

// ============================================================================
// COMPLIANCE OPERATIONS
// ============================================================================

// Perform AML check
export async function performAmlCheck(
	userId: string,
	checkType: 'sanctions_screening' | 'pep_check' | 'adverse_media' | 'transaction_monitoring' | 'source_of_funds',
	provider: string,
	result: any
) {
	return await db.insert(schema.amlChecks).values({
		userId,
		checkType,
		checkProvider: provider,
		checkResult: result.status,
		riskScore: result.riskScore,
		riskLevel: result.riskLevel,
		findings: result.findings,
		providerCheckId: result.id,
		nextCheckDue: result.nextCheckDate,
	}).returning();
}

// Log audit event
export async function logAuditEvent(event: {
	userId?: string;
	eventType: string;
	eventCategory: 'authentication' | 'trading' | 'compliance' | 'admin_action' | 'system' | 'financial' | 'security';
	severity?: 'info' | 'warning' | 'error' | 'critical';
	description: string;
	metadata?: any;
	ipAddress?: string;
	userAgent?: string;
}) {
	return await db.insert(schema.auditLogs).values({
		...event,
		severity: event.severity || 'info',
	}).returning();
}

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

// Get user trading statistics
export async function getUserTradingStats(userId: string, days: number = 30) {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	
	const trades = await db.query.trades.findMany({
		where: and(
			eq(schema.trades.userId, userId),
			gte(schema.trades.placedAt, startDate)
		),
	});
	
	const totalTrades = trades.length;
	const completedTrades = trades.filter((t: typeof schema.trades.$inferSelect) => t.status === 'filled').length;
	const totalVolume = trades.reduce(
		(sum: number, t: typeof schema.trades.$inferSelect) => sum + parseFloat(t.totalValue || '0'),
		0
	);
	
	return {
		totalTrades,
		completedTrades,
		successRate: totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0,
		totalVolume,
	};
}

// Get top performing assets
export async function getTopPerformingAssets(userId: string, limit: number = 5) {
	return await db.query.holdings.findMany({
		where: eq(schema.holdings.userId, userId),
		with: {
			asset: true,
		},
		orderBy: [desc(schema.holdings.unrealizedPnl)],
		limit,
	});
}
