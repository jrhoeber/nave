import React, { useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApp } from '@react-native-firebase/app';
import { GoogleSignin, statusCodes as GoogleStatusCodes } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { log } from '../../lib/log';
import { NaveLogo } from '../../components/ui/NaveLogo';
import { Colors, Spacing, Typography } from '../../theme';
import type { AuthNavigationProp } from '../../types/navigation';

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
  const apiKey = getApp().options.apiKey;
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
  const navigation = useNavigation<AuthNavigationProp>();
  const signInWithFirebase = useAuthStore((s) => s.signInWithFirebase);
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading('google');
    try {
      log.debug('[GoogleSignIn] checking play services...');
      await GoogleSignin.hasPlayServices();
      log.debug('[GoogleSignIn] signing in...');
      const result: any = await GoogleSignin.signIn();
      if (result?.type === 'cancelled') {
        return;
      }
      log.debug('[GoogleSignIn] getting tokens...');
      const { idToken } = await GoogleSignin.getTokens();
      log.debug('[GoogleSignIn] got idToken:', !!idToken);
      if (!idToken) throw new Error('No ID token from Google');
      log.debug('[GoogleSignIn] exchanging for Firebase token...');
      const firebaseIdToken = await getFirebaseIdToken(idToken, 'google.com');
      log.debug('[GoogleSignIn] got Firebase token, signing in to backend...');
      await signInWithFirebase(firebaseIdToken);
    } catch (err: any) {
      log.warn('[GoogleSignIn] error', err.code, err.message);
      if (
        err.code === GoogleStatusCodes.SIGN_IN_CANCELLED ||
        err.code === GoogleStatusCodes.IN_PROGRESS
      ) {
        // User cancelled — no error to show
      } else {
        setError('Google sign-in failed. Please try again.');
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
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* Gold accent line on left edge */}
      <View style={styles.goldEdge} />

      <View style={[styles.container, { paddingTop: insets.top + Spacing[16], paddingBottom: insets.bottom + Spacing[4] }]}>
        {/* Top content */}
        <View style={styles.top}>
          <NaveLogo size={80} />
          <Text style={styles.appName}>Nave</Text>
          <View style={styles.goldDivider} />

          <Text style={styles.quote}>
            {'\u201C'}For where two or three are{'\n'}gathered together in my name,{'\n'}there am I in the midst of them.{'\u201D'}
          </Text>
          <Text style={styles.reference}>Matthew 18:20</Text>

        </View>

        {/* Bottom CTA */}
        <View style={styles.cta}>
          {error ? (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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

          <TouchableOpacity
            onPress={() => navigation.navigate('EmailSignIn')}
            disabled={loading !== null}
            activeOpacity={0.7}
          >
            <Text style={styles.emailLink}>Continue with email</Text>
          </TouchableOpacity>

          <View style={styles.legal}>
            <Text style={styles.legalLabel}>BY CONTINUING, YOU AGREE TO OUR</Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://naveapp.co/terms')} activeOpacity={0.7}>
                <Text style={styles.legalLink}>TERMS OF SERVICE</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}> · </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://naveapp.co/privacy')} activeOpacity={0.7}>
                <Text style={styles.legalLink}>PRIVACY POLICY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  goldEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.accent,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[8],
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[10],
  },
  appName: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: 56,
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 64,
  },
  goldDivider: {
    width: 32,
    height: 2,
    backgroundColor: Colors.accent,
    marginVertical: Spacing[3],
  },
  quote: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    marginTop: Spacing[2],
  },
  reference: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: Spacing[1],
  },
  cta: {
    gap: Spacing[3],
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 8,
    padding: Spacing[3],
    gap: Spacing[2],
    width: '100%',
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sm,
    flex: 1,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: Spacing[6],
    width: '100%',
  },
  appleBtn: {
    backgroundColor: '#1a1a1a',
  },
  appleBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  googleBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  legal: {
    alignItems: 'center',
    marginTop: Spacing[3],
    gap: 4,
  },
  legalLabel: {
    fontSize: 10,
    color: Colors.textLight,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLink: {
    fontSize: 10,
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    fontWeight: Typography.semibold,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 10,
    color: Colors.textLight,
  },
  emailLink: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
