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
import { Input } from '../../components/ui/Input';
import { Colors, Spacing, Typography } from '../../theme';

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_FOUND: 'No account found with this email.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  MISSING_EMAIL: 'Please enter your email address.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again later.',
};

export function PasswordResetScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const apiKey = getApp().options.apiKey;
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: trimmed }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        const code = data.error?.message || '';
        throw new Error(code);
      }
      setSent(true);
    } catch (err: any) {
      const code = err.message || '';
      const friendly = FIREBASE_ERROR_MESSAGES[code];
      setError(friendly || 'Could not send reset email. Please try again.');
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

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {sent
              ? 'Check your email for a reset link.'
              : "Enter your email and we'll send you a link to reset your password."}
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!sent && (
            <>
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
              </View>
              <Button
                label="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
                fullWidth
                size="lg"
              />
            </>
          )}

          {sent && (
            <Button
              label="Back to Sign In"
              onPress={() => navigation.goBack()}
              fullWidth
              size="lg"
            />
          )}
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
});
