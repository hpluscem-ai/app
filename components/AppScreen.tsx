import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { imageSources } from '../constants/assets';
import { colors, typography } from '../constants/theme';
import { AppFooter } from './auth/AppFooter';
import { DockIcon, type DockIconName } from './icons/DockIcon';

type MainTab = 'mileage' | 'apply' | 'map' | 'profile';
type MainDockMode = 'flow' | 'hidden' | 'overlay';

type AppScreenProps =
  | {
      children: ReactNode;
      contentStyle?: StyleProp<ViewStyle>;
      title: string;
      variant: 'auth';
    }
  | {
      activeTab: MainTab;
      children: ReactNode;
      dockMode?: MainDockMode;
      scrollEnabled?: boolean;
      variant: 'main';
    }
  | {
      children: ReactNode;
      variant: 'plain';
    };

type DockItem = {
  href?: '/map' | '/mileage' | '/mileage/apply' | '/mypage';
  icon: DockIconName;
  key: MainTab;
  label: string;
};

const dockItems = [
  {
    href: '/mileage',
    icon: 'mileage',
    key: 'mileage',
    label: '마일리지',
  },
  {
    href: '/mileage/apply',
    icon: 'camera',
    key: 'apply',
    label: '적립',
  },
  { href: '/map', icon: 'map', key: 'map', label: '지도' },
  { href: '/mypage', icon: 'profile', key: 'profile', label: '내정보' },
] as const satisfies ReadonlyArray<DockItem>;

function AuthBrand({ title }: { title: string }) {
  return (
    <View style={styles.brandBlock}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="에이치플러스에코 로고"
        resizeMode="contain"
        source={imageSources.hplusEcoLogo}
        style={styles.mainLogo}
      />
      <Text style={styles.authTitle}>{title}</Text>
    </View>
  );
}

function LogoHeader() {
  return (
    <View style={styles.header}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="에이치플러스에코 로고"
        resizeMode="contain"
        source={imageSources.hplusEcoLogo}
        style={styles.headerLogo}
      />
    </View>
  );
}

function DockBar({ activeTab }: { activeTab: MainTab }) {
  const router = useRouter();

  return (
    <View style={styles.dockSection}>
      <View
        accessibilityLabel="하단 메뉴"
        accessibilityRole="tablist"
        style={styles.dock}
      >
        {dockItems.map((item) => {
          const active = item.key === activeTab;
          const enabled = Boolean(item.href);

          return (
            <Pressable
              accessibilityLabel={`${item.label}${active ? ', 현재 화면' : item.href ? '' : ', 준비 중'}`}
              accessibilityRole="tab"
              accessibilityState={{
                disabled: !item.href,
                selected: active,
              }}
              disabled={!enabled}
              key={item.key}
              onPress={() => {
                if (item.href) {
                  router.replace(item.href);
                }
              }}
              style={({ pressed }) => [
                styles.dockItem,
                active && styles.dockItemActive,
                pressed && enabled && styles.pressed,
              ]}
            >
              <DockIcon active={active} name={item.icon} />
              <Text style={[styles.dockLabel, active && styles.dockLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 화면 종류에 맞춰 공통 스크롤 영역, 상단 영역, 하단 메뉴와 푸터를 구성합니다. */
export function AppScreen(props: AppScreenProps) {
  const isMain = props.variant === 'main';
  const dockMode = isMain ? (props.dockMode ?? 'flow') : 'hidden';
  const scrollEnabled = isMain ? (props.scrollEnabled ?? true) : true;

  return (
    <SafeAreaView
      edges={
        isMain
          ? ['top', 'left', 'right', 'bottom']
          : ['left', 'right', 'bottom']
      }
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}
      >
        {isMain ? <LogoHeader /> : null}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
        >
          {props.variant === 'auth' ? (
            <View style={[styles.authContent, props.contentStyle]}>
              <AuthBrand title={props.title} />
              {props.children}
            </View>
          ) : props.variant === 'main' ? (
            <View style={styles.mainContent}>
              {props.children}
              {dockMode === 'overlay' ? (
                <View pointerEvents="box-none" style={styles.dockOverlay}>
                  <DockBar activeTab={props.activeTab} />
                </View>
              ) : null}
            </View>
          ) : (
            props.children
          )}
          {props.variant === 'main' && dockMode === 'flow' ? (
            <DockBar activeTab={props.activeTab} />
          ) : null}
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
    position: 'relative',
  },
  dockOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
  },
  authContent: {
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
  authTitle: {
    ...typography.body,
    color: colors.brand,
  },
  header: {
    width: '100%',
    height: 52,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  headerLogo: {
    width: 91,
    height: 24,
  },
  dockSection: {
    width: '100%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dock: {
    width: 284,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 32,
    backgroundColor: 'rgba(252, 252, 253, 0.5)',
    paddingHorizontal: 5,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  dockItem: {
    width: 68,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 32,
  },
  dockItemActive: {
    backgroundColor: 'rgba(38, 44, 58, 0.04)',
  },
  dockLabel: {
    ...typography.caption,
    color: colors.gray400,
  },
  dockLabelActive: {
    color: colors.gray800,
  },
  pressed: {
    opacity: 0.9,
  },
});
