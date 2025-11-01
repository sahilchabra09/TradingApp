/**
 * Trading Hours Middleware
 * Ensures trades can only be placed during market hours
 * FSC Mauritius Compliance: Market operation hours enforcement
 */

import type { Context, Next } from 'hono';
import { TradingHoursError } from '../types/api';

interface TradingHours {
	open: string; // HH:MM format
	close: string; // HH:MM format
	timezone: string;
	daysOpen: number[]; // 0 = Sunday, 6 = Saturday
}

// Default trading hours for Mauritius Stock Exchange
const DEFAULT_TRADING_HOURS: TradingHours = {
	open: '09:30',
	close: '15:30',
	timezone: 'Indian/Mauritius',
	daysOpen: [1, 2, 3, 4, 5], // Monday to Friday
};

/**
 * Check if current time is within trading hours
 */
function isTradingHours(config: TradingHours = DEFAULT_TRADING_HOURS): boolean {
	const now = new Date();
	
	// Convert to market timezone
	const marketTime = new Date(
		now.toLocaleString('en-US', { timeZone: config.timezone })
	);

	// Check if today is a trading day
	const dayOfWeek = marketTime.getDay();
	if (!config.daysOpen.includes(dayOfWeek)) {
		return false;
	}

	// Parse market open and close times
	const [openHour, openMinute] = config.open.split(':').map(Number);
	const [closeHour, closeMinute] = config.close.split(':').map(Number);

	const openTime = new Date(marketTime);
	openTime.setHours(openHour, openMinute, 0, 0);

	const closeTime = new Date(marketTime);
	closeTime.setHours(closeHour, closeMinute, 0, 0);

	// Check if current time is between open and close
	return marketTime >= openTime && marketTime <= closeTime;
}

/**
 * Get next trading session info
 */
function getNextTradingSession(config: TradingHours = DEFAULT_TRADING_HOURS): {
	opensAt: Date;
	message: string;
} {
	const now = new Date();
	const marketTime = new Date(
		now.toLocaleString('en-US', { timeZone: config.timezone })
	);

	const [openHour, openMinute] = config.open.split(':').map(Number);
	const nextOpen = new Date(marketTime);
	nextOpen.setHours(openHour, openMinute, 0, 0);

	// If today is not a trading day or market closed, find next trading day
	let dayOfWeek = marketTime.getDay();
	let daysToAdd = 0;

	// If market already closed today or not a trading day, start from tomorrow
	if (marketTime >= nextOpen || !config.daysOpen.includes(dayOfWeek)) {
		daysToAdd = 1;
		dayOfWeek = (dayOfWeek + 1) % 7;
	}

	// Find next trading day
	while (!config.daysOpen.includes(dayOfWeek)) {
		daysToAdd++;
		dayOfWeek = (dayOfWeek + 1) % 7;
	}

	nextOpen.setDate(nextOpen.getDate() + daysToAdd);

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const message = daysToAdd === 0
		? `Market opens today at ${config.open}`
		: `Market opens on ${dayNames[dayOfWeek]} at ${config.open}`;

	return { opensAt: nextOpen, message };
}

/**
 * Trading hours enforcement middleware
 * Only applies to trading-related endpoints
 */
export const enforceTradingHours = async (c: Context, next: Next) => {
	// Check if this is a trading endpoint
	const path = c.req.path;
	const isTradingEndpoint =
		path.includes('/trades/order') ||
		path.includes('/orders') && c.req.method === 'POST';

	if (!isTradingEndpoint) {
		return next();
	}

	// Check trading hours
	if (!isTradingHours()) {
		const nextSession = getNextTradingSession();

		throw new TradingHoursError(
			`Trading is not allowed outside market hours. ${nextSession.message}`
		);
	}

	await next();
};

/**
 * Check if markets are currently open (utility function)
 */
export function areMarketsOpen(): boolean {
	return isTradingHours();
}
