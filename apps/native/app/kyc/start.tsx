/**
 * KYC Start Screen - Minimal Didit V3 Integration
 * Creates session and opens WebView
 */
import { useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { kycApi } from '@/lib/kyc-api';

export default function KYCStartScreen() {
  const theme = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification steps to display
  const verificationSteps = [
    { 
      id: 1, 
      title: 'Document Upload', 
      description: 'Upload your Aadhaar, PAN, or Passport', 
      emoji: '📸',
    },
    { 
      id: 2, 
      title: 'Face Verification', 
      description: 'Quick selfie for identity confirmation', 
      emoji: '🤳',
    },
    { 
      id: 3, 
      title: 'Instant Review', 
      description: 'AI-powered verification in seconds', 
      emoji: '⚡',
    },
  ];

  // Accepted documents
  const acceptedDocuments = [
    { type: 'Aadhaar Card', icon: '🪪' },
    { type: 'PAN Card', icon: '💳' },
    { type: 'Indian Passport', icon: '📕' },
  ];

  // Start verification process
  const handleStartVerification = async () => {
    if (!isSignedIn) {
      Alert.alert('Login Required', 'Please sign in to continue.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      // Get auth token
      const token = await getToken();
      if (!token) {
        setError('Authentication failed. Please try again.');
        return;
      }
      
      kycApi.setAuthToken(token);

      // Create verification session
      const response = await kycApi.createSession();
      
      if (response.success && response.data) {
        // Navigate to WebView with verification URL
        router.push({
          pathname: '/kyc/document-capture' as any,
          params: {
            sessionUrl: response.data.verification_url,
          },
        });
      } else {
        setError(response.error || 'Failed to start verification');
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
            📋
          </Text>
          <Text style={{ 
            fontSize: 30, 
            fontWeight: 'bold', 
            color: theme.colors.text.primary, 
            textAlign: 'center', 
            marginBottom: 12 
          }}>
            Complete KYC
          </Text>
          <Text style={{ 
            fontSize: 15, 
            color: theme.colors.text.secondary, 
            textAlign: 'center', 
            marginBottom: 24, 
            paddingHorizontal: 20 
          }}>
            Verify your identity to unlock all trading features
          </Text>

          {/* Error message */}
          {error && (
            <Card style={{ marginBottom: 16, backgroundColor: theme.colors.error + '20' }}>
              <Text style={{ color: theme.colors.error, fontSize: 14, textAlign: 'center' }}>
                {error}
              </Text>
              <TouchableOpacity 
                onPress={() => setError(null)} 
                style={{ marginTop: 8 }}
              >
                <Text style={{ 
                  color: theme.colors.accent.primary, 
                  fontSize: 14, 
                  textAlign: 'center',
                  textDecorationLine: 'underline'
                }}>
                  Dismiss
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Verification steps */}
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
                </View>
              </View>
            </Card>
          ))}

          {/* Accepted documents */}
          <Card style={{ marginBottom: 24 }}>
            <Text style={{ 
              color: theme.colors.text.primary, 
              fontSize: 16, 
              fontWeight: '600', 
              marginBottom: 12 
            }}>
              🇮🇳 Accepted Documents
            </Text>
            {acceptedDocuments.map((doc, index) => (
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

          {/* Start button */}
          <Button 
            title={creating ? 'Starting...' : 'Start Verification'} 
            onPress={showConsentDialog}
            disabled={creating}
            fullWidth 
            style={{ marginBottom: 16 }} 
          />

          {creating && (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <ActivityIndicator color={theme.colors.accent.primary} />
            </View>
          )}

          {/* Privacy notice */}
          <Text style={{ 
            color: theme.colors.text.tertiary, 
            fontSize: 11, 
            textAlign: 'center',
            paddingHorizontal: 20 
          }}>
            🔒 Your data is encrypted and securely processed by Didit, a certified identity verification provider.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
