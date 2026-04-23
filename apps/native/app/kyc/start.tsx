/**
 * KYC Start Screen - Minimal Didit V3 Integration
 * Creates session and opens WebView
 */
import { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
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
      icon: 'camera-outline' as const,
    },
    { 
      id: 2, 
      title: 'Face Verification', 
      description: 'Quick selfie for identity confirmation', 
      icon: 'scan-outline' as const,
    },
    { 
      id: 3, 
      title: 'Instant Review', 
      description: 'AI-powered verification in seconds', 
      icon: 'flash-outline' as const,
    },
  ];

  // Accepted documents
  const acceptedDocuments = [
    { type: 'Aadhaar Card', icon: 'card-outline' as const },
    { type: 'PAN Card',     icon: 'id-card-outline' as const },
    { type: 'Indian Passport', icon: 'book-outline' as const },
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
        // Navigate to WebView with verification URL and session ID
        router.push({
          pathname: '/kyc/document-capture' as any,
          params: {
            sessionUrl: response.data.verification_url,
            sessionId:  response.data.session_id,
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
          <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 24 }}>
            <Ionicons name="clipboard-outline" size={72} color={theme.colors.accent.primary} />
          </View>
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
                  <Ionicons name={step.icon} size={24} color={theme.colors.accent.primary} />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="flag-outline" size={18} color={theme.colors.accent.primary} style={{ marginRight: 6 }} />
              <Text style={{ 
                color: theme.colors.text.primary, 
                fontSize: 16, 
                fontWeight: '600',
              }}>
                Accepted Documents
              </Text>
            </View>
            {acceptedDocuments.map((doc, index) => (
              <View key={index} style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 8 
              }}>
                <Ionicons name={doc.icon} size={16} color={theme.colors.text.secondary} style={{ marginRight: 8 }} />
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
              <Spinner color={theme.colors.accent.primary} />
            </View>
          )}

          {/* Privacy notice */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
            <Ionicons name="lock-closed-outline" size={12} color={theme.colors.text.tertiary} style={{ marginRight: 4 }} />
            <Text style={{ 
              color: theme.colors.text.tertiary, 
              fontSize: 11, 
              textAlign: 'center',
            }}>
              Your data is encrypted and securely processed by Didit, a certified identity verification provider.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
