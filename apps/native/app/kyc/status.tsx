/**
 * KYC Status Screen
 * Displays verification status and results
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { 
  kycApi, 
  getStatusConfig, 
  canRetryVerification,
  isVerificationComplete,
  isVerificationPending,
  type KycStatusResponse,
  type UserKycSummary,
  type KycSessionStatus,
} from '@/lib/kyc-api';

export default function KYCStatusScreen() {
  const theme = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{
    sessionId?: string;
    fromWebView?: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<KycStatusResponse | null>(null);
  const [userSummary, setUserSummary] = useState<UserKycSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch status data
  const fetchStatus = useCallback(async (showLoading = true) => {
    if (!isSignedIn) return;
    
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const token = await getToken();
      if (token) {
        kycApi.setAuthToken(token);
      }

      // Fetch user summary first
      const summaryResponse = await kycApi.getUserKycStatus();
      if (summaryResponse.success && summaryResponse.data) {
        setUserSummary(summaryResponse.data);
      }

      // If we have a session ID, fetch specific session status
      const sessionId = params.sessionId || summaryResponse.data?.lastSessionId;
      if (sessionId) {
        const statusResponse = await kycApi.getSessionStatus(sessionId);
        if (statusResponse.success && statusResponse.data) {
          setSessionStatus(statusResponse.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch KYC status:', err);
      setError('Failed to load verification status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, params.sessionId]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for updates if coming from WebView and status is pending
  useEffect(() => {
    if (params.fromWebView === 'true' && sessionStatus && isVerificationPending(sessionStatus.status)) {
      const pollInterval = setInterval(() => {
        fetchStatus(false);
      }, 5000); // Poll every 5 seconds

      // Stop polling after 2 minutes
      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
      }, 120000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeout);
      };
    }
  }, [params.fromWebView, sessionStatus?.status, fetchStatus]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Also try to refresh from provider
    if (params.sessionId || userSummary?.lastSessionId) {
      const sessionId = params.sessionId || userSummary?.lastSessionId;
      if (sessionId) {
        await kycApi.refreshSessionStatus(sessionId);
      }
    }
    
    await fetchStatus(false);
  };

  // Handle retry verification
  const handleRetry = () => {
    router.replace('/kyc/start' as any);
  };

  // Get current status for display
  const currentStatus: KycSessionStatus = sessionStatus?.status || 
    (userSummary?.kycStatus === 'approved' ? 'approved' : 
     userSummary?.kycStatus === 'rejected' ? 'rejected' : 
     userSummary?.kycStatus === 'pending' ? 'in_progress' : 'created');
  
  const statusConfig = getStatusConfig(currentStatus);

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent.primary}
            />
          }
        >
          {/* Status Header */}
          <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 40, marginBottom: 24 }}>
            {statusConfig.emoji}
          </Text>
          <Text style={{ 
            fontSize: 30, 
            fontWeight: 'bold', 
            color: theme.colors.text.primary, 
            textAlign: 'center', 
            marginBottom: 12 
          }}>
            {statusConfig.label}
          </Text>
          <Text style={{ 
            fontSize: 15, 
            color: theme.colors.text.secondary, 
            textAlign: 'center', 
            marginBottom: 8, 
            paddingHorizontal: 20 
          }}>
            {statusConfig.description}
          </Text>

          {/* Polling indicator */}
          {isVerificationPending(currentStatus) && params.fromWebView === 'true' && (
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginBottom: 24 
            }}>
              <ActivityIndicator size="small" color={theme.colors.accent.primary} />
              <Text style={{ 
                color: theme.colors.text.tertiary, 
                fontSize: 12, 
                marginLeft: 8 
              }}>
                Checking for updates...
              </Text>
            </View>
          )}

          {/* Error message */}
          {error && (
            <Card style={{ marginBottom: 16, backgroundColor: theme.colors.error + '20' }}>
              <Text style={{ color: theme.colors.error, fontSize: 14, textAlign: 'center' }}>
                {error}
              </Text>
            </Card>
          )}

          {/* Verification Details Card */}
          <Card style={{ marginBottom: 16, marginTop: 16 }}>
            <Text style={{ 
              color: theme.colors.text.primary, 
              fontSize: 16, 
              fontWeight: '600', 
              marginBottom: 16 
            }}>
              Verification Progress
            </Text>

            {/* Document Verification */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8 }}>📄</Text>
                <Text style={{ color: theme.colors.text.secondary }}>Document Verification</Text>
              </View>
              <Text style={{ 
                color: sessionStatus?.verificationDetails?.documentVerified 
                  ? theme.colors.success 
                  : isVerificationPending(currentStatus) 
                    ? theme.colors.warning 
                    : theme.colors.error 
              }}>
                {sessionStatus?.verificationDetails?.documentVerified 
                  ? '✓' 
                  : isVerificationPending(currentStatus) 
                    ? '⏳' 
                    : '✗'}
              </Text>
            </View>

            {/* Liveness Check */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8 }}>🤳</Text>
                <Text style={{ color: theme.colors.text.secondary }}>Liveness Detection</Text>
              </View>
              <Text style={{ 
                color: sessionStatus?.verificationDetails?.livenessVerified 
                  ? theme.colors.success 
                  : isVerificationPending(currentStatus) 
                    ? theme.colors.warning 
                    : theme.colors.error 
              }}>
                {sessionStatus?.verificationDetails?.livenessVerified 
                  ? '✓' 
                  : isVerificationPending(currentStatus) 
                    ? '⏳' 
                    : '✗'}
              </Text>
            </View>

            {/* Face Match */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8 }}>👤</Text>
                <Text style={{ color: theme.colors.text.secondary }}>Face Match</Text>
              </View>
              <Text style={{ 
                color: sessionStatus?.verificationDetails?.faceMatchVerified 
                  ? theme.colors.success 
                  : isVerificationPending(currentStatus) 
                    ? theme.colors.warning 
                    : theme.colors.error 
              }}>
                {sessionStatus?.verificationDetails?.faceMatchVerified 
                  ? '✓' 
                  : isVerificationPending(currentStatus) 
                    ? '⏳' 
                    : '✗'}
              </Text>
            </View>

            {/* IP Analysis */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8 }}>🌐</Text>
                <Text style={{ color: theme.colors.text.secondary }}>Security Check</Text>
              </View>
              <Text style={{ 
                color: sessionStatus?.verificationDetails?.ipAnalysisPassed 
                  ? theme.colors.success 
                  : isVerificationPending(currentStatus) 
                    ? theme.colors.warning 
                    : theme.colors.error 
              }}>
                {sessionStatus?.verificationDetails?.ipAnalysisPassed 
                  ? '✓' 
                  : isVerificationPending(currentStatus) 
                    ? '⏳' 
                    : '✗'}
              </Text>
            </View>
          </Card>

          {/* Extracted Data (for approved verifications) */}
          {currentStatus === 'approved' && sessionStatus?.extractedData && (
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ 
                color: theme.colors.text.primary, 
                fontSize: 16, 
                fontWeight: '600', 
                marginBottom: 16 
              }}>
                Verified Information
              </Text>

              {sessionStatus.extractedData.fullName && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Full Name</Text>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '500' }}>
                    {sessionStatus.extractedData.fullName}
                  </Text>
                </View>
              )}

              {sessionStatus.extractedData.dateOfBirth && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Date of Birth</Text>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '500' }}>
                    {sessionStatus.extractedData.dateOfBirth}
                  </Text>
                </View>
              )}

              {sessionStatus.extractedData.documentType && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Document Type</Text>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '500' }}>
                    {sessionStatus.extractedData.documentType}
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Rejection Reason */}
          {currentStatus === 'rejected' && sessionStatus?.rejectionReason && (
            <Card style={{ marginBottom: 16, backgroundColor: theme.colors.error + '10' }}>
              <Text style={{ 
                color: theme.colors.error, 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 8 
              }}>
                Why was my verification rejected?
              </Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                {sessionStatus.rejectionReason}
              </Text>
            </Card>
          )}

          {/* Session Info */}
          <Card style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>Session ID</Text>
              <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
                {sessionStatus?.sessionId?.slice(0, 8) || userSummary?.lastSessionId?.slice(0, 8) || 'N/A'}...
              </Text>
            </View>
            {sessionStatus?.createdAt && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>Started</Text>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
                  {new Date(sessionStatus.createdAt).toLocaleString('en-IN')}
                </Text>
              </View>
            )}
            {sessionStatus?.completedAt && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>Completed</Text>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
                  {new Date(sessionStatus.completedAt).toLocaleString('en-IN')}
                </Text>
              </View>
            )}
            {userSummary && userSummary.totalAttempts > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>Attempt</Text>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
                  {sessionStatus?.attemptNumber || userSummary.totalAttempts} of 5
                </Text>
              </View>
            )}
          </Card>

          {/* Action Buttons */}
          {canRetryVerification(currentStatus) && sessionStatus?.canRetry && (
            <Button 
              title="Try Again" 
              onPress={handleRetry} 
              fullWidth 
              style={{ marginBottom: 16 }} 
            />
          )}

          {currentStatus === 'approved' && (
            <Button 
              title="Continue to Trading" 
              onPress={() => router.replace('/(drawer)' as any)} 
              fullWidth 
              style={{ marginBottom: 16 }} 
            />
          )}

          {/* Help link */}
          <TouchableOpacity 
            onPress={() => router.push('/settings/support' as any)}
            style={{ alignItems: 'center', marginTop: 8 }}
          >
            <Text style={{ 
              color: theme.colors.accent.primary, 
              fontSize: 14,
              textDecorationLine: 'underline'
            }}>
              Need help? Contact Support
            </Text>
          </TouchableOpacity>

          {/* Pull to refresh hint */}
          <Text style={{ 
            color: theme.colors.text.tertiary, 
            fontSize: 11, 
            textAlign: 'center',
            marginTop: 24 
          }}>
            Pull down to refresh status
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
