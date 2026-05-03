import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  ListRenderItemInfo,
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
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Avatar } from '../../components/ui/Avatar';
import { ImageCropModal } from '../../components/ui/ImageCropModal';
import { EmptyStateBox } from '../../components/ui/EmptyStateBox';
import { ParishPostCard } from '../../components/parish/ParishPostCard';
import { useAuthStore } from '../../store/authStore';
import { api, ApiError, mapParish, mapParishPost } from '../../lib/apiClient';
import { CardList, Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { Parish, ParishPost, ParishReactionType } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_BASE_HEIGHT = 300;

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
      onUpdated({ ...parish, coverPhotoUrl: data.cover_photo_url });
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
        {/* Header */}
        <View style={[manageStyles.header, { paddingTop: insets.top || Spacing[4] }]}>
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={manageStyles.headerTitle}>Manage Parish</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !hasChanges}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Text style={[manageStyles.saveText, !hasChanges && manageStyles.saveTextDisabled]}>Save</Text>
            )}
          </TouchableOpacity>
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
            <Text style={manageStyles.sectionLabel}>COVER PHOTO</Text>
            <TouchableOpacity onPress={handlePickCoverPhoto} activeOpacity={0.8} disabled={uploadingCover} style={[manageStyles.coverPhotoBtn, { height: (SCREEN_WIDTH - 2 * Spacing[5]) * (coverHeight / SCREEN_WIDTH) }]}>
              {(localCoverUri ?? parish?.coverPhotoUrl) ? (
                <>
                  <Image source={{ uri: localCoverUri ?? parish!.coverPhotoUrl! }} style={manageStyles.coverPhotoPreview} resizeMode="cover" />
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
            <Text style={manageStyles.sectionLabel}>DETAILS</Text>
            <View style={manageStyles.card}>
              <View style={manageStyles.fieldContainer}>
                <Text style={manageStyles.fieldLabel}>WEBSITE</Text>
                <View style={manageStyles.fieldRow}>
                  <View style={manageStyles.fieldIcon}>
                    <Icon name="globe-outline" size={13} color={Colors.accent} />
                  </View>
                  <TextInput
                    style={manageStyles.fieldInput}
                    value={website}
                    onChangeText={(t) => setWebsite(t.slice(0, WEBSITE_MAX))}
                    placeholder="https://example.com"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="none"
                    keyboardType="url"
                    maxLength={WEBSITE_MAX}
                  />
                </View>
                <Text style={manageStyles.charCount}>
                  {website.length}/{WEBSITE_MAX}
                </Text>
              </View>
            </View>

            {/* Schedule section */}
            <Text style={manageStyles.sectionLabel}>SCHEDULE</Text>
            <View style={manageStyles.card}>
              <View style={manageStyles.fieldContainer}>
                <Text style={manageStyles.fieldLabel}>MASS TIMES</Text>
                <View style={manageStyles.fieldRow}>
                  <View style={manageStyles.fieldIcon}>
                    <MCIcon name="clock-outline" size={13} color={Colors.accent} />
                  </View>
                  <TextInput
                    style={[manageStyles.fieldInput, manageStyles.scheduleInput]}
                    value={massSchedule}
                    onChangeText={(t) => setMassSchedule(t.slice(0, SCHEDULE_MAX))}
                    placeholder={"Sunday: 8:00 AM, 10:30 AM\nDaily: 7:00 AM"}
                    placeholderTextColor={Colors.textLight}
                    multiline
                    maxLength={SCHEDULE_MAX}
                    textAlignVertical="top"
                  />
                </View>
                <Text style={manageStyles.charCount}>
                  {massSchedule.length}/{SCHEDULE_MAX}
                </Text>
              </View>
            </View>
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
  const navigation = useNavigation<RootNavigationProp>();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [profileVisible, setProfileVisible] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [manageVisible, setManageVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<ParishPost | undefined>();
  const [parish, setParish] = useState<Parish | null>(null);
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
          setParish(mapParish(data));
          setCoverImgError(false);
        })
        .catch(() => {});
    }, [parishId])
  );

  // If cover photo fails to load (expired URL), re-fetch parish data for a fresh URL
  const handleCoverImageError = useCallback(() => {
    setCoverImgError(true);
    api.getParish(parishId)
      .then((data) => {
        setParish(mapParish(data));
        setCoverImgError(false);
      })
      .catch(() => {});
  }, [parishId]);

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const data = await api.getParishPosts(parishId, cursor);
      console.log('[fetchPosts] posts:', data.posts.length, 'next_cursor:', data.next_cursor);
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
    } catch (e) {
      console.log('[fetchPosts] error:', e);
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
    console.log('[loadMore] fired — hasMore:', hasMore.current, 'loading:', loadingMoreRef.current, 'cursor:', nextCursor);
    if (!hasMore.current || loadingMoreRef.current || !nextCursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await fetchPosts(nextCursor);
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [fetchPosts, nextCursor]);

  const handleToggleReaction = useCallback(async (postId: string, reaction: ParishReactionType) => {
    const parishId_ = parishId;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const alreadyReacted = p.userReactions.includes(reaction);
      return {
        ...p,
        reactions: { ...p.reactions, [reaction]: (p.reactions[reaction] ?? 0) + (alreadyReacted ? -1 : 1) },
        userReactions: alreadyReacted
          ? p.userReactions.filter((r) => r !== reaction)
          : [...p.userReactions, reaction],
      };
    }));
    try {
      const snapshot = posts.find((p) => p.id === postId);
      const alreadyReacted = snapshot?.userReactions.includes(reaction) ?? false;
      const raw = alreadyReacted
        ? await api.removeParishPostReaction(parishId_, postId, reaction)
        : await api.addParishPostReaction(parishId_, postId, reaction);
      setPosts((prev) => prev.map((p) =>
        p.id !== postId ? p : {
          ...p,
          reactions: raw.reactions as Record<ParishReactionType, number>,
          userReactions: raw.user_reactions as ParishReactionType[],
        }
      ));
    } catch {
      // roll back
      setPosts((prev) => prev.map((p) => {
        if (p.id !== postId) return p;
        const alreadyReacted = p.userReactions.includes(reaction);
        return {
          ...p,
          reactions: { ...p.reactions, [reaction]: (p.reactions[reaction] ?? 0) + (alreadyReacted ? -1 : 1) },
          userReactions: alreadyReacted
            ? p.userReactions.filter((r) => r !== reaction)
            : [...p.userReactions, reaction],
        };
      }));
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

  const hasCover = !!parish?.coverPhotoUrl && !coverImgError;

  const ListHeader = useCallback(() => (
    <View>
      {hasCover ? (
        /* Cover photo area */
        <View style={{ height: coverHeight }}>
          <Image
            source={{ uri: parish!.coverPhotoUrl! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={handleCoverImageError}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }} />

  {/* bottom paper dissolve — note the locations prop */}
          <LinearGradient
            colors={[
              'rgba(250,247,242,0)',
              'rgba(250,247,242,0.4)',
              'rgba(250,247,242,1)'
            ]}
            locations={[0, 0.55, 1]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 }} />
          {uploadingCover && (
            <View style={styles.coverPhotoUploading}>
              <ActivityIndicator size="small" color={Colors.textInverse} />
            </View>
          )}
          {/* Top-right action buttons */}
          <View style={[styles.coverPhotoActions, { top: insets.top + Spacing[3] }]}>
            <TouchableOpacity onPress={() => setProfileVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.coverPhotoActionBtn}>
              <BlurView blurType="light" blurAmount={20} style={StyleSheet.absoluteFill} />
              <MCIcon name="information-outline" size={19} color="rgba(237, 235, 235, 0.9)" />
            </TouchableOpacity>
            {isParishAdmin ? (
              <TouchableOpacity onPress={() => setManageVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.coverPhotoActionBtn}>
                <BlurView blurType="light" blurAmount={20} style={StyleSheet.absoluteFill} />
                <Icon name="ellipsis-horizontal" size={17} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            ) : null}
          </View>
          {/* Parish info overlaid at bottom of cover */}
          <View style={styles.coverNameOverlay}>
            <Text style={styles.coverParishName} numberOfLines={2}>{parishName}</Text>
          </View>
        </View>
      ) : (
        /* No cover photo — compact header */
        <View style={[styles.noCoverHeader, { paddingTop: insets.top + Spacing[3] }]}>
          {/* Action buttons row */}
          <View style={styles.noCoverActions}>
            <TouchableOpacity onPress={() => setProfileVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.noCoverActionBtn}>
              <MCIcon name="information-outline" size={19} color={Colors.textSecondary} />
            </TouchableOpacity>
            {isParishAdmin ? (
              <TouchableOpacity onPress={() => setManageVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.noCoverActionBtn}>
                <Icon name="ellipsis-horizontal" size={17} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.noCoverParishName} numberOfLines={2}>{parishName}</Text>
        </View>
      )}

      {/* Hairline divider */}
      <View style={styles.sectionDivider} />

      {/* Community header — sits outside the post card */}
      <View style={styles.communityHeader}>
        <Text style={styles.communityTitle}>Community</Text>
        <TouchableOpacity
          style={styles.newPostBtn}
          onPress={() => { setEditingPost(undefined); setComposeVisible(true); }}
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
  ), [parish, parishName, loadingPosts, isParishAdmin, uploadingCover, hasCover, coverImgError, handleCoverImageError, insets.top]);

  const ListFooter = useCallback(() => (
    posts.length > 0 ? (
      <View style={[CardList.footer, styles.cardBottomExtra]}>
        {loadingMore && <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />}
      </View>
    ) : null
  ), [loadingMore, posts.length]);

  const ListEmpty = useCallback(() => !loadingPosts ? (
    <EmptyStateBox
      title="Start the conversation"
      body="Be the first to share something with your parish community"
      actionLabel="Write the first post"
      onAction={() => { setEditingPost(undefined); setComposeVisible(true); }}
    />
  ) : null, [loadingPosts]);

  const renderItem = ({ item, index }: ListRenderItemInfo<ParishPost>) => (
    <View style={[CardList.item, index === 0 && CardList.itemFirst]}>
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

      <FlatList
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        style={{ flex: 1 }}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedScroll}
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

  coverPhotoPlaceholder: {
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoPattern: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
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
  coverSubtitle: {
    fontSize: Typography.sm,
    color: 'rgba(55,65,81,0.75)',
    marginBottom: 6,
  },
  coverParishName: {
    fontFamily: Typography.fontSans,
    fontSize: 30,
    fontWeight: Typography.semibold,
    color: '#1a1a1a',
    letterSpacing: -0.8,
    lineHeight: 30 * 1.05,
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
  noCoverSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: 6,
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  communityTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
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
  newPostArrow: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },

  cardBottomExtra: {
    minHeight: Spacing[5],
    paddingBottom: Spacing[3],
  },

  feedScroll: { paddingBottom: Spacing[10] },
  initialLoader: { marginTop: Spacing[4], marginBottom: Spacing[4] },
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  saveText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.primaryDark,
  },
  saveTextDisabled: {
    opacity: 0.4,
  },

  scroll: {
    paddingBottom: Spacing[12],
  },

  // Sections
  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[6],
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[2],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
  },

  // Fields
  fieldContainer: {
    paddingVertical: Spacing[1],
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 0,
    marginLeft: 26 + Spacing[3],
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
    marginTop: 5,
  },
  fieldInput: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    paddingVertical: Spacing[2],
    paddingHorizontal: 0,
  },
  scheduleInput: {
    minHeight: 80,
    fontWeight: Typography.regular,
    lineHeight: Typography.base * 1.5,
  },
  charCount: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: Spacing[1],
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
