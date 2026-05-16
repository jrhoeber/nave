import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Avatar } from '../../components/ui/Avatar';
import { ImageX } from '../../components/ui/ImageX';
import { ImageCropModal } from '../../components/ui/ImageCropModal';
import { EmptyStateBox } from '../../components/ui/EmptyStateBox';
import { FormHeader } from '../../components/ui/FormHeader';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { FormCard } from '../../components/ui/FormCard';
import { FormField } from '../../components/ui/FormField';
import { ParishPostCard } from '../../components/parish/ParishPostCard';
import { ParishListHeader } from '../../components/parish/ParishListHeader';
import { useTabBarContentPadding } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { api, ApiError, mapParish, mapParishPost } from '../../lib/apiClient';
import { getCachedParishSync, setCachedParish } from '../../lib/parishCache';
import { CardList, Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { Parish, ParishPost } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_BASE_HEIGHT = 200;

// Cover photos are GCS V4 signed URLs whose query-string token rotates on each
// server-side cache miss. Re-rendering <ImageX> with a different `source.uri`
// string flashes on device, even though the bitmap is cached. Preserve the
// previous URL string when the underlying object (path before `?`) is unchanged.
function mergeParish(prev: Parish | null, next: Parish): Parish {
  if (!prev?.coverPhotoUrl || !next.coverPhotoUrl) return next;
  const stripQuery = (u: string) => {
    const i = u.indexOf('?');
    return i >= 0 ? u.slice(0, i) : u;
  };
  if (stripQuery(prev.coverPhotoUrl) === stripQuery(next.coverPhotoUrl)) {
    return { ...next, coverPhotoUrl: prev.coverPhotoUrl };
  }
  return next;
}

// ─── Parish profile modal ─────────────────────────────────────────────────────

function ParishProfileModal({ parish, visible, onClose, onChangeParish }: {
  parish: Parish | null;
  visible: boolean;
  onClose: () => void;
  onChangeParish: () => void;
}) {
  const formatWebsiteDisplay = (url: string) => {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={profileStyles.container}>

        {!parish && (
          <View style={profileStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {/* Drag indicator */}
        <View style={profileStyles.dragIndicatorRow}>
          <View style={profileStyles.dragIndicator} />
        </View>

        {parish && (
          <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={profileStyles.scroll}>

            {/* Header row — spacer + Done */}
            <View style={profileStyles.headerRow}>
              <View style={{ width: 40 }} />
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={profileStyles.headerBtn}>
                <Icon name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Church icon ring — centered like avatar */}
            <View style={profileStyles.iconCenter}>
              <View style={profileStyles.churchIconRing}>
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <Path d="M11.4 2.25h1.2v1.6h1.2v1.2h-1.2v2h-1.2v-2h-1.2v-1.2h1.2z" fill={Colors.accent} />
                  <Path d="M12 7.25 4.5 12.5V20.5a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75V12.5L12 7.25z" fill="#3d6b4a" />
                  <Path d="M10 21.25v-4.25a2 2 0 0 1 4 0v4.25h-4z" fill="#dce6df" />
                </Svg>
              </View>
            </View>

            {/* Parish name — centered */}
            <Text style={profileStyles.parishName}>{parish.name}</Text>

            {/* Diocese — centered */}
            {parish.diocese && (
              <Text style={profileStyles.dioceseText}>{parish.diocese}</Text>
            )}

            {/* Gold divider */}
            <View style={profileStyles.goldDivider} />

            {/* City, State label — centered uppercase */}
            <Text style={profileStyles.locationLabel}>
              {parish.city}, {parish.state}
            </Text>

            {/* Stats card */}
            <View style={profileStyles.statsCard}>
              <View style={profileStyles.statsCol}>
                <Text style={profileStyles.statsLabel}>PARISHIONERS</Text>
                <Text style={profileStyles.statsValue}>{parish.memberCount}</Text>
              </View>

              <View style={profileStyles.statsDivider} />

              <View style={profileStyles.statsCol}>
                <Text style={profileStyles.statsLabel}>GROUPS</Text>
                <Text style={profileStyles.statsValue}>{parish.groupCount}</Text>
              </View>

              {parish.established && (
                <>
                  <View style={profileStyles.statsDivider} />
                  <View style={profileStyles.statsCol}>
                    <Text style={profileStyles.statsLabel}>ESTABLISHED</Text>
                    <Text style={profileStyles.statsValue}>{parish.established}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Mass schedule */}
            <Text style={profileStyles.sectionLabel}>MASS SCHEDULE</Text>
            <View style={profileStyles.detailsCard}>
              {parish.massSchedule ? (
                <View style={profileStyles.scheduleContent}>
                  {parish.massSchedule.split('\n').filter(Boolean).map((line, i, arr) => (
                    <View key={i}>
                      <Text style={profileStyles.scheduleText}>{line}</Text>
                      {i < arr.length - 1 && <View style={profileStyles.detailSep} />}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={profileStyles.scheduleContent}>
                  <Text style={profileStyles.detailSubtitle}>Visit parish website for mass schedule</Text>
                </View>
              )}
            </View>

            {/* Details — address & website */}
            {(parish.streetAddress || parish.website) && (
              <>
                <Text style={profileStyles.sectionLabel}>DETAILS</Text>
                <View style={profileStyles.detailsCard}>
                  {parish.streetAddress && (
                    <View style={profileStyles.detailRow}>
                      <View style={profileStyles.detailIcon}>
                        <Icon name="location-outline" size={18} color={Colors.accent} />
                      </View>
                      <View style={profileStyles.detailContent}>
                        <Text style={profileStyles.detailTitle}>{parish.streetAddress}</Text>
                        <Text style={profileStyles.detailSubtitle}>
                          {parish.city}, {parish.state}{parish.postalCode ? ` ${parish.postalCode}` : ''}
                        </Text>
                      </View>
                    </View>
                  )}

                  {parish.website && (
                    <>
                      {parish.streetAddress && <View style={profileStyles.detailSep} />}
                      <TouchableOpacity
                        style={profileStyles.detailRow}
                        onPress={() => {
                          if (!parish.website) return;
                          const url = /^https?:\/\//i.test(parish.website) ? parish.website : `https://${parish.website}`;
                          Linking.openURL(url);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={profileStyles.detailIcon}>
                          <Icon name="globe-outline" size={18} color={Colors.accent} />
                        </View>
                        <View style={profileStyles.detailContent}>
                          <Text style={profileStyles.detailTitle}>{formatWebsiteDisplay(parish.website)}</Text>
                          <Text style={profileStyles.detailSubtitle}>Visit website</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}

            {/* Change parish — bottom right */}
            <TouchableOpacity style={profileStyles.changeBtn} onPress={onChangeParish} activeOpacity={0.7}>
              <Text style={profileStyles.changeBtnText}>Change parish</Text>
              <Text style={profileStyles.changeBtnArrow}> &rarr;</Text>
            </TouchableOpacity>

          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Compose modal ────────────────────────────────────────────────────────────

function ComposeModal({ parishId, visible, onClose, onCreated, onUpdated, editPost, isParishAdmin }: {
  parishId: string;
  visible: boolean;
  onClose: () => void;
  onCreated: (post: ParishPost) => void;
  onUpdated: (post: ParishPost) => void;
  editPost?: ParishPost;
  isParishAdmin: boolean;
}) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    setContent(editPost?.content ?? '');
    setIsAnnouncement(false);
    setError(null);
  }, [editPost, visible]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editPost) {
        const raw = await api.updateParishPost(parishId, editPost.id, trimmed);
        onUpdated(mapParishPost(raw));
        onClose();
      } else {
        const raw = await api.createParishPost(parishId, trimmed, isAnnouncement) as { _moderation?: { status: string } };
        if (raw._moderation?.status !== 'pending_review') {
          onCreated(mapParishPost(raw as Parameters<typeof mapParishPost>[0]));
        }
        onClose();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit post. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={{ flex: 1 }}>
        <View style={[composeStyles.container, { paddingTop: insets.top || Spacing[4] }]}>

          {/* Header — fixed */}
          <View style={composeStyles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={composeStyles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={composeStyles.title}>{editPost ? 'Edit Post' : 'New Post'}</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!content.trim() || submitting}
              style={[composeStyles.postBtn, (!content.trim() || submitting) && composeStyles.postBtnDisabled]}
            >
              {submitting
                ? <ActivityIndicator size="small" color={Colors.textInverse} />
                : <Text style={composeStyles.postBtnText}>{editPost ? 'Save' : 'Post'}</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={composeStyles.divider} />

          {error && (
            <View style={composeStyles.errorBanner}>
              <Text style={composeStyles.errorText}>{error}</Text>
            </View>
          )}

          {/* Scrollable compose area */}
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: keyboardHeight }}
          >
            {/* Announcement toggle — only for new posts by admins */}
            {isParishAdmin && !editPost && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[composeStyles.announcementRow, isAnnouncement && composeStyles.announcementRowActive]}
                onPress={() => setIsAnnouncement(v => !v)}
              >
                <View style={composeStyles.announcementLeft}>
                  <MCIcon name="church" size={15} color={isAnnouncement ? Colors.accent : Colors.textSecondary} />
                  <Text style={[composeStyles.announcementLabel, isAnnouncement && composeStyles.announcementLabelActive]}>
                    Parish Announcement
                  </Text>
                </View>
                <Switch
                  value={isAnnouncement}
                  onValueChange={setIsAnnouncement}
                  trackColor={{ false: Colors.border, true: Colors.accent + '80' }}
                  thumbColor={isAnnouncement ? Colors.accent : Colors.textLight}
                />
              </TouchableOpacity>
            )}

            {/* Compose area — avatar + name + input unified */}
            <View style={composeStyles.composeArea}>
              <Avatar name={user?.displayName ?? ''} uri={user?.avatarUrl} size={42} />
              <View style={composeStyles.composeRight}>
                <Text style={composeStyles.authorName}>{user?.displayName}</Text>
                <TextInput
                  style={composeStyles.input}
                  placeholder="Share something with your parish…"
                  placeholderTextColor={Colors.textLight}
                  value={content}
                  onChangeText={(t) => { setContent(t); if (error) setError(null); }}
                  multiline
                  scrollEnabled={false}
                  autoFocus
                  maxLength={1000}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

// PostCard and ReactionBar are now extracted to components/parish/

// ─── Manage parish modal (admin only) ────────────────────────────────────────

const WEBSITE_MAX = 120;
const SCHEDULE_MAX = 500;

function ManageParishModal({ parish, visible, onClose, onUpdated, uploadingCover, setUploadingCover }: {
  parish: Parish | null;
  visible: boolean;
  onClose: () => void;
  onUpdated: (updated: Parish) => void;
  uploadingCover: boolean;
  setUploadingCover: (v: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const coverHeight = COVER_BASE_HEIGHT + insets.top;
  const [website, setWebsite] = useState('');
  const [massSchedule, setMassSchedule] = useState('');
  const [saving, setSaving] = useState(false);
  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [pickedImage, setPickedImage] = useState<{ uri: string; width: number; height: number; type: string } | null>(null);

  useEffect(() => {
    if (parish) {
      setWebsite(parish.website ?? '');
      setMassSchedule(parish.massSchedule ?? '');
      setLocalCoverUri(null);
    }
  }, [parish, visible]);

  const hasChanges =
    website.trim() !== (parish?.website ?? '') ||
    massSchedule.trim() !== (parish?.massSchedule ?? '');

  const handlePickCoverPhoto = async () => {
    if (!parish) return;
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 1, maxWidth: 2400, maxHeight: 1350 });
    if (result.didCancel || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setPickedImage({
      uri: asset.uri!,
      width: asset.width ?? 1600,
      height: asset.height ?? 900,
      type: asset.type ?? 'image/jpeg',
    });
    setCropModalVisible(true);
  };

  const handleCropConfirm = async (croppedUri: string) => {
    setCropModalVisible(false);
    if (!parish || !pickedImage) return;
    setLocalCoverUri(croppedUri);
    setUploadingCover(true);
    try {
      const data = await api.uploadParishCoverPhoto(parish.id, croppedUri, pickedImage.type);
      onUpdated({
        ...parish,
        coverPhotoUrl: data.cover_photo_url,
      });
    } catch (e: any) {
      setLocalCoverUri(null);
      Alert.alert('Error', e?.message ?? 'Failed to upload cover photo. Please try again.');
    } finally {
      setUploadingCover(false);
      setPickedImage(null);
    }
  };

  const handleCropCancel = () => {
    setCropModalVisible(false);
    setPickedImage(null);
  };

  const handleSave = async () => {
    if (!parish) return;
    setSaving(true);
    try {
      const raw = await api.updateParish(parish.id, {
        website: website.trim() || undefined,
        mass_schedule: massSchedule.trim() || undefined,
      });
      onUpdated(mapParish(raw));
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ],
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleBack}>
      <View style={manageStyles.container}>
        <View style={{ paddingTop: insets.top || Spacing[4] }}>
          <FormHeader
            title="Manage Parish"
            onBack={handleBack}
            actionLabel="Save"
            onAction={handleSave}
            actionDisabled={!hasChanges}
            loading={saving}
          />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={manageStyles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Cover Photo */}
            <SectionLabel style={{ marginTop: Spacing[6] }}>COVER PHOTO</SectionLabel>
            <TouchableOpacity onPress={handlePickCoverPhoto} activeOpacity={0.8} disabled={uploadingCover} style={[manageStyles.coverPhotoBtn, { height: (SCREEN_WIDTH - 2 * Spacing[5]) * (coverHeight / SCREEN_WIDTH) }]}>
              {(localCoverUri ?? parish?.coverPhotoUrl) ? (
                <>
                  <ImageX source={{ uri: localCoverUri ?? parish!.coverPhotoUrl! }} style={manageStyles.coverPhotoPreview} contentFit="cover" />
                  <View style={manageStyles.coverPhotoOverlay}>
                    {uploadingCover ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Icon name="camera-outline" size={22} color="#fff" />
                        <Text style={manageStyles.coverPhotoOverlayText}>Change Photo</Text>
                      </>
                    )}
                  </View>
                </>
              ) : (
                <View style={manageStyles.coverPhotoEmpty}>
                  <Icon name="camera-outline" size={28} color={Colors.accent} />
                  <Text style={manageStyles.coverPhotoEmptyText}>Add Cover Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Details section */}
            <SectionLabel style={{ marginTop: Spacing[6] }}>DETAILS</SectionLabel>
            <FormCard>
              <FormField
                label="WEBSITE"
                icon="globe-outline"
                value={website}
                onChangeText={(t) => setWebsite(t)}
                maxLength={WEBSITE_MAX}
                placeholder="https://example.com"
                autoCapitalize="none"
                keyboardType="url"
              />
            </FormCard>

            {/* Schedule section */}
            <SectionLabel style={{ marginTop: Spacing[6] }}>SCHEDULE</SectionLabel>
            <FormCard>
              <FormField
                label="MASS TIMES"
                icon="clock-outline"
                iconElement={<MCIcon name="clock-outline" size={13} color={Colors.accent} />}
                value={massSchedule}
                onChangeText={(t) => setMassSchedule(t)}
                maxLength={SCHEDULE_MAX}
                placeholder={"Sunday: 8:00 AM, 10:30 AM\nDaily: 7:00 AM"}
                multiline
                inputStyle={{ minHeight: 80 }}
              />
            </FormCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {pickedImage && (
        <ImageCropModal
          visible={cropModalVisible}
          imageUri={pickedImage.uri}
          imageWidth={pickedImage.width}
          imageHeight={pickedImage.height}
          aspectRatio={SCREEN_WIDTH / coverHeight}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </Modal>
  );
}

// ─── Parish feed view ─────────────────────────────────────────────────────────

function ParishFeed({ parishId, parishName, onChangeParish }: {
  parishId: string;
  parishName: string;
  onChangeParish: () => void;
}) {
  const insets = useSafeAreaInsets();
  const coverHeight = COVER_BASE_HEIGHT + insets.top;
  const tabBarPadding = useTabBarContentPadding();
  const navigation = useNavigation<RootNavigationProp>();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUserName = useAuthStore((s) => s.user?.displayName);
  const currentUserAvatarUrl = useAuthStore((s) => s.user?.avatarUrl);
  const [profileVisible, setProfileVisible] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [manageVisible, setManageVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<ParishPost | undefined>();
  const userParishCoverUrl = useAuthStore((s) => s.user?.parishCoverPhotoUrl);
  const [parish, setParish] = useState<Parish | null>(() => {
    const cached = getCachedParishSync();
    return cached && cached.id === parishId ? cached : null;
  });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverImgError, setCoverImgError] = useState(false);
  const isParishAdmin = parish?.isParishAdmin ?? false;

  const [posts, setPosts] = useState<ParishPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const hasMore = useRef(true);
  const loadingMoreRef = useRef(false);

  // Refresh parish data (including cover photo signed URL) on every focus
  useFocusEffect(
    useCallback(() => {
      api.getParish(parishId)
        .then((data) => {
          const next = mapParish(data);
          setParish((prev) => {
            const merged = mergeParish(prev, next);
            setCachedParish(merged).catch(() => {});
            return merged;
          });
          setCoverImgError(false);
        })
        .catch(() => {});
    }, [parishId])
  );

  // If the cover photo fails to load (e.g. signed URL expired), refetch the
  // parish for a fresh URL — but at most once per *URL value*. Without this
  // ref, a persistently-broken URL produces an infinite loop: image errors →
  // refetch resolves → setCoverImgError(false) → image re-mounts → errors
  // again → refetch again. The ref is a stable record of "we already tried
  // this URL", and only resets when parishId changes (i.e. user navigates).
  const retriedCoverUrlRef = useRef<string | null>(null);
  useEffect(() => {
    retriedCoverUrlRef.current = null;
  }, [parishId]);
  const handleCoverImageError = useCallback(() => {
    const currentUrl = parish?.coverPhotoUrl;
    if (!currentUrl) return;
    if (retriedCoverUrlRef.current === currentUrl) {
      // Already retried this URL once; give up to avoid a refetch loop.
      setCoverImgError(true);
      return;
    }
    retriedCoverUrlRef.current = currentUrl;
    setCoverImgError(true);
    api.getParish(parishId)
      .then((data) => {
        const next = mapParish(data);
        setParish((prev) => {
          const merged = mergeParish(prev, next);
          setCachedParish(merged).catch(() => {});
          return merged;
        });
        setCoverImgError(false);
      })
      .catch(() => {});
  }, [parishId, parish?.coverPhotoUrl]);

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const data = await api.getParishPosts(parishId, cursor);
      const mapped = data.posts.map(mapParishPost);
      if (cursor) {
        setPosts((prev) => [...prev, ...mapped]);
      } else {
        setPosts(mapped);
      }
      setNextCursor(data.next_cursor);
      if (!data.next_cursor) {
        hasMore.current = false;
      }
    } catch {
      // Network error — keep previous posts displayed.
    }
  }, [parishId]);

  useEffect(() => {
    setLoadingPosts(true);
    hasMore.current = true;
    fetchPosts().finally(() => setLoadingPosts(false));
  }, [fetchPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    hasMore.current = true;
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  // Refresh post data (including comment counts) when returning from detail screen
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMore.current || loadingMoreRef.current || !nextCursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await fetchPosts(nextCursor);
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [fetchPosts, nextCursor]);

  const handleToggleReaction = useCallback(async (postId: string) => {
    const parishId_ = parishId;
    const snapshot = posts.find((p) => p.id === postId);
    const wasReacted = snapshot?.userReacted ?? false;
    setPosts((prev) => prev.map((p) =>
      p.id !== postId ? p : {
        ...p,
        reactionCount: p.reactionCount + (wasReacted ? -1 : 1),
        userReacted: !wasReacted,
      }
    ));
    try {
      const raw = wasReacted
        ? await api.removeParishPostReaction(parishId_, postId)
        : await api.addParishPostReaction(parishId_, postId);
      setPosts((prev) => prev.map((p) =>
        p.id !== postId ? p : {
          ...p,
          reactionCount: raw.reaction_count,
          userReacted: raw.user_reacted,
        }
      ));
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.id !== postId ? p : {
          ...p,
          reactionCount: snapshot?.reactionCount ?? p.reactionCount,
          userReacted: wasReacted,
        }
      ));
    }
  }, [parishId, posts]);

  const handleEdit = useCallback((post: ParishPost) => {
    setEditingPost(post);
    setComposeVisible(true);
  }, []);

  const handleReport = useCallback((post: ParishPost) => {
    const reasons: Array<{ text: string; value: string }> = [
      { text: 'Spam', value: 'spam' },
      { text: 'Harassment', value: 'harassment' },
      { text: 'Hate Speech', value: 'hate_speech' },
      { text: 'Inappropriate', value: 'inappropriate' },
      { text: 'Misinformation', value: 'misinformation' },
      { text: 'Other', value: 'other' },
    ];
    Alert.alert(
      'Report Post',
      'Why are you reporting this?',
      [
        ...reasons.map((r) => ({
          text: r.text,
          onPress: async () => {
            try {
              await api.reportContent('post', post.id, r.value);
              Alert.alert('Report Submitted', 'Thank you. Our team will review this.');
            } catch (err) {
              if (err instanceof ApiError && err.status === 409) {
                Alert.alert('Already Reported', "You've already reported this content.");
              } else {
                Alert.alert('Error', 'Could not submit report. Please try again.');
              }
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  const handleDelete = useCallback(async (post: ParishPost) => {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    try {
      await api.deleteParishPost(parishId, post.id);
    } catch {
      // restore on failure
      setPosts((prev) => {
        const idx = prev.findIndex((p) => p.createdAt < post.createdAt);
        const next = [...prev];
        next.splice(idx === -1 ? prev.length : idx, 0, post);
        return next;
      });
    }
  }, [parishId]);

  // Once /parishes/{id} has resolved (parish is non-null), trust it as the
  // source of truth for whether a cover exists. userParishCoverUrl from the
  // auth store can be stale within a session (e.g. cover removed server-side
  // or parish switched) and only resets on cold start via loadStoredAuth.
  // It's only useful as a placeholder before the first fetch resolves.
  const effectiveCoverUrl = parish ? parish.coverPhotoUrl : userParishCoverUrl;
  const knowsParishHasNoCover = !!parish && !parish.coverPhotoUrl;
  const hasCover = !knowsParishHasNoCover && !coverImgError;

  const handleProfilePress = useCallback(() => setProfileVisible(true), []);
  const handleManagePress = useCallback(() => setManageVisible(true), []);
  const handleNewPostPress = useCallback(() => {
    setEditingPost(undefined);
    setComposeVisible(true);
  }, []);

  const headerEl = useMemo(() => (
    <ParishListHeader
      coverUrl={effectiveCoverUrl}
      hasCover={hasCover}
      coverHeight={coverHeight}
      parishName={parishName}
      diocese={parish?.diocese}
      established={parish?.established}
      currentUserName={currentUserName ?? ''}
      currentUserAvatarUrl={currentUserAvatarUrl}
      isParishAdmin={isParishAdmin}
      uploadingCover={uploadingCover}
      loadingPosts={loadingPosts}
      insetTop={insets.top}
      onCoverError={handleCoverImageError}
      onProfilePress={handleProfilePress}
      onManagePress={handleManagePress}
      onNewPostPress={handleNewPostPress}
    />
  ), [
    effectiveCoverUrl,
    hasCover,
    coverHeight,
    parishName,
    parish?.diocese,
    parish?.established,
    currentUserName,
    currentUserAvatarUrl,
    isParishAdmin,
    uploadingCover,
    loadingPosts,
    insets.top,
    handleCoverImageError,
    handleProfilePress,
    handleManagePress,
    handleNewPostPress,
  ]);

  const ListFooter = useCallback(() => (
    loadingMore ? <ActivityIndicator color={Colors.primary} style={styles.footerLoader} /> : null
  ), [loadingMore]);

  const ListEmpty = useCallback(() => !loadingPosts ? (
    <EmptyStateBox
      title="Start the conversation"
      body="Be the first to share something with your parish community"
      actionLabel="Write the first post"
      onAction={() => { setEditingPost(undefined); setComposeVisible(true); }}
    />
  ) : null, [loadingPosts]);

  const renderItem = ({ item, index }: ListRenderItemInfo<ParishPost>) => (
    <View style={[CardList.item, index === 0 && CardList.itemFirst, index === posts.length - 1 && CardList.itemLast]}>
      <ParishPostCard
        post={item}
        currentUserId={currentUserId}
        isParishAdmin={isParishAdmin}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReport={handleReport}
        onToggleReaction={handleToggleReaction}
        onPress={() => navigation.navigate('ParishPostDetail', { parishId, postId: item.id })}
        onAuthorPress={(userId) => navigation.navigate('UserProfile', { id: userId })}
        isLast={index === posts.length - 1}
      />
    </View>
  );
  const keyExtractor = (item: ParishPost) => item.id;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={hasCover ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <FlashList
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={headerEl}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
      />

      <ParishProfileModal
        parish={parish}
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        onChangeParish={onChangeParish}
      />

      <ComposeModal
        parishId={parishId}
        visible={composeVisible}
        editPost={editingPost}
        isParishAdmin={isParishAdmin}
        onClose={() => { setComposeVisible(false); setEditingPost(undefined); }}
        onCreated={(post) => setPosts((prev) => [post, ...prev])}
        onUpdated={(updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
      />

      <ManageParishModal
        parish={parish}
        visible={manageVisible}
        onClose={() => setManageVisible(false)}
        onUpdated={(updated) => setParish(updated)}
        uploadingCover={uploadingCover}
        setUploadingCover={setUploadingCover}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ParishScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const handleChangeParish = async () => {
    // Only clear locally so the user can cancel and return to their current parish.
    // The server update happens when the user selects a new parish in ParishSetupScreen.
    await updateUser({ parishId: undefined, parish: undefined });
  };

  if (!user?.parishId) {
    // RootNavigator redirects to ParishSetupScreen when parishId is missing,
    // so this should never render — but return null as a safety fallback.
    return null;
  }

  return (
    <ParishFeed
      parishId={user.parishId}
      parishName={user.parish ?? user.parishId}
      onChangeParish={handleChangeParish}
    />
  );
}

// ─── Feed styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  footerLoader: { marginVertical: Spacing[4] },
});

// ─── Profile modal styles ─────────────────────────────────────────────────────

const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingBottom: Spacing[12],
  },

  // ── Drag indicator ─────────────────────────────────────────────────────────
  dragIndicatorRow: {
    alignItems: 'center',
    paddingTop: Spacing[2],
    paddingBottom: Spacing[1],
  },
  dragIndicator: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  // ── Header row ────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[4],
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Church icon (like avatar) ─────────────────────────────────────────────
  iconCenter: {
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  churchIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },

  // ── Parish name ───────────────────────────────────────────────────────────
  parishName: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: Typography['3xl'],
    color: '#000000',
    lineHeight: Typography['3xl'] * 1.15,
    textAlign: 'center',
    marginBottom: Spacing[1],
    paddingHorizontal: Spacing[6],
  },

  // ── Diocese ───────────────────────────────────────────────────────────────
  dioceseText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: Spacing[3],
  },

  // ── Gold divider ──────────────────────────────────────────────────────────
  goldDivider: {
    width: 28,
    height: 2.5,
    backgroundColor: Colors.accent,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: Spacing[3],
  },

  // ── Location label ────────────────────────────────────────────────────────
  locationLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.8,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: Spacing[5],
  },

  // ── Change parish CTA ──────────────────────────────────────────────────────
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing[2],
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent + '50',
    paddingBottom: 4,
    marginHorizontal: Spacing[6],
    marginTop: Spacing[1],
  },
  changeBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  changeBtnArrow: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },

  // ── Stats card ────────────────────────────────────────────────────────────
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[5],
    borderRadius: Radius.md,
    paddingVertical: Spacing[4],
    marginBottom: Spacing[6],
    ...Shadows.sm,
  },
  statsCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
  },
  statsDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing[1],
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 1.2,
    marginBottom: Spacing[2],
  },
  statsValue: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 2,
  },

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[6],
  },

  // ── Details card ──────────────────────────────────────────────────────────
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[3],
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  detailSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[4],
  },

  // ── Mass schedule ─────────────────────────────────────────────────────────
  scheduleContent: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
  },
  scheduleText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing[2],
  },
});

// ─── Compose modal styles ─────────────────────────────────────────────────────

const composeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  cancel: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  postBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.45,
  },
  postBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  errorBanner: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 119, 6, 0.25)',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.warning,
    lineHeight: Typography.sm * 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  announcementRow: {
    width: Dimensions.get('window').width - Spacing[4] * 2,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[5],
    marginBottom: Spacing[2],
    paddingLeft: Spacing[3],
    paddingRight: Spacing[6],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.surface ?? Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  announcementRowActive: {
    backgroundColor: Colors.accent + '12',
    borderColor: Colors.accent + '40',
  },
  announcementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  announcementLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  announcementLabelActive: {
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  composeArea: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  composeRight: {
    flex: 1,
  },
  authorName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing[1],
  },
  input: {
    minHeight: 120,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
});

// ─── Manage parish modal styles ───────────────────────────────────────────────

const manageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  scroll: {
    paddingBottom: Spacing[12],
  },

  // Cover photo
  coverPhotoBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[2],
  },
  coverPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  coverPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  coverPhotoOverlayText: {
    color: '#fff',
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  coverPhotoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  coverPhotoEmptyText: {
    fontSize: Typography.sm,
    color: Colors.accent,
    fontWeight: Typography.medium,
  },
});
