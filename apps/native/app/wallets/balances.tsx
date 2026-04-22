import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import {
	getPaperAccount,
	getPaperHoldings,
	getPaperPortfolio,
	getPaperStatus,
	type PaperHoldingsResponse,
	type PaperPortfolioResponse,
	type PaperStatus,
} from '@/lib/paper-api';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { formatCurrency } from '@/lib/formatters';
import { useTheme, useStableToken } from '@/lib/hooks';

const toNumber = (value: string | undefined) => Number(value || 0);

type WalletState = {
	status: PaperStatus | null;
	portfolio: PaperPortfolioResponse | null;
	holdings: PaperHoldingsResponse | null;
};

export default function WalletBalancesScreen() {
	const theme = useTheme();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [state, setState] = useState<WalletState>({
		status: null,
		portfolio: null,
		holdings: null,
	});

	const loadWallets = useCallback(async () => {
		if (!isSignedIn) {
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			const status = await getPaperStatus(stableGetToken);
			if (!status.hasDemoAccount) {
				setState({ status, portfolio: null, holdings: null });
				setError(null);
				return;
			}

			const account = await getPaperAccount(stableGetToken);
			const [portfolio, holdings] = await Promise.all([
				getPaperPortfolio(account.userId, stableGetToken),
				getPaperHoldings(account.userId, stableGetToken),
			]);
			setState({ status, portfolio, holdings });
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load wallet balances.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn]);

	useEffect(() => {
		void loadWallets();
	}, [loadWallets]);

	const totals = useMemo(() => {
		const cash = toNumber(state.portfolio?.cash);
		const holdingsValue = toNumber(state.portfolio?.holdingsValue);
		return {
			cash,
			holdingsValue,
			total: cash + holdingsValue,
		};
	}, [state.portfolio?.cash, state.portfolio?.holdingsValue]);

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
			<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
				<View
					style={{
						backgroundColor: 'rgba(16, 185, 129, 0.1)',
						borderRadius: 24,
						padding: 28,
						marginBottom: 20,
						borderWidth: 1.5,
						borderColor: 'rgba(16, 185, 129, 0.3)',
					}}
				>
					<View style={{ marginBottom: 24 }}>
						<Ionicons name="wallet" size={40} color={theme.colors.accent.primary} />
					</View>
					<Text style={{ color: '#9CA3AF', fontSize: 13, letterSpacing: 0.5, marginBottom: 8, fontWeight: '600' }}>
						Total Balance
					</Text>
					{isLoading ? (
						<Spinner color={theme.colors.accent.primary} />
					) : (
						<Text style={{ color: '#FFFFFF', fontSize: 42, fontWeight: 'bold', letterSpacing: -0.5, marginBottom: 8 }}>
							{state.portfolio ? formatCurrency(totals.total) : '--'}
						</Text>
					)}
					<Text style={{ color: theme.colors.success, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
						Live demo balance
					</Text>
				</View>

				<View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
					<Button title="Deposit" onPress={() => {}} style={{ flex: 1 }} />
					<Button title="Withdraw" onPress={() => {}} style={{ flex: 1 }} />
				</View>

				{error ? (
					<View
						style={{
							backgroundColor: 'rgba(239, 68, 68, 0.1)',
							borderColor: 'rgba(239,68,68,0.25)',
							borderWidth: 1,
							borderRadius: 12,
							padding: 12,
							marginBottom: 16,
						}}
					>
						<Text style={{ color: '#FCA5A5' }}>{error}</Text>
					</View>
				) : null}

				<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
					<Ionicons name="wallet-outline" size={24} color={theme.colors.text.primary} style={{ marginRight: 8 }} />
					<Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700' }}>Wallet Breakdown</Text>
				</View>

				<View
					style={{
						backgroundColor: 'rgba(255, 255, 255, 0.05)',
						borderRadius: 16,
						padding: 16,
						marginBottom: 12,
						borderWidth: 1,
						borderColor: 'rgba(255, 255, 255, 0.1)',
					}}
				>
					<Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 6 }}>Cash</Text>
					<Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: '700' }}>
						{state.portfolio ? formatCurrency(totals.cash) : '--'}
					</Text>
				</View>

				<View
					style={{
						backgroundColor: 'rgba(255, 255, 255, 0.05)',
						borderRadius: 16,
						padding: 16,
						marginBottom: 12,
						borderWidth: 1,
						borderColor: 'rgba(255, 255, 255, 0.1)',
					}}
				>
					<Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 6 }}>Holdings Value</Text>
					<Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: '700' }}>
						{state.portfolio ? formatCurrency(totals.holdingsValue) : '--'}
					</Text>
					<Text style={{ color: theme.colors.text.tertiary, marginTop: 6, fontSize: 12 }}>
						{state.holdings?.holdings.length || 0} open positions
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
