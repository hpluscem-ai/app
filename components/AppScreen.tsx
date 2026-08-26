import { useRef, type ReactNode, type RefObject } from 'react';
import { BlurTargetView, BlurView } from 'expo-blur';
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
type MainDockMode = 'fixed' | 'hidden';

type AppScreenBaseProps = {
  children: ReactNode;
  showFooter?: boolean;
};

type AppScreenProps =
  | (AppScreenBaseProps & {
      contentStyle?: StyleProp<ViewStyle>;
      title: string;
      variant: 'auth';
    })
  | (AppScreenBaseProps & {
      activeTab: MainTab;
      dockMode?: MainDockMode;
      dockOverContent?: boolean;
      scrollEnabled?: boolean;
      variant: 'main';
    })
  | (AppScreenBaseProps & {
      variant: 'plain';
    });

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
        accessibilityLabel="하얀100 로고"
        resizeMode="contain"
        source={imageSources.hayan100Logo}
        style={styles.authLogo}
      />
      <Text style={styles.authTitle}>하얀100 {title}</Text>
    </View>
  );
}

function LogoHeader() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="하얀100 로고, 마일리지로 이동"
        accessibilityRole="button"
        onPress={() => {
          router.replace('/mileage');
        }}
        style={({ pressed }) => [
          styles.headerLogoButton,
          pressed && styles.pressed,
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          accessible={false}
          resizeMode="contain"
          source={imageSources.hayan100Logo}
          style={styles.headerLogo}
        />
      </Pressable>
    </View>
  );
}

function DockBar({
  activeTab,
  blurTarget,
}: {
  activeTab: MainTab;
  blurTarget: RefObject<View | null>;
}) {
  const router = useRouter();

  return (
    <View pointerEvents="box-none" style={styles.dockSection}>
      <View style={styles.dockShadow}>
        <BlurView
          accessibilityLabel="하단 메뉴"
          accessibilityRole="tablist"
          blurMethod="dimezisBlurViewSdk31Plus"
          blurReductionFactor={1}
          blurTarget={blurTarget}
          intensity={10}
          style={styles.dock}
          tint="extraLight"
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
                <Text
                  style={[styles.dockLabel, active && styles.dockLabelActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

function ScreenScrollView({
  children,
  insetForDock,
  scrollEnabled,
}: {
  children: ReactNode;
  insetForDock: boolean;
  scrollEnabled: boolean;
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        insetForDock && styles.scrollContentWithFixedDock,
      ]}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

/** 화면 종류에 맞춰 공통 스크롤 영역, 상단 영역, 하단 메뉴와 푸터를 구성합니다. */
export function AppScreen(props: AppScreenProps) {
  const blurTargetRef = useRef<View>(null);
  const isMain = props.variant === 'main';
  const dockMode = isMain ? (props.dockMode ?? 'fixed') : 'hidden';
  const hasFixedDock = isMain && dockMode === 'fixed';
  const dockOverContent = isMain ? (props.dockOverContent ?? false) : false;
  const insetForDock = hasFixedDock && !dockOverContent;
  const scrollEnabled = isMain ? (props.scrollEnabled ?? true) : true;
  const showFooter = props.showFooter ?? true;
  const scrollContents = (
    <>
      {props.variant === 'auth' ? (
        <View style={[styles.authContent, props.contentStyle]}>
          <AuthBrand title={props.title} />
          {props.children}
        </View>
      ) : props.variant === 'main' ? (
        <View style={styles.mainContent}>{props.children}</View>
      ) : (
        props.children
      )}
      {showFooter ? <AppFooter /> : null}
    </>
  );

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
        {isMain ? (
          <View style={styles.mainViewport}>
            <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
              <ScreenScrollView
                insetForDock={insetForDock}
                scrollEnabled={scrollEnabled}
              >
                {scrollContents}
              </ScreenScrollView>
            </BlurTargetView>
            {hasFixedDock ? (
              <View pointerEvents="box-none" style={styles.fixedDock}>
                <DockBar
                  activeTab={props.activeTab}
                  blurTarget={blurTargetRef}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <ScreenScrollView insetForDock={false} scrollEnabled={scrollEnabled}>
            {scrollContents}
          </ScreenScrollView>
        )}
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
  scrollContentWithFixedDock: {
    paddingBottom: 80,
  },
  mainViewport: {
    flex: 1,
    position: 'relative',
  },
  blurTarget: {
    flex: 1,
  },
  mainContent: {
    flexGrow: 1,
    width: '100%',
  },
  fixedDock: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
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
  authLogo: {
    width: 216,
    height: 32,
  },
  authTitle: {
    ...typography.authBody,
    color: colors.brand,
  },
  header: {
    width: '100%',
    height: 52,
    flexShrink: 0,
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  headerLogoButton: {
    width: 135,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 135,
    height: 20,
  },
  dockSection: {
    width: '100%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dockShadow: {
    width: 284,
    height: 64,
    borderRadius: 32,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  dock: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 32,
    backgroundColor: 'rgba(252, 252, 253, 0.5)',
    overflow: 'hidden',
    paddingHorizontal: 6,
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
    backgroundColor: 'rgba(0, 0, 71, 0.04)',
  },
  dockLabel: {
    ...typography.suitMedium12,
    color: colors.gray400,
    textAlign: 'center',
  },
  dockLabelActive: {
    color: colors.brand500,
  },
  pressed: {
    opacity: 0.9,
  },
});
