/**
 * KYC Start Screen
 * Entry point for identity verification flow
 * Integrates with Didit KYC via WebView
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { 
  kycApi, 
  INDIA_DOCUMENT_GUIDANCE, 
  getStatusConfig,
  type UserKycSummary,
} from '@/lib/kyc-api';

export default function KYCStartScreen() {
  const theme = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [kycStatus, setKycStatus] = useState<UserKycSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Feature steps to display
  const verificationSteps = [
    { 
      id: 1, 
      title: 'Document Upload', 
      description: 'Upload your Aadhaar, PAN, or Passport', 
      emoji: '📸',
      detail: 'We accept all major Indian ID documents' 
    },
    { 
      id: 2, 
      title: 'Face Verification', 
      description: 'Quick selfie for identity confirmation', 
      emoji: '🤳',
      detail: 'Passive liveness - no blinking required' 
    },
    { 
      id: 3, 
      title: 'Instant Review', 
      description: 'AI-powered verification in seconds', 
      emoji: '⚡',
      detail: 'Most verifications complete in under 2 minutes' 
    },
  ];

  // Fetch current KYC status
  const fetchKycStatus = useCallback(async () => {
    if (!isSignedIn) return;
    
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (token) {
        kycApi.setAuthToken(token);
      }

      const response = await kycApi.getUserKycStatus();
      
      if (response.success && response.data) {
        setKycStatus(response.data);
        
        // If already verified, redirect to status page
        if (response.data.kycStatus === 'approved') {
          router.replace('/kyc/status' as any);
        }
      } else {
        setError(response.error || 'Failed to fetch KYC status');
      }
    } catch (err) {
      console.error('Failed to fetch KYC status:', err);
      setError('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  useEffect(() => {
    fetchKycStatus();
  }, [fetchKycStatus]);

  // Start verification process
  const handleStartVerification = async () => {
    try {
      setCreating(true);
      setError(null);

      const token = await getToken();
      if (token) {
        kycApi.setAuthToken(token);
      }

      // Create verification session
      const response = await kycApi.createSession('en'); // or 'hi' for Hindi
      
      if (response.success && response.data) {
        // Navigate to WebView screen with session data
        router.push({
          pathname: '/kyc/document-capture' as any,
          params: {
            sessionId: response.data.sessionId,
            sessionUrl: response.data.sessionUrl,
            providerSessionId: response.data.providerSessionId,
          },
        });
      } else {
        // Handle specific error cases
        if (response.code === 'ALREADY_VERIFIED') {
          Alert.alert('Already Verified', 'Your identity has already been verified.');
          router.replace('/kyc/status' as any);
        } else if (response.code === 'MAX_ATTEMPTS_REACHED') {
          Alert.alert(
            'Maximum Attempts Reached',
            'You have reached the maximum number of verification attempts. Please contact support.',
            [{ text: 'Contact Support', onPress: () => router.push('/settings/support' as any) }]
          );
        } else {
          setError(response.error || 'Failed to start verification');
        }
      }
    } catch (err) {
      console.error('Failed to start verification:', err);
      setError('Failed to start verification. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Show consent before starting
  const showConsentDialog = () => {
    Alert.alert(
      'Identity Verification',
      'By continuing, you agree to:\n\n' +
      '• Share your government ID document for verification\n' +
      '• Allow camera access for face verification\n' +
      '• Our Privacy Policy and Terms of Service\n\n' +
      'Your data is securely processed and encrypted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I Agree', onPress: handleStartVerification },
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#000000', '#0a3d2e', '#000000']}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
          <Text style={{ color: theme.colors.text.secondary, marginTop: 16 }}>
            Loading verification status...
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Determine if user can start verification
  const canStartVerification = !kycStatus || 
    kycStatus.kycStatus === 'not_started' || 
    kycStatus.kycStatus === 'rejected' ||
    kycStatus.kycStatus === 'resubmission_required';

  const isPending = kycStatus?.kycStatus === 'pending';

  return (
    <LinearGradient
      colors={['#000000', '#0a3d2e', '#000000']}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView 
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }} 
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 40, marginBottom: 24 }}>
            {isPending ? '⏳' : '📋'}
          </Text>
          <Text style={{ 
            fontSize: 30, 
            fontWeight: 'bold', 
            color: theme.colors.text.primary, 
            textAlign: 'center', 
            marginBottom: 12 
          }}>
            {isPending ? 'Verification In Progress' : 'Complete KYC'}
          </Text>
          <Text style={{ 
            fontSize: 15, 
            color: theme.colors.text.secondary, 
            textAlign: 'center', 
            marginBottom: 8, 
            paddingHorizontal: 20 
          }}>
            {isPending 
              ? 'Your verification is being processed. This usually takes a few minutes.'
              : 'Verify your identity to unlock all trading features and higher limits'}
          </Text>

          {/* Attempt counter if applicable */}
          {kycStatus && kycStatus.totalAttempts > 0 && !isPending && (
            <Text style={{ 
              fontSize: 13, 
              color: theme.colors.text.tertiary, 
              textAlign: 'center', 
              marginBottom: 24 
            }}>
              Attempt {kycStatus.totalAttempts + 1} of 5
            </Text>
          )}

          {/* Error message */}
          {error && (
            <Card style={{ marginBottom: 16, backgroundColor: theme.colors.error + '20' }}>
              <Text style={{ color: theme.colors.error, fontSize: 14, textAlign: 'center' }}>
                {error}
              </Text>
              <TouchableOpacity onPress={fetchKycStatus} style={{ marginTop: 8 }}>
                <Text style={{ 
                  color: theme.colors.accent.primary, 
                  fontSize: 14, 
                  textAlign: 'center',
                  textDecorationLine: 'underline'
                }}>
                  Tap to retry
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Pending verification status */}
          {isPending && kycStatus?.lastSessionId && (
            <Button 
              title="Check Status" 
              onPress={() => router.push({
                pathname: '/kyc/status' as any,
                params: { sessionId: kycStatus.lastSessionId },
              })} 
              fullWidth 
              style={{ marginBottom: 24 }} 
            />
          )}

          {/* Verification steps */}
          {!isPending && (
            <>
              <View style={{ marginTop: 16 }} />
              {verificationSteps.map((step) => (
                <Card key={step.id} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 24, 
                      backgroundColor: theme.colors.accent.primary + '20', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginRight: 16 
                    }}>
                      <Text style={{ fontSize: 24 }}>{step.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        color: theme.colors.text.primary, 
                        fontSize: 17, 
                        fontWeight: '600', 
                        marginBottom: 4 
                      }}>
                        {step.title}
                      </Text>
                      <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                        {step.description}
                      </Text>
                      <Text style={{ color: theme.colors.text.tertiary, fontSize: 11, marginTop: 2 }}>
                        {step.detail}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}

              {/* Accepted documents for India */}
              <Card style={{ marginBottom: 16 }}>
                <Text style={{ 
                  color: theme.colors.text.primary, 
                  fontSize: 16, 
                  fontWeight: '600', 
                  marginBottom: 12 
                }}>
                  🇮🇳 Accepted Indian Documents
                </Text>
                {INDIA_DOCUMENT_GUIDANCE.accepted.slice(0, 3).map((doc, index) => (
                  <View key={index} style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginBottom: 8 
                  }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{doc.icon}</Text>
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>
                      {doc.type}
                    </Text>
                  </View>
                ))}
                <Text style={{ 
                  color: theme.colors.text.tertiary, 
                  fontSize: 12, 
                  marginTop: 4 
                }}>
                  + Voter ID, Driver's License, and more
                </Text>
              </Card>

              {/* Tips */}
              <Card style={{ marginBottom: 24 }}>
                <Text style={{ 
                  color: theme.colors.text.primary, 
                  fontSize: 16, 
                  fontWeight: '600', 
                  marginBottom: 12 
                }}>
                  💡 Tips for Success
                </Text>
                {INDIA_DOCUMENT_GUIDANCE.tips.slice(0, 3).map((tip, index) => (
                  <View key={index} style={{ 
                    flexDirection: 'row', 
                    alignItems: 'flex-start', 
                    marginBottom: 6 
                  }}>
                    <Text style={{ color: theme.colors.success, marginRight: 8 }}>✓</Text>
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 13, flex: 1 }}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </Card>

              {/* Start button */}
              {canStartVerification && (
                <Button 
                  title={creating ? 'Starting...' : 'Start Verification'} 
                  onPress={showConsentDialog}
                  disabled={creating}
                  fullWidth 
                  style={{ marginBottom: 16 }} 
                />
              )}

              {/* Rejection message */}
              {kycStatus?.kycStatus === 'rejected' && (
                <Text style={{ 
                  color: theme.colors.warning, 
                  fontSize: 13, 
                  textAlign: 'center',
                  marginBottom: 16 
                }}>
                  Your previous verification was unsuccessful. Please try again with a different document or ensure better lighting.
                </Text>
              )}

              {/* Privacy notice */}
              <Text style={{ 
                color: theme.colors.text.tertiary, 
                fontSize: 11, 
                textAlign: 'center',
                paddingHorizontal: 20 
              }}>
                🔒 Your data is encrypted and securely processed by Didit, a certified identity verification provider. We comply with RBI KYC guidelines.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
