import React, { useCallback, useEffect } from 'react';
import { RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCard } from '../../components/feed/PostCard';
import { Avatar } from '../../components/ui/Avatar';
import { NaveLogo } from '../../components/ui/NaveLogo';
import { useAuthStore } from '../../store/authStore';
import { useFeedStore } from '../../store/feedStore';
import { Colors, Spacing, Typography } from '../../theme';
import type { Post } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

const FEED_STALE_MS = 30_000;

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const user = useAuthStore((s) => s.user);
  const posts = useFeedStore((s) => s.posts);
  const isLoading = useFeedStore((s) => s.isLoading);
  const hasFetched = useFeedStore((s) => s.hasFetched);
  const fetchFeed = useFeedStore((s) => s.fetchFeed);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const togglePraying = useFeedStore((s) => s.togglePraying);

  useEffect(() => { if (!hasFetched) fetchFeed(); }, [hasFetched, fetchFeed]);

  useFocusEffect(
    useCallback(() => {
      const { lastFetchedAt } = useFeedStore.getState();
      if (Date.now() - lastFetchedAt > FEED_STALE_MS) fetchFeed();
    }, [fetchFeed]),
  );

  const openPost = useCallback((id: string) => navigation.navigate('PostDetail', { id }), [navigation]);
  const openAuthor = useCallback((id: string) => navigation.navigate('UserProfile', { id }), [navigation]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onLike={toggleLike}
      onPray={togglePraying}
      onComment={openPost}
      onPress={openPost}
      onAuthorPress={openAuthor}
    />
  ), [toggleLike, togglePraying, openPost, openAuthor]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <NaveLogo size={32} />
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="notifications-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => user && navigation.navigate('UserProfile', { id: user.id })}>
            <Avatar uri={user?.avatarUrl} name={user?.displayName} size={34} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.composeRow} onPress={() => navigation.navigate('Compose', {})} activeOpacity={0.85}>
        <Avatar uri={user?.avatarUrl} name={user?.displayName} size={38} />
        <View style={styles.composeInput}>
          <Text style={styles.composePlaceholder}>Share a prayer, reflection, or update...</Text>
        </View>
        <TouchableOpacity style={styles.prayBtn} onPress={() => navigation.navigate('Compose', { postType: 'prayer_request' })}>
          <Icon name="hand-right-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>

      <FlashList
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderPost}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchFeed} tintColor={Colors.primary} />}
        ListEmptyComponent={hasFetched && !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🕊️</Text>
            <Text style={styles.emptyTitle}>Your feed is quiet</Text>
            <Text style={styles.emptySubtitle}>Follow friends and join prayer groups to see their posts here.</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  iconBtn: { padding: Spacing[1] },
  composeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing[3] },
  composeInput: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  composePlaceholder: { fontSize: Typography.sm, color: Colors.textLight },
  prayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing[4], paddingBottom: Spacing[10] },
  empty: { alignItems: 'center', paddingVertical: Spacing[16], paddingHorizontal: Spacing[8] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[2] },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.base * Typography.normal },
});
