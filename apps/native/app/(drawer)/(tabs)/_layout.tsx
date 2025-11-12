import { TabBarIcon } from "@/components/tabbar-icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Tabs } from "expo-router";
import { BlurView } from 'expo-blur';

export default function TabLayout() {
	const { isDarkColorScheme } = useColorScheme();

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: "#10B981",
				tabBarInactiveTintColor: "#6B7280",
				tabBarStyle: {
					position: 'absolute',
					backgroundColor: 'rgba(0, 0, 0, 0.85)',
					borderTopWidth: 1,
					borderTopColor: 'rgba(16, 185, 129, 0.2)',
					height: 80,
					paddingBottom: 20,
					paddingTop: 10,
					elevation: 0,
				},
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: '600',
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
