import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, Text } from 'react-native';

export function Splash({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]} pointerEvents="none">
      <StatusBar barStyle="light-content" backgroundColor="#1a2b4a" />
      <Text style={styles.title}>Nave</Text>
      <Text style={styles.tagline}>A Catholic Prayer Community</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a2b4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#c9a84c',
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tagline: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    marginTop: 14,
  },
});
