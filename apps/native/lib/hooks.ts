/**
 * Custom React hooks for the trading app
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Animated, Keyboard } from 'react-native';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { lightTheme, darkTheme, type Theme } from './theme';
import type { PaperMarketData } from './paper-api';

/**
 * Hook to get the current theme
 */
export const useTheme = (): Theme => {
  const colorScheme = useNativeColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
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

const PAPER_STREAM_BASE_URL = toWebSocketBaseUrl(
	process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000'
);

/**
 * Maintains a realtime websocket stream for paper trading market data updates.
 */
export const usePaperMarketStream = ({
	enabled = true,
	symbols = [],
	getToken,
	onSnapshot,
	onQuote,
	onError,
	onReady,
}: UsePaperMarketStreamOptions) => {
	const socketRef = useRef<WebSocket | null>(null);
	const callbacksRef = useRef({
		onSnapshot,
		onQuote,
		onError,
		onReady,
	});
	const [connectionState, setConnectionState] = useState<
		'idle' | 'connecting' | 'open' | 'closed' | 'error'
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
		};
	}, [onSnapshot, onQuote, onError, onReady]);

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

		const uniqueSymbols = symbolsKey ? symbolsKey.split(',') : [];
		const symbolsParam = uniqueSymbols.join(',');
		let isDisposed = false;

		const connect = async () => {
			setConnectionState('connecting');
			const token = await getToken();
			if (!token || isDisposed) {
				if (!isDisposed) {
					setConnectionState('error');
					callbacksRef.current.onError?.('Please sign in again to start realtime market data.');
				}
				return;
			}

			const streamUrl = `${PAPER_STREAM_BASE_URL}/api/paper-trading/stream?symbols=${encodeURIComponent(symbolsParam)}`;
			const socket = new (WebSocket as any)(
				streamUrl,
				undefined,
				{ headers: { Authorization: `Bearer ${token}` } } as any
			) as WebSocket;
			socketRef.current = socket;

			socket.onopen = () => {
				if (isDisposed) {
					return;
				}
				setConnectionState('open');
			};

			socket.onmessage = (event) => {
				if (isDisposed || typeof event.data !== 'string') {
					return;
				}

				try {
				const message = JSON.parse(event.data) as {
					type?: string;
					quote?: PaperMarketData | LiveQuoteUpdate;
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
						case 'error':
							callbacksRef.current.onError?.(
								message.message || 'Realtime market stream reported an error.'
							);
							return;
						default:
							return;
					}
				} catch (error) {
					callbacksRef.current.onError?.(
						error instanceof Error ? error.message : 'Invalid realtime market stream payload.'
					);
				}
			};

			socket.onerror = () => {
				if (isDisposed) {
					return;
				}
				setConnectionState('error');
				callbacksRef.current.onError?.('Realtime market stream failed.');
			};

			socket.onclose = () => {
				if (isDisposed) {
					return;
				}
				setConnectionState('closed');
			};
		};

		void connect();

		return () => {
			isDisposed = true;
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
