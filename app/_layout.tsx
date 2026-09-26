import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { PaperProvider } from 'react-native-paper';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBar } from '../components/AppBar';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import { NoticeProvider } from '../components/NoticeProvider';
import { typography, webAppFrame } from '../constants/theme';
import { getWebMetadata } from '../constants/webMetadata';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const sentryEnabled = !__DEV__ && Boolean(sentryDsn);

Sentry.init({
  attachScreenshot: false,
  attachViewHierarchy: false,
  dsn: sentryDsn,
  enableAutoPerformanceTracing: false,
  enabled: sentryEnabled,
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || undefined,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

if (sentryEnabled) {
  Sentry.setTag('expo-update-id', Updates.updateId ?? 'embedded');
  Sentry.setTag('expo-is-embedded-update', Updates.isEmbeddedLaunch);
}

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { state } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'SUIT-Medium': require('../assets/fonts/SUIT-Medium.ttf'),
    'SUIT-SemiBold': require('../assets/fonts/SUIT-SemiBold.ttf'),
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && state.status !== 'restoring') {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded, state.status]);

  if ((!fontsLoaded && !fontError) || state.status === 'restoring') {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            header: ({ back, navigation, options }) => (
              <AppBar
                onBack={back ? () => navigation.goBack() : undefined}
                title={options.title ?? ''}
                titleStyle={options.headerTitleStyle}
              />
            ),
            headerTitleStyle: typography.screenTitle,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="term" options={{ title: '이용약관' }} />
          <Stack.Screen
            name="privacy"
            options={{ title: '개인정보처리방침' }}
          />
          <Stack.Screen
            name="collection"
            options={{ title: '개인정보 수집 및 이용 동의' }}
          />
          <Stack.Screen
            name="marketing"
            options={{ title: '마케팅 정보 수신 동의' }}
          />
          <Stack.Screen
            name="reset-password"
            options={{ title: '비밀번호 재설정' }}
          />
          <Stack.Protected guard={state.status === 'signedOut'}>
            <Stack.Screen name="login" options={{ title: '로그인' }} />
            <Stack.Screen name="sign-up" options={{ title: '회원가입' }} />
            <Stack.Screen
              name="find-email"
              options={{ title: '이메일 찾기' }}
            />
            <Stack.Screen
              name="find-password"
              options={{ title: '비밀번호 찾기' }}
            />
          </Stack.Protected>
          <Stack.Protected guard={state.status === 'signedIn'}>
            <Stack.Screen
              name="mypage"
              options={{ animation: 'none', headerShown: false }}
            />
            <Stack.Screen
              name="map"
              options={{ animation: 'none', headerShown: false }}
            />
            <Stack.Screen
              name="mileage/index"
              options={{ animation: 'none', headerShown: false }}
            />
            <Stack.Screen
              name="mileage/apply"
              options={{ animation: 'none', headerShown: false }}
            />
            <Stack.Screen name="mileage/[status]" />
          </Stack.Protected>
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function RootLayout() {
  const metadata = getWebMetadata(usePathname());
  return (
    <View style={[styles.root, Platform.OS === 'web' && webAppFrame]}>
      {Platform.OS === 'web' && (
        <Head>
          <title>{metadata.title}</title>
          <meta property="og:title" content={metadata.title} />
          <meta property="og:url" content={metadata.url} />
        </Head>
      )}
      <AuthProvider>
        <NoticeProvider>
          <RootNavigator />
        </NoticeProvider>
      </AuthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default Sentry.wrap(RootLayout);
