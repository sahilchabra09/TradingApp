/**
 * Drawer Layout - Main navigation wrapper
 */
import { Drawer } from "expo-router/drawer";
import { useTheme } from "@/lib/hooks";
import { SafeAreaProvider } from "react-native-safe-area-context";

const DrawerLayout = () => {
	const theme = useTheme();

	return (
		<SafeAreaProvider>
			<Drawer
				screenOptions={{
					headerShown: false,
					drawerStyle: {
						backgroundColor: theme.colors.background.primary,
					},
					drawerActiveTintColor: theme.colors.accent.primary,
					drawerInactiveTintColor: theme.colors.text.secondary,
				}}
			>
				<Drawer.Screen
					name="(tabs)"
					options={{
						drawerLabel: "Trading",
						headerShown: false,
					}}
				/>
			</Drawer>
		</SafeAreaProvider>
	);
};

export default DrawerLayout;
