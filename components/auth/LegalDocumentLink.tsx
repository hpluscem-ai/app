import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, type StyleProp, type TextStyle } from 'react-native';

import type { LegalDocument } from '../../constants/legalDocuments';

export function LegalDocumentLink({
  children,
  document,
  style,
}: {
  children: ReactNode;
  document: LegalDocument;
  style?: StyleProp<TextStyle>;
}) {
  const path = document === 'terms' ? '/term' : `/${document}`;
  const linkStyle: StyleProp<TextStyle> = [
    style,
    { textDecorationLine: 'none' },
  ];

  if (Platform.OS === 'web') {
    return (
      <Link
        href={path as Href}
        rel="noopener noreferrer"
        style={linkStyle}
        target="_blank"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link href={path as Href} push style={linkStyle}>
      {children}
    </Link>
  );
}
