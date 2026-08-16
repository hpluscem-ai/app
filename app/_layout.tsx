import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBar } from '../components/AppBar';

export default function RootLayout() {
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
              />
            ),
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
