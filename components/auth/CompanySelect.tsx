import { MenuView } from '@expo/ui/community/menu';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../constants/theme';

export type CompanySelectProps = {
  companies: readonly { id: string; businessName: string }[];
  disabled: boolean;
  error?: string;
  loading: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  onRetry: () => void;
  value: string;
};

export function CompanySelect({
  companies,
  disabled,
  error,
  loading,
  onBlur,
  onChange,
  onRetry,
  value,
}: CompanySelectProps) {
  const [width, setWidth] = useState(0);
  const selected = companies.find((company) => company.id === value);
  const label = selected?.businessName ?? '소속을 선택해주세요.';
  const text = (
    <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
  );

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.container}
    >
      {disabled || !companies.length || width === 0 ? (
        <Pressable
          accessibilityHint={error}
          accessibilityLabel="소속 선택"
          accessibilityRole="button"
          accessibilityState={{ busy: loading, disabled }}
          accessibilityValue={{ text: label }}
          disabled={disabled}
          onBlur={onBlur}
          onPress={onRetry}
          style={styles.select}
        >
          {text}
        </Pressable>
      ) : (
        <MenuView
          actions={companies.map((company) => ({
            id: company.id,
            title: company.businessName,
            state: company.id === value ? 'on' : 'off',
          }))}
          onCloseMenu={onBlur}
          onPressAction={({ nativeEvent }) => {
            if (companies.some((company) => company.id === nativeEvent.event)) {
              onChange(nativeEvent.event);
              onBlur();
            }
          }}
          style={styles.container}
        >
          <View
            accessible
            accessibilityHint={error}
            accessibilityLabel="소속 선택"
            accessibilityRole="button"
            accessibilityValue={{ text: label }}
            // MenuView measures its RN trigger intrinsically inside the native host.
            style={[styles.select, { width }]}
          >
            {text}
          </View>
        </MenuView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  select: {
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.gray100,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  text: { ...typography.authBody, color: colors.gray400 },
  selectedText: { color: colors.gray800 },
});
