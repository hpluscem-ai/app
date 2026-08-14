import { Image, StyleSheet, Text, View } from 'react-native';

import { imageSources } from '../../constants/assets';
import { colors, typography } from '../../constants/theme';

export function AppFooter() {
  return (
    <View style={styles.footer}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="에이치플러스에코 로고"
        resizeMode="contain"
        source={imageSources.hplusEcoLogo}
        style={styles.footerLogo}
      />

      <View style={styles.divider} />

      <View style={styles.footerLegal}>
        <Text style={styles.footerText}>이용약관</Text>
        <Text style={styles.footerTextStrong}>개인정보처리방침</Text>
        <View style={styles.footerGroup}>
          <Text style={styles.footerText}>고객센터</Text>
          <Text style={styles.footerText}>전화번호 : 010-0000-0000</Text>
          <Text style={styles.footerText}>
            주중 09~18시 (점심시간 12~13시 30분 / 주말 및 공휴일 제외)
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footerGroup}>
        <Text style={styles.footerText}>에이치플러스에코</Text>
        <Text style={styles.footerText}>사업자등록번호 : 220-86-00404</Text>
        <Text style={styles.footerText}>대표 : 홍길동</Text>
        <Text style={styles.footerText}>개인정보처리담당자 : 홍길동</Text>
        <Text style={styles.footerText}>
          주소 : 서울시 송파구 석촌호수로 222 6~8층 (석촌동, 제이타워)
        </Text>
        <Text style={styles.footerText}>
          Copyright © 2021 H-Plus Eco. All Rights Reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.gray50,
    paddingHorizontal: 20,
    paddingVertical: 52,
  },
  footerLogo: {
    width: 91,
    height: 24,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.gray200,
  },
  footerLegal: {
    width: '100%',
    gap: 16,
  },
  footerGroup: {
    width: '100%',
    gap: 4,
  },
  footerText: {
    ...typography.captionMedium,
    color: colors.gray800,
  },
  footerTextStrong: {
    ...typography.captionBold,
    color: colors.gray800,
  },
});
