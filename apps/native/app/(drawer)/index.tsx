import { View, Text, ScrollView } from "react-native";
import { Container } from "@/components/container";

export default function Home() {
	return (
		<Container>
			<ScrollView showsVerticalScrollIndicator={false} className="flex-1">
			</ScrollView>
		</Container>
	);
}
