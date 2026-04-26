import { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Animated,
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
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
import type { Theme } from '@/lib/theme';
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
	const historyAnim = useRef(new Animated.Value(320)).current;

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
		<LinearGradient colors={theme.colors.background.gradient as [string, string, string]} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={0}
				>
					{/* ── Header ─────────────────────────────────────────────────────── */}
					<View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border.primary, gap: 8 }}>
						<TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Ionicons name="chevron-back" size={22} color={theme.colors.accent.primary} />
						</TouchableOpacity>

						{/* Stock picker pill */}
						<TouchableOpacity
							onPress={() => setDropdownOpen(true)}
							style={{
								flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
								paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20,
								backgroundColor: theme.colors.accent.glow,
								borderWidth: 1, borderColor: theme.colors.border.accent,
							}}
							activeOpacity={0.7}
						>
							<Ionicons name="sparkles" size={13} color={theme.colors.accent.primary} />
							<Text style={{ flex: 1, color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
								{selectedSymbol || 'Select a stock'}
							</Text>
							<Ionicons name="chevron-down" size={13} color={theme.colors.accent.primary} />
						</TouchableOpacity>

						{/* History / hamburger */}
						<TouchableOpacity onPress={openHistory} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Ionicons name="menu-outline" size={24} color={theme.colors.accent.primary} />
						</TouchableOpacity>
					</View>

					{/* ── Body ───────────────────────────────────────────────────────── */}
					{phase === 'idle' ? (
						<IdleState theme={theme} onSelectStock={() => setDropdownOpen(true)} />
					) : phase === 'error' ? (
						<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
							<ErrorState
								theme={theme}
								message={error}
								onRetry={() => selectedSymbol && startResearchFlow(selectedSymbol)}
							/>
						</View>
					) : phase !== 'ready' ? (
						<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
							<LoadingState theme={theme} statusText={statusText} phase={phase} />
						</View>
					) : (
						<>
							{/* Messages */}
							<ScrollView
								ref={scrollRef}
								style={{ flex: 1 }}
								contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
								showsVerticalScrollIndicator={false}
								keyboardDismissMode="interactive"
							>
								{messages.length === 0 ? (
									<View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
										<Ionicons name="document-text-outline" size={40} color={theme.colors.accent.glow} />
										<Text style={{ color: theme.colors.text.secondary, fontSize: 14, textAlign: 'center' }}>
											Generating your research report…
										</Text>
									</View>
								) : (
									messages.map((msg) => <MessageBubble key={msg.id} message={msg} theme={theme} />)
								)}

								{isSending && (
									<View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 8 }}>
										<ActivityIndicator size="small" color={theme.colors.accent.primary} />
										<Text style={{ color: theme.colors.text.disabled, fontSize: 13 }}>Analyzing…</Text>
									</View>
								)}
							</ScrollView>

							{/* Input bar */}
							<View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border.primary, gap: 10 }}>
								<TextInput
									value={inputText}
									onChangeText={setInputText}
									placeholder="Ask a follow-up question…"
									placeholderTextColor={theme.colors.text.disabled}
									multiline
									maxLength={5000}
									style={{
										flex: 1, minHeight: 42, maxHeight: 120,
										paddingHorizontal: 16, paddingVertical: 10, borderRadius: 21,
										backgroundColor: theme.colors.surface.primary,
										borderWidth: 1, borderColor: theme.colors.border.accent,
										color: theme.colors.text.primary, fontSize: 15,
									}}
									editable={!isSending}
									blurOnSubmit={false}
									onSubmitEditing={handleSend}
								/>
								<TouchableOpacity
									onPress={handleSend}
									disabled={!inputText.trim() || isSending}
									style={{
										width: 42, height: 42, borderRadius: 21,
										alignItems: 'center', justifyContent: 'center',
										backgroundColor: inputText.trim() && !isSending ? theme.colors.accent.primary : theme.colors.accent.glow,
									}}
								>
									<Ionicons
										name="send"
										size={17}
										color={inputText.trim() && !isSending ? theme.colors.text.inverse : theme.colors.text.disabled}
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
						style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' }}
						activeOpacity={1}
						onPress={() => setDropdownOpen(false)}
					>
						<View style={{
							backgroundColor: theme.colors.background.secondary,
							borderTopLeftRadius: 22, borderTopRightRadius: 22,
							paddingTop: 12, paddingBottom: 36,
						}}>
							<View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.surface.elevated, marginBottom: 18 }} />
							<Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '700', paddingHorizontal: 20, marginBottom: 2 }}>Select a Stock</Text>
							<Text style={{ color: theme.colors.text.disabled, fontSize: 13, paddingHorizontal: 20, marginBottom: 14 }}>Stocks with available AI research</Text>

							{availableStocks.length === 0 ? (
								<View style={{ padding: 32, alignItems: 'center' }}>
									<Ionicons name="search-outline" size={32} color={theme.colors.accent.glow} style={{ marginBottom: 10 }} />
									<Text style={{ color: theme.colors.text.disabled, textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
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
											style={{
												flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13,
												borderBottomWidth: 1, borderBottomColor: theme.colors.border.primary, gap: 12,
											}}
											activeOpacity={0.7}
										>
											<View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: theme.colors.accent.glow, alignItems: 'center', justifyContent: 'center' }}>
												<Text style={{ color: theme.colors.accent.primary, fontWeight: '700', fontSize: 12 }}>{item.symbol.slice(0, 4)}</Text>
											</View>
											<View style={{ flex: 1 }}>
												<Text style={{ color: theme.colors.text.primary, fontWeight: '600', fontSize: 15 }}>{item.symbol}</Text>
												{item.lastUpdatedAt && (
													<Text style={{ color: theme.colors.text.disabled, fontSize: 12, marginTop: 1 }}>
														Updated {formatRelativeDate(item.lastUpdatedAt)}
													</Text>
												)}
											</View>
											{selectedSymbol === item.symbol && (
												<Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
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
					<View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
						{/* Dimmed overlay */}
						<TouchableOpacity
							style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' }}
							activeOpacity={1}
							onPress={closeHistory}
						/>
						{/* Sliding panel */}
						<Animated.View
							style={[{
								position: 'absolute', right: 0, top: 0, bottom: 0, width: 300,
								backgroundColor: theme.colors.background.primary,
								borderLeftWidth: 1, borderLeftColor: theme.colors.border.accent,
								shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 20,
							}, { transform: [{ translateX: historyAnim }] }]}
						>
							<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'right']}>
								{/* Panel header */}
								<View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border.primary }}>
									<Ionicons name="time-outline" size={18} color={theme.colors.accent.primary} style={{ marginRight: 8 }} />
									<Text style={{ flex: 1, color: theme.colors.text.primary, fontSize: 16, fontWeight: '700' }}>Chat History</Text>
									<TouchableOpacity onPress={closeHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
										<Ionicons name="close" size={22} color={theme.colors.text.disabled} />
									</TouchableOpacity>
								</View>

								{/* Chat list */}
								{allChats.length === 0 ? (
									<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
										<Ionicons name="chatbubble-outline" size={38} color={theme.colors.accent.glow} style={{ marginBottom: 12 }} />
										<Text style={{ color: theme.colors.text.disabled, textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
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
													{
														flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
														borderBottomWidth: 1, borderBottomColor: theme.colors.surface.primary, gap: 10,
													},
													chatId === item.chatId && { backgroundColor: theme.colors.accent.glow },
												]}
												activeOpacity={0.7}
											>
												<View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.accent.glow, alignItems: 'center', justifyContent: 'center' }}>
													<Text style={{ color: theme.colors.accent.primary, fontWeight: '700', fontSize: 10 }}>{item.symbol.slice(0, 4)}</Text>
												</View>
												<View style={{ flex: 1 }}>
													<Text style={{ color: theme.colors.text.primary, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
														{item.title || `${item.symbol} Research`}
													</Text>
													<Text style={{ color: theme.colors.text.disabled, fontSize: 11, marginTop: 2 }}>
														{formatRelativeDate(item.createdAt)}
													</Text>
												</View>
												{chatId === item.chatId && (
													<View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.accent.primary }} />
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

function IdleState({ theme, onSelectStock }: { theme: Theme; onSelectStock: () => void }) {
	return (
		<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
			<View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: theme.colors.accent.glow, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
				<Ionicons name="sparkles" size={36} color={theme.colors.accent.primary} />
			</View>
			<Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: '700', marginBottom: 10 }}>AI Research</Text>
			<Text style={{ color: theme.colors.text.disabled, fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 280, marginBottom: 28 }}>
				Select a stock to view a data-backed research report powered by AI.
			</Text>
			<TouchableOpacity onPress={onSelectStock} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, backgroundColor: theme.colors.accent.primary }} activeOpacity={0.8}>
				<Ionicons name="search" size={15} color={theme.colors.text.inverse} style={{ marginRight: 8 }} />
				<Text style={{ color: theme.colors.text.inverse, fontWeight: '700', fontSize: 15 }}>Browse Available Stocks</Text>
			</TouchableOpacity>
		</View>
	);
}

function LoadingState({ theme, statusText, phase }: { theme: Theme; statusText: string; phase: ScreenPhase }) {
	const subtitles: Partial<Record<ScreenPhase, string>> = {
		initializing: 'Setting up the knowledge base and collecting market data…',
		processing: 'Analyzing pricing history, news articles, and market context…',
		creating_chat: 'Preparing your personalized research session…',
		loading_messages: 'Loading your research report…',
	};
	return (
		<View style={{ alignItems: 'center', gap: 4 }}>
			<View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accent.glow, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
				<Ionicons name="sparkles" size={32} color={theme.colors.accent.primary} />
			</View>
			<ActivityIndicator size="large" color={theme.colors.accent.primary} style={{ marginBottom: 16 }} />
			<Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 6 }}>{statusText}</Text>
			{subtitles[phase] && (
				<Text style={{ color: theme.colors.text.disabled, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 20 }}>{subtitles[phase]}</Text>
			)}
		</View>
	);
}

function ErrorState({ theme, message, onRetry }: { theme: Theme; message: string | null; onRetry: () => void }) {
	return (
		<View style={{ alignItems: 'center', gap: 4 }}>
			<View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: theme.colors.error + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
				<Ionicons name="warning-outline" size={30} color={theme.colors.error} />
			</View>
			<Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Something went wrong</Text>
			<Text style={{ color: theme.colors.text.secondary, fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginBottom: 20 }}>{message || 'An unexpected error occurred.'}</Text>
			<TouchableOpacity onPress={onRetry} style={{ paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.accent.glow, borderWidth: 1, borderColor: theme.colors.border.accent }} activeOpacity={0.8}>
				<Text style={{ color: theme.colors.accent.primary, fontWeight: '600', fontSize: 15 }}>Try again</Text>
			</TouchableOpacity>
		</View>
	);
}

function MessageBubble({ message, theme }: { message: DisplayMessage; theme: Theme }) {
	const isUser = message.role === 'user';

	if (isUser) {
		return (
			<View style={{ alignSelf: 'flex-end', maxWidth: '82%', marginBottom: 10 }}>
				<View style={{
					paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderTopRightRadius: 4,
					backgroundColor: theme.colors.accent.glow,
					borderWidth: 1, borderColor: theme.colors.border.accent,
				}}>
					<Text style={{ color: theme.colors.text.primary, fontSize: 14, lineHeight: 21 }}>{message.content}</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={{ alignSelf: 'flex-start', maxWidth: '96%', marginBottom: 14 }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 }}>
				<Ionicons name="sparkles" size={11} color={theme.colors.accent.primary} />
				<Text style={{ color: theme.colors.accent.primary, fontSize: 11, fontWeight: '600' }}>AI Analyst</Text>
			</View>
			<View style={{
				paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderTopLeftRadius: 4,
				backgroundColor: theme.colors.surface.primary,
				borderWidth: 1, borderColor: theme.colors.border.primary,
			}}>
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
