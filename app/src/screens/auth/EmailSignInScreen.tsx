import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApp } from '@react-native-firebase/app';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Colors, Spacing, Typography } from '../../theme';
import { checkPwned, validateLengthAndContext } from '../../lib/passwordValidation';
import type { AuthNavigationProp } from '../../types/navigation';

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'An account with this email already exists.',
  INVALID_LOGIN_CREDENTIALS: 'Invalid email or password.',
  WEAK_PASSWORD: 'Password must be at least 8 characters.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again later.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  MISSING_PASSWORD: 'Please enter a password.',
  USER_DISABLED: 'This account has been disabled.',
};

export function EmailSignInScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AuthNavigationProp>();
  const signInWithFirebase = useAuthStore((s) => s.signInWithFirebase);

  const [isCreateMode, setIsCreateMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length === 0) {
      setError('Please enter a password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (isCreateMode) {
        const reason = validateLengthAndContext(password, { email: trimmed });
        if (reason) {
          setError(reason);
          setLoading(false);
          return;
        }
        const pwned = await checkPwned(password);
        if (pwned) {
          setError('This password has appeared in known data breaches. Please choose another.');
          setLoading(false);
          return;
        }
      }

      const apiKey = getApp().options.apiKey;
      const endpoint = isCreateMode ? 'accounts:signUp' : 'accounts:signInWithPassword';
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmed,
            password,
            returnSecureToken: true,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.idToken) {
        const code = data.error?.message || '';
        throw new Error(code);
      }
      await signInWithFirebase(data.idToken);
    } catch (err: any) {
      const code = err.message || '';
      const friendly = FIREBASE_ERROR_MESSAGES[code];
      setError(friendly || (isCreateMode ? 'Account creation failed. Please try again.' : 'Sign-in failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.goldEdge} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + Spacing[4], paddingBottom: insets.bottom + Spacing[4] },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>{isCreateMode ? 'Create Account' : 'Sign In'}</Text>
          <Text style={styles.subtitle}>
            {isCreateMode ? 'Enter your email and choose a password' : 'Sign in with your email and password'}
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
              textContentType="emailAddress"
              autoComplete="email"
            />
            <PasswordInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode={isCreateMode ? 'create' : 'signin'}
              hint={isCreateMode ? 'At least 8 characters' : undefined}
            />
          </View>

          <Button
            label={isCreateMode ? 'Create Account' : 'Sign In'}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginBottom: Spacing[4] }}
          />

          {!isCreateMode && (
            <TouchableOpacity
              style={styles.forgot}
              onPress={() => navigation.navigate('PasswordReset')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.toggleMode}
            onPress={() => {
              setIsCreateMode((v) => !v);
              setError('');
            }}
          >
            <Text style={styles.toggleText}>
              {isCreateMode ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={styles.toggleLink}>
                {isCreateMode ? 'Sign in' : 'Create one'}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  goldEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.accent,
  },
  container: { flexGrow: 1, paddingHorizontal: Spacing[6] },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing[6] },
  title: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: 36,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginBottom: Spacing[6],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 8,
    padding: Spacing[3],
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  errorText: { color: Colors.error, fontSize: Typography.sm, flex: 1 },
  form: { marginBottom: Spacing[4] },
  forgot: { alignItems: 'center', marginBottom: Spacing[4] },
  forgotText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  toggleMode: { alignItems: 'center' },
  toggleText: { fontSize: Typography.sm, color: Colors.textSecondary },
  toggleLink: { color: Colors.primary, fontWeight: Typography.semibold },
});
