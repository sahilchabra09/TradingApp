/**
 * News Tab Screen
 *
 * Two modes, toggled by the segment control at the top:
 *   LIVE      — WebSocket stream
 *   HISTORY   — Paginated REST fetch
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Spinner } from '@/components/Spinner';
import { NewsCard } from '@/components/NewsCard';
import { useAppTheme } from '@/lib/ThemeContext';
import { fetchNews } from '@/lib/news-api';
import { useNewsStream, useStableToken, useDebounce } from '@/lib/hooks';
import type { NewsArticle } from '@/lib/news-api';

const PAGE_SIZE = 20;
type FeedMode = 'live' | 'history';

export default function NewsScreen() {
	const router                   = useRouter();
	const { theme }                = useAppTheme();
	const { isSignedIn, getToken } = useAuth();
	const stableGetToken           = useStableToken(getToken);
	const params                   = useLocalSearchParams<{ symbol?: string }>();

	const initialSymbol = params.symbol ? String(params.symbol).toUpperCase() : '';
	const [mode, setMode]               = useState<FeedMode>(initialSymbol ? 'history' : 'live');
	const [searchQuery, setSearchQuery] = useState(initialSymbol);
	const debouncedQuery                = useDebounce(searchQuery, 350);
	const isSearching                   = debouncedQuery.trim().length > 0;

	useEffect(() => {
		if (params.symbol) {
			const sym = String(params.symbol).toUpperCase();
			setSearchQuery(sym);
			setMode('history');
		}
	}, [params.symbol]);

	// ── Live feed (WebSocket) ─────────────────────────────────────────────────
	const [liveArticles, setLiveArticles]   = useState<NewsArticle[]>([]);
	const [hasLiveHistory, setHasLiveHistory] = useState(false);

	const handleHistory = useCallback((articles: NewsArticle[]) => {
		setLiveArticles(articles);
		setHasLiveHistory(true);
	}, []);

	const handleArticle = useCallback((article: NewsArticle) => {
		setLiveArticles((prev) => {
			if (prev.some((a) => a.id === article.id)) return prev;
			return [article, ...prev];
		});
	}, []);

	const { connectionState } = useNewsStream({
		enabled: isSignedIn === true && mode === 'live',
		symbols: ['*'],
		getToken: stableGetToken,
		onHistory: handleHistory,
		onArticle: handleArticle,
		onReady:   useCallback(() => setHasLiveHistory(false), []),
	});

	const isLiveConnected = connectionState === 'open';
	const isLiveLoading   = (connectionState === 'connecting' || connectionState === 'reconnecting') && !hasLiveHistory;

	// ── History feed (REST + pagination) ─────────────────────────────────────
	const [historyArticles, setHistoryArticles] = useState<NewsArticle[]>([]);
	const [historyLoading, setHistoryLoading]   = useState(false);
	const [historyRefreshing, setHistoryRefreshing] = useState(false);
	const [nextPageToken, setNextPageToken]     = useState<string | null>(null);
	const [historyError, setHistoryError]       = useState<string | null>(null);
	const loadingMoreRef                        = useRef(false);

	const loadHistory = useCallback(
		async (replace = true, pageToken?: string) => {
			if (!isSignedIn) return;
			if (replace) {
				setHistoryLoading(true);
				setHistoryError(null);
			}
			try {
				const result = await fetchNews(
					{
						symbols: debouncedQuery.trim() ? debouncedQuery.trim().toUpperCase() : undefined,
						limit: PAGE_SIZE,
						sort: 'desc',
						pageToken,
					},
					stableGetToken
				);

				setHistoryArticles((prev) => {
					if (replace) return result.news;
					// Deduplicate — Alpaca can return the same article ID across pages
					const existingIds = new Set(prev.map((a) => a.id));
					const fresh = result.news.filter((a) => !existingIds.has(a.id));
					return [...prev, ...fresh];
				});
				setNextPageToken(result.next_page_token);
				setHistoryError(null);
			} catch (err) {
				setHistoryError(
					err instanceof Error ? err.message : 'Unable to load news.'
				);
			} finally {
				setHistoryLoading(false);
				setHistoryRefreshing(false);
				loadingMoreRef.current = false;
			}
		},
		[isSignedIn, stableGetToken, debouncedQuery]
	);

	useEffect(() => {
		if (mode === 'history' || isSearching) void loadHistory(true);
	}, [mode, debouncedQuery]);

	const handleRefresh = useCallback(() => {
		setHistoryRefreshing(true);
		void loadHistory(true);
	}, [loadHistory]);

	const handleLoadMore = useCallback(() => {
		if (loadingMoreRef.current || !nextPageToken) return;
		loadingMoreRef.current = true;
		void loadHistory(false, nextPageToken);
	}, [loadHistory, nextPageToken]);

	const displayArticles: NewsArticle[] = mode === 'live' ? liveArticles : historyArticles;

	const filteredArticles = useMemo(() => {
		if (!isSearching || mode !== 'live') return displayArticles;
		const q = debouncedQuery.trim().toUpperCase();
		return displayArticles.filter(
			(a) =>
				a.symbols.some((s) => s.includes(q)) ||
				a.headline.toUpperCase().includes(q) ||
				a.source.toUpperCase().includes(q)
		);
	}, [displayArticles, isSearching, debouncedQuery, mode]);

	const openArticle = useCallback(
		(article: NewsArticle) => {
			router.push({
				pathname: '/news/article',
				params: { data: JSON.stringify(article) },
			});
		},
		[router]
	);

	const showSpinner =
		(mode === 'live' && isLiveLoading) ||
		(mode === 'history' && historyLoading && historyArticles.length === 0);

	const errorMessage = mode === 'history' ? historyError : null;

	return (
		<LinearGradient
			colors={theme.colors.background.gradient as [string, string, string]}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				{/* Header */}
				<View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
						<Text
							style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: '700', flex: 1, letterSpacing: -0.3 }}
						>
							Market News
						</Text>
						{mode === 'live' && (
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
								<View
									style={{
										width: 7,
										height: 7,
										borderRadius: 4,
										backgroundColor: isLiveConnected ? theme.colors.success : theme.colors.warning,
									}}
								/>
								<Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
									{isLiveConnected
										? 'Live'
										: connectionState === 'reconnecting'
										? 'Reconnecting...'
										: 'Connecting...'}
								</Text>
							</View>
						)}
					</View>

					{/* Mode toggle */}
					<View
						style={{
							flexDirection: 'row',
							backgroundColor: theme.colors.surface.primary,
							borderRadius: 12,
							padding: 3,
							marginBottom: 10,
							borderWidth: 1,
							borderColor: theme.colors.border.primary,
						}}
					>
						{(['live', 'history'] as FeedMode[]).map((m) => (
							<TouchableOpacity
								key={m}
								onPress={() => setMode(m)}
								style={{
									flex: 1,
									paddingVertical: 7,
									borderRadius: 10,
									alignItems: 'center',
									backgroundColor:
										mode === m ? theme.colors.surface.elevated : 'transparent',
									borderWidth: mode === m ? 1 : 0,
									borderColor: theme.colors.border.secondary,
								}}
							>
								<Text
									style={{
										color: mode === m ? theme.colors.accent.primary : theme.colors.text.tertiary,
										fontSize: 13,
										fontWeight: mode === m ? '700' : '500',
									}}
								>
									{m === 'live' ? 'Live' : 'History'}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					{/* Search bar */}
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							backgroundColor: theme.colors.surface.secondary,
							borderRadius: 14,
							paddingHorizontal: 12,
							height: 44,
							borderWidth: 1,
							borderColor: theme.colors.border.primary,
						}}
					>
						<Ionicons
							name="search"
							size={16}
							color={theme.colors.text.tertiary}
							style={{ marginRight: 8 }}
						/>
						<TextInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search by symbol or keyword..."
							placeholderTextColor={theme.colors.text.disabled}
							style={{ flex: 1, color: theme.colors.text.primary, fontSize: 14 }}
							autoCapitalize="characters"
							autoCorrect={false}
							returnKeyType="search"
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery('')}>
								<Ionicons name="close-circle" size={16} color={theme.colors.text.tertiary} />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Error banner */}
				{errorMessage ? (
					<View
						style={{
							marginHorizontal: 16,
							marginBottom: 8,
							padding: 12,
							borderRadius: 12,
							backgroundColor: `${theme.colors.error}15`,
							borderWidth: 1,
							borderColor: `${theme.colors.error}25`,
						}}
					>
						<Text style={{ color: theme.colors.error, fontSize: 13 }}>{errorMessage}</Text>
					</View>
				) : null}

				{/* Content */}
				{showSpinner ? (
					<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
						<Spinner size="large" />
						<Text style={{ color: theme.colors.text.tertiary, marginTop: 14, fontSize: 14 }}>
							{mode === 'live' ? 'Connecting to live feed...' : 'Loading news...'}
						</Text>
					</View>
				) : (
					<FlatList
						data={filteredArticles}
						keyExtractor={(item, index) => `${item.id}-${index}`}
						contentContainerStyle={{
							paddingHorizontal: 16,
							paddingTop: 4,
							paddingBottom: 120,
						}}
						showsVerticalScrollIndicator={false}
						onRefresh={mode === 'history' ? handleRefresh : undefined}
						refreshing={historyRefreshing}
						onEndReached={mode === 'history' ? handleLoadMore : undefined}
						onEndReachedThreshold={0.4}
						renderItem={({ item, index }) => (
							<NewsCard
								article={item}
								onPress={() => openArticle(item)}
								isLive={mode === 'live' && index === 0 && isLiveConnected}
							/>
						)}
						ListFooterComponent={
							mode === 'history' && loadingMoreRef.current ? (
								<View style={{ paddingVertical: 16, alignItems: 'center' }}>
									<ActivityIndicator color={theme.colors.accent.primary} />
								</View>
							) : null
						}
						ListEmptyComponent={
							<View
								style={{
									padding: 32,
									alignItems: 'center',
									backgroundColor: theme.colors.surface.primary,
									borderRadius: 16,
									borderWidth: 1,
									borderColor: theme.colors.border.primary,
								}}
							>
								<Ionicons
									name="newspaper-outline"
									size={36}
									color={theme.colors.text.disabled}
									style={{ marginBottom: 12 }}
								/>
								<Text
									style={{ color: theme.colors.text.tertiary, fontSize: 14, textAlign: 'center' }}
								>
									{isSearching
										? `No news found for "${debouncedQuery.trim()}".`
										: mode === 'live'
										? 'Waiting for live articles...'
										: 'No articles available.'}
								</Text>
							</View>
						}
					/>
				)}
			</SafeAreaView>
		</LinearGradient>
	);
}
