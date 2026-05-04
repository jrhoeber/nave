import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NaveLogo } from './ui/NaveLogo';
import { Colors, Spacing, Typography } from '../theme';

export function Splash({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]} pointerEvents="none">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.goldEdge} />
      <View style={styles.content}>
        <NaveLogo size={80} />
        <Text style={styles.appName}>Nave</Text>
        <View style={styles.goldDivider} />
        <Text style={styles.tagline}>A Catholic Prayer Community</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.accent,
  },
  content: {
    alignItems: 'center',
    gap: Spacing[2],
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
  tagline: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
});
