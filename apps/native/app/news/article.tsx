/**
 * Article detail screen — full in-app browser.
 *
 * Loads `article.url` directly in a WebView so the user reads the complete
 * article without leaving the app.  A slim animated progress bar gives
 * visual feedback while the page loads.
 *
 * Fallback hierarchy:
 *   1. article.url  → WebView (full article, primary path)
 *   2. article.content → rendered HTML (Alpaca partial, rare)
 *   3. article.summary → plain text
 *
 * The header always shows a back button, the source name, and an
 * "open externally" icon for users who prefer their system browser.
 */

import { useCallback, useRef, useState } from 'react';
import {
	Animated,
	Linking,
	Text,
	TouchableOpacity,
	View,
	ScrollView,
	useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import type { NewsArticle } from '@/lib/news-api';
import { useTheme } from '@/lib/hooks';
import type { Theme } from '@/lib/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalise(s: string): string {
	return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function buildFallbackHtml(content: string, theme: Theme): string {
	return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: ${theme.colors.text.secondary};
    background: ${theme.colors.background.primary};
    padding: 16px 16px 40px;
  }
  p  { margin-bottom: 16px; }
  h1, h2, h3 { color: ${theme.colors.text.primary}; margin: 20px 0 10px; }
  a  { color: ${theme.colors.accent.primary}; text-decoration: none; }
  img { max-width: 100%; border-radius: 8px; margin: 8px 0; display: block; }
  ul, ol { padding-left: 20px; margin-bottom: 14px; }
  li { margin-bottom: 6px; }
  strong, b { color: ${theme.colors.text.primary}; }
  blockquote {
    border-left: 3px solid ${theme.colors.border.accent};
    padding-left: 14px;
    color: ${theme.colors.text.secondary};
    margin: 14px 0;
  }
</style>
</head>
<body>${content}</body>
</html>`;
}

// Script injected into the fallback WebView to report its scrollHeight
const HEIGHT_SCRIPT = `
(function() {
  function send() {
    window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
  }
  send();
  new MutationObserver(send).observe(document.body, { childList:true, subtree:true });
  window.addEventListener('load', send);
})();
true;
`;

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: Animated.Value; color: string }) {
	return (
		<View
			style={{
				height: 2,
				backgroundColor: 'rgba(255,255,255,0.06)',
				overflow: 'hidden',
			}}
		>
			<Animated.View
				style={{
					height: '100%',
					backgroundColor: color,
					width: progress.interpolate({
						inputRange: [0, 1],
						outputRange: ['0%', '100%'],
					}),
				}}
			/>
		</View>
	);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ArticleScreen() {
	const theme  = useTheme();
	const router = useRouter();
	const { height: screenHeight } = useWindowDimensions();
	const params  = useLocalSearchParams<{ data?: string }>();

	const article: NewsArticle | null = (() => {
		try {
			return params.data ? (JSON.parse(params.data) as NewsArticle) : null;
		} catch {
			return null;
		}
	})();

	// WebView state
	const [isLoading, setIsLoading]     = useState(true);
	const [loadError, setLoadError]     = useState(false);
	const [currentUrl, setCurrentUrl]   = useState(article?.url ?? '');
	const progressAnim                  = useRef(new Animated.Value(0)).current;

	// Fallback HTML WebView height
	const [htmlHeight, setHtmlHeight]   = useState(500);

	const animateProgress = useCallback((toValue: number) => {
		Animated.timing(progressAnim, {
			toValue,
			duration: 200,
			useNativeDriver: false,
		}).start();
	}, [progressAnim]);

	const openInBrowser = useCallback(async () => {
		const url = currentUrl || article?.url;
		if (!url) return;
		try { await Linking.openURL(url); } catch { /* ignore */ }
	}, [currentUrl, article?.url]);

	// ── No article ────────────────────────────────────────────────────────────

	if (!article) {
		return (
			<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
				<SafeAreaView
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
					edges={['top', 'bottom']}
				>
					<Ionicons name="newspaper-outline" size={48} color={theme.colors.text.disabled} style={{ marginBottom: 16 }} />
					<Text style={{ color: theme.colors.text.primary, fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
						Article not available.
					</Text>
					<TouchableOpacity
						onPress={() => router.back()}
						style={{
							paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
							backgroundColor: theme.colors.accent.glow,
							borderWidth: 1, borderColor: theme.colors.border.accent,
						}}
					>
						<Text style={{ color: theme.colors.accent.primary, fontWeight: '600' }}>Go back</Text>
					</TouchableOpacity>
				</SafeAreaView>
			</View>
		);
	}

	// ── Header (shared across both render paths) ──────────────────────────────

	const header = (
		<View
			style={{
				flexDirection: 'row',
				alignItems: 'center',
				paddingHorizontal: 12,
				paddingVertical: 10,
				backgroundColor: theme.colors.background.primary,
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.border.primary,
				gap: 8,
			}}
		>
			<TouchableOpacity
				onPress={() => router.back()}
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				style={{
					width: 34, height: 34, borderRadius: 17,
					backgroundColor: theme.colors.surface.secondary,
					alignItems: 'center', justifyContent: 'center',
				}}
			>
				<Ionicons name="chevron-back" size={20} color={theme.colors.text.primary} />
			</TouchableOpacity>

			<Text
				style={{ flex: 1, color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600' }}
				numberOfLines={1}
			>
				{capitalise(article.source || 'Article')}
			</Text>

			{(article.url || currentUrl) && (
				<TouchableOpacity
					onPress={openInBrowser}
					hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					style={{
						width: 34, height: 34, borderRadius: 17,
						backgroundColor: theme.colors.surface.secondary,
						alignItems: 'center', justifyContent: 'center',
					}}
				>
					<Ionicons name="open-outline" size={18} color={theme.colors.text.secondary} />
				</TouchableOpacity>
			)}
		</View>
	);

	// ── Primary path: load article URL in a full-screen WebView ──────────────

	if (article.url && !loadError) {
		return (
			<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
				<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
					{header}

					{/* Progress bar — visible while loading */}
					{isLoading && <ProgressBar progress={progressAnim} color={theme.colors.accent.primary} />}

					<WebView
						source={{ uri: article.url }}
						style={{ flex: 1, backgroundColor: theme.colors.background.primary }}
						onLoadStart={() => {
							setIsLoading(true);
							setLoadError(false);
							animateProgress(0.1);
						}}
						onLoadProgress={({ nativeEvent }) => {
							animateProgress(nativeEvent.progress);
						}}
						onLoadEnd={() => {
							animateProgress(1);
							// Brief pause so the bar reaches 100% visually before hiding
							setTimeout(() => setIsLoading(false), 200);
						}}
						onNavigationStateChange={(nav: WebViewNavigation) => {
							setCurrentUrl(nav.url);
						}}
						onError={() => {
							setIsLoading(false);
							setLoadError(true);
						}}
						// Allow the reader to navigate to linked pages within the WebView
						// (e.g. "read more" links inside the article)
						javaScriptEnabled
						domStorageEnabled
						sharedCookiesEnabled
						// Identify as a real browser so paywalls / bot-blocks don't trigger
						userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
					/>
				</SafeAreaView>
			</View>
		);
	}

	// ── Fallback A: WebView errored — show error state with retry options ─────

	if (loadError) {
		return (
			<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
				<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
					{header}
					<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 }}>
						<Ionicons name="cloud-offline-outline" size={48} color={theme.colors.text.disabled} />
						<Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
							The article couldn't be loaded.{'\n'}You can try opening it in your browser.
						</Text>
						{article.url && (
							<TouchableOpacity
								onPress={openInBrowser}
								style={{
									flexDirection: 'row', alignItems: 'center', gap: 8,
									paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
									backgroundColor: theme.colors.accent.glow,
									borderWidth: 1, borderColor: theme.colors.border.accent,
								}}
							>
								<Ionicons name="open-outline" size={16} color={theme.colors.accent.primary} />
								<Text style={{ color: theme.colors.accent.primary, fontSize: 14, fontWeight: '600' }}>
									Open in browser
								</Text>
							</TouchableOpacity>
						)}
						<TouchableOpacity
							onPress={() => { setLoadError(false); setIsLoading(true); }}
							style={{ paddingVertical: 8 }}
						>
							<Text style={{ color: theme.colors.text.tertiary, fontSize: 13 }}>Try again</Text>
						</TouchableOpacity>
					</View>
				</SafeAreaView>
			</View>
		);
	}

	// ── Fallback B: no URL — render Alpaca's partial HTML / summary ──────────

	const htmlContent = article.content?.trim();
	const summary     = article.summary?.trim();

	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				{header}
				<ScrollView
					contentContainerStyle={{ paddingBottom: 48 }}
					showsVerticalScrollIndicator={false}
				>
					{/* Headline */}
					<View style={{ padding: 20, paddingBottom: 0 }}>
						<Text
							style={{
								color: theme.colors.text.primary, fontSize: 22, fontWeight: '700',
								lineHeight: 30, marginBottom: 14,
							}}
						>
							{article.headline}
						</Text>

						{/* Symbols */}
						{article.symbols.length > 0 && (
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
								{article.symbols.map((s) => (
									<View
										key={s}
										style={{
											paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
											backgroundColor: theme.colors.accent.glow,
											borderWidth: 1, borderColor: theme.colors.border.accent,
										}}
									>
										<Text style={{ color: theme.colors.accent.primary, fontSize: 11, fontWeight: '700' }}>
											{s}
										</Text>
									</View>
								))}
							</View>
						)}

						{/* Summary */}
						{summary && (
							<Text
								style={{
									color: theme.colors.text.secondary, fontSize: 15, lineHeight: 23,
									marginBottom: 16, fontStyle: 'italic',
								}}
							>
								{summary}
							</Text>
						)}

						<View style={{ height: 1, backgroundColor: theme.colors.border.primary, marginBottom: 4 }} />
					</View>

					{/* Partial HTML content */}
					{htmlContent ? (
						<View style={{ height: htmlHeight, marginHorizontal: 4 }}>
							<WebView
								source={{ html: buildFallbackHtml(htmlContent, theme) }}
								scrollEnabled={false}
								style={{ backgroundColor: 'transparent' }}
								originWhitelist={['*']}
								injectedJavaScript={HEIGHT_SCRIPT}
								onMessage={(e) => {
									const h = parseInt(e.nativeEvent.data, 10);
									if (!isNaN(h) && h > 0) setHtmlHeight(h + 24);
								}}
							/>
						</View>
					) : null}
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}
