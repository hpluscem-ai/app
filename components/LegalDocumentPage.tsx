import Head from 'expo-router/head';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { legalDocuments, type LegalDocument } from '../constants/legalDocuments';
import { colors, typography } from '../constants/theme';
import { AppScreen } from './AppScreen';

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  const { title, blocks } = legalDocuments[document];

  return (
    <AppScreen variant="plain">
      <Head>
        {Platform.OS !== 'web' && <title>{title}</title>}
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {blocks.map(([kind, content], index) =>
          kind === 'list' ? (
            <View key={index} style={styles.list}>
              {content.map((item) => (
                <Text key={item} style={styles.body}>
                  {`• ${item}`}
                </Text>
              ))}
            </View>
          ) : (
            <Text
              accessibilityRole={kind === 'heading' ? 'header' : undefined}
              key={index}
              style={kind === 'heading' ? styles.heading : styles.body}
            >
              {content}
            </Text>
          ),
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', padding: 20, gap: 16 },
  list: { gap: 16 },
  title: { ...typography.suitSemiBold20, color: colors.gray800 },
  heading: { ...typography.suitSemiBold18, color: colors.gray800 },
  body: { ...typography.suitMedium16, color: colors.gray800 },
});
