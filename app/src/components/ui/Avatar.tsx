import React, { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { ImageX } from './ImageX';
import { Colors, Typography } from '../../theme';
import { Text } from './Text';

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
  const initials = name
    ? name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';
  const fontSize = size * 0.38;
  const badgeSize = size * 0.28;

  const showImage = !!uri && !imgError;
  const showFallback = !showImage;

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}>
      {showFallback && (
        <View style={[StyleSheet.absoluteFill, styles.fallback, { borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}
      {showImage && (
        <ImageX
          source={{ uri }}
          style={[StyleSheet.absoluteFill, styles.image, { borderRadius: size / 2 }]}
          contentFit="cover"
          onError={() => setImgError(true)}
          onLoad={onLoad ? () => onLoad() : undefined}
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
