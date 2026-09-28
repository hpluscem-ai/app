import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { imageSources } from '../../constants/assets';
import { colors, typography } from '../../constants/theme';
import { LegalDocumentLink } from './LegalDocumentLink';

export function AppFooter() {
  const divider = (
    <Svg aria-hidden height={1} width="100%">
      <Line
        x1={0}
        y1={0.5}
        x2="100%"
        y2={0.5}
        stroke={colors.gray200}
        strokeWidth={1}
        strokeDasharray="2 2"
      />
    </Svg>
  );

  return (
    <View style={styles.footer}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="하얀100 로고"
        resizeMode="contain"
        source={imageSources.hayan100FooterLogo}
        style={styles.footerLogo}
      />

      {divider}

      <View style={styles.footerLegal}>
        <LegalDocumentLink document="terms" style={styles.footerText}>
          이용약관
        </LegalDocumentLink>
        <LegalDocumentLink document="privacy" style={styles.footerTextStrong}>
          개인정보처리방침
        </LegalDocumentLink>
        <View style={styles.footerGroup}>
          <Text style={styles.footerText}>고객센터</Text>
          <Text style={styles.footerText}>전화번호 : 02-2037-7724</Text>
          <Text style={styles.footerText}>운영시간 : 평일 09:00 ~ 18:00</Text>
          <Text style={styles.footerText}>이메일 : kmpark@hpluseco.co.kr</Text>
        </View>
      </View>

      {divider}

      <View style={styles.footerGroup}>
        <Text style={styles.footerText}>에이치플러스에코(주)</Text>
        <Text style={styles.footerText}>사업자등록번호 : 220-86-00404</Text>
        <Text style={styles.footerText}>대표 : 허자홍</Text>
        <Text style={styles.footerText}>
          개인정보처리담당자 : 에이치플러스에코(주) 화학영업팀
        </Text>
        <Text style={styles.footerText}>
          주소 : 서울특별시 송파구 석촌호수로 222(석촌동, 제이타워 6층)
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
    width: 162,
    height: 24,
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
    ...typography.footer,
    color: colors.gray800,
  },
  footerTextStrong: {
    ...typography.footerStrong,
    color: colors.gray800,
  },
});
