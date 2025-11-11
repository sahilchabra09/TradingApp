import { TabBarIcon } from "@/components/tabbar-icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Tabs } from "expo-router";

export default function TabLayout() {
	const { isDarkColorScheme } = useColorScheme();

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: isDarkColorScheme
					? "#00D35A"
					: "#00A347",
				tabBarInactiveTintColor: isDarkColorScheme
					? "hsl(215 20.2% 65.1%)"
					: "hsl(215.4 16.3% 46.9%)",
				tabBarStyle: {
					backgroundColor: isDarkColorScheme
						? "#001C10"
						: "#FFFFFF",
					borderTopColor: isDarkColorScheme
						? "#003C24"
						: "#E9FFF1",
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="markets"
				options={{
					title: "Markets",
					tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="trade"
				options={{
					title: "Trade",
					tabBarIcon: ({ color }) => <TabBarIcon name="shopping-cart" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="news"
				options={{
					title: "News",
					tabBarIcon: ({ color }) => <TabBarIcon name="file-text" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
				}}
			/>
		</Tabs>
	);
}
