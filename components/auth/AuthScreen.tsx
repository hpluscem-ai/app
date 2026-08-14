import type { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { imageSources } from '../../constants/assets';
import { colors, typography } from '../../constants/theme';
import { AppFooter } from './AppFooter';

type AuthScreenProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  title: string;
};

export function AuthScreen({
  children,
  contentStyle,
  title,
}: AuthScreenProps) {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.mainContent, contentStyle]}>
            <View style={styles.brandBlock}>
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel="에이치플러스에코 로고"
                resizeMode="contain"
                source={imageSources.hplusEcoLogo}
                style={styles.mainLogo}
              />
              <Text style={styles.title}>{title}</Text>
            </View>
            {children}
          </View>
          <AppFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    width: '100%',
    alignItems: 'center',
    gap: 40,
    paddingHorizontal: 20,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 8,
  },
  mainLogo: {
    width: 152,
    height: 40,
  },
  title: {
    ...typography.body,
    color: colors.brand,
  },
});
