import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Typography } from '../../theme';
import type { AuthNavigationProp } from '../../types/navigation';

export function WelcomeScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.container, { paddingTop: insets.top + Spacing[6], paddingBottom: insets.bottom + Spacing[6] }]}>
        <View style={styles.top}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Nave</Text>
          <Text style={styles.tagline}>
            Where Catholics gather, pray,{'\n'}and grow in faith together.
          </Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: '🙏', text: 'Join prayer groups & share intentions' },
            { icon: '✝️', text: 'Connect with your parish & diocese' },
            { icon: '👐', text: 'Make Catholic friends near & far' },
            { icon: '📖', text: 'Share scripture, reflections & events' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cta} testID="welcome-cta">
          <Button
            label="Create Account"
            onPress={() => navigation.navigate('SignUp')}
            variant="secondary"
            size="lg"
            fullWidth
            style={styles.primaryBtn}
            testID="welcome-create-account-btn"
          />
          <Button
            label="Sign In"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
            size="lg"
            fullWidth
            style={styles.secondaryBtn}
            textStyle={styles.secondaryBtnText}
            testID="welcome-sign-in-btn"
          />
          <Text style={styles.disclaimer}>
            By joining, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing[6], justifyContent: 'space-between' },
  top: { alignItems: 'center', gap: Spacing[3] },
  logo: { width: 100, height: 100, marginBottom: Spacing[2] },
  appName: { fontSize: 64, fontWeight: Typography.extrabold, color: Colors.textInverse, letterSpacing: -2, lineHeight: 68 },
  tagline: { fontSize: Typography.md, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: Typography.md * 1.5 },
  features: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: Spacing[5], gap: Spacing[3] },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  featureIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  featureText: { fontSize: Typography.base, color: 'rgba(255,255,255,0.9)', flex: 1 },
  cta: { gap: Spacing[3] },
  primaryBtn: { backgroundColor: Colors.accent },
  secondaryBtn: { borderColor: 'rgba(255,255,255,0.6)' },
  secondaryBtnText: { color: Colors.textInverse },
  disclaimer: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: Spacing[2] },
});
