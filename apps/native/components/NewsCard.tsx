/**
 * NewsCard
 * Reusable card for displaying a single news article.
 *
 * Two variants:
 *   "full"    — used in the news feed list (headline + summary + meta)
 *   "compact" — used in the asset-detail "Latest News" section (headline + meta only)
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NewsArticle } from '@/lib/news-api';
import { useTheme } from '@/lib/hooks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoDate: string): string {
	const diff = Date.now() - new Date(isoDate).getTime();
	if (isNaN(diff)) return '';
	const mins  = Math.floor(diff / 60_000);
	const hours = Math.floor(diff / 3_600_000);
	const days  = Math.floor(diff / 86_400_000);
	if (mins < 1)   return 'just now';
	if (mins < 60)  return `${mins}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7)   return `${days}d ago`;
	return new Date(isoDate).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

function capitalise(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Full card (news feed) ────────────────────────────────────────────────────

type NewsCardProps = {
	article: NewsArticle;
	onPress: () => void;
	isLive?: boolean;
};

export function NewsCard({ article, onPress, isLive = false }: NewsCardProps) {
	const theme = useTheme();

	const summary = article.summary
		? stripHtml(article.summary)
		: article.content
		? stripHtml(article.content).slice(0, 160)
		: '';

	return (
		<TouchableOpacity
			activeOpacity={0.82}
			onPress={onPress}
			style={{
				backgroundColor: theme.colors.surface.primary,
				borderRadius: 16,
				padding: 16,
				marginBottom: 10,
				borderWidth: 1,
				borderColor: isLive
					? theme.colors.error + '33'
					: theme.colors.border.primary,
			}}
		>
			{/* ── Top meta row ─────────────────────────────────── */}
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					marginBottom: 8,
					gap: 6,
					flexWrap: 'wrap',
				}}
			>
				{isLive && (
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							paddingHorizontal: 6,
							paddingVertical: 2,
							borderRadius: 6,
							backgroundColor: theme.colors.error + '1F',
							borderWidth: 1,
							borderColor: theme.colors.error + '40',
							gap: 4,
						}}
					>
						<View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: theme.colors.error }} />
						<Text style={{ color: theme.colors.error, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 }}>
							LIVE
						</Text>
					</View>
				)}
				<Text style={{ color: theme.colors.text.tertiary, fontSize: 11 }}>
					{capitalise(article.source || 'news')}
				</Text>
				<Text style={{ color: theme.colors.text.disabled, fontSize: 11 }}>·</Text>
				<Text style={{ color: theme.colors.text.tertiary, fontSize: 11 }}>
					{formatRelativeTime(article.created_at)}
				</Text>
				{article.author ? (
					<>
						<Text style={{ color: theme.colors.text.disabled, fontSize: 11 }}>·</Text>
						<Text style={{ color: theme.colors.text.tertiary, fontSize: 11 }} numberOfLines={1}>
							{article.author}
						</Text>
					</>
				) : null}
			</View>

			{/* ── Headline ─────────────────────────────────────── */}
			<Text
				style={{
					color: theme.colors.text.primary,
					fontSize: 15,
					fontWeight: '600',
					lineHeight: 22,
					marginBottom: summary ? 6 : 10,
				}}
				numberOfLines={3}
			>
				{article.headline}
			</Text>

			{/* ── Summary ──────────────────────────────────────── */}
			{summary ? (
				<Text
					style={{
						color: theme.colors.text.secondary,
						fontSize: 13,
						lineHeight: 19,
						marginBottom: 10,
					}}
					numberOfLines={2}
				>
					{summary}
				</Text>
			) : null}

			{/* ── Bottom row: symbols + read more ──────────────── */}
			<View
				style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
			>
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1, gap: 4 }}>
					{article.symbols.slice(0, 4).map((s) => (
						<View
							key={s}
							style={{
								paddingHorizontal: 7,
								paddingVertical: 2,
								borderRadius: 6,
								backgroundColor: theme.colors.accent.glow,
								borderWidth: 1,
								borderColor: theme.colors.border.accent,
								marginRight: 4,
							}}
						>
							<Text style={{ color: theme.colors.accent.primary, fontSize: 10, fontWeight: '700' }}>
								{s}
							</Text>
						</View>
					))}
					{article.symbols.length > 4 && (
						<Text style={{ color: theme.colors.text.disabled, fontSize: 10, alignSelf: 'center' }}>
							+{article.symbols.length - 4}
						</Text>
					)}
				</View>
				<Ionicons name="chevron-forward" size={14} color={theme.colors.text.disabled} />
			</View>
		</TouchableOpacity>
	);
}

// ─── Compact card (asset-detail Latest News) ─────────────────────────────────

type CompactNewsCardProps = {
	article: NewsArticle;
	onPress: () => void;
};

export function CompactNewsCard({ article, onPress }: CompactNewsCardProps) {
	const theme = useTheme();

	return (
		<TouchableOpacity
			activeOpacity={0.82}
			onPress={onPress}
			style={{
				backgroundColor: theme.colors.surface.glass,
				borderRadius: 12,
				padding: 12,
				marginBottom: 8,
				borderWidth: 1,
				borderColor: theme.colors.border.primary,
				flexDirection: 'row',
				alignItems: 'center',
				gap: 10,
			}}
		>
			<View style={{ flex: 1 }}>
				<Text
					style={{ color: theme.colors.text.primary, fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 4 }}
					numberOfLines={2}
				>
					{article.headline}
				</Text>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
					<Text style={{ color: theme.colors.text.tertiary, fontSize: 11 }}>
						{capitalise(article.source || 'news')}
					</Text>
					<Text style={{ color: theme.colors.text.disabled, fontSize: 11 }}>·</Text>
					<Text style={{ color: theme.colors.text.tertiary, fontSize: 11 }}>
						{formatRelativeTime(article.created_at)}
					</Text>
				</View>
			</View>
			<Ionicons name="chevron-forward" size={14} color={theme.colors.text.disabled} />
		</TouchableOpacity>
	);
}
