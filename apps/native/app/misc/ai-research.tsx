import { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Animated,
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStableToken } from '@/lib/hooks';
import {
	initResearch,
	getResearchStatus,
	createResearchChat,
	getChatMessages,
	sendChatMessageSync,
	listAllChats,
	listKnowledgeBases,
	type KBStatus,
	type KBListItem,
	type ChatListItem,
} from '@/lib/ai-research-api';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenPhase =
	| 'idle'            // No symbol selected yet
	| 'initializing'    // Calling /init
	| 'processing'      // KB uploading/processing, polling
	| 'creating_chat'   // KB ready, creating chat
	| 'loading_messages'
	| 'ready'
	| 'error';

type DisplayMessage = {
	id: string;
	role: 'user' | 'assistant';
	content: string;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AIResearchScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const params = useLocalSearchParams<{ symbol?: string }>();
	const initialSymbol = (params.symbol ? String(params.symbol).toUpperCase() : null);

	// ── Core state ──────────────────────────────────────────────────────────
	const [selectedSymbol, setSelectedSymbol] = useState<string | null>(initialSymbol);
	const [chatId, setChatId] = useState<string | null>(null);
	const [messages, setMessages] = useState<DisplayMessage[]>([]);
	const [inputText, setInputText] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [phase, setPhase] = useState<ScreenPhase>(initialSymbol ? 'initializing' : 'idle');
	const [error, setError] = useState<string | null>(null);
	const [statusText, setStatusText] = useState('');

	// ── Data for UI ─────────────────────────────────────────────────────────
	const [availableStocks, setAvailableStocks] = useState<KBListItem[]>([]);
	const [allChats, setAllChats] = useState<ChatListItem[]>([]);

	// ── UI toggles ──────────────────────────────────────────────────────────
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);

	// ── Refs ────────────────────────────────────────────────────────────────
	const scrollRef = useRef<ScrollView>(null);
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const historyAnim = useRef(new Animated.Value(320)).current; // panel starts off-screen right

	// ── Cleanup polling ──────────────────────────────────────────────────────
	useEffect(() => () => {
		if (pollingRef.current) clearInterval(pollingRef.current);
	}, []);

	// ── Auto-scroll on new messages ──────────────────────────────────────────
	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
		}
	}, [messages.length]);

	// ── Load available stocks + chat history ─────────────────────────────────
	const refreshSidebarData = useCallback(() => {
		if (!isSignedIn) return;
		Promise.all([
			listKnowledgeBases(stableGetToken).catch(() => ({ knowledgeBases: [] as KBListItem[] })),
			listAllChats(stableGetToken).catch(() => ({ chats: [] as ChatListItem[] })),
		]).then(([kbs, chats]) => {
			setAvailableStocks(kbs.knowledgeBases.filter((k) => k.status === 'ready'));
			setAllChats(chats.chats);
		});
	}, [isSignedIn, stableGetToken]);

	useEffect(() => {
		refreshSidebarData();
	}, [refreshSidebarData]);

	// ── History panel animation ───────────────────────────────────────────────
	const openHistory = useCallback(() => {
		setHistoryOpen(true);
		Animated.spring(historyAnim, {
			toValue: 0,
			useNativeDriver: true,
			tension: 120,
			friction: 14,
		}).start();
	}, [historyAnim]);

	const closeHistory = useCallback(() => {
		Animated.timing(historyAnim, {
			toValue: 320,
			duration: 220,
			useNativeDriver: true,
		}).start(() => setHistoryOpen(false));
	}, [historyAnim]);

	// ── Load a chat from history ──────────────────────────────────────────────
	const loadChatFromHistory = useCallback(
		async (chat: ChatListItem) => {
			closeHistory();
			setSelectedSymbol(chat.symbol);
			setChatId(chat.chatId);
			setMessages([]);
			setError(null);
			setPhase('loading_messages');
			setStatusText('Loading messages...');

			try {
				const result = await getChatMessages(chat.chatId, stableGetToken);
				const msgs: DisplayMessage[] = (result.messages || []).map((m, i) => ({
					id: m.id || `msg-${i}`,
					role: m.role,
					content: m.content,
				}));
				setMessages(msgs);
				setPhase('ready');
			} catch (err) {
				setPhase('error');
				setError(err instanceof Error ? err.message : 'Failed to load chat.');
			}
		},
		[stableGetToken, closeHistory]
	);

	// ── Select stock from dropdown ────────────────────────────────────────────
	const handleSelectStock = useCallback(
		(symbol: string) => {
			setDropdownOpen(false);
			if (symbol === selectedSymbol && phase === 'ready') return;
			setSelectedSymbol(symbol);
			setMessages([]);
			setChatId(null);
			setError(null);
			startResearchFlow(symbol);
		},
		[selectedSymbol, phase]
	);

	// ── Research init flow ────────────────────────────────────────────────────
	const startResearchFlow = useCallback(
		async (sym: string) => {
			if (!isSignedIn) return;
			try {
				setPhase('initializing');
				setStatusText('Initializing research...');
				setError(null);

				const initResult = await initResearch(sym, stableGetToken);

				if (initResult.status === 'ready') {
					await createAndLoadChat(sym);
				} else if (['creating', 'uploading', 'processing'].includes(initResult.status)) {
					setPhase('processing');
					setStatusText(getStatusLabel(initResult.status));
					startPolling(sym);
				} else if (initResult.status === 'error') {
					setPhase('error');
					setError(initResult.errorMessage || 'Research initialization failed.');
				}
			} catch (err) {
				setPhase('error');
				setError(err instanceof Error ? err.message : 'Failed to initialize research.');
			}
		},
		[isSignedIn, stableGetToken]
	);

	// Auto-start when screen opens with a symbol
	useEffect(() => {
		if (initialSymbol && isSignedIn) {
			startResearchFlow(initialSymbol);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialSymbol, isSignedIn]);

	// ── Poll for KB readiness ─────────────────────────────────────────────────
	const startPolling = useCallback(
		(sym: string) => {
			if (pollingRef.current) clearInterval(pollingRef.current);
			pollingRef.current = setInterval(async () => {
				try {
					const status = await getResearchStatus(sym, stableGetToken);
					if (status.status === 'ready') {
						clearInterval(pollingRef.current!);
						pollingRef.current = null;
						await createAndLoadChat(sym);
						refreshSidebarData();
					} else if (status.status === 'error') {
						clearInterval(pollingRef.current!);
						pollingRef.current = null;
						setPhase('error');
						setError(status.errorMessage || 'Data processing failed.');
					} else {
						setStatusText(getStatusLabel(status.status));
					}
				} catch {
					// Silently retry
				}
			}, 3000);
		},
		[stableGetToken, refreshSidebarData]
	);

	// ── Create chat + load or auto-generate initial report ───────────────────
	const createAndLoadChat = useCallback(
		async (sym: string) => {
			try {
				setPhase('creating_chat');
				setStatusText('Setting up your research session...');

				const chatResult = await createResearchChat(sym, stableGetToken);
				setChatId(chatResult.chatId);

				if (chatResult.isExisting) {
					// Returning user — load their existing messages
					setPhase('loading_messages');
					setStatusText('Loading your research...');
					const msgResult = await getChatMessages(chatResult.chatId, stableGetToken);
					setMessages(
						(msgResult.messages || []).map((m, i) => ({
							id: m.id || `msg-${i}`,
							role: m.role,
							content: m.content,
						}))
					);
					setPhase('ready');
				} else {
					// New chat — enter ready immediately, then silently fire the initial report.
					// This avoids a multi-minute loading screen: the user sees the chat
					// interface right away with an "Analyzing…" indicator.
					setPhase('ready');
					setMessages([]);
					setIsSending(true);
					try {
						const resp = await sendChatMessageSync(
							chatResult.chatId,
							buildInitialPrompt(sym),
							stableGetToken
						);
						setMessages([
							{
								id: resp.id || 'report-0',
								role: 'assistant',
								content: resp.content,
							},
						]);
					} catch (err) {
						setMessages([
							{
								id: 'report-err',
								role: 'assistant',
								content: `Failed to generate research report: ${
									err instanceof Error ? err.message : 'Unknown error.'
								}`,
							},
						]);
					} finally {
						setIsSending(false);
					}
				}

				refreshSidebarData();
			} catch (err) {
				setPhase('error');
				setError(err instanceof Error ? err.message : 'Failed to create research session.');
			}
		},
		[stableGetToken, refreshSidebarData]
	);

	// ── Send message ──────────────────────────────────────────────────────────
	const handleSend = useCallback(async () => {
		if (!chatId || !inputText.trim() || isSending) return;

		const userMessage = inputText.trim();
		setInputText('');
		setIsSending(true);

		setMessages((prev) => [
			...prev,
			{ id: `user-${Date.now()}`, role: 'user', content: userMessage },
		]);

		try {
			const resp = await sendChatMessageSync(chatId, userMessage, stableGetToken);
			setMessages((prev) => [
				...prev,
				{
					id: resp.id || `asst-${Date.now()}`,
					role: 'assistant',
					content: resp.content,
				},
			]);
		} catch (err) {
			setMessages((prev) => [
				...prev,
				{
					id: `err-${Date.now()}`,
					role: 'assistant',
					content: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'Unknown error.'}`,
				},
			]);
		} finally {
			setIsSending(false);
		}
	}, [chatId, inputText, isSending, stableGetToken]);

	// ─────────────────────────────────────────────────────────────────────────
	// Render
	// ─────────────────────────────────────────────────────────────────────────

	return (
		<LinearGradient colors={['#000000', '#011a0c', '#000000']} style={{ flex: 1 }}>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={0}
				>
					{/* ── Header ─────────────────────────────────────────────────────── */}
					<View style={styles.header}>
						<TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Ionicons name="chevron-back" size={22} color="#34D399" />
						</TouchableOpacity>

						{/* Stock picker pill */}
						<TouchableOpacity
							onPress={() => setDropdownOpen(true)}
							style={styles.stockPill}
							activeOpacity={0.7}
						>
							<Ionicons name="sparkles" size={13} color="#34D399" />
							<Text style={styles.stockPillText} numberOfLines={1}>
								{selectedSymbol || 'Select a stock'}
							</Text>
							<Ionicons name="chevron-down" size={13} color="#34D399" />
						</TouchableOpacity>

						{/* History / hamburger */}
						<TouchableOpacity onPress={openHistory} style={styles.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Ionicons name="menu-outline" size={24} color="#34D399" />
						</TouchableOpacity>
					</View>

					{/* ── Body ───────────────────────────────────────────────────────── */}
					{phase === 'idle' ? (
						<IdleState onSelectStock={() => setDropdownOpen(true)} />
					) : phase === 'error' ? (
						<View style={styles.centeredContainer}>
							<ErrorState
								message={error}
								onRetry={() => selectedSymbol && startResearchFlow(selectedSymbol)}
							/>
						</View>
					) : phase !== 'ready' ? (
						<View style={styles.centeredContainer}>
							<LoadingState statusText={statusText} phase={phase} />
						</View>
					) : (
						<>
							{/* Messages */}
							<ScrollView
								ref={scrollRef}
								style={{ flex: 1 }}
								contentContainerStyle={styles.messageList}
								showsVerticalScrollIndicator={false}
								keyboardDismissMode="interactive"
							>
								{messages.length === 0 ? (
									<View style={styles.emptyChat}>
										<Ionicons name="document-text-outline" size={40} color="rgba(52,211,153,0.25)" />
										<Text style={[styles.emptyChatText, { color: theme.colors.text.secondary }]}>
											Generating your research report…
										</Text>
									</View>
								) : (
									messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
								)}

								{isSending && (
									<View style={styles.thinkingRow}>
										<ActivityIndicator size="small" color="#34D399" />
										<Text style={styles.thinkingText}>Analyzing…</Text>
									</View>
								)}
							</ScrollView>

							{/* Input bar */}
							<View style={styles.inputBar}>
								<TextInput
									value={inputText}
									onChangeText={setInputText}
									placeholder="Ask a follow-up question…"
									placeholderTextColor="rgba(255,255,255,0.28)"
									multiline
									maxLength={5000}
									style={styles.input}
									editable={!isSending}
									blurOnSubmit={false}
									onSubmitEditing={handleSend}
								/>
								<TouchableOpacity
									onPress={handleSend}
									disabled={!inputText.trim() || isSending}
									style={[
										styles.sendBtn,
										{ backgroundColor: inputText.trim() && !isSending ? '#10B981' : 'rgba(16,185,129,0.12)' },
									]}
								>
									<Ionicons
										name="send"
										size={17}
										color={inputText.trim() && !isSending ? '#FFFFFF' : 'rgba(52,211,153,0.35)'}
									/>
								</TouchableOpacity>
							</View>
						</>
					)}
				</KeyboardAvoidingView>

				{/* ── Stock Dropdown Modal ──────────────────────────────────────── */}
				<Modal
					visible={dropdownOpen}
					transparent
					animationType="fade"
					onRequestClose={() => setDropdownOpen(false)}
				>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setDropdownOpen(false)}
					>
						<View style={styles.dropdownSheet}>
							<View style={styles.dropdownHandle} />
							<Text style={styles.dropdownTitle}>Select a Stock</Text>
							<Text style={styles.dropdownSubtitle}>Stocks with available AI research</Text>

							{availableStocks.length === 0 ? (
								<View style={styles.dropdownEmpty}>
									<Ionicons name="search-outline" size={32} color="rgba(52,211,153,0.3)" style={{ marginBottom: 10 }} />
									<Text style={styles.dropdownEmptyText}>
										No research available yet.{'\n'}Open a stock page and tap "AI Research" to get started.
									</Text>
								</View>
							) : (
								<FlatList
									data={availableStocks}
									keyExtractor={(item) => item.symbol}
									style={{ maxHeight: 320 }}
									renderItem={({ item }) => (
										<TouchableOpacity
											onPress={() => handleSelectStock(item.symbol)}
											style={styles.dropdownRow}
											activeOpacity={0.7}
										>
											<View style={styles.symbolBadge}>
												<Text style={styles.symbolBadgeText}>{item.symbol.slice(0, 4)}</Text>
											</View>
											<View style={{ flex: 1 }}>
												<Text style={styles.dropdownRowSymbol}>{item.symbol}</Text>
												{item.lastUpdatedAt && (
													<Text style={styles.dropdownRowDate}>
														Updated {formatRelativeDate(item.lastUpdatedAt)}
													</Text>
												)}
											</View>
											{selectedSymbol === item.symbol && (
												<Ionicons name="checkmark-circle" size={20} color="#10B981" />
											)}
										</TouchableOpacity>
									)}
								/>
							)}
						</View>
					</TouchableOpacity>
				</Modal>

				{/* ── Chat History Panel ────────────────────────────────────────── */}
				{historyOpen && (
					<View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
						{/* Dimmed overlay */}
						<TouchableOpacity
							style={styles.historyOverlay}
							activeOpacity={1}
							onPress={closeHistory}
						/>
						{/* Sliding panel */}
						<Animated.View
							style={[styles.historyPanel, { transform: [{ translateX: historyAnim }] }]}
						>
							<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'right']}>
								{/* Panel header */}
								<View style={styles.historyHeader}>
									<Ionicons name="time-outline" size={18} color="#34D399" style={{ marginRight: 8 }} />
									<Text style={styles.historyTitle}>Chat History</Text>
									<TouchableOpacity onPress={closeHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
										<Ionicons name="close" size={22} color="rgba(255,255,255,0.45)" />
									</TouchableOpacity>
								</View>

								{/* Chat list */}
								{allChats.length === 0 ? (
									<View style={styles.historyEmpty}>
										<Ionicons name="chatbubble-outline" size={38} color="rgba(52,211,153,0.25)" style={{ marginBottom: 12 }} />
										<Text style={styles.historyEmptyText}>
											No chats yet.{'\n'}Start a research session from any stock page.
										</Text>
									</View>
								) : (
									<FlatList
										data={allChats}
										keyExtractor={(item) => item.chatId}
										contentContainerStyle={{ paddingVertical: 6 }}
										renderItem={({ item }) => (
											<TouchableOpacity
												onPress={() => loadChatFromHistory(item)}
												style={[
													styles.historyRow,
													chatId === item.chatId && styles.historyRowActive,
												]}
												activeOpacity={0.7}
											>
												<View style={styles.historySymbolBadge}>
													<Text style={styles.historySymbolText}>{item.symbol.slice(0, 4)}</Text>
												</View>
												<View style={{ flex: 1 }}>
													<Text style={styles.historyRowTitle} numberOfLines={1}>
														{item.title || `${item.symbol} Research`}
													</Text>
													<Text style={styles.historyRowDate}>
														{formatRelativeDate(item.createdAt)}
													</Text>
												</View>
												{chatId === item.chatId && (
													<View style={styles.activeDot} />
												)}
											</TouchableOpacity>
										)}
									/>
								)}
							</SafeAreaView>
						</Animated.View>
					</View>
				)}
			</SafeAreaView>
		</LinearGradient>
	);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IdleState({ onSelectStock }: { onSelectStock: () => void }) {
	return (
		<View style={styles.centeredContainer}>
			<View style={styles.idleIconWrap}>
				<Ionicons name="sparkles" size={36} color="#34D399" />
			</View>
			<Text style={styles.idleTitle}>AI Research</Text>
			<Text style={styles.idleSubtitle}>
				Select a stock to view a data-backed research report powered by AI.
			</Text>
			<TouchableOpacity onPress={onSelectStock} style={styles.idleBtn} activeOpacity={0.8}>
				<Ionicons name="search" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
				<Text style={styles.idleBtnText}>Browse Available Stocks</Text>
			</TouchableOpacity>
		</View>
	);
}

function LoadingState({ statusText, phase }: { statusText: string; phase: ScreenPhase }) {
	const subtitles: Partial<Record<ScreenPhase, string>> = {
		initializing: 'Setting up the knowledge base and collecting market data…',
		processing: 'Analyzing pricing history, news articles, and market context…',
		creating_chat: 'Preparing your personalized research session…',
		loading_messages: 'Loading your research report…',
	};
	return (
		<View style={styles.loadingWrap}>
			<View style={styles.loadingIconWrap}>
				<Ionicons name="sparkles" size={32} color="#34D399" />
			</View>
			<ActivityIndicator size="large" color="#34D399" style={{ marginBottom: 16 }} />
			<Text style={styles.loadingLabel}>{statusText}</Text>
			{subtitles[phase] && (
				<Text style={styles.loadingSubtitle}>{subtitles[phase]}</Text>
			)}
		</View>
	);
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
	return (
		<View style={styles.errorWrap}>
			<View style={styles.errorIconWrap}>
				<Ionicons name="warning-outline" size={30} color="#FCA5A5" />
			</View>
			<Text style={styles.errorTitle}>Something went wrong</Text>
			<Text style={styles.errorMessage}>{message || 'An unexpected error occurred.'}</Text>
			<TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.8}>
				<Text style={styles.retryBtnText}>Try again</Text>
			</TouchableOpacity>
		</View>
	);
}

function MessageBubble({ message }: { message: DisplayMessage }) {
	const isUser = message.role === 'user';

	if (isUser) {
		return (
			<View style={styles.userBubbleWrap}>
				<View style={styles.userBubble}>
					<Text style={styles.userBubbleText}>{message.content}</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.assistantBubbleWrap}>
			<View style={styles.assistantLabel}>
				<Ionicons name="sparkles" size={11} color="#34D399" />
				<Text style={styles.assistantLabelText}>AI Analyst</Text>
			</View>
			<View style={styles.assistantBubble}>
				<SimpleMarkdown>{message.content}</SimpleMarkdown>
			</View>
		</View>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialPrompt(symbol: string): string {
	return `Generate a comprehensive research report for ${symbol.toUpperCase()}.

Analyze all available data in the knowledge base including:
- Current pricing and recent price action
- Historical price trends (intraday, weekly, monthly, quarterly, yearly)
- Volume patterns and any unusual activity
- All available news articles — key themes, sentiment, and potential market impact
- Correlations between news events and price movements

Structure your report as:
1. **Executive Summary** — 2–3 sentence overview of the current situation
2. **Price Analysis** — Current price, trend direction, key price levels, volume
3. **News & Sentiment Analysis** — Key themes, overall sentiment assessment
4. **Technical Outlook** — Based on available price history patterns
5. **Key Risks & Catalysts** — Factors that could move the stock
6. **Conclusion & Outlook** — Your near-term assessment

Be thorough, specific, and cite data points from the available documents.`;
}

function getStatusLabel(status: KBStatus): string {
	switch (status) {
		case 'creating':   return 'Creating knowledge base…';
		case 'uploading':  return 'Uploading market data & news…';
		case 'processing': return 'Indexing data — almost ready…';
		case 'ready':      return 'Research data ready!';
		case 'error':      return 'An error occurred.';
		default:           return 'Preparing research…';
	}
}

function formatRelativeDate(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(iso).toLocaleDateString();
}


// ─── Layout styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	// Header
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.06)',
		gap: 8,
	},
	backBtn: { padding: 4 },
	menuBtn: { padding: 4 },
	stockPill: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 7,
		paddingHorizontal: 13,
		borderRadius: 20,
		backgroundColor: 'rgba(16,185,129,0.1)',
		borderWidth: 1,
		borderColor: 'rgba(16,185,129,0.22)',
	},
	stockPillText: {
		flex: 1,
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '600',
	},

	// Shared container
	centeredContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},

	// Idle state
	idleIconWrap: {
		width: 76,
		height: 76,
		borderRadius: 38,
		backgroundColor: 'rgba(16,185,129,0.1)',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	idleTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 10 },
	idleSubtitle: {
		color: 'rgba(255,255,255,0.45)',
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 21,
		maxWidth: 280,
		marginBottom: 28,
	},
	idleBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 22,
		paddingVertical: 13,
		borderRadius: 14,
		backgroundColor: '#10B981',
	},
	idleBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

	// Loading state
	loadingWrap: { alignItems: 'center', gap: 4 },
	loadingIconWrap: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: 'rgba(16,185,129,0.1)',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	loadingLabel: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 6,
	},
	loadingSubtitle: {
		color: 'rgba(255,255,255,0.45)',
		fontSize: 13,
		textAlign: 'center',
		maxWidth: 280,
		lineHeight: 20,
	},

	// Error state
	errorWrap: { alignItems: 'center', gap: 4 },
	errorIconWrap: {
		width: 68,
		height: 68,
		borderRadius: 34,
		backgroundColor: 'rgba(239,68,68,0.1)',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	errorTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 6 },
	errorMessage: {
		color: 'rgba(255,255,255,0.5)',
		fontSize: 13,
		textAlign: 'center',
		maxWidth: 300,
		lineHeight: 20,
		marginBottom: 20,
	},
	retryBtn: {
		paddingHorizontal: 28,
		paddingVertical: 12,
		borderRadius: 12,
		backgroundColor: 'rgba(16,185,129,0.15)',
		borderWidth: 1,
		borderColor: 'rgba(16,185,129,0.3)',
	},
	retryBtnText: { color: '#34D399', fontWeight: '600', fontSize: 15 },

	// Message list
	messageList: { padding: 16, paddingBottom: 12 },
	emptyChat: { alignItems: 'center', paddingVertical: 48, gap: 12 },
	emptyChatText: { fontSize: 14, textAlign: 'center' },
	thinkingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 8 },
	thinkingText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

	// User bubble
	userBubbleWrap: { alignSelf: 'flex-end', maxWidth: '82%', marginBottom: 10 },
	userBubble: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 18,
		borderTopRightRadius: 4,
		backgroundColor: 'rgba(16,185,129,0.18)',
		borderWidth: 1,
		borderColor: 'rgba(16,185,129,0.3)',
	},
	userBubbleText: { color: '#F3F4F6', fontSize: 14, lineHeight: 21 },

	// Assistant bubble
	assistantBubbleWrap: { alignSelf: 'flex-start', maxWidth: '96%', marginBottom: 14 },
	assistantLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
	assistantLabelText: { color: '#34D399', fontSize: 11, fontWeight: '600' },
	assistantBubble: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 18,
		borderTopLeftRadius: 4,
		backgroundColor: 'rgba(255,255,255,0.04)',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.08)',
	},

	// Input bar
	inputBar: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: 'rgba(255,255,255,0.06)',
		gap: 10,
	},
	input: {
		flex: 1,
		minHeight: 42,
		maxHeight: 120,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 21,
		backgroundColor: 'rgba(255,255,255,0.055)',
		borderWidth: 1,
		borderColor: 'rgba(16,185,129,0.2)',
		color: '#FFFFFF',
		fontSize: 15,
	},
	sendBtn: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
	},

	// Dropdown modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.72)',
		justifyContent: 'flex-end',
	},
	dropdownSheet: {
		backgroundColor: '#011a0c',
		borderTopLeftRadius: 22,
		borderTopRightRadius: 22,
		paddingTop: 12,
		paddingBottom: 36,
	},
	dropdownHandle: {
		alignSelf: 'center',
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: 'rgba(255,255,255,0.15)',
		marginBottom: 18,
	},
	dropdownTitle: {
		color: '#FFFFFF',
		fontSize: 17,
		fontWeight: '700',
		paddingHorizontal: 20,
		marginBottom: 2,
	},
	dropdownSubtitle: {
		color: 'rgba(255,255,255,0.4)',
		fontSize: 13,
		paddingHorizontal: 20,
		marginBottom: 14,
	},
	dropdownEmpty: { padding: 32, alignItems: 'center' },
	dropdownEmptyText: {
		color: 'rgba(255,255,255,0.35)',
		textAlign: 'center',
		fontSize: 13,
		lineHeight: 20,
	},
	dropdownRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 13,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.05)',
		gap: 12,
	},
	symbolBadge: {
		width: 42,
		height: 42,
		borderRadius: 12,
		backgroundColor: 'rgba(16,185,129,0.14)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	symbolBadgeText: { color: '#34D399', fontWeight: '700', fontSize: 12 },
	dropdownRowSymbol: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
	dropdownRowDate: { color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 1 },

	// History panel
	historyOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.55)',
	},
	historyPanel: {
		position: 'absolute',
		right: 0,
		top: 0,
		bottom: 0,
		width: 300,
		backgroundColor: '#010e07',
		borderLeftWidth: 1,
		borderLeftColor: 'rgba(16,185,129,0.15)',
		shadowColor: '#000',
		shadowOffset: { width: -4, height: 0 },
		shadowOpacity: 0.4,
		shadowRadius: 12,
		elevation: 20,
	},
	historyHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 18,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.06)',
	},
	historyTitle: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
	historyEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
	historyEmptyText: {
		color: 'rgba(255,255,255,0.35)',
		textAlign: 'center',
		fontSize: 13,
		lineHeight: 20,
	},
	historyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 13,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.04)',
		gap: 10,
	},
	historyRowActive: { backgroundColor: 'rgba(16,185,129,0.08)' },
	historySymbolBadge: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: 'rgba(16,185,129,0.14)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	historySymbolText: { color: '#34D399', fontWeight: '700', fontSize: 10 },
	historyRowTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
	historyRowDate: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
	activeDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		backgroundColor: '#10B981',
	},
});
