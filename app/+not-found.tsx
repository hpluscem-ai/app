import { Stack, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { imageSources } from '../constants/assets';
import { colors, typography } from '../constants/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppScreen activeTab="profile" showFooter={false} variant="main">
        <View style={styles.content}>
          <View style={styles.notFoundContent}>
            <View style={styles.copyGroup}>
              <View style={styles.headingGroup}>
                <Image
                  accessible={false}
                  accessibilityIgnoresInvertColors
                  resizeMode="contain"
                  source={imageSources.notFound404}
                  style={styles.illustration}
                />
                <Text style={styles.heading}>
                  {'죄송합니다.\n페이지를 찾을 수 없습니다.'}
                </Text>
              </View>
              <Text style={styles.description}>
                {
                  '존재하지 않는 주소를 입력하셨거나,\n요청하신 페이지의 주소가 변경, 삭제되어 찾을 수 없습니다.\n궁금하신 점이 있으시면 언제든 sales@nocoders.kr로 문의해 주시기 바랍니다.\n\n감사합니다.'
                }
              </Text>
            </View>
            <View style={styles.buttons}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/')}
                style={[styles.button, styles.primaryButton]}
              >
                <Text style={[styles.buttonLabel, styles.primaryButtonLabel]}>
                  메인으로
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace('/')
                }
                style={[styles.button, styles.secondaryButton]}
              >
                <Text style={[styles.buttonLabel, styles.secondaryButtonLabel]}>
                  이전으로
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  notFoundContent: {
    width: '100%',
    maxWidth: 350,
    gap: 32,
  },
  copyGroup: {
    gap: 8,
  },
  headingGroup: {
    alignItems: 'flex-start',
    gap: 16,
  },
  illustration: {
    width: 164,
    height: 164,
  },
  heading: {
    ...typography.suitSemiBold20,
    color: colors.gray800,
  },
  description: {
    ...typography.suitMedium14,
    color: colors.gray800,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 'auto',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: colors.brand500,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.brand500,
    backgroundColor: colors.white,
  },
  buttonLabel: {
    ...typography.suitSemiBold14,
  },
  primaryButtonLabel: {
    color: colors.white,
  },
  secondaryButtonLabel: {
    color: colors.brand500,
  },
});
