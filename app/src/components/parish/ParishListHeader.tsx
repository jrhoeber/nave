import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Avatar } from '../ui/Avatar';
import { ImageX } from '../ui/ImageX';
import { Colors, Radius, Spacing, Typography } from '../../theme';

const TOP_GRADIENT_COLORS = ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)'];
const COVER_ACTION_TINT = 'rgba(237, 235, 235, 0.9)';
const COVER_ACTION_TINT_ALT = 'rgba(255,255,255,0.9)';

interface ParishListHeaderProps {
  coverUrl?: string;
  hasCover: boolean;
  coverHeight: number;
  parishName: string;
  diocese?: string;
  established?: number;
  currentUserName: string;
  currentUserAvatarUrl?: string;
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
  diocese,
  established,
  currentUserName,
  currentUserAvatarUrl,
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
        </View>
      )}

      <View style={styles.parishNameSection}>
        <Text style={styles.parishNameText} numberOfLines={2}>{parishName}</Text>
        {(diocese || established) && (
          <View style={styles.parishMetaRow}>
            {diocese ? (
              <Text style={styles.parishMetaText} numberOfLines={1}>
                {diocese.toUpperCase()}
              </Text>
            ) : null}
            {diocese && established ? (
              <View style={styles.parishMetaDot} />
            ) : null}
            {established ? (
              <Text style={styles.parishMetaText}>EST. {established}</Text>
            ) : null}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.composerCard}
        onPress={onNewPostPress}
        activeOpacity={0.75}
      >
        <Avatar name={currentUserName} size={34} uri={currentUserAvatarUrl} />
        <Text style={styles.composerPrompt} numberOfLines={1}>
          Share something with your parish…
        </Text>
      </TouchableOpacity>

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
  noCoverHeader: {
    paddingHorizontal: Spacing[5],
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
  parishNameSection: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[2],
  },
  parishNameText: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: 32,
    color: '#000000',
    letterSpacing: -0.5,
    lineHeight: 32 * 1.15,
  },
  parishMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: Spacing[2],
  },
  parishMetaText: {
    fontSize: 11,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1.4,
    flexShrink: 1,
  },
  parishMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.accent,
  },
  composerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: '#fcfbf9',
    marginHorizontal: Spacing[3],
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
  },
  composerPrompt: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textLight,
  },
  initialLoader: {
    marginTop: Spacing[4],
    marginBottom: Spacing[4],
  },
});
