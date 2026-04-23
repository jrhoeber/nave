import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firebase from '@react-native-firebase/app';
import { GoogleSignin, statusCodes as GoogleStatusCodes } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Typography } from '../../theme';

GoogleSignin.configure({
  webClientId: '667996115450-9uq4d4jlgpk6p43occmgb3ikv9fr1u6l.apps.googleusercontent.com',
});

/**
 * Exchange a Google or Apple identity token for a Firebase ID token via the
 * Firebase Identity Toolkit REST API. This avoids the need for the
 * @react-native-firebase/auth native SDK (which has CocoaPods conflicts).
 */
async function getFirebaseIdToken(
  providerToken: string,
  providerId: 'google.com' | 'apple.com',
): Promise<string> {
  const apiKey = firebase.app().options.apiKey;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${providerToken}&providerId=${providerId}`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    },
  );
  const data = await res.json();
  if (!res.ok || !data.idToken) {
    throw new Error(data.error?.message || 'Firebase sign-in failed');
  }
  return data.idToken as string;
}

export function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const signInWithFirebase = useAuthStore((s) => s.signInWithFirebase);
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading('google');
    try {
      console.log('[GoogleSignIn] checking play services...');
      await GoogleSignin.hasPlayServices();
      console.log('[GoogleSignIn] signing in...');
      await GoogleSignin.signIn();
      console.log('[GoogleSignIn] getting tokens...');
      const { idToken } = await GoogleSignin.getTokens();
      console.log('[GoogleSignIn] got idToken:', !!idToken);
      if (!idToken) throw new Error('No ID token from Google');
      console.log('[GoogleSignIn] exchanging for Firebase token...');
      const firebaseIdToken = await getFirebaseIdToken(idToken, 'google.com');
      console.log('[GoogleSignIn] got Firebase token, signing in to backend...');
      await signInWithFirebase(firebaseIdToken);
    } catch (err: any) {
      console.log('[GoogleSignIn] error code:', err.code, 'message:', err.message, err);
      if (
        err.code === GoogleStatusCodes.SIGN_IN_CANCELLED ||
        err.code === GoogleStatusCodes.IN_PROGRESS
      ) {
        // User cancelled — no error to show
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setLoading('apple');
    try {
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      if (!response.identityToken) throw new Error('No identity token from Apple');
      const firebaseIdToken = await getFirebaseIdToken(response.identityToken, 'apple.com');
      await signInWithFirebase(firebaseIdToken);
    } catch (err: any) {
      if (err.code === appleAuth.Error.CANCELED) {
        // User cancelled — no error to show
      } else {
        setError('Apple sign-in failed. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

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

        <View style={styles.cta}>
          {error ? (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn]}
            onPress={handleGoogleSignIn}
            disabled={loading !== null}
            activeOpacity={0.85}
          >
            {loading === 'google' ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Icon name="logo-google" size={20} color={Colors.textPrimary} />
            )}
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, styles.appleBtn]}
              onPress={handleAppleSignIn}
              disabled={loading !== null}
              activeOpacity={0.85}
            >
              {loading === 'apple' ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <Icon name="logo-apple" size={22} color={Colors.textInverse} />
              )}
              <Text style={styles.appleBtnText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}

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
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(220,38,38,0.15)', borderRadius: 8, padding: Spacing[3], gap: Spacing[2] },
  errorText: { color: '#fca5a5', fontSize: Typography.sm, flex: 1 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing[3], borderRadius: 14, paddingVertical: Spacing[4], paddingHorizontal: Spacing[5] },
  googleBtn: { backgroundColor: Colors.textInverse },
  googleBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  appleBtn: { backgroundColor: '#000' },
  appleBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textInverse },
  disclaimer: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: Spacing[2] },
});
