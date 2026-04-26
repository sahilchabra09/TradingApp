/**
 * KYC Status Screen
 * Displays verification status and results
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStableToken } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { activatePaperAccount, getPaperStatus, type PaperStatus } from '@/lib/paper-api';
import { 
  kycApi, 
  getStatusConfig, 
  canRetryVerification,
  isVerificationComplete,
  isVerificationPending,
  type KycStatusResponse,
  type UserKycSummary,
  type KycSessionStatus,
  type AdminApprovalStatus,
} from '@/lib/kyc-api';

export default function KYCStatusScreen() {
  const theme = useTheme();
  const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
  const params = useLocalSearchParams<{
    sessionId?: string;
    fromWebView?: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<KycStatusResponse | null>(null);
  const [userSummary, setUserSummary] = useState<UserKycSummary | null>(null);
  const [paperStatus, setPaperStatus] = useState<PaperStatus | null>(null);
  const [unlockingPaper, setUnlockingPaper] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status data
  const fetchStatus = useCallback(async (showLoading = true) => {
    if (!isSignedIn) return;
    
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const token = await stableGetToken();
      if (token) {
        kycApi.setAuthToken(token);
      }

      // Fetch user summary first
      const summaryResponse = await kycApi.getUserKycStatus();
      if (summaryResponse.success && summaryResponse.data) {
        setUserSummary(summaryResponse.data);
      }

      // Fetch demo-account eligibility for unlock CTA
      try {
        const nextPaperStatus = await getPaperStatus(stableGetToken);
        setPaperStatus(nextPaperStatus);
      } catch {
        setPaperStatus(null);
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

  // Initial fetch — when coming from WebView, first sync with Didit then fetch
  useEffect(() => {
    const init = async () => {
      if (params.fromWebView === 'true' && params.sessionId) {
        // Proactively pull latest decision from Didit before rendering
        try {
          const token = await stableGetToken();
          if (token) kycApi.setAuthToken(token);
          await kycApi.syncSession(params.sessionId);
        } catch {
          // Best-effort — fetchStatus will still show cached DB state
        }
      }
      await fetchStatus();
    };
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for updates if coming from WebView and status is still pending/in-review
  useEffect(() => {
    // Keep polling only while the session hasn't reached a terminal state
    const isTerminal = sessionStatus && 
      (sessionStatus.status === 'approved' || 
       sessionStatus.status === 'declined' || 
       sessionStatus.status === 'expired');

    if (params.fromWebView === 'true' && !isTerminal) {
      const pollInterval = setInterval(async () => {
        // Try sync first to pull fresh data from Didit
        if (params.sessionId) {
          try { await kycApi.syncSession(params.sessionId); } catch { /* ignore */ }
        }
        await fetchStatus(false);
      }, 5000); // Poll every 5 seconds

      // Stop polling after 3 minutes
      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
      }, 180000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeout);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.fromWebView, sessionStatus?.status]);

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

  const handleUnlockPaper = useCallback(async () => {
    try {
      setUnlockingPaper(true);
      await activatePaperAccount(stableGetToken);
      const nextPaperStatus = await getPaperStatus(stableGetToken);
      setPaperStatus(nextPaperStatus);
      Alert.alert(
        'Paper Account Unlocked',
        'Your paper wallet is now active with $100,000 virtual cash.'
      );
    } catch (err) {
      Alert.alert(
        'Unable to unlock paper account',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setUnlockingPaper(false);
    }
  }, []);

  // Determine the admin approval status
  const adminApproval: AdminApprovalStatus = sessionStatus?.adminApprovalStatus || userSummary?.adminApprovalStatus || null;

  // Show popup when returning from WebView and Didit verification is complete
  const popupShown = useRef(false);
  const unlockPromptShown = useRef(false);
  useEffect(() => {
    if (params.fromWebView === 'true' && !popupShown.current && sessionStatus) {
      if (sessionStatus.status === 'approved' && adminApproval === 'pending_approval') {
        popupShown.current = true;
        Alert.alert(
          'Verification Complete',
          'Your identity verification has been completed successfully. Your account is now pending approval from ReTrading to start trading.',
          [{ text: 'OK' }]
        );
      } else if (sessionStatus.status === 'declined') {
        popupShown.current = true;
        Alert.alert(
          'Verification Failed',
          sessionStatus.rejectionReason || 'Your identity verification was not successful. You can try again.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [params.fromWebView, sessionStatus?.status, adminApproval]);

  useEffect(() => {
    const isKycApproved = sessionStatus?.status === 'approved' || userSummary?.kycStatus === 'approved';
    if (
      isKycApproved &&
      paperStatus?.canActivateDemo &&
      !paperStatus?.hasDemoAccount &&
      !unlockPromptShown.current
    ) {
      unlockPromptShown.current = true;
      Alert.alert(
        'Unlock Paper Account',
        'KYC is complete. Unlock your paper account now to receive $100,000 virtual cash.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Unlock now',
            onPress: () => {
              void handleUnlockPaper();
            },
          },
        ]
      );
    }

    if (paperStatus?.hasDemoAccount) {
      unlockPromptShown.current = false;
    }
  }, [paperStatus?.canActivateDemo, paperStatus?.hasDemoAccount, handleUnlockPaper, sessionStatus?.status, userSummary?.kycStatus]);

  // Get current status for display
  const currentStatus: KycSessionStatus = sessionStatus?.status || 
    (userSummary?.kycStatus === 'approved'  ? 'approved'    : 
     userSummary?.kycStatus === 'rejected'  ? 'declined'    : 
     userSummary?.kycStatus === 'pending'   ? 'in_progress' : 'created');
  
  const statusConfig = getStatusConfig(currentStatus);

  // Determine what to show the user based on combined Didit + admin status
  const getDisplayStatus = () => {
    // Didit approved but admin hasn't reviewed yet
    if (currentStatus === 'approved' && adminApproval === 'pending_approval') {
      return {
        iconName: 'checkmark-circle' as const,
        iconColor: theme.colors.success,
        title: 'Verification Complete',
        description: 'Your identity has been verified successfully. Your account is now pending approval from ReTrading.',
        color: theme.colors.warning,
      };
    }
    // Admin approved — user can trade
    if (currentStatus === 'approved' && adminApproval === 'approved') {
      return {
        iconName: 'trophy' as const,
        iconColor: theme.colors.success,
        title: 'Account Approved',
        description: 'Your account has been approved by ReTrading. You can now start trading!',
        color: theme.colors.success,
      };
    }
    // Admin rejected
    if (adminApproval === 'rejected') {
      return {
        iconName: 'close-circle' as const,
        iconColor: theme.colors.error,
        title: 'Approval Declined',
        description: 'Your account was not approved by ReTrading. Please contact support for more information.',
        color: theme.colors.error,
      };
    }
    // Default: map Didit status to icon
    const statusIconMap: Record<string, { iconName: React.ComponentProps<typeof Ionicons>['name']; iconColor: string }> = {
      approved:    { iconName: 'checkmark-circle', iconColor: theme.colors.success },
      declined:    { iconName: 'close-circle',     iconColor: theme.colors.error },
      rejected:    { iconName: 'close-circle',     iconColor: theme.colors.error },
      in_progress: { iconName: 'time-outline',     iconColor: theme.colors.warning },
      pending:     { iconName: 'time-outline',     iconColor: theme.colors.warning },
      created:     { iconName: 'document-outline', iconColor: theme.colors.text.tertiary },
      expired:     { iconName: 'timer-outline',    iconColor: theme.colors.text.tertiary },
      abandoned:   { iconName: 'exit-outline',     iconColor: theme.colors.text.tertiary },
    };
    const iconInfo = statusIconMap[currentStatus] ?? { iconName: 'help-circle-outline' as const, iconColor: theme.colors.text.tertiary };
    return {
      iconName: iconInfo.iconName,
      iconColor: iconInfo.iconColor,
      title: statusConfig.label,
      description: statusConfig.description,
      color: statusConfig.color,
    };
  };

  const displayStatus = getDisplayStatus();

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.background.gradient as [string, string, string]}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner size="large" />
          <Text style={{ color: theme.colors.text.secondary, marginTop: 16 }}>
            Loading verification status...
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors.background.gradient as [string, string, string]}
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
          {/* Status Header Icon */}
          <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 24 }}>
            <Ionicons name={displayStatus.iconName} size={80} color={displayStatus.iconColor} />
          </View>
          <Text style={{ 
            fontSize: 30, 
            fontWeight: 'bold', 
            color: theme.colors.text.primary, 
            textAlign: 'center', 
            marginBottom: 12 
          }}>
            {displayStatus.title}
          </Text>
          <Text style={{ 
            fontSize: 15, 
            color: theme.colors.text.secondary, 
            textAlign: 'center', 
            marginBottom: 8, 
            paddingHorizontal: 20 
          }}>
            {displayStatus.description}
          </Text>

          {/* Admin Approval Status Badge */}
          {currentStatus === 'approved' && adminApproval && (
            <View style={{
              alignSelf: 'center',
              backgroundColor: adminApproval === 'approved' ? theme.colors.success + '20' : adminApproval === 'rejected' ? theme.colors.error + '20' : theme.colors.warning + '20',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginBottom: 16,
            }}>
              <Text style={{
                color: adminApproval === 'approved' ? theme.colors.success : adminApproval === 'rejected' ? theme.colors.error : theme.colors.warning,
                fontSize: 13,
                fontWeight: '600',
              }}>
                {adminApproval === 'pending_approval' ? 'Pending Approval from ReTrading' :
                 adminApproval === 'approved' ? 'Approved by ReTrading' :
                 'Declined by ReTrading'}
              </Text>
            </View>
          )}

          {/* Polling indicator */}
          {isVerificationPending(currentStatus) && params.fromWebView === 'true' && (
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginBottom: 24 
            }}>
              <Spinner size="small" />
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

          {paperStatus?.canActivateDemo && !paperStatus?.hasDemoAccount && (
            <Card style={{ marginBottom: 16, backgroundColor: theme.colors.accent.primary + '15' }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                Unlock your paper account
              </Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 12 }}>
                KYC is complete. Activate paper trading to receive $100,000 virtual cash.
              </Text>
              <Button
                title={unlockingPaper ? 'Unlocking...' : 'Unlock Paper Account'}
                onPress={() => {
                  void handleUnlockPaper();
                }}
                disabled={unlockingPaper}
                fullWidth
              />
            </Card>
          )}

          {paperStatus?.hasDemoAccount && (
            <Card style={{ marginBottom: 16, backgroundColor: theme.colors.success + '15' }}>
              <Text style={{ color: theme.colors.success, fontSize: 14, fontWeight: '600' }}>
                Paper account is active. You can now paper trade with live market data.
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
                <Ionicons name="document-text-outline" size={20} color={theme.colors.accent.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.colors.text.secondary }}>Document Verification</Text>
              </View>
              {sessionStatus?.verificationDetails?.documentVerified
                ? <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                : isVerificationPending(currentStatus)
                  ? <Ionicons name="time-outline" size={18} color={theme.colors.warning} />
                  : <Ionicons name="close-circle" size={18} color={theme.colors.error} />}
            </View>

            {/* Liveness Check */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="camera-outline" size={20} color={theme.colors.accent.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.colors.text.secondary }}>Liveness Detection</Text>
              </View>
              {sessionStatus?.verificationDetails?.livenessVerified
                ? <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                : isVerificationPending(currentStatus)
                  ? <Ionicons name="time-outline" size={18} color={theme.colors.warning} />
                  : <Ionicons name="close-circle" size={18} color={theme.colors.error} />}
            </View>

            {/* Face Match */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-outline" size={20} color={theme.colors.accent.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.colors.text.secondary }}>Face Match</Text>
              </View>
              {sessionStatus?.verificationDetails?.faceMatchVerified
                ? <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                : isVerificationPending(currentStatus)
                  ? <Ionicons name="time-outline" size={18} color={theme.colors.warning} />
                  : <Ionicons name="close-circle" size={18} color={theme.colors.error} />}
            </View>

            {/* IP Analysis */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.accent.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.colors.text.secondary }}>Security Check</Text>
              </View>
              {sessionStatus?.verificationDetails?.ipAnalysisPassed
                ? <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                : isVerificationPending(currentStatus)
                  ? <Ionicons name="time-outline" size={18} color={theme.colors.warning} />
                  : <Ionicons name="close-circle" size={18} color={theme.colors.error} />}
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

          {/* Rejection Reason — shown for both 'declined' (Didit) and 'rejected' (user table) */}
          {(currentStatus === 'declined' || currentStatus === 'rejected') && sessionStatus?.rejectionReason && (
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

          {currentStatus === 'approved' && adminApproval === 'approved' && (
            <Button 
              title="Start Trading" 
              onPress={() => router.replace('/(drawer)' as any)} 
              fullWidth 
              style={{ marginBottom: 16 }} 
            />
          )}

          {currentStatus === 'approved' && adminApproval === 'pending_approval' && (
            <>
              <Button 
                title="Start Paper Trading" 
                onPress={() => router.replace('/(drawer)' as any)} 
                fullWidth 
                style={{ marginBottom: 16 }} 
              />
              <View style={{
                backgroundColor: theme.colors.info + '10',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.colors.info + '30',
              }}>
                <Text style={{ color: theme.colors.info, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  What happens next?
                </Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                  The ReTrading team will review your verification. Once approved, you will be able to trade for real. In the meantime, paper trading with $100,000 virtual cash is available now.
                </Text>
              </View>
            </>
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
