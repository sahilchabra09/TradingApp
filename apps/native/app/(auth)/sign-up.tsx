import { useClerk, useSignUp, useOAuth } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

type SocialProvider = 'google' | 'facebook';

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const clerkError = error as { errors?: Array<{ message?: string }> };
    const message = clerkError.errors?.[0]?.message;
    if (message) {
      return message;
    }
  }
  return 'We could not complete your request. Please try again.';
};

export default function SignUpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();
  const { setActive } = useClerk();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({ strategy: 'oauth_facebook' });

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const redirectUrl = useMemo(
    () =>
      makeRedirectUri({
        path: '/oauth-native-callback',
        scheme: 'mybettertapp',
      }),
    []
  );

  const handleSignUp = async () => {
    if (!isLoaded) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      router.push({ pathname: '/verify-email', params: { email: emailAddress.trim() } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: SocialProvider) => {
    const start = provider === 'google' ? startGoogleOAuth : startFacebookOAuth;
    try {
      setOauthLoading(provider);
      setError(null);
      const { createdSessionId, setActive: setActiveOAuth, signIn, signUp: oauthSignUp } = await start({ redirectUrl });
      const sessionId = createdSessionId ?? signIn?.createdSessionId ?? oauthSignUp?.createdSessionId;
      const status = signIn?.status ?? oauthSignUp?.status;
      if (sessionId && (createdSessionId || status === 'complete')) {
        const activate = setActiveOAuth ?? setActive;
        await activate({ session: sessionId });
        router.replace('/');
        return;
      }
      if (status && status !== 'complete') {
        setError('Please finish the verification steps sent to your email to complete sign up.');
        return;
      }
      setError('We could not complete the social sign up. Please use email instead.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <LinearGradient colors={['#000000', '#031814', '#000000']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 12 }}>Create account</Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 15, marginBottom: 32 }}>
              Join TradeX to start investing smarter.
            </Text>

            <View style={{ gap: 12 }}>
              <Button
                title="Sign up with Google"
                onPress={() => handleOAuth('google')}
                fullWidth
                loading={oauthLoading === 'google'}
                variant="secondary"
                icon={<Ionicons name="logo-google" size={20} color={theme.colors.text.primary} />}
              />
              <Button
                title="Sign up with Facebook"
                onPress={() => handleOAuth('facebook')}
                fullWidth
                loading={oauthLoading === 'facebook'}
                variant="secondary"
                icon={<Ionicons name="logo-facebook" size={20} color={theme.colors.text.primary} />}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 28 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <Text style={{ color: theme.colors.text.secondary, marginHorizontal: 12 }}>or create with email</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            </View>

            <Input
              label="Email"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="you@example.com"
              keyboardType="email-address"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a strong password"
              secureTextEntry
            />

            {error && (
              <Text style={{ color: theme.colors.error, marginTop: 4, marginBottom: 12 }}>{error}</Text>
            )}

            <Button title="Continue" onPress={handleSignUp} loading={loading} fullWidth style={{ marginTop: 12 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ color: theme.colors.text.secondary, marginRight: 6 }}>Already have an account?</Text>
              <Link href="/sign-in">
                <Text style={{ color: theme.colors.accent.primary, fontWeight: '600' }}>Sign in</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}