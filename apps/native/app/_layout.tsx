import { Stack, useRouter, useSegments } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
	DarkTheme,
	DefaultTheme,
	type Theme,
	ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { NAV_THEME } from "@/lib/constants";
import React, { useEffect, useRef } from "react";
import { useColorScheme } from "@/lib/use-color-scheme";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { setAndroidNavigationBar } from "@/lib/android-navigation-bar";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import type { TokenCache } from "@clerk/clerk-expo";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();
void SplashScreen.preventAutoHideAsync();

const tokenCache: TokenCache = {
	async getToken(key) {
		try {
			return await SecureStore.getItemAsync(key);
		} catch {
			return null;
		}
	},
	async saveToken(key, value) {
		try {
			if (!value) {
				await SecureStore.deleteItemAsync(key);
				return;
			}
			await SecureStore.setItemAsync(key, value);
		} catch {
			// ignore storage errors; Clerk will re-request tokens if needed
		}
	},
};

const LIGHT_THEME: Theme = {
	...DefaultTheme,
	colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
	...DarkTheme,
	colors: NAV_THEME.dark,
};

export const unstable_settings = {
	initialRouteName: "(drawer)",
};

const AUTH_SEGMENTS = new Set(["(auth)", "sign-in", "sign-up", "verify-email"]);
const APP_SEGMENTS = new Set(["(drawer)", "", undefined]);

const InitialLayout = () => {
	const { isLoaded, isSignedIn } = useAuth();
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		if (isLoaded) {
			void SplashScreen.hideAsync();
		}
	}, [isLoaded]);

	useEffect(() => {
		if (!isLoaded) {
			return;
		}
		const firstSegment = segments[0];
		const inAuth = AUTH_SEGMENTS.has(firstSegment as string);
		const inApp = APP_SEGMENTS.has(firstSegment as string);

		if (isSignedIn && !inApp) {
			router.replace("/");
			return;
		}

		if (!isSignedIn && !inAuth) {
			router.replace("/sign-in");
		}
	}, [isLoaded, isSignedIn, segments, router]);

	if (!isLoaded) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "#000000",
				}}
			>
				<ActivityIndicator size="large" color="#10B981" />
				<Text style={{ color: "#FFFFFF", marginTop: 12 }}>
					Loading your session...
				</Text>
			</View>
		);
	}

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: {
					backgroundColor: "#000000",
				},
			}}
		>
			<Stack.Screen name="(auth)" options={{ headerShown: false }} />
			<Stack.Screen name="(drawer)" options={{ headerShown: false }} />
			<Stack.Screen
				name="modal"
				options={{
					title: "Modal",
					presentation: "modal",
					headerShown: true,
					headerStyle: { backgroundColor: "#000000" },
					headerTintColor: "#FFFFFF",
					headerShadowVisible: false,
				}}
			/>
		</Stack>
	);
};

export default function RootLayout() {
	const hasMounted = useRef(false);
	const { colorScheme, isDarkColorScheme } = useColorScheme();
	const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);
	const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

	useIsomorphicLayoutEffect(() => {
		if (hasMounted.current) {
			return;
		}

		if (Platform.OS === "web") {
			document.documentElement.classList.add("bg-background");
		}
		setAndroidNavigationBar(colorScheme);
		setIsColorSchemeLoaded(true);
		hasMounted.current = true;
	}, []);

	if (!isColorSchemeLoaded) {
		return null;
	}

	if (!publishableKey) {
		throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in your Expo env.");
	}

	return (
		<ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
			<SafeAreaProvider>
				<ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
					<StatusBar style="light" />
					<GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
						<InitialLayout />
					</GestureHandlerRootView>
				</ThemeProvider>
			</SafeAreaProvider>
		</ClerkProvider>
	);
}

const useIsomorphicLayoutEffect =
	Platform.OS === "web" && typeof window === "undefined"
		? React.useEffect
		: React.useLayoutEffect;
