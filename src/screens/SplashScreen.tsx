import {BASE_URL, ONESIGNAL_APP_ID} from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Linking, StyleSheet, View} from 'react-native';
import {OneSignal} from 'react-native-onesignal';
import {SafeAreaView} from 'react-native-safe-area-context';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import {downloadFile, handlePermissionAndLogin} from './helper';

interface Message {
  type: MessageTypes;
  payload: any;
}

enum MessageTypes {
  user = 'CURRENT_USER',
  order_csv = 'CSV_ORDER_INBOXPAGE',
}

const baseUrl = BASE_URL;

const SplashScreen = () => {
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const webViewRef = useRef<WebView | null>(null);
  const [initScript, setInitScript] = useState<string>();
  const webRef = useRef<WebView>(null);
  const prevUrl = useRef<string>(null);

  const SAVE_FROM_WEB = `(function() {
    var currentUser = window.localStorage.getItem('currentUser');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CURRENT_USER', payload: currentUser }));
})();`;

  useEffect(() => {
    // OneSignal Initialization
    OneSignal.initialize(ONESIGNAL_APP_ID);
    //check for initial deep link
    getInitialUrlDeepLink();

    //initialise deep linking
    const subscription = Linking.addEventListener('url', event => {
      if (event.url) {
        webViewRef.current?.injectJavaScript(`
            window.location.href = '${event?.url}';
          `);
      }
    });

    handleInit().then(() => {
      setWebViewLoaded(true);
      refreshHandler();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const clickListener = (event: any) => {
      const url = event?.notification?.launchUrl;
      const notification = event?.notification?.additionalData;
      console.log('notification', notification);
      const webUrl = notification?.web_url?.replace(
        'localhost:4000',
        'joova.app',
      );

      webViewRef.current?.injectJavaScript(`
          window.location.href = '${webUrl}';
        `);

      // if (senderId) {
      //   let targetUrl;

      //   // Check the type of notification and construct the appropriate URL
      //   switch (notification?.notificationType) {
      //     case 'chat':
      //       targetUrl = `https://learning.icodestaging.in/chat/${senderId}`;
      //       break;
      //     case 'confirmPayment':
      //       targetUrl = `https://learning.icodestaging.in/order/${confirmPaymentOrderId}`;
      //       break;
      //     case 'joinSessionTransaction':
      //       targetUrl = `https://learning.icodestaging.in/order/${joinSessionTransactionId}`;
      //       break;
      //     case 'onCancelTransaction':
      //       targetUrl = `https://learning.icodestaging.in/order/${cancelTransactionId}`;
      //       break;
      //     case 'requestPublishListingDraft':
      //       targetUrl = `https://learning.icodestaging.in/order/${requestPublishListingDraftId}`;
      //       break;
      //     case 'createListing':
      //       targetUrl = `https://learning.icodestaging.in/new-order/${createListingId}`;
      //       break;
      //     case 'updateListingException':
      //       targetUrl = `https://learning.icodestaging.in/order/${updateListingExceptionId}`;
      //       break;
      //     case 'deleteSession':
      //       targetUrl = `https://learning.icodestaging.in/order/${deleteSessionId}`;
      //       break;
      //     case 'freeLesson':
      //       targetUrl = `https://learning.icodestaging.in/order/${freeLessonId}`;
      //       break;
      //     default:
      //       targetUrl = 'https://learning.icodestaging.in';
      //   }

      //   // Instead of opening the URL in the browser, inject the URL into the WebView
      //   webViewRef.current?.injectJavaScript(`
      //     window.location.href = '${targetUrl}';
      //   `);
      // }
    };

    OneSignal.Notifications.addEventListener('click', clickListener);

    return () => {
      OneSignal.Notifications.removeEventListener('click', clickListener);
    };
  }, []);

  const getInitialUrlDeepLink = async () => {
    try {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        handleDeepLinkUrl(initialURL);
      }
    } catch (error) {
      console.error('Error getting initial URL:', error);
    }
  };

  const handleDeepLinkUrl = url => {
    webViewRef.current?.injectJavaScript(`
      window.location.href = '${url}';
    `);
  };

  async function handleInit() {
    const allKeys = await AsyncStorage.getAllKeys();
    if (allKeys.length === 0) {
      setInitScript(SAVE_FROM_WEB);
    } else {
      const setItemScripts = allKeys.map(async key => {
        const value = await AsyncStorage.getItem(key);
        const sanitizedValue =
          typeof value === 'object'
            ? JSON.stringify(value)
            : JSON.stringify(String(value));
        return `AsyncStorage.setItem('${key}', ${sanitizedValue});`;
      });

      const SAVE_FROM_RN = `(function() {
        ${setItemScripts.join('\n')}
      })();`;
      setInitScript(SAVE_FROM_WEB);
    }
  }

  const refreshHandler = () => {
    webRef.current?.injectJavaScript(SAVE_FROM_WEB);
  };

  const handleOnNavigationStateChange = async (navState: any) => {
    webViewRef.current?.injectJavaScript(SAVE_FROM_WEB);

    if (prevUrl.current === `${baseUrl}/login`) {
      //Run this when user authenticates first time
      webViewRef.current?.injectJavaScript(`
          if (window && window.location && window.location.reload) {
            window.location.reload();
          }
        `);
    }
    prevUrl.current = navState.url;
  };

  const handleOnMessage = async (event: WebViewMessageEvent) => {
    const message: Message = JSON.parse(event?.nativeEvent?.data);
    switch (message.type) {
      case MessageTypes.user: {
        // Parse the payload string to get the currentUser object
        const currentUserString = message?.payload;
        const currentUser = JSON.parse(currentUserString);
        // Directly access id and attributes properties
        const currentUserId = currentUser?.id?.uuid;
        const email = currentUser?.attributes?.email;

        console.log('currentUser - handleOnMessage', currentUserId);
        if (currentUserId) {
          handlePermissionAndLogin(currentUserId);
          if (email) {
            OneSignal.User.addEmail(email);
          }
        } else {
          await AsyncStorage.removeItem('currentUser');
        }

        break;
      }
      case MessageTypes.order_csv: {
        const url = message?.payload;
        downloadFile(url.replace('blob:', ''));
        break;
      }
      default:
        throw new Error('invalid case');
    }
  };

  return (
    <SafeAreaView style={styles.safearea}>
      <View style={styles.parent}>
        {!webViewLoaded && !initScript ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : initScript ? (
          <WebView
            ref={webViewRef}
            javaScriptEnabled={true}
            injectedJavaScriptBeforeContentLoaded={initScript}
            onMessage={handleOnMessage}
            source={{uri: baseUrl}}
            onNavigationStateChange={handleOnNavigationStateChange}
            domStorageEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safearea: {
    flex: 1,
  },
  parent: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SplashScreen;
