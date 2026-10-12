import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { Portal } from 'react-native-paper';

import { colors } from '../constants/theme';

export function RequestLoading({ visible }: { visible: boolean }) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const active = visible && focused && Platform.OS !== 'web';

  useEffect(() => {
    if (!active || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [active]);

  if (!active) return null;
  return (
    <Portal>
      <View accessibilityViewIsModal onStartShouldSetResponder={() => true} style={styles.overlay}>
        <ActivityIndicator accessibilityLabel="처리 중" accessibilityRole="progressbar" accessibilityState={{ busy: true }} />
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayScrim,
  },
});
