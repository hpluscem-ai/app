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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { iconPaths, imageSources } from '../constants/assets';
import { colors, typography } from '../constants/theme';
import { AppFooter } from './auth/AppFooter';

type MainTab = 'mileage' | 'apply' | 'map' | 'profile';
type DockIconName = 'mileage' | 'camera' | 'map' | 'profile';

type MainScreenProps = {
  activeTab: MainTab;
  children: ReactNode;
};

type DockItem = {
  href?: '/mileage/apply' | '/mypage';
  icon: DockIconName;
  key: MainTab;
  label: string;
};

const dockItems = [
  {
    href: undefined,
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
  { href: undefined, icon: 'map', key: 'map', label: '지도' },
  { href: '/mypage', icon: 'profile', key: 'profile', label: '내정보' },
] as const satisfies ReadonlyArray<DockItem>;

const dockIconConfig = {
  mileage: {
    filled: false,
    height: 21.2,
    path: iconPaths.mileage,
    viewBox: '0 0 21.2016 21.2',
    width: 21.2016,
  },
  camera: {
    filled: true,
    height: 19.52,
    path: iconPaths.camera,
    viewBox: '0 0 21.2 19.52',
    width: 21.2,
  },
  map: {
    filled: false,
    height: 18,
    path: iconPaths.map,
    viewBox: '0 0 20 18',
    width: 20,
  },
  profile: {
    filled: false,
    height: 17.0002,
    path: iconPaths.profile,
    viewBox: '0 0 19.5249 17.0002',
    width: 19.5249,
  },
} as const;

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

function DockIcon({ active, name }: { active: boolean; name: DockIconName }) {
  const config = dockIconConfig[name];
  const color = active ? colors.gray800 : colors.gray400;

  return (
    <View style={styles.dockIconFrame}>
      <Svg
        fill="none"
        height={config.height}
        viewBox={config.viewBox}
        width={config.width}
      >
        <Path
          d={config.path}
          fill={config.filled ? color : 'none'}
          stroke={config.filled ? 'none' : color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={config.filled ? 0 : 2}
        />
      </Svg>
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

/** 로그인 이후 화면의 로고 바, 스크롤, 하단 메뉴와 푸터를 구성합니다. */
export function MainScreen({ activeTab, children }: MainScreenProps) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}
      >
        <LogoHeader />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
          <DockBar activeTab={activeTab} />
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
  scrollContent: {
    flexGrow: 1,
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
  dockIconFrame: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
