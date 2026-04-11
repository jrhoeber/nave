import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Typography } from '../../theme';
import type { AuthNavigationProp } from '../../types/navigation';

export function LoginScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.cross}>✝</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your Nave account</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner} testID="login-error-banner">
            <Icon name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText} testID="login-error-text">{error}</Text>
          </View>
        ) : null}

        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"
          autoCapitalize="none" autoComplete="email" leftIcon="mail-outline" placeholder="you@example.com" testID="login-email-input" />
        <Input label="Password" value={password} onChangeText={setPassword} isPassword
          leftIcon="lock-closed-outline" placeholder="Your password" testID="login-password-input" />

        <TouchableOpacity style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button label="Sign In" onPress={handleLogin} loading={loading} fullWidth size="lg" style={styles.submitBtn} testID="login-submit-btn" />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.footerLink}>Sign Up</Text>
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
  header: { marginBottom: Spacing[8] },
  cross: { fontSize: 32, color: Colors.accent, marginBottom: Spacing[3] },
  title: { fontSize: Typography['3xl'], fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[1] },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error + '14', borderRadius: 8, padding: Spacing[3], marginBottom: Spacing[4], gap: Spacing[2] },
  errorText: { color: Colors.error, fontSize: Typography.sm, flex: 1 },
  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing[2], marginBottom: Spacing[5] },
  forgotText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium },
  submitBtn: { marginTop: Spacing[2] },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing[8] },
  footerText: { fontSize: Typography.base, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.base, color: Colors.primary, fontWeight: Typography.semibold },
});
