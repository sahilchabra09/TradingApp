import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useStableToken } from '@/lib/hooks';import { router } from 'expo-router';
import {
	activatePaperAccount,
	getPaperAccount,
	getPaperPortfolio,
	getPaperStatus,
	type PaperAccount,
	type PaperPortfolioResponse,
	type PaperStatus,
} from '@/lib/paper-api';
import { formatCurrency, formatPercentage, formatRelativeTime } from '@/lib/formatters';

type DashboardState = {
	status: PaperStatus | null;
	account: PaperAccount | null;
	portfolio: PaperPortfolioResponse | null;
};

const toNumber = (value: string | undefined) => Number(value || 0);

export default function DemoDashboardScreen() {
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [isLoading, setIsLoading] = useState(true);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<DashboardState>({
		status: null,
		account: null,
		portfolio: null,
	});

	const loadDashboard = useCallback(async () => {
		if (!isSignedIn) {
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			const status = await getPaperStatus(stableGetToken);
			if (!status.hasDemoAccount) {
				setData({ status, account: null, portfolio: null });
				setError(null);
				setLastUpdatedAt(new Date());
				return;
			}

			const account = await getPaperAccount(stableGetToken);
			const portfolio = await getPaperPortfolio(account.userId, stableGetToken);
			setData({ status, account, portfolio });
			setError(null);
			setLastUpdatedAt(new Date());
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn]);

	useEffect(() => {
		void loadDashboard();
	}, [loadDashboard]);

	if (!isSignedIn) {
		return (
			<SafeAreaView className="flex-1 bg-[#050A05]">
				<View className="flex-1 items-center justify-center px-6">
					<Text className="text-center text-base text-[#A8D5B3]">
						Sign in to view your demo dashboard.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (isLoading && !data.status) {
		return (
			<SafeAreaView className="flex-1 bg-[#050A05]">
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color="#00D35A" />
					<Text className="mt-3 text-sm text-[#A8D5B3]">Loading demo dashboard...</Text>
				</View>
			</SafeAreaView>
		);
	}

	const cash = toNumber(data.portfolio?.cash);
	const totalValue = toNumber(data.portfolio?.totalValue);
	const totalPnl = toNumber(data.portfolio?.totalPnl);
	const pnlPct = cash > 0 ? (totalPnl / cash) * 100 : 0;

	return (
		<SafeAreaView className="flex-1 bg-[#050A05]">
			<View className="flex-1 px-4 pb-6 pt-4">
				<View className="rounded-[28px] border border-emerald-400/15 bg-[#082013] px-5 py-5">
					<Text className="text-xs uppercase tracking-[1.7px] text-[#6B9175]">
						Demo Wallet
					</Text>
					<Text className="mt-2 text-3xl font-bold tracking-tight text-[#E6F8EA]">
						{data.portfolio ? formatCurrency(totalValue) : '--'}
					</Text>
					<Text
						className={
							totalPnl >= 0
								? 'mt-3 text-base font-semibold text-emerald-300'
								: 'mt-3 text-base font-semibold text-rose-300'
						}
					>
						{data.portfolio
							? `${formatCurrency(totalPnl)} · ${formatPercentage(pnlPct)}`
							: `KYC: ${data.status?.kycStatus || 'not_started'}`}
					</Text>
				</View>

				<View className="mt-4 flex-row gap-x-3">
					<View className="flex-1 rounded-3xl border border-white/8 bg-[#07140b] px-4 py-4">
						<Text className="text-xs uppercase tracking-[1.4px] text-[#6B9175]">Cash</Text>
						<Text className="mt-2 text-xl font-semibold text-[#E6F8EA]">
							{data.portfolio ? formatCurrency(cash) : '--'}
						</Text>
					</View>
					<View className="flex-1 rounded-3xl border border-white/8 bg-[#07140b] px-4 py-4">
						<Text className="text-xs uppercase tracking-[1.4px] text-[#6B9175]">Refreshed</Text>
						<Text className="mt-2 text-sm font-medium text-[#E6F8EA]">
							{lastUpdatedAt ? formatRelativeTime(lastUpdatedAt) : 'Just now'}
						</Text>
					</View>
				</View>

				{error ? (
					<View className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
						<Text className="text-sm text-rose-200">{error}</Text>
					</View>
				) : null}

				<View className="mt-6 gap-y-3">
					{data.status?.canActivateDemo && !data.status?.hasDemoAccount ? (
						<Pressable
							className="items-center rounded-full bg-[#00D35A] px-5 py-4"
							onPress={() => {
								void activatePaperAccount(stableGetToken).then(() => loadDashboard());
							}}
						>
							<Text className="text-base font-semibold text-[#031108]">Activate demo account</Text>
						</Pressable>
					) : null}
					<Pressable
						className="items-center rounded-full border border-white/10 bg-white/5 px-5 py-4"
						onPress={() => router.push('/orders/order-form')}
					>
						<Text className="text-base font-semibold text-[#E6F8EA]">Place demo trade</Text>
					</Pressable>
					<Pressable
						className="items-center rounded-full border border-white/10 bg-white/5 px-5 py-4"
						onPress={() => router.push('/portfolio/detail')}
					>
						<Text className="text-base font-semibold text-[#E6F8EA]">View holdings</Text>
					</Pressable>
					<Pressable
						className="items-center rounded-full border border-white/10 bg-white/5 px-5 py-4"
						onPress={() => {
							void loadDashboard();
						}}
					>
						<Text className="text-base font-semibold text-[#E6F8EA]">Refresh now</Text>
					</Pressable>
				</View>
			</View>
		</SafeAreaView>
	);
}
