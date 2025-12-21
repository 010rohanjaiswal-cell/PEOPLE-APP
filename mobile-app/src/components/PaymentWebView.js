/**
 * Payment WebView Component
 * Displays Cashfree payment page in-app using WebView
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

const PaymentWebView = ({ visible, paymentUrl, onClose, onPaymentComplete }) => {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewRef, setWebViewRef] = useState(null);
  const paymentCompletedRef = useRef(false); // Prevent multiple calls
  const lastUrlRef = useRef(''); // Track last URL to prevent duplicate processing

  // Reset payment completed flag when modal opens/closes
  useEffect(() => {
    if (visible) {
      paymentCompletedRef.current = false;
      lastUrlRef.current = '';
      setLoading(true);
      setCanGoBack(false);
    } else {
      // Reset when modal closes
      paymentCompletedRef.current = false;
      lastUrlRef.current = '';
      setLoading(false);
      setCanGoBack(false);
    }
  }, [visible]);

  const handleNavigationStateChange = React.useCallback((navState) => {
    // Prevent multiple payment completion calls
    if (paymentCompletedRef.current) {
      return;
    }

    const url = navState.url || '';
    
    // Prevent processing the same URL multiple times (deduplication)
    if (url === lastUrlRef.current && url !== '') {
      return; // Skip if we've already processed this URL
    }
    lastUrlRef.current = url;
    
    // Check for deep link callback FIRST (before state updates)
    if (url.includes('people-app://payment/callback')) {
      try {
        const urlObj = new URL(url.replace('people-app://', 'https://'));
        const orderId = urlObj.searchParams.get('orderId');
        if (orderId && !paymentCompletedRef.current) {
          paymentCompletedRef.current = true;
          lastUrlRef.current = ''; // Reset to allow future navigation
          // Use requestAnimationFrame to break the update cycle
          requestAnimationFrame(() => {
            onPaymentComplete(orderId);
          });
          return;
        }
      } catch (e) {
        console.error('Error parsing callback URL:', e);
      }
    }

    // Only update state if payment not completed
    // Update state directly - React will batch and optimize
    if (!paymentCompletedRef.current) {
      setCanGoBack(navState.canGoBack);
      setLoading(navState.loading);
    }

    // Check for payment return URL (our backend redirect page)
    if (url.includes('/api/payment/return')) {
      try {
        const urlObj = new URL(url);
        const orderId = urlObj.searchParams.get('orderId');
        if (orderId) {
          console.log('📥 Payment return page detected, orderId:', orderId);
        }
      } catch (e) {
        console.error('Error parsing return URL:', e);
      }
    }
    
    // Check for Cashfree success/failure pages
    if (url.includes('cashfree.com') && (url.includes('success') || url.includes('failure'))) {
      // Payment page redirected to success/failure
      // We'll handle this via deep link or status check
    }
  }, [onPaymentComplete]);

  const handleShouldStartLoadWithRequest = React.useCallback((request) => {
    const url = request.url || '';
    
    // Prevent multiple calls
    if (paymentCompletedRef.current) {
      return false;
    }
    
    // Intercept deep link callbacks
    if (url.startsWith('people-app://')) {
      // Extract orderId and call completion handler directly
      try {
        const urlObj = new URL(url.replace('people-app://', 'https://'));
        const orderId = urlObj.searchParams.get('orderId');
        if (orderId && !paymentCompletedRef.current) {
          paymentCompletedRef.current = true;
          // Use requestAnimationFrame to break the update cycle
          requestAnimationFrame(() => {
            onPaymentComplete(orderId);
          });
        }
      } catch (e) {
        console.error('Error parsing deep link:', e);
      }
      return false; // Don't load in WebView, handle via deep link
    }
    
    return true; // Allow navigation
  }, [onPaymentComplete]);

  const handleGoBack = () => {
    if (webViewRef && canGoBack) {
      webViewRef.goBack();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
          >
            <MaterialIcons
              name={canGoBack ? 'arrow-back' : 'close'}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* WebView */}
        {paymentUrl && (
          <WebView
            key={paymentUrl} // Force remount when URL changes
            ref={(ref) => setWebViewRef(ref)}
            source={{ uri: paymentUrl }}
            style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          allowsBackForwardNavigationGestures={true}
          onLoadStart={() => {
            if (!paymentCompletedRef.current) {
              setLoading(true);
            }
          }}
          onLoadEnd={() => {
            if (!paymentCompletedRef.current) {
              setLoading(false);
            }
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            if (!paymentCompletedRef.current) {
              setLoading(false);
            }
          }}
        />
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default PaymentWebView;

