import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ImageX } from '../ui/ImageX';
import { Colors, Spacing, Typography } from '../../theme';

const TOP_GRADIENT_COLORS = ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)'];
const BOTTOM_GRADIENT_COLORS = [
  'rgba(250,247,242,0)',
  'rgba(250,247,242,0.4)',
  'rgba(250,247,242,1)',
];
const BOTTOM_GRADIENT_LOCATIONS = [0, 0.55, 1];
const COVER_ACTION_TINT = 'rgba(237, 235, 235, 0.9)';
const COVER_ACTION_TINT_ALT = 'rgba(255,255,255,0.9)';

interface ParishListHeaderProps {
  coverUrl?: string;
  hasCover: boolean;
  coverHeight: number;
  parishName: string;
  isParishAdmin: boolean;
  uploadingCover: boolean;
  loadingPosts: boolean;
  insetTop: number;
  onCoverError: () => void;
  onProfilePress: () => void;
  onManagePress: () => void;
  onNewPostPress: () => void;
}

function ParishListHeaderImpl({
  coverUrl,
  hasCover,
  coverHeight,
  parishName,
  isParishAdmin,
  uploadingCover,
  loadingPosts,
  insetTop,
  onCoverError,
  onProfilePress,
  onManagePress,
  onNewPostPress,
}: ParishListHeaderProps) {
  return (
    <View>
      {hasCover ? (
        <View style={{ height: coverHeight, backgroundColor: Colors.surface }}>
          {coverUrl ? (
            <ImageX
              source={{ uri: coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              onError={onCoverError}
            />
          ) : null}
          <LinearGradient
            colors={TOP_GRADIENT_COLORS}
            style={styles.topGradient}
          />
          <LinearGradient
            colors={BOTTOM_GRADIENT_COLORS}
            locations={BOTTOM_GRADIENT_LOCATIONS}
            style={styles.bottomGradient}
          />
          {uploadingCover && (
            <View style={styles.coverPhotoUploading}>
              <ActivityIndicator size="small" color={Colors.textInverse} />
            </View>
          )}
          <View style={[styles.coverPhotoActions, { top: insetTop + Spacing[3] }]}>
            <TouchableOpacity
              onPress={onProfilePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.coverPhotoActionBtn}
            >
              <BlurView blurType="light" blurAmount={20} style={StyleSheet.absoluteFill} />
              <MCIcon name="information-outline" size={19} color={COVER_ACTION_TINT} />
            </TouchableOpacity>
            {isParishAdmin ? (
              <TouchableOpacity
                onPress={onManagePress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.coverPhotoActionBtn}
              >
                <BlurView blurType="light" blurAmount={20} style={StyleSheet.absoluteFill} />
                <Icon name="ellipsis-horizontal" size={17} color={COVER_ACTION_TINT_ALT} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.coverNameOverlay}>
            <Text style={styles.coverParishName} numberOfLines={2}>{parishName}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.noCoverHeader, { paddingTop: insetTop + Spacing[3] }]}>
          <View style={styles.noCoverActions}>
            <TouchableOpacity
              onPress={onProfilePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.noCoverActionBtn}
            >
              <MCIcon name="information-outline" size={19} color={Colors.textSecondary} />
            </TouchableOpacity>
            {isParishAdmin ? (
              <TouchableOpacity
                onPress={onManagePress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.noCoverActionBtn}
              >
                <Icon name="ellipsis-horizontal" size={17} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.noCoverParishName} numberOfLines={2}>{parishName}</Text>
        </View>
      )}

      <View style={styles.sectionDivider} />

      <View style={styles.communityHeader}>
        <TouchableOpacity
          style={styles.newPostBtn}
          onPress={onNewPostPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.newPostText}>+ New post</Text>
        </TouchableOpacity>
      </View>

      {loadingPosts && (
        <ActivityIndicator color={Colors.accent} style={styles.initialLoader} />
      )}
    </View>
  );
}

export const ParishListHeader = React.memo(ParishListHeaderImpl);

const styles = StyleSheet.create({
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  coverPhotoUploading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoActions: {
    position: 'absolute',
    right: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  coverPhotoActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(80,80,80,0.35)',
  },
  coverNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
  },
  coverParishName: {
    fontFamily: Typography.fontSans,
    fontSize: 34,
    fontWeight: Typography.medium,
    color: '#1a1a1a',
    letterSpacing: -0.8,
    lineHeight: 34 * 1.05,
  },
  noCoverHeader: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
  },
  noCoverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing[2],
    marginBottom: Spacing[5],
  },
  noCoverActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCoverParishName: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: 36,
    color: '#000000',
    letterSpacing: -0.5,
    lineHeight: 36 * 1.15,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  communityTitle: {
    fontSize: 12,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingBottom: 4,
  },
  newPostText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  initialLoader: {
    marginTop: Spacing[4],
    marginBottom: Spacing[4],
  },
});
