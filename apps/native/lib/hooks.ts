/**
 * Custom React hooks for the trading app
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Animated, Keyboard } from 'react-native';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { lightTheme, darkTheme, type Theme } from './theme';

/**
 * Hook to get the current theme
 */
export const useTheme = (): Theme => {
  const colorScheme = useNativeColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
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
