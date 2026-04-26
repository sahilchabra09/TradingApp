/**
 * Custom React hooks for the trading app
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Animated, Keyboard } from 'react-native';
import type { Theme } from './theme';
import { useAppTheme } from './ThemeContext';
import type { PaperMarketData } from './paper-api';
import type { NewsArticle } from './news-api';

/**
 * Hook to get the current theme.
 * Now backed by ThemeContext so it responds to the user's theme choice
 * (Obsidian / Ivory / Midnight) rather than the OS colour scheme.
 */
export const useTheme = (): Theme => {
  const { theme } = useAppTheme();
  return theme;
};

/**
 * Wraps Clerk's getToken in a stable ref so it can be safely used in
 * useCallback/useEffect dependency arrays without causing infinite re-renders.
 * Clerk's useAuth().getToken returns a new function reference on every render.
 */
export const useStableToken = (getToken: () => Promise<string | null>) => {
  const ref = useRef(getToken);
  ref.current = getToken;
  return useCallback(() => ref.current(), []);
};

/**
 * Hook to manage animation values
 */
export const useAnimatedValue = (initialValue: number = 0) => {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  
  const animate = useCallback((
    toValue: number,
    duration: number = 240,
    useNativeDriver: boolean = true
  ) => {
    Animated.timing(animatedValue, {
      toValue,
      duration,
      useNativeDriver,
    }).start();
  }, [animatedValue]);
  
  return { animatedValue, animate };
};

/**
 * Hook to detect keyboard visibility
 */
export const useKeyboard = () => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
};

/**
 * Hook for debounced value
 */
export const useDebounce = <T,>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for interval-based updates
 */
export const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
};

/**
 * Hook for toggle state
 */
export const useToggle = (initialValue: boolean = false): [boolean, () => void] => {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle];
};

/**
 * Hook for previous value
 */
export const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
};

/**
 * Hook for mounting state
 */
export const useIsMounted = (): (() => boolean) => {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
};

/**
 * Hook for loading state management
 */
export const useLoading = (initialState: boolean = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  
  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);
  
  return { isLoading, startLoading, stopLoading, setIsLoading };
};

/**
 * Hook for counter with increment/decrement
 */
export const useCounter = (initialValue: number = 0) => {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  
  return { count, increment, decrement, reset, setCount };
};

type PollingOptions<T> = {
  enabled?: boolean;
  intervalMs?: number;
  fetcher: () => Promise<T>;
};

/**
 * Polls a remote resource and keeps the latest data in state.
 */
export const usePollingResource = <T,>({
  enabled = true,
  intervalMs = 30_000,
  fetcher,
}: PollingOptions<T>) => {
  const isMounted = useIsMounted();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(
    async (background = false) => {
      if (!enabled) {
        return null;
      }

      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const nextData = await fetcher();
        if (!isMounted()) {
          return nextData;
        }

        setData(nextData);
        setError(null);
        setLastUpdatedAt(new Date());
        return nextData;
      } catch (err) {
        if (!isMounted()) {
          return null;
        }

        setError(err instanceof Error ? err.message : 'Unable to refresh data.');
        return null;
      } finally {
        if (isMounted()) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [enabled, fetcher, isMounted]
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void refresh(false);
  }, [enabled, refresh]);

  useInterval(() => {
    void refresh(true);
  }, enabled ? intervalMs : null);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    lastUpdatedAt,
    refresh,
  };
};

/**
 * Convenience wrapper for the app's standard 30 second price refresh cycle.
 */
export const useThirtySecondPolling = <T,>(
  options: Omit<PollingOptions<T>, 'intervalMs'>
) => {
  return usePollingResource({
    ...options,
    intervalMs: 30_000,
  });
};

type LiveQuoteUpdate = {
	symbol: string;
	lastPrice: string;
	asOf: string;
	exchange: string | null;
	source?: 'websocket' | 'rest';
};

type UsePaperMarketStreamOptions = {
	enabled?: boolean;
	symbols?: string[];
	getToken: () => Promise<string | null>;
	onSnapshot?: (quote: PaperMarketData) => void;
	onQuote?: (quote: LiveQuoteUpdate) => void;
	onError?: (message: string) => void;
	onReady?: () => void;
	/** Called when the server confirms a symbol subscription. */
	onSubscribed?: (symbols: string[]) => void;
	/** Called when the server confirms a symbol unsubscription. */
	onUnsubscribed?: (symbols: string[]) => void;
};

function toWebSocketBaseUrl(rawBaseUrl: string) {
	const normalized = rawBaseUrl.replace(/\/+$/, '');
	if (normalized.startsWith('https://')) {
		return `wss://${normalized.slice('https://'.length)}`;
	}

	if (normalized.startsWith('http://')) {
		return `ws://${normalized.slice('http://'.length)}`;
	}

	if (normalized.startsWith('wss://') || normalized.startsWith('ws://')) {
		return normalized;
	}

	return `ws://${normalized}`;
}

// Reconnect parameters — exponential backoff with jitter.
const RECONNECT_BASE_MS     = 1_000;
const RECONNECT_MAX_MS      = 30_000;
const RECONNECT_MAX_ATTEMPTS = 8;

function getReconnectDelay(attempt: number): number {
	const exp    = RECONNECT_BASE_MS * Math.pow(2, attempt);
	const jitter = Math.random() * 500;
	return Math.min(exp + jitter, RECONNECT_MAX_MS);
}

/**
 * Maintains a realtime WebSocket stream for paper trading market data updates.
 *
 * Auth note: the Authorization header is forwarded via the third argument of
 * the WebSocket constructor — a React Native / Expo extension that is NOT
 * available in browser WebSocket. This is intentional; the server's requireAuth
 * middleware requires a Bearer token on the upgrade request.
 *
 * Reconnect: automatically reconnects with exponential backoff (up to
 * RECONNECT_MAX_ATTEMPTS times) whenever the socket closes unexpectedly.
 * A deliberate unmount or symbol-set change closes the socket cleanly without
 * triggering reconnect.
 */
export const usePaperMarketStream = ({
	enabled = true,
	symbols = [],
	getToken,
	onSnapshot,
	onQuote,
	onError,
	onReady,
	onSubscribed,
	onUnsubscribed,
}: UsePaperMarketStreamOptions) => {
	const socketRef = useRef<WebSocket | null>(null);
	const callbacksRef = useRef({
		onSnapshot,
		onQuote,
		onError,
		onReady,
		onSubscribed,
		onUnsubscribed,
	});
	const [connectionState, setConnectionState] = useState<
		'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error'
	>('idle');
	const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);
	const symbolsKey = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
		.slice(0, 100)
		.join(',');

	useEffect(() => {
		callbacksRef.current = {
			onSnapshot,
			onQuote,
			onError,
			onReady,
			onSubscribed,
			onUnsubscribed,
		};
	}, [onSnapshot, onQuote, onError, onReady, onSubscribed, onUnsubscribed]);

	const send = useCallback((payload: object) => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return;
		}
		socket.send(JSON.stringify(payload));
	}, []);

	useEffect(() => {
		if (!enabled) {
			setConnectionState('idle');
			socketRef.current?.close();
			socketRef.current = null;
			return;
		}

		const symbolsParam = symbolsKey; // already deduped + comma-joined
		let isDisposed = false;
		let reconnectAttempt = 0;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

		// Forward-declare so connect() and scheduleReconnect() can reference each
		// other via closure. Both are only ever invoked asynchronously (setTimeout /
		// socket event callbacks), so the binding is always initialised before use.
		let scheduleReconnect: () => void = () => {};

		const connect = async () => {
			if (isDisposed) return;
			setConnectionState(reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

			const token = await getToken();
			if (!token || isDisposed) {
				if (!isDisposed) {
					setConnectionState('error');
					callbacksRef.current.onError?.(
						'Please sign in again to start realtime market data.'
					);
				}
				return;
			}

			// Compute the WS base URL here (not at module load time) so that the
			// value is always current and misconfiguration is caught early in dev.
			const rawServerUrl = process.env.EXPO_PUBLIC_SERVER_URL;
			if (!rawServerUrl && typeof __DEV__ !== 'undefined' && __DEV__) {
				console.warn(
					'[PaperMarketStream] EXPO_PUBLIC_SERVER_URL is not set. ' +
						'Falling back to ws://localhost:3000. ' +
						'Set this env var before building for non-local environments.'
				);
			}
			const wsBase     = toWebSocketBaseUrl(rawServerUrl || 'http://localhost:3000');
			const streamUrl  = `${wsBase}/api/paper-trading/stream?symbols=${encodeURIComponent(symbolsParam)}`;

			// React Native / Expo supports passing arbitrary HTTP headers on the
			// WebSocket upgrade request via the third constructor argument.
			// This is intentional and required — browser WebSocket does not support it.
			const socket = new (WebSocket as any)(
				streamUrl,
				undefined,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						// Prevents ngrok's browser-warning interstitial from intercepting
						// the WS upgrade when the dev server is tunnelled through ngrok.
						'ngrok-skip-browser-warning': '1',
					},
				} as any
			) as WebSocket;
			socketRef.current = socket;

			socket.onopen = () => {
				if (isDisposed) return;
				reconnectAttempt = 0; // reset backoff on successful connection
				setConnectionState('open');
			};

			socket.onmessage = (event) => {
				if (isDisposed || typeof event.data !== 'string') return;

				try {
					const message = JSON.parse(event.data) as {
						type?: string;
						quote?: PaperMarketData | LiveQuoteUpdate;
						symbols?: string[];
						message?: string;
					};

					setLastMessageAt(new Date());

					switch (message.type) {
						case 'ready':
							callbacksRef.current.onReady?.();
							return;
						case 'snapshot':
							if (message.quote) {
								callbacksRef.current.onSnapshot?.(message.quote as PaperMarketData);
							}
							return;
						case 'quote':
							if (message.quote) {
								callbacksRef.current.onQuote?.(message.quote as LiveQuoteUpdate);
							}
							return;
						case 'subscribed':
							if (message.symbols) {
								callbacksRef.current.onSubscribed?.(message.symbols);
							}
							return;
						case 'unsubscribed':
							if (message.symbols) {
								callbacksRef.current.onUnsubscribed?.(message.symbols);
							}
							return;
						case 'pong':
							// Keepalive acknowledgement — lastMessageAt is already updated above.
							return;
						case 'error':
							callbacksRef.current.onError?.(
								message.message || 'Realtime market stream reported an error.'
							);
							return;
						default:
							return;
					}
				} catch (err) {
					callbacksRef.current.onError?.(
						err instanceof Error
							? err.message
							: 'Invalid realtime market stream payload.'
					);
				}
			};

			socket.onerror = () => {
				if (isDisposed) return;
				callbacksRef.current.onError?.(
					reconnectAttempt < RECONNECT_MAX_ATTEMPTS
						? 'Realtime market stream error. Reconnecting\u2026'
						: 'Realtime market stream failed.'
				);
				scheduleReconnect();
			};

			socket.onclose = () => {
				if (isDisposed) return;
				scheduleReconnect();
			};
		};

		scheduleReconnect = () => {
			if (isDisposed) return;
			if (reconnectAttempt >= RECONNECT_MAX_ATTEMPTS) {
				setConnectionState('error');
				callbacksRef.current.onError?.(
					'Realtime market stream could not reconnect. Please reload.'
				);
				return;
			}
			const delay = getReconnectDelay(reconnectAttempt);
			reconnectAttempt++;
			setConnectionState('reconnecting');
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				if (!isDisposed) void connect();
			}, delay);
		};

		void connect();

		return () => {
			isDisposed = true;
			if (reconnectTimer !== null) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			const socket = socketRef.current;
			if (socket && socket.readyState !== WebSocket.CLOSED) {
				socket.close();
			}
			socketRef.current = null;
		};
	}, [enabled, getToken, symbolsKey]);

	const subscribe = useCallback(
		(nextSymbols: string[]) => {
			send({
				type: 'subscribe',
				symbols: [...new Set(nextSymbols.map((item) => item.trim().toUpperCase()).filter(Boolean))],
			});
		},
		[send]
	);

	const unsubscribe = useCallback(
		(nextSymbols: string[]) => {
			send({
				type: 'unsubscribe',
				symbols: [...new Set(nextSymbols.map((item) => item.trim().toUpperCase()).filter(Boolean))],
			});
		},
		[send]
	);

	return {
		connectionState,
		lastMessageAt,
		subscribe,
		unsubscribe,
	};
};

// ─── useNewsStream ────────────────────────────────────────────────────────────

type UseNewsStreamOptions = {
	enabled?: boolean;
	/**
	 * Initial symbol filter.  Pass ["*"] or leave empty for all news.
	 * You can dynamically subscribe/unsubscribe after mount.
	 */
	symbols?: string[];
	getToken: () => Promise<string | null>;
	/** Called when the server sends the catch-up history batch. */
	onHistory?: (articles: NewsArticle[]) => void;
	/** Called for every new real-time article. */
	onArticle?: (article: NewsArticle) => void;
	onError?: (message: string) => void;
	onReady?: () => void;
};

type NewsConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';

/**
 * Maintains a real-time WebSocket connection to the backend news stream
 * (`/api/news/stream`).  The server fans out new Alpaca news articles as
 * they arrive.  On connect the server sends the last 50 buffered articles
 * as a "history" message so the feed is never empty.
 *
 * Auth note: the Authorization header is forwarded via the third argument of
 * the WebSocket constructor — a React Native / Expo extension not available
 * in browser WebSocket.
 */
export const useNewsStream = ({
	enabled = true,
	symbols = [],
	getToken,
	onHistory,
	onArticle,
	onError,
	onReady,
}: UseNewsStreamOptions) => {
	const socketRef    = useRef<WebSocket | null>(null);
	const callbacksRef = useRef({ onHistory, onArticle, onError, onReady });
	const [connectionState, setConnectionState] = useState<NewsConnectionState>('idle');
	const [lastArticleAt, setLastArticleAt]     = useState<Date | null>(null);

	// Keep callback refs fresh without causing reconnects
	useEffect(() => {
		callbacksRef.current = { onHistory, onArticle, onError, onReady };
	}, [onHistory, onArticle, onError, onReady]);

	const symbolsParam = [
		...new Set(
			(symbols.length === 0 ? ['*'] : symbols)
				.map((s) => s.trim().toUpperCase())
				.filter(Boolean)
		),
	].join(',');

	const send = useCallback((payload: object) => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) return;
		socket.send(JSON.stringify(payload));
	}, []);

	useEffect(() => {
		if (!enabled) {
			setConnectionState('idle');
			socketRef.current?.close();
			socketRef.current = null;
			return;
		}

		let isDisposed        = false;
		let reconnectAttempt  = 0;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let scheduleReconnect: () => void = () => {};

		const connect = async () => {
			if (isDisposed) return;
			setConnectionState(reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

			const token = await getToken();
			if (!token || isDisposed) {
				if (!isDisposed) {
					setConnectionState('error');
					callbacksRef.current.onError?.('Please sign in to access news.');
				}
				return;
			}

			const rawServerUrl = process.env.EXPO_PUBLIC_SERVER_URL;
			const wsBase = toWebSocketBaseUrl(rawServerUrl || 'http://localhost:3004');
			const streamUrl = `${wsBase}/api/news/stream?symbols=${encodeURIComponent(symbolsParam)}`;

			const socket = new (WebSocket as any)(
				streamUrl,
				undefined,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'ngrok-skip-browser-warning': '1',
					},
				} as any
			) as WebSocket;
			socketRef.current = socket;

			socket.onopen = () => {
				if (isDisposed) return;
				reconnectAttempt = 0;
				setConnectionState('open');
			};

			socket.onmessage = (event) => {
				if (isDisposed || typeof event.data !== 'string') return;
				try {
					const message = JSON.parse(event.data) as {
						type?: string;
						articles?: NewsArticle[];
						article?: NewsArticle;
						symbols?: string[];
						message?: string;
						asOf?: string;
					};

					switch (message.type) {
						case 'ready':
							callbacksRef.current.onReady?.();
							return;
						case 'history':
							if (message.articles) {
								callbacksRef.current.onHistory?.(message.articles);
							}
							return;
						case 'article':
							if (message.article) {
								setLastArticleAt(new Date());
								callbacksRef.current.onArticle?.(message.article);
							}
							return;
						case 'pong':
							return;
						case 'error':
							callbacksRef.current.onError?.(
								message.message || 'News stream error.'
							);
							return;
						default:
							return;
					}
				} catch (err) {
					callbacksRef.current.onError?.(
						err instanceof Error ? err.message : 'Invalid news stream payload.'
					);
				}
			};

			socket.onerror = () => {
				if (isDisposed) return;
				callbacksRef.current.onError?.(
					reconnectAttempt < RECONNECT_MAX_ATTEMPTS
						? 'News stream error. Reconnecting\u2026'
						: 'News stream failed.'
				);
				scheduleReconnect();
			};

			socket.onclose = () => {
				if (isDisposed) return;
				scheduleReconnect();
			};
		};

		scheduleReconnect = () => {
			if (isDisposed) return;
			if (reconnectAttempt >= RECONNECT_MAX_ATTEMPTS) {
				setConnectionState('error');
				callbacksRef.current.onError?.(
					'News stream could not reconnect. Please reload.'
				);
				return;
			}
			const delay = getReconnectDelay(reconnectAttempt);
			reconnectAttempt++;
			setConnectionState('reconnecting');
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				if (!isDisposed) void connect();
			}, delay);
		};

		void connect();

		return () => {
			isDisposed = true;
			if (reconnectTimer !== null) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			const socket = socketRef.current;
			if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();
			socketRef.current = null;
		};
	}, [enabled, getToken, symbolsParam]);

	/** Subscribe to additional symbols after mount */
	const subscribe = useCallback(
		(nextSymbols: string[]) => {
			send({
				type: 'subscribe',
				symbols: [...new Set(nextSymbols.map((s) => s.trim().toUpperCase()).filter(Boolean))],
			});
		},
		[send]
	);

	/** Unsubscribe from symbols */
	const unsubscribe = useCallback(
		(nextSymbols: string[]) => {
			send({
				type: 'unsubscribe',
				symbols: [...new Set(nextSymbols.map((s) => s.trim().toUpperCase()).filter(Boolean))],
			});
		},
		[send]
	);

	const ping = useCallback(() => send({ type: 'ping' }), [send]);

	return { connectionState, lastArticleAt, subscribe, unsubscribe, ping };
};
