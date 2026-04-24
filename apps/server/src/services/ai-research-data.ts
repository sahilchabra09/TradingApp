/**
 * AI Research Data Service
 *
 * Fetches market data from Alpaca and formats it into text files
 * suitable for uploading to an AutoSage knowledge base.
 *
 * Produces 3 files per stock:
 * 1. Pricing data — OHLCV bars + current snapshot
 * 2. Historical news — past articles
 * 3. Real-time / latest news — most recent articles
 */

import { getAlpacaSnapshot, getAlpacaHistoricalBars, type HistoricalBar } from './alpaca';
import { getHistoricalNews } from './news.service';
import type { NewsArticle } from '../types/news';

// ─── Pricing Document ─────────────────────────────────────────────────────────

function formatBar(bar: HistoricalBar): string {
	return `${bar.t} | O: ${bar.o.toFixed(2)} | H: ${bar.h.toFixed(2)} | L: ${bar.l.toFixed(2)} | C: ${bar.c.toFixed(2)} | Vol: ${bar.v}`;
}

export async function buildPricingDocument(symbol: string): Promise<string> {
	const sym = symbol.toUpperCase();

	// Fetch current snapshot
	let snapshotSection = '';
	try {
		const snapshot = await getAlpacaSnapshot(sym);
		snapshotSection = [
			'## Current Market Snapshot',
			`Symbol: ${snapshot.symbol}`,
			`Company: ${snapshot.instrumentName || sym}`,
			`Exchange: ${snapshot.exchange}`,
			`Currency: ${snapshot.currency || 'USD'}`,
			`Last Price: $${snapshot.lastPrice}`,
			`Price Source: ${snapshot.lastPriceSource}`,
			`As Of: ${snapshot.asOf}`,
			`Data Feed: ${snapshot.marketDataFeed}`,
			'',
		].join('\n');
	} catch (err) {
		snapshotSection = `## Current Market Snapshot\nUnavailable: ${err instanceof Error ? err.message : 'unknown error'}\n\n`;
	}

	// Fetch historical bars for multiple periods
	const periods = ['1D', '1W', '1M', '3M', '1Y'] as const;
	const barSections: string[] = [];

	for (const period of periods) {
		try {
			const bars = await getAlpacaHistoricalBars(sym, period);
			if (bars.length > 0) {
				const header = `## Price History — ${period} (${bars.length} bars)`;
				const rows = bars.map(formatBar);
				barSections.push([header, 'Timestamp | Open | High | Low | Close | Volume', ...rows, ''].join('\n'));
			}
		} catch {
			barSections.push(`## Price History — ${period}\nNo data available.\n`);
		}
	}

	const doc = [
		`# ${sym} — Pricing & Market Data`,
		`Generated: ${new Date().toISOString()}`,
		'',
		snapshotSection,
		...barSections,
	].join('\n');

	return doc;
}

// ─── News Documents ───────────────────────────────────────────────────────────

function formatNewsArticle(article: NewsArticle): string {
	const lines = [
		`### ${article.headline}`,
		`Date: ${article.created_at}`,
		`Source: ${article.source}`,
		`Author: ${article.author || 'Unknown'}`,
		`Symbols: ${article.symbols.join(', ') || 'N/A'}`,
	];

	if (article.summary) {
		lines.push(`Summary: ${article.summary}`);
	}
	if (article.content) {
		// Strip HTML tags for cleaner text
		const cleanContent = article.content
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		if (cleanContent.length > 0) {
			lines.push(`Content: ${cleanContent}`);
		}
	}
	if (article.url) {
		lines.push(`URL: ${article.url}`);
	}

	lines.push('');
	return lines.join('\n');
}

/**
 * Fetch historical news (older articles, up to 50) for comprehensive analysis.
 */
export async function buildHistoricalNewsDocument(symbol: string): Promise<string> {
	const sym = symbol.toUpperCase();

	// Fetch a larger batch of historical news
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

	const allArticles: NewsArticle[] = [];
	let pageToken: string | undefined;
	let pages = 0;
	const maxPages = 3; // Up to 150 articles

	while (pages < maxPages) {
		const result = await getHistoricalNews({
			symbols: sym,
			limit: 50,
			sort: 'desc',
			start: threeMonthsAgo.toISOString(),
			include_content: true,
			exclude_contentless: false,
			page_token: pageToken,
		});

		allArticles.push(...result.news);
		pages++;

		if (!result.next_page_token) break;
		pageToken = result.next_page_token;
	}

	const doc = [
		`# ${sym} — Historical News Articles`,
		`Generated: ${new Date().toISOString()}`,
		`Total Articles: ${allArticles.length}`,
		`Date Range: ${threeMonthsAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
		'',
		...allArticles.map(formatNewsArticle),
	].join('\n');

	return doc;
}

/**
 * Fetch the latest / real-time news (most recent articles, up to 20).
 * This is the document that gets refreshed every 30 minutes.
 */
export async function buildRealtimeNewsDocument(symbol: string): Promise<string> {
	const sym = symbol.toUpperCase();

	const result = await getHistoricalNews({
		symbols: sym,
		limit: 20,
		sort: 'desc',
		include_content: true,
		exclude_contentless: false,
	});

	const doc = [
		`# ${sym} — Latest News & Updates`,
		`Generated: ${new Date().toISOString()}`,
		`Total Articles: ${result.news.length}`,
		'',
		...result.news.map(formatNewsArticle),
	].join('\n');

	return doc;
}

/**
 * Build the initial research prompt that asks AutoSage to generate
 * a comprehensive research report.
 */
export function buildInitialResearchPrompt(symbol: string): string {
	return `Generate a comprehensive research report for ${symbol.toUpperCase()}. 

Analyze all available data in the knowledge base including:
- Current pricing and recent price action
- Historical price trends across multiple timeframes (intraday, weekly, monthly, quarterly, yearly)
- Volume patterns and any unusual activity
- All available news articles — identify key themes, sentiment (bullish/bearish/neutral), and potential market impact
- Correlations between news events and price movements

Structure your report as:
1. **Executive Summary** — 2-3 sentence overview of the stock's current situation
2. **Price Analysis** — Current price, recent trend direction, key price levels, volume analysis
3. **News & Sentiment Analysis** — Key themes from recent news, overall sentiment assessment
4. **Technical Outlook** — Based on the available price history patterns
5. **Key Risks & Catalysts** — Upcoming events or factors that could move the stock
6. **Conclusion & Outlook** — Your assessment of the near-term outlook

Be thorough, specific, and always cite data points from the available documents.`;
}
