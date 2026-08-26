import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBar } from '../components/AppBar';
import { typography } from '../constants/theme';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const sentryEnabled = !__DEV__ && Boolean(sentryDsn);

Sentry.init({
  attachScreenshot: false,
  attachViewHierarchy: false,
  dsn: sentryDsn,
  enableAutoPerformanceTracing: false,
  enabled: sentryEnabled,
  environment:
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || undefined,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

if (sentryEnabled) {
  Sentry.setTag('expo-update-id', Updates.updateId ?? 'embedded');
  Sentry.setTag('expo-is-embedded-update', Updates.isEmbeddedLaunch);
}

void SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'SUIT-Medium': require('../assets/fonts/SUIT-Medium.ttf'),
    'SUIT-SemiBold': require('../assets/fonts/SUIT-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
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
          <Stack.Screen
            name="reset-password"
            options={{ title: '비밀번호 재설정' }}
          />
          <Stack.Screen name="mypage" options={{ headerShown: false }} />
          <Stack.Screen name="map" options={{ headerShown: false }} />
          <Stack.Screen
            name="mileage/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="mileage/apply"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="mileage/[status]" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
