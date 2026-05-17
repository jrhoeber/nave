import React from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormHeader } from '../../components/ui/FormHeader';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { Text } from '../../components/ui/Text';

interface Dependency {
  name: string;
  license: string;
  publisher?: string;
}

interface DependencyGroup {
  title: string;
  description: string;
  items: Dependency[];
}

const GROUPS: DependencyGroup[] = [
  {
    title: 'MOBILE APP',
    description: 'Production dependencies bundled with the iOS and Android apps.',
    items: [
      { name: 'react-native', license: 'MIT', publisher: 'Meta' },
      { name: 'react', license: 'MIT', publisher: 'Meta' },
      { name: 'expo', license: 'MIT', publisher: '650 Industries' },
      { name: 'expo-image', license: 'MIT', publisher: '650 Industries' },
      { name: 'expo-crypto', license: 'MIT', publisher: '650 Industries' },
      { name: '@react-native-firebase/app', license: 'Apache-2.0', publisher: 'Invertase' },
      { name: '@react-native-firebase/crashlytics', license: 'Apache-2.0', publisher: 'Invertase' },
      { name: '@react-native-firebase/messaging', license: 'Apache-2.0', publisher: 'Invertase' },
      { name: '@react-native-google-signin/google-signin', license: 'MIT' },
      { name: '@invertase/react-native-apple-authentication', license: 'Apache-2.0', publisher: 'Invertase' },
      { name: '@notifee/react-native', license: 'Apache-2.0', publisher: 'Invertase' },
      { name: '@react-native-async-storage/async-storage', license: 'MIT' },
      { name: '@react-native-clipboard/clipboard', license: 'MIT' },
      { name: '@react-native-community/blur', license: 'MIT' },
      { name: '@react-native-community/image-editor', license: 'MIT' },
      { name: '@react-navigation/native', license: 'MIT' },
      { name: '@react-navigation/native-stack', license: 'MIT' },
      { name: '@react-navigation/bottom-tabs', license: 'MIT' },
      { name: '@shopify/flash-list', license: 'MIT' },
      { name: 'react-native-config', license: 'MIT' },
      { name: 'react-native-gesture-handler', license: 'MIT' },
      { name: 'react-native-reanimated', license: 'MIT' },
      { name: 'react-native-safe-area-context', license: 'MIT' },
      { name: 'react-native-screens', license: 'MIT' },
      { name: 'react-native-svg', license: 'MIT' },
      { name: 'react-native-vector-icons', license: 'MIT' },
      { name: 'react-native-linear-gradient', license: 'MIT' },
      { name: 'react-native-image-picker', license: 'MIT' },
      { name: 'zustand', license: 'MIT', publisher: 'Poimandres' },
      { name: 'date-fns', license: 'MIT' },
    ],
  },
  {
    title: 'WEB APP',
    description: 'Production dependencies for the landing page and admin console.',
    items: [
      { name: 'react', license: 'MIT', publisher: 'Meta' },
      { name: 'react-dom', license: 'MIT', publisher: 'Meta' },
      { name: 'react-router-dom', license: 'MIT' },
      { name: 'firebase', license: 'Apache-2.0', publisher: 'Google' },
      { name: 'Playfair Display', license: 'OFL', publisher: 'Google Fonts' },
      { name: 'Inter', license: 'OFL', publisher: 'Google Fonts' },
    ],
  },
  {
    title: 'BACKEND',
    description: 'Python dependencies for the Nave API service.',
    items: [
      { name: 'fastapi', license: 'MIT' },
      { name: 'uvicorn', license: 'BSD-3' },
      { name: 'asyncpg', license: 'Apache-2.0' },
      { name: 'python-dotenv', license: 'BSD-3' },
      { name: 'python-jose[cryptography]', license: 'MIT' },
      { name: 'pydantic-settings', license: 'MIT' },
      { name: 'python-multipart', license: 'Apache-2.0' },
      { name: 'email-validator', license: 'CC0-1.0' },
      { name: 'alembic', license: 'MIT' },
      { name: 'sqlalchemy', license: 'MIT' },
      { name: 'psycopg2-binary', license: 'LGPL-3 (with exceptions)' },
      { name: 'google-cloud-storage', license: 'Apache-2.0' },
      { name: 'google-cloud-vision', license: 'Apache-2.0' },
      { name: 'firebase-admin', license: 'Apache-2.0' },
      { name: 'Pillow', license: 'HPND' },
      { name: 'anthropic', license: 'MIT' },
      { name: 'openai', license: 'Apache-2.0' },
    ],
  },
];

export function OpenSourceNoticesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <FormHeader title="Open Source Notices" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Nave is built on the work of the open-source community. The following components
          are distributed under their respective licenses, and we are grateful for their
          authors. License texts are available from each project's repository.
        </Text>

        {GROUPS.map((group) => (
          <View key={group.title}>
            <SectionLabel>{group.title}</SectionLabel>
            <Text style={styles.groupDescription}>{group.description}</Text>
            <View style={styles.card}>
              {group.items.map((item, idx) => (
                <View key={item.name}>
                  {idx > 0 && <View style={styles.sep} />}
                  <View style={styles.row}>
                    <View style={styles.rowContent}>
                      <Text style={styles.depName} numberOfLines={1}>{item.name}</Text>
                      {!!item.publisher && (
                        <Text style={styles.depPublisher}>{item.publisher}</Text>
                      )}
                    </View>
                    <Text style={styles.depLicense}>{item.license}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>
          For Apache-2.0 components, the full NOTICE files are bundled with the app
          binaries in accordance with the license terms.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Spacing[12],
  },
  intro: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.sm * Typography.relaxed,
    marginHorizontal: Spacing[5],
    marginTop: Spacing[3],
  },
  groupDescription: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginHorizontal: Spacing[5],
    marginTop: -Spacing[2],
    marginBottom: Spacing[3],
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing[5],
    overflow: 'hidden',
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: Spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  rowContent: {
    flex: 1,
  },
  depName: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  depPublisher: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  depLicense: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    lineHeight: Typography.xs * Typography.relaxed,
    marginHorizontal: Spacing[5],
    marginTop: Spacing[5],
    fontStyle: 'italic',
  },
});
