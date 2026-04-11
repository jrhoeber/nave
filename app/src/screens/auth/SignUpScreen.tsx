import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Typography } from '../../theme';
import type { AuthNavigationProp } from '../../types/navigation';

export function SignUpScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signup = useAuthStore((s) => s.signup);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSignUp = async () => {
    if (!form.displayName.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all required fields.'); return;
    }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await signup(form);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <ScrollView testID="signup-scroll" contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.cross}>✝</Text>
          <Text style={styles.title}>Join Nave</Text>
          <Text style={styles.subtitle}>Create your account and join the community</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner} testID="signup-error-banner">
            <Icon name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText} testID="signup-error-text">{error}</Text>
          </View>
        ) : null}

        <Input label="Full Name *" value={form.displayName} onChangeText={set('displayName')} autoCapitalize="words" leftIcon="person-outline" placeholder="Your name" testID="signup-displayname-input" />
        <Input label="Username *" value={form.username} onChangeText={(v) => set('username')(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} autoCapitalize="none" leftIcon="at-outline" placeholder="your_username" hint="Letters, numbers, and underscores only" testID="signup-username-input" />
        <Input label="Email *" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" leftIcon="mail-outline" placeholder="you@example.com" testID="signup-email-input" />
        <Input label="Password *" value={form.password} onChangeText={set('password')} isPassword leftIcon="lock-closed-outline" placeholder="Min. 8 characters" hint="At least 8 characters" testID="signup-password-input" />

        <Button label="Create Account" onPress={handleSignUp} loading={loading} fullWidth size="lg" style={styles.submitBtn} testID="signup-submit-btn" />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing[6], paddingTop: Spacing[12], paddingBottom: Spacing[8] },
  back: { marginBottom: Spacing[6] },
  header: { marginBottom: Spacing[6] },
  cross: { fontSize: 32, color: Colors.accent, marginBottom: Spacing[3] },
  title: { fontSize: Typography['3xl'], fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[1] },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error + '14', borderRadius: 8, padding: Spacing[3], marginBottom: Spacing[4], gap: Spacing[2] },
  errorText: { color: Colors.error, fontSize: Typography.sm, flex: 1 },
  submitBtn: { marginTop: Spacing[2] },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing[6] },
  footerText: { fontSize: Typography.base, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.base, color: Colors.primary, fontWeight: Typography.semibold },
});
