import {useNavigation} from '@react-navigation/native';
import React, {useState, useEffect, useRef} from 'react';
import {View, ActivityIndicator, Linking, Keyboard} from 'react-native';
import {LogLevel, OneSignal} from 'react-native-onesignal';
import {SafeAreaView} from 'react-native-safe-area-context';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ONESIGNAL_APP_ID} from '@env';

interface Message {
  type: MessageTypes;
  payload: any;
}

enum MessageTypes {
  user = 'CURRENT_USER',
}

interface SaveData {
  key: string;
  value: string;
}

const SplashScreen = () => {
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [loginId, setLoginId] = useState('');
  // const [webUrl, setWebUrl] = useState("https://learning.icodestaging.in");
  const [email, setEmail] = useState(null);
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState(null);
  const webViewRef = useRef<WebView | null>(null);
  const navigation: any = useNavigation();

  const SAVE_FROM_WEB = `(function() {
    var currentUser = window.localStorage.getItem('currentUser');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CURRENT_USER', payload: currentUser }));
})();`;

  const [initScript, setInitScript] = useState<string>();
  const webRef = useRef<WebView>(null);

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
      // setInitScript(SAVE_FROM_RN);
      setInitScript(SAVE_FROM_WEB);
    }
  }

  const refreshHandler = () => {
    setInterval(() => {
      webRef.current?.injectJavaScript(SAVE_FROM_WEB);
    }, 5000);
  };

  useEffect(() => {
    handleInit().then(refreshHandler);
  }, []);

  useEffect(() => {
    const loaderTimeout = setTimeout(() => {
      setWebViewLoaded(true);
    }, 2000);

    return () => {
      clearTimeout(loaderTimeout);
    };
  }, []);

  useEffect(() => {
    console.log('INITIAL IZAING ONE SIGNAL');

    // Remove this line if you don't need verbose logging
    // OneSignal Initialization
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', event => {
      webViewRef.current?.injectJavaScript(`
          window.location.href = '${event?.url}';
        `);
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
      console.log('WEB UYRL ', webUrl);

      // const senderId = notification?.senderId;
      // const confirmPaymentOrderId = '65afa24e-303a-4388-ad33-5da835b48c2c';
      // const joinSessionTransactionId = '';
      // const cancelTransactionId = '';
      // const requestPublishListingDraftId = '';
      // const createListingId = '';
      // const updateListingExceptionId = '';
      // const deleteSessionId = '';
      // const freeLessonId = '';

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

  const handlePermissionAndLogin = async (userId: string) => {
    const canRequest: any = OneSignal.Notifications.canRequestPermission();
    if (canRequest) {
      // Request permission
      console.log('USER ID BEFORE PROMOT ', userId);

      const res = await OneSignal.Notifications.requestPermission(true);
      console.log('PROMPT RES ', JSON.stringify(res));
      OneSignal.login(userId);
    }
  };

  // useEffect(() => {
  //   handlePermissionAndLogin();
  // }, [loginId]);

  const handleOnNavigationStateChange = async (navState: any) => {
    console.log('navState', navState);
    clearUserValues(navState);
    // Additional conditions or handling for other navigation states if needed
    if (
      navState.title === 'Log in | JOOVA' &&
      navState.url !== 'https://joova.app/login'
    ) {
      const currentUserData: any = await webViewRef.current?.injectJavaScript(`
  JSON.stringify({ type: 'CURRENT_USER', payload: window.localStorage.getItem('currentUser') });
`);

      if (currentUserData) {
        // console.log('Asking permissions ');

        const currentUser = JSON.parse(currentUserData?.payload);
        // console.log("IDD + > ", currentUser?.id?.uuid);

        // handlePermissionAndLogin(currentUser.id?.uuid);
        // Save current user in AsyncStorage
        await AsyncStorage.setItem('currentUser', JSON.stringify(currentUser));
      }

      webViewRef.current?.injectJavaScript(`
    if (window && window.location && window.location.reload) {
      window.location.reload();
    }
  `);
    }
  };

  const clearUserValues = async navState => {
    if (
      navState.title === 'Sell or rent lessons | JOOVA' &&
      navState.url === 'https://joova.app/'
    ) {
      setLoginId('');
      setEmail(null);
      setPhone(null);
      setUser(null);
      await AsyncStorage.removeItem('currentUser');
    }
  };

  const handleOnMessage = (event: WebViewMessageEvent) => {
    // console.log("event ",event?.nativeEvent?.data);

    const message: Message = JSON.parse(event?.nativeEvent?.data);
    switch (message.type) {
      case MessageTypes.user: {
        // Parse the payload string to get the currentUser object
        const currentUserString = message?.payload;
        const currentUser = JSON.parse(currentUserString);
        // Directly access id and attributes properties
        const currentUserId = currentUser?.id?.uuid;
        const email = currentUser?.attributes?.email;
        const phone = currentUser?.attributes?.profile?.publicData?.phoneNumber;
        if (currentUser && currentUser !== null && currentUser !== undefined) {
          setUser(currentUser);
        }
        // if (
        //   currentUserId &&
        //   currentUserId !== null &&
        //   currentUserId !== undefined
        // ) {
        //   setLoginId(currentUserId);
        // }
        if (currentUser) {
          console.log('Asking permissions ');
          console.log('IDD + > ', currentUser?.id?.uuid);

          handlePermissionAndLogin(currentUser.id?.uuid);
        }

        if (email && email !== null && email !== undefined) {
          setEmail(email);
          OneSignal.User.addEmail(email);
        }
        if (phone && phone !== null && phone !== undefined) {
          setPhone(phone);
          OneSignal.User.addSms(phone);
        }

        break;
      }
      default:
        throw new Error('invalid case');
    }
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={{flex: 1}}>
        {!webViewLoaded && !initScript ? (
          <View
            style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size="large" />
          </View>
        ) : initScript ? (
          <WebView
            ref={webViewRef}
            javaScriptEnabled={true}
            injectedJavaScriptBeforeContentLoaded={initScript}
            onMessage={handleOnMessage}
            source={{uri: 'https://joova.app'}}
            onNavigationStateChange={handleOnNavigationStateChange}
            domStorageEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
            onLoad={() => {
              console.log('WebView has finished loading');
            }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default SplashScreen;
