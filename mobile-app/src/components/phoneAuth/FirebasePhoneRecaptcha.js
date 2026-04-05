/**
 * WebView that loads Firebase v8 (CDN) + reCAPTCHA and posts the token to React Native.
 */
import React, { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { getFirebaseRecaptchaWebSource, assertFirebaseWebConfig } from './recaptchaHtml';

export default function FirebasePhoneRecaptcha({
  firebaseConfig,
  firebaseVersion,
  appVerificationDisabledForTesting = false,
  languageCode,
  onVerify,
  onLoad,
  onError,
  onFullChallenge,
  invisible = false,
  verify = false,
  style,
  ...webViewProps
}) {
  const webviewRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  assertFirebaseWebConfig(firebaseConfig);

  useEffect(() => {
    if (webviewRef.current && loaded && verify) {
      webviewRef.current.injectJavaScript(`
    (function(){
      window.dispatchEvent(new MessageEvent('message', {data: { verify: true }}));
    })();
    true;
    `);
    }
  }, [verify, loaded]);

  return (
    <WebView
      ref={webviewRef}
      style={style}
      javaScriptEnabled
      automaticallyAdjustContentInsets
      scalesPageToFit
      mixedContentMode="always"
      originWhitelist={['*']}
      source={getFirebaseRecaptchaWebSource(
        firebaseConfig,
        firebaseVersion,
        appVerificationDisabledForTesting,
        languageCode,
        invisible
      )}
      onError={onError}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          switch (data.type) {
            case 'load':
              setLoaded(true);
              onLoad?.();
              break;
            case 'error':
              onError?.();
              break;
            case 'verify':
              onVerify?.(data.token);
              break;
            case 'fullChallenge':
              onFullChallenge?.();
              break;
            default:
              break;
          }
        } catch {
          onError?.();
        }
      }}
      {...webViewProps}
    />
  );
}
