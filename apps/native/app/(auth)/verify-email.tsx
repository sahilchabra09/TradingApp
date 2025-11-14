import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

const getErrorMessage = (error: unknown) => {
	if (typeof error === 'object' && error !== null) {
		const clerkError = error as { errors?: Array<{ message?: string }> };
		const message = clerkError.errors?.[0]?.message;
		if (message) {
			return message;
		}
	}
	return 'Verification failed. Please try again.';
};

export default function VerifyEmailScreen() {
	const theme = useTheme();
	const router = useRouter();
	const params = useLocalSearchParams<{ email?: string | string[] }>();
	const { isLoaded, signUp, setActive } = useSignUp();

	const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;
	const displayEmail = emailParam ?? signUp?.emailAddress ?? 'your email address';

	const [code, setCode] = useState('');
	const [loading, setLoading] = useState(false);
	const [resending, setResending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleVerify = async () => {
		if (!isLoaded || code.trim().length === 0) {
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await signUp.reload();
			const trimmedCode = code.trim();
			const result = await signUp.attemptEmailAddressVerification({ code: trimmedCode });
			if (result.status === 'complete') {
				await setActive({ session: result.createdSessionId });
				router.replace('/');
				return;
			}
			setError('We need a valid code to finish verifying your email.');
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (!isLoaded) {
			return;
		}
		setResending(true);
		setError(null);
		try {
			await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setResending(false);
		}
	};

	return (
		<LinearGradient colors={['#000000', '#041510', '#000000']} style={{ flex: 1 }}>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				<ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
					<View style={{ flex: 1, justifyContent: 'center' }}>
						<Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: 'bold', marginBottom: 8 }}>Check your inbox</Text>
						<Text style={{ color: theme.colors.text.secondary, fontSize: 15, marginBottom: 28 }}>
							We sent a one-time verification code to {displayEmail}.
						</Text>

						<Input
							label="Verification code"
							value={code}
							onChangeText={setCode}
							placeholder="Enter 6-digit code"
							keyboardType="numeric"
							maxLength={6}
						/>

						{error && <Text style={{ color: theme.colors.error, marginTop: 4, marginBottom: 12 }}>{error}</Text>}

						<Button
							title="Verify and continue"
							onPress={handleVerify}
							disabled={code.trim().length < 6 || loading}
							loading={loading}
							fullWidth
							style={{ marginTop: 12 }}
						/>

						<Button
							title="Resend code"
							onPress={handleResend}
							loading={resending}
							variant="secondary"
							fullWidth
							style={{ marginTop: 16 }}
						/>

						<Button
							title="Use a different email"
							onPress={() => router.replace('/sign-up')}
							variant="ghost"
							fullWidth
							style={{ marginTop: 16 }}
						/>
					</View>
				</ScrollView>
			</SafeAreaView>
		</LinearGradient>
	);
}
