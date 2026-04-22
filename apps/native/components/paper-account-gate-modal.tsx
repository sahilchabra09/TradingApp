import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { router, usePathname } from 'expo-router';
import { activatePaperAccount, getPaperStatus, type PaperStatus } from '@/lib/paper-api';
import { Spinner } from '@/components/Spinner';
import { useStableToken } from '@/lib/hooks';

type Step = 'kyc_required' | 'unlock_demo' | null;

export function PaperAccountGateModal() {
	const { isSignedIn, getToken } = useAuth();
	const stableGetToken = useStableToken(getToken);
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
			<View className="flex-1 items-center justify-center bg-black/65 px-6">
				<View className="w-full max-w-[380px] rounded-3xl border border-emerald-400/30 bg-[#06140d] px-5 py-5">
				<Text className="text-xs uppercase tracking-[1.6px] text-[#7BAA88]">
					Paper Trading Setup
				</Text>
					<Text className="mt-2 text-2xl font-bold text-[#E6F8EA]">
						{step === 'kyc_required'
							? 'Complete KYC to unlock demo trading'
							: 'KYC complete. Unlock your demo account'}
					</Text>
					<Text className="mt-3 text-sm leading-6 text-[#A8D5B3]">
						{step === 'kyc_required'
							? 'Finish KYC verification first. Then you can unlock your demo account with $100,000 virtual cash.'
							: 'Activate your demo account now to receive $100,000 virtual cash and start paper trading with live market prices.'}
					</Text>

					{error ? (
						<View className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2">
							<Text className="text-xs text-rose-200">{error}</Text>
						</View>
					) : null}

					<View className="mt-5 flex-row gap-x-3">
						<Pressable
							className="flex-1 items-center rounded-full border border-white/20 bg-white/5 px-4 py-3"
							onPress={() => setDismissedStep(step)}
							disabled={isUnlocking}
						>
							<Text className="text-sm font-semibold text-[#E6F8EA]">Later</Text>
						</Pressable>
						<Pressable
							className="flex-1 items-center rounded-full bg-[#00D35A] px-4 py-3"
							onPress={() => {
								void handlePrimary();
							}}
							disabled={isUnlocking || isLoading}
						>
							{isUnlocking || isLoading ? (
								<Spinner color="#031108" size="small" />
							) : (
								<Text className="text-sm font-semibold text-[#031108]">
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
