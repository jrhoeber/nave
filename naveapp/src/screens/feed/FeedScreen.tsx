import React, { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCard } from '../../components/feed/PostCard';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useFeedStore } from '../../store/feedStore';
import { Colors, Spacing, Typography } from '../../theme';
import type { Post } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const user = useAuthStore((s) => s.user);
  const { posts, isLoading, fetchFeed, toggleLike, togglePraying } = useFeedStore();

  useEffect(() => { fetchFeed(); }, []);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onLike={toggleLike}
      onPray={togglePraying}
      onComment={(id) => navigation.navigate('PostDetail', { id })}
      onPress={(id) => navigation.navigate('PostDetail', { id })}
      onAuthorPress={(id) => navigation.navigate('UserProfile', { id })}
    />
  ), [toggleLike, togglePraying]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.logo}>Nave</Text>
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

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchFeed} tintColor={Colors.primary} />}
        ListEmptyComponent={!isLoading ? (
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
  logo: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold, color: Colors.primary, letterSpacing: -0.5 },
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
