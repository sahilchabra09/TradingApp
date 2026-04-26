import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@clerk/clerk-expo';
import { useStableToken } from '@/lib/hooks';
import { useAppTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { Spinner } from '@/components/Spinner';
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
	const { theme } = useAppTheme();
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
			<LinearGradient colors={theme.colors.background.gradient as [string, string, string]} style={{ flex: 1 }}>
				<SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
					<Text style={{ color: theme.colors.text.secondary, fontSize: 16, textAlign: 'center' }}>
						Sign in to view your paper dashboard.
					</Text>
				</SafeAreaView>
			</LinearGradient>
		);
	}

	if (isLoading && !data.status) {
		return (
			<LinearGradient colors={theme.colors.background.gradient as [string, string, string]} style={{ flex: 1 }}>
				<SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
					<Spinner />
					<Text style={{ color: theme.colors.text.secondary, marginTop: 12, fontSize: 14 }}>
						Loading paper dashboard...
					</Text>
				</SafeAreaView>
			</LinearGradient>
		);
	}

	const cash = toNumber(data.portfolio?.cash);
	const totalValue = toNumber(data.portfolio?.totalValue);
	const totalPnl = toNumber(data.portfolio?.totalPnl);
	const pnlPct = cash > 0 ? (totalPnl / cash) * 100 : 0;

	return (
		<LinearGradient
			colors={theme.colors.background.gradient as [string, string, string]}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 }}>
				{/* Wallet card */}
				<View style={{
					borderRadius: 28,
					borderWidth: 1,
					borderColor: theme.colors.border.primary,
					backgroundColor: theme.colors.surface.primary,
					paddingHorizontal: 20,
					paddingVertical: 20,
				}}>
					<Text style={{ fontSize: 11, letterSpacing: 1.7, color: theme.colors.text.tertiary, textTransform: 'uppercase' }}>
						Demo Wallet
					</Text>
					<Text style={{ marginTop: 8, fontSize: 30, fontWeight: '700', letterSpacing: -0.5, color: theme.colors.text.primary }}>
						{data.portfolio ? formatCurrency(totalValue) : '--'}
					</Text>
					<Text style={{
						marginTop: 12,
						fontSize: 16,
						fontWeight: '600',
						color: totalPnl >= 0 ? theme.colors.chart.bullish : theme.colors.chart.bearish,
					}}>
						{data.portfolio
							? `${formatCurrency(totalPnl)} · ${formatPercentage(pnlPct)}`
							: `KYC: ${data.status?.kycStatus || 'not_started'}`}
					</Text>
				</View>

				{/* Stats row */}
				<View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
					<View style={{
						flex: 1,
						borderRadius: 24,
						borderWidth: 1,
						borderColor: theme.colors.border.primary,
						backgroundColor: theme.colors.surface.primary,
						paddingHorizontal: 16,
						paddingVertical: 16,
					}}>
						<Text style={{ fontSize: 11, letterSpacing: 1.4, color: theme.colors.text.tertiary, textTransform: 'uppercase' }}>Cash</Text>
						<Text style={{ marginTop: 8, fontSize: 20, fontWeight: '600', color: theme.colors.text.primary }}>
							{data.portfolio ? formatCurrency(cash) : '--'}
						</Text>
					</View>
					<View style={{
						flex: 1,
						borderRadius: 24,
						borderWidth: 1,
						borderColor: theme.colors.border.primary,
						backgroundColor: theme.colors.surface.primary,
						paddingHorizontal: 16,
						paddingVertical: 16,
					}}>
						<Text style={{ fontSize: 11, letterSpacing: 1.4, color: theme.colors.text.tertiary, textTransform: 'uppercase' }}>Refreshed</Text>
						<Text style={{ marginTop: 8, fontSize: 14, fontWeight: '500', color: theme.colors.text.primary }}>
							{lastUpdatedAt ? formatRelativeTime(lastUpdatedAt) : 'Just now'}
						</Text>
					</View>
				</View>

				{error ? (
					<View style={{
						marginTop: 16,
						borderRadius: 16,
						borderWidth: 1,
						borderColor: `${theme.colors.error}30`,
						backgroundColor: `${theme.colors.error}15`,
						paddingHorizontal: 16,
						paddingVertical: 12,
					}}>
						<Text style={{ fontSize: 14, color: theme.colors.error }}>{error}</Text>
					</View>
				) : null}

				{/* Actions */}
				<View style={{ marginTop: 24, gap: 12 }}>
					{data.status?.canActivateDemo && !data.status?.hasDemoAccount ? (
						<Pressable
							style={{
								alignItems: 'center',
								borderRadius: 999,
								backgroundColor: theme.colors.accent.primary,
								paddingHorizontal: 20,
								paddingVertical: 16,
							}}
							onPress={() => {
								void activatePaperAccount(stableGetToken).then(() => loadDashboard());
							}}
						>
							<Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.inverse }}>
								Activate paper account
							</Text>
						</Pressable>
					) : null}
					<Pressable
						style={{
							alignItems: 'center',
							borderRadius: 999,
							borderWidth: 1,
							borderColor: theme.colors.border.primary,
							backgroundColor: theme.colors.surface.primary,
							paddingHorizontal: 20,
							paddingVertical: 16,
						}}
						onPress={() => router.push('/orders/order-form')}
					>
						<Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.primary }}>
							Place paper trade
						</Text>
					</Pressable>
					<Pressable
						style={{
							alignItems: 'center',
							borderRadius: 999,
							borderWidth: 1,
							borderColor: theme.colors.border.primary,
							backgroundColor: theme.colors.surface.primary,
							paddingHorizontal: 20,
							paddingVertical: 16,
						}}
						onPress={() => router.push('/portfolio/detail')}
					>
						<Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.primary }}>
							View holdings
						</Text>
					</Pressable>
					<Pressable
						style={{
							alignItems: 'center',
							borderRadius: 999,
							borderWidth: 1,
							borderColor: theme.colors.border.primary,
							backgroundColor: theme.colors.surface.primary,
							paddingHorizontal: 20,
							paddingVertical: 16,
						}}
						onPress={() => {
							void loadDashboard();
						}}
					>
						<Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.primary }}>
							Refresh now
						</Text>
					</Pressable>
				</View>
			</SafeAreaView>
		</LinearGradient>
	);
}
