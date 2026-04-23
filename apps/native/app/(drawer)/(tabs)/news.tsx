/**
 * News Tab Screen
 *
 * Two modes, toggled by the segment control at the top:
 *
 *   LIVE      — WebSocket stream: new articles prepend the list in real time.
 *               The server sends the last 50 buffered articles on connect so
 *               the feed is never empty.  A green "● LIVE" dot shows stream
 *               health.
 *
 *   HISTORY   — Paginated REST fetch from Alpaca's historical news endpoint.
 *               Supports infinite scroll and pull-to-refresh.
 *
 * Both modes support the search bar which filters by symbol / keyword.
 * Searching switches to HISTORY mode automatically (REST supports symbol
 * filtering natively; the WS buffer is too small for keyword search).
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
import { fetchNews } from '@/lib/news-api';
import { useNewsStream, useStableToken, useDebounce } from '@/lib/hooks';
import type { NewsArticle } from '@/lib/news-api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type FeedMode = 'live' | 'history';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NewsScreen() {
	const router                   = useRouter();
	const { isSignedIn, getToken } = useAuth();
	const stableGetToken           = useStableToken(getToken);
	const params                   = useLocalSearchParams<{ symbol?: string }>();

	// ── Mode & search ─────────────────────────────────────────────────────────
	// If navigated from asset-detail with a symbol, pre-fill the search bar
	// and start in history mode (symbol filtering requires REST).
	const initialSymbol = params.symbol ? String(params.symbol).toUpperCase() : '';
	const [mode, setMode]               = useState<FeedMode>(initialSymbol ? 'history' : 'live');
	const [searchQuery, setSearchQuery] = useState(initialSymbol);
	const debouncedQuery                = useDebounce(searchQuery, 350);
	const isSearching                   = debouncedQuery.trim().length > 0;

	// Keep search / mode in sync when params change (e.g. navigating from a
	// different asset while the tab is already mounted).
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
			// Deduplicate by id
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

				setHistoryArticles((prev) =>
					replace ? result.news : [...prev, ...result.news]
				);
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

	// Load history when mode or search query changes
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

	// ── Derived display list ──────────────────────────────────────────────────
	const displayArticles: NewsArticle[] = mode === 'live' ? liveArticles : historyArticles;

	// Local keyword filter on top of the live feed
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

	// ── Navigate to article ───────────────────────────────────────────────────
	const openArticle = useCallback(
		(article: NewsArticle) => {
			router.push({
				pathname: '/news/article',
				params: { data: JSON.stringify(article) },
			});
		},
		[router]
	);

	// ── Render ────────────────────────────────────────────────────────────────

	const showSpinner =
		(mode === 'live' && isLiveLoading) ||
		(mode === 'history' && historyLoading && historyArticles.length === 0);

	const errorMessage = mode === 'history' ? historyError : null;

	return (
		<LinearGradient
			colors={['#000000', '#0a1f18', '#000000']}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

				{/* ── Header ────────────────────────────────────────────── */}
				<View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
						<Text
							style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', flex: 1 }}
						>
							Market News
						</Text>
						{/* Live status dot */}
						{mode === 'live' && (
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
								<View
									style={{
										width: 7,
										height: 7,
										borderRadius: 4,
										backgroundColor: isLiveConnected ? '#10B981' : '#F59E0B',
									}}
								/>
								<Text style={{ color: '#6B7280', fontSize: 12 }}>
									{isLiveConnected
										? 'Live'
										: connectionState === 'reconnecting'
										? 'Reconnecting…'
										: 'Connecting…'}
								</Text>
							</View>
						)}
					</View>

					{/* ── Mode toggle ───────────────────────────────────── */}
					<View
						style={{
							flexDirection: 'row',
							backgroundColor: 'rgba(255,255,255,0.05)',
							borderRadius: 12,
							padding: 3,
							marginBottom: 10,
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
										mode === m ? 'rgba(16,185,129,0.18)' : 'transparent',
									borderWidth: mode === m ? 1 : 0,
									borderColor: 'rgba(16,185,129,0.3)',
								}}
							>
								<Text
									style={{
										color: mode === m ? '#10B981' : '#6B7280',
										fontSize: 13,
										fontWeight: mode === m ? '700' : '500',
									}}
								>
									{m === 'live' ? '● Live' : '  History'}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					{/* ── Search bar ────────────────────────────────────── */}
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							backgroundColor: 'rgba(255,255,255,0.06)',
							borderRadius: 14,
							paddingHorizontal: 12,
							height: 44,
							borderWidth: 1,
							borderColor: 'rgba(255,255,255,0.1)',
						}}
					>
						<Ionicons
							name="search"
							size={16}
							color="#6B7280"
							style={{ marginRight: 8 }}
						/>
						<TextInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search by symbol or keyword…"
							placeholderTextColor="#4B5563"
							style={{ flex: 1, color: '#FFFFFF', fontSize: 14 }}
							autoCapitalize="characters"
							autoCorrect={false}
							returnKeyType="search"
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery('')}>
								<Ionicons name="close-circle" size={16} color="#6B7280" />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* ── Error banner ──────────────────────────────────────── */}
				{errorMessage ? (
					<View
						style={{
							marginHorizontal: 16,
							marginBottom: 8,
							padding: 12,
							borderRadius: 12,
							backgroundColor: 'rgba(239,68,68,0.1)',
							borderWidth: 1,
							borderColor: 'rgba(239,68,68,0.2)',
						}}
					>
						<Text style={{ color: '#FCA5A5', fontSize: 13 }}>{errorMessage}</Text>
					</View>
				) : null}

				{/* ── Content ───────────────────────────────────────────── */}
				{showSpinner ? (
					<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
						<Spinner color="#10B981" size="large" />
						<Text style={{ color: '#6B7280', marginTop: 14, fontSize: 14 }}>
							{mode === 'live' ? 'Connecting to live feed…' : 'Loading news…'}
						</Text>
					</View>
				) : (
					<FlatList
						data={filteredArticles}
						keyExtractor={(item) => String(item.id)}
						contentContainerStyle={{
							paddingHorizontal: 16,
							paddingTop: 4,
							paddingBottom: 110,
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
								// Mark only the very first article as "live" when in live mode
								isLive={mode === 'live' && index === 0 && isLiveConnected}
							/>
						)}
						ListFooterComponent={
							mode === 'history' && loadingMoreRef.current ? (
								<View style={{ paddingVertical: 16, alignItems: 'center' }}>
									<ActivityIndicator color="#10B981" />
								</View>
							) : null
						}
						ListEmptyComponent={
							<View
								style={{
									padding: 32,
									alignItems: 'center',
									backgroundColor: 'rgba(255,255,255,0.03)',
									borderRadius: 16,
									borderWidth: 1,
									borderColor: 'rgba(255,255,255,0.07)',
								}}
							>
								<Ionicons
									name="newspaper-outline"
									size={36}
									color="#374151"
									style={{ marginBottom: 12 }}
								/>
								<Text
									style={{ color: '#6B7280', fontSize: 14, textAlign: 'center' }}
								>
									{isSearching
										? `No news found for "${debouncedQuery.trim()}".`
										: mode === 'live'
										? 'Waiting for live articles…'
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
