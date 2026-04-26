import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { router, usePathname } from 'expo-router';
import { activatePaperAccount, getPaperStatus, type PaperStatus } from '@/lib/paper-api';
import { Spinner } from '@/components/Spinner';
import { useStableToken, useTheme } from '@/lib/hooks';

type Step = 'kyc_required' | 'unlock_demo' | null;

export function PaperAccountGateModal() {
	const { isSignedIn, getToken } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const theme = useTheme();
	const pathname = usePathname();
	const [status, setStatus] = useState<PaperStatus | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isUnlocking, setIsUnlocking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dismissedStep, setDismissedStep] = useState<Step>(null);

	const refreshStatus = useCallback(async () => {
		if (!isSignedIn) {
			setStatus(null);
			return;
		}

		try {
			setIsLoading(true);
			const nextStatus = await getPaperStatus(stableGetToken);
			setStatus(nextStatus);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to check paper trading account status.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn]);

	useEffect(() => {
		void refreshStatus();
	}, [refreshStatus, pathname]);

	const step = useMemo<Step>(() => {
		if (!status || status.canTradeDemo) {
			return null;
		}

		// KYC verified (Didit approved or awaiting admin) but demo account not yet activated
		if (status.canActivateDemo && !status.hasDemoAccount) {
			return 'unlock_demo';
		}

		return 'kyc_required';
	}, [status]);

	useEffect(() => {
		if (!step) {
			setDismissedStep(null);
			return;
		}

		if (dismissedStep && dismissedStep !== step) {
			setDismissedStep(null);
		}
	}, [dismissedStep, step]);

	const visible = Boolean(step && dismissedStep !== step);

	const handlePrimary = useCallback(async () => {
		if (step === 'kyc_required') {
			router.push('/kyc/start');
			return;
		}

		if (step === 'unlock_demo') {
			try {
				setIsUnlocking(true);
				await activatePaperAccount(stableGetToken);
				await refreshStatus();
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unable to unlock paper trading account.');
			} finally {
				setIsUnlocking(false);
			}
		}
	}, [refreshStatus, step]);

	if (!isSignedIn || !visible) {
		return null;
	}

	return (
		<Modal transparent animationType="fade" visible>
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 24 }}>
				<View style={{
					width: '100%',
					maxWidth: 380,
					borderRadius: 24,
					borderWidth: 1,
					borderColor: theme.colors.border.accent,
					backgroundColor: theme.colors.background.secondary,
					paddingHorizontal: 20,
					paddingVertical: 20,
				}}>
					<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: theme.colors.text.secondary }}>
						Paper Trading Setup
					</Text>
					<Text style={{ marginTop: 8, fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary }}>
						{step === 'kyc_required'
							? 'Complete KYC to unlock paper trading'
							: 'Unlock your paper account'}
					</Text>
					<Text style={{ marginTop: 12, fontSize: 14, lineHeight: 22, color: theme.colors.text.secondary }}>
						{step === 'kyc_required'
							? 'Finish KYC verification first. Then you can unlock your paper account with $100,000 virtual cash.'
							: 'Activate your paper account to receive $100,000 virtual cash and start paper trading with live market prices. Once the ReTrading team approves your account, you will be able to trade for real.'}
					</Text>

					{error ? (
						<View style={{
							marginTop: 16, borderRadius: 12, borderWidth: 1,
							borderColor: theme.colors.error + '4D',
							backgroundColor: theme.colors.error + '1A',
							paddingHorizontal: 12, paddingVertical: 8,
						}}>
							<Text style={{ fontSize: 12, color: theme.colors.error }}>{error}</Text>
						</View>
					) : null}

					<View style={{ marginTop: 20, flexDirection: 'row', gap: 12 }}>
						<Pressable
							style={{
								flex: 1, alignItems: 'center', borderRadius: 999,
								borderWidth: 1, borderColor: theme.colors.border.secondary,
								backgroundColor: theme.colors.surface.primary,
								paddingHorizontal: 16, paddingVertical: 12,
							}}
							onPress={() => setDismissedStep(step)}
							disabled={isUnlocking}
						>
							<Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}>Later</Text>
						</Pressable>
						<Pressable
							style={{
								flex: 1, alignItems: 'center', borderRadius: 999,
								backgroundColor: theme.colors.accent.primary,
								paddingHorizontal: 16, paddingVertical: 12,
							}}
							onPress={() => {
								void handlePrimary();
							}}
							disabled={isUnlocking || isLoading}
						>
							{isUnlocking || isLoading ? (
								<Spinner size="small" />
							) : (
								<Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.inverse }}>
									{step === 'kyc_required' ? 'Go to KYC' : 'Unlock Paper Trading'}
								</Text>
							)}
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}
