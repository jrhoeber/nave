import React, { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from '../../theme';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
  showBadge?: boolean;
  badgeColor?: string;
  onLoad?: () => void;
}

function AvatarImpl({
  uri,
  name,
  size = 40,
  style,
  showBadge,
  badgeColor = Colors.success,
  onLoad,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [uri]);
  const initials = name
    ? name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';
  const fontSize = size * 0.38;
  const badgeSize = size * 0.28;

  // iOS Image source supports a `cache` hint that maps to NSURLRequest cache policy.
  // `force-cache` makes a cached avatar reusable across mounts/screens without a refetch.
  const source = uri
    ? Platform.OS === 'ios'
      ? { uri, cache: 'force-cache' as const }
      : { uri }
    : undefined;

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}>
      <View style={[StyleSheet.absoluteFill, styles.fallback, { borderRadius: size / 2 }]}>
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      </View>
      {source && !imgError && (
        <Image
          source={source}
          style={[StyleSheet.absoluteFill, styles.image, { borderRadius: size / 2 }]}
          resizeMode="cover"
          onError={() => setImgError(true)}
          onLoad={onLoad}
        />
      )}
      {showBadge && (
        <View
          style={[
            styles.badge,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: badgeColor },
          ]}
        />
      )}
    </View>
  );
}

export const Avatar = React.memo(AvatarImpl, (prev, next) =>
  prev.uri === next.uri &&
  prev.name === next.name &&
  prev.size === next.size &&
  prev.showBadge === next.showBadge &&
  prev.badgeColor === next.badgeColor &&
  prev.style === next.style,
);

const styles = StyleSheet.create({
  image: { backgroundColor: Colors.surfaceAlt },
  fallback: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: Colors.textInverse, fontWeight: Typography.semibold },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
});
