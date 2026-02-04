/**
 * Document Capture Screen - Didit WebView Integration
 * Loads Didit's hosted verification page in a WebView
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '@/lib/hooks';
import { kycApi, type KycSessionStatus } from '@/lib/kyc-api';

// Callback URL scheme for detecting completion
const CALLBACK_SCHEME = 'tradingapp://';
const COMPLETION_PATHS = ['/kyc/callback', '/kyc/success', '/kyc/complete'];

export default function DocumentCaptureScreen() {
  const theme = useTheme();
  const { getToken } = useAuth();
  const params = useLocalSearchParams<{
    sessionId: string;
    sessionUrl: string;
    providerSessionId: string;
  }>();
  
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [verificationCompleted, setVerificationCompleted] = useState(false);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      // Show confirmation before leaving
      showExitConfirmation();
      return true;
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  // Show exit confirmation
  const showExitConfirmation = () => {
    Alert.alert(
      'Cancel Verification?',
      'Are you sure you want to cancel? You can resume verification later.',
      [
        { text: 'Continue Verification', style: 'cancel' },
        { 
          text: 'Cancel', 
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  // Handle WebView navigation state change
  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    
    const url = navState.url;
    console.log('WebView navigating to:', url);

    // Check if this is a callback URL (completion)
    if (url.startsWith(CALLBACK_SCHEME)) {
      // Parse the URL for status information
      const isSuccess = COMPLETION_PATHS.some(path => url.includes(path));
      handleVerificationComplete(isSuccess);
      return;
    }

    // Also check for Didit's completion indicators in the URL
    if (url.includes('status=completed') || 
        url.includes('status=success') ||
        url.includes('/complete') ||
        url.includes('/success')) {
      handleVerificationComplete(true);
    }
  }, []);

  // Handle verification completion
  const handleVerificationComplete = async (success: boolean) => {
    if (verificationCompleted) return; // Prevent double handling
    setVerificationCompleted(true);

    console.log('Verification completed, success:', success);

    // Give a moment for any final processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Navigate to status page
    router.replace({
      pathname: '/kyc/status' as any,
      params: {
        sessionId: params.sessionId,
        fromWebView: 'true',
      },
    });
  };

  // Handle WebView messages (from injected JavaScript)
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);

      if (data.type === 'verification_complete') {
        handleVerificationComplete(data.success);
      } else if (data.type === 'verification_error') {
        Alert.alert('Verification Error', data.message || 'An error occurred during verification.');
      }
    } catch (e) {
      // Not JSON, might be a regular message
      console.log('WebView message (non-JSON):', event.nativeEvent.data);
    }
  }, []);

  // JavaScript to inject into WebView for better integration
  const injectedJavaScript = `
    (function() {
      // Override alert to communicate with React Native
      window.originalAlert = window.alert;
      window.alert = function(message) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'alert',
          message: message
        }));
      };

      // Listen for Didit completion events (if they fire custom events)
      window.addEventListener('didit-verification-complete', function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'verification_complete',
          success: true,
          data: e.detail
        }));
      });

      // Monitor for completion indicators in the DOM
      const observer = new MutationObserver(function(mutations) {
        // Check for success/complete text or elements
        const body = document.body.innerText.toLowerCase();
        if (body.includes('verification successful') || 
            body.includes('verification complete') ||
            body.includes('thank you') ||
            document.querySelector('[data-testid="success"]') ||
            document.querySelector('.verification-complete')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'verification_complete',
            success: true
          }));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Handle page load
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'page_loaded',
        url: window.location.href
      }));

      true;
    })();
  `;

  // Retry loading
  const handleRetry = () => {
    setLoadError(null);
    setLoading(true);
    webViewRef.current?.reload();
  };

  // Render loading state
  if (!params.sessionUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ 
            color: theme.colors.text.primary, 
            fontSize: 18, 
            fontWeight: '600',
            marginBottom: 8,
            textAlign: 'center' 
          }}>
            Session Error
          </Text>
          <Text style={{ 
            color: theme.colors.text.secondary, 
            fontSize: 14, 
            textAlign: 'center',
            marginBottom: 24 
          }}>
            Unable to load verification session. Please try again.
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              backgroundColor: theme.colors.accent.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.text.tertiary,
        backgroundColor: theme.colors.background.primary,
      }}>
        <TouchableOpacity 
          onPress={showExitConfirmation}
          style={{ padding: 8 }}
        >
          <Text style={{ color: theme.colors.text.secondary, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        
        <Text style={{ 
          color: theme.colors.text.primary, 
          fontSize: 17, 
          fontWeight: '600' 
        }}>
          Identity Verification
        </Text>
        
        <View style={{ width: 60 }} />
      </View>

      {/* Loading indicator overlay */}
      {loading && (
        <View style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.background.primary,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        }}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
          <Text style={{ 
            color: theme.colors.text.secondary, 
            marginTop: 16,
            fontSize: 14 
          }}>
            Loading verification...
          </Text>
        </View>
      )}

      {/* Error state */}
      {loadError && (
        <View style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.background.primary,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          zIndex: 10,
        }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>😔</Text>
          <Text style={{ 
            color: theme.colors.text.primary, 
            fontSize: 18, 
            fontWeight: '600',
            marginBottom: 8,
            textAlign: 'center' 
          }}>
            Failed to Load
          </Text>
          <Text style={{ 
            color: theme.colors.text.secondary, 
            fontSize: 14, 
            textAlign: 'center',
            marginBottom: 24 
          }}>
            {loadError}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{
                backgroundColor: theme.colors.background.secondary,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: theme.colors.text.primary }}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleRetry}
              style={{
                backgroundColor: theme.colors.accent.primary,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: params.sessionUrl }}
        style={{ flex: 1 }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setLoadError('Unable to load verification page. Please check your internet connection.');
          setLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent.statusCode);
          if (nativeEvent.statusCode >= 400) {
            setLoadError(`Server error (${nativeEvent.statusCode}). Please try again later.`);
          }
        }}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        
        // WebView configuration
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        
        // Camera access for face verification
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        
        // Security
        originWhitelist={['https://*', 'http://*', 'tradingapp://*']}
        
        // iOS specific
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        
        // Android specific
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        
        // User agent (helps with compatibility)
        userAgent={Platform.select({
          ios: 'TradingApp/1.0 iOS WebView',
          android: 'TradingApp/1.0 Android WebView',
        })}
      />

      {/* Progress indicator at bottom */}
      {!loading && !loadError && (
        <View style={{
          padding: 12,
          backgroundColor: theme.colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: theme.colors.text.tertiary,
        }}>
          <Text style={{ 
            color: theme.colors.text.tertiary, 
            fontSize: 12, 
            textAlign: 'center' 
          }}>
            🔒 Secured by Didit • Your data is encrypted
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
