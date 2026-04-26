import { PaperAccountGateModal } from "@/components/paper-account-gate-modal";
import { FloatingPillTabBar } from "@/components/LiquidGlassTabBar";
import { Tabs } from "expo-router";

export default function TabLayout() {
	return (
		<>
			<Tabs
        tabBar={(props) => <FloatingPillTabBar {...props} />}
				screenOptions={{
					headerShown: false,
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						title: "Home",
					}}
				/>
				<Tabs.Screen
					name="markets"
					options={{
						title: "Markets",
					}}
				/>
				<Tabs.Screen
					name="trade"
					options={{
						title: "Trade",
					}}
				/>
				<Tabs.Screen
					name="news"
					options={{
						title: "News",
					}}
				/>
				<Tabs.Screen
					name="profile"
					options={{
						title: "Profile",
					}}
				/>
			</Tabs>
			<PaperAccountGateModal />
		</>
	);
}
