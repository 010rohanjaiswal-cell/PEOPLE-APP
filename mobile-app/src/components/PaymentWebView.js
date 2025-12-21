/**
 * Payment WebView Component
 * Displays Cashfree payment page in-app using WebView
 * Simplified version to prevent infinite loops
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
  const webViewRef = useRef(null);
  const paymentCompletedRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      paymentCompletedRef.current = false;
      isProcessingRef.current = false;
      setLoading(true);
      setCanGoBack(false);
    }
  }, [visible]);

  // Handle navigation - simplified to prevent loops
  const handleNavigationStateChange = (navState) => {
    // Prevent any processing if payment already completed
    if (paymentCompletedRef.current || isProcessingRef.current) {
      return;
    }

    const url = navState.url || '';
    
    // Check for deep link callback
    if (url.includes('people-app://payment/callback')) {
      isProcessingRef.current = true;
      paymentCompletedRef.current = true;
      
      try {
        const urlObj = new URL(url.replace('people-app://', 'https://'));
        const orderId = urlObj.searchParams.get('orderId');
        
        if (orderId) {
          // Use setTimeout to break the update cycle
          setTimeout(() => {
            onPaymentComplete(orderId);
          }, 100);
          return;
        }
      } catch (e) {
        console.error('Error parsing callback URL:', e);
        isProcessingRef.current = false;
        paymentCompletedRef.current = false;
      }
      return;
    }

    // Check for backend return URL
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

    // Update navigation state only if not processing
    if (!isProcessingRef.current) {
      setCanGoBack(navState.canGoBack || false);
      setLoading(navState.loading !== false);
    }
  };

  // Handle should start load - intercept deep links
  const handleShouldStartLoadWithRequest = (request) => {
    const url = request.url || '';
    
    if (paymentCompletedRef.current) {
      return false;
    }
    
    // Intercept deep link callbacks
    if (url.startsWith('people-app://')) {
      isProcessingRef.current = true;
      paymentCompletedRef.current = true;
      
      try {
        const urlObj = new URL(url.replace('people-app://', 'https://'));
        const orderId = urlObj.searchParams.get('orderId');
        
        if (orderId) {
          setTimeout(() => {
            onPaymentComplete(orderId);
          }, 100);
        }
      } catch (e) {
        console.error('Error parsing deep link:', e);
        isProcessingRef.current = false;
        paymentCompletedRef.current = false;
      }
      
      return false; // Don't load in WebView
    }
    
    return true; // Allow navigation
  };

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    } else {
      onClose();
    }
  };

  const handleLoadStart = () => {
    if (!paymentCompletedRef.current) {
      setLoading(true);
    }
  };

  const handleLoadEnd = () => {
    if (!paymentCompletedRef.current) {
      setLoading(false);
    }
  };

  const handleError = () => {
    if (!paymentCompletedRef.current) {
      setLoading(false);
    }
  };

  // Don't render if no payment URL
  if (!paymentUrl) {
    return null;
  }

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
        <WebView
          ref={webViewRef}
          source={{ uri: paymentUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          allowsBackForwardNavigationGestures={true}
        />

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
