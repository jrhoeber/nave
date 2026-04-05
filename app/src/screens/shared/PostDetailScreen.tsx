import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCard } from '../../components/feed/PostCard';
import { Button } from '../../components/ui/Button';
import { useFeedStore } from '../../store/feedStore';
import { Colors, Spacing, Typography } from '../../theme';
import type { PostDetailRouteProp, RootNavigationProp } from '../../types/navigation';

export function PostDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<PostDetailRouteProp>();
  const { posts, toggleLike, togglePraying } = useFeedStore();
  const post = posts.find((p) => p.id === route.params.id);

  if (!post) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Post not found.</Text>
        <Button label="Go Back" onPress={() => navigation.goBack()} variant="outline" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PostCard post={post} onLike={toggleLike} onPray={togglePraying} onComment={() => {}}
          onPress={() => {}} onAuthorPress={(id) => navigation.navigate('UserProfile', { id })} />
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments ({post.commentCount})</Text>
          <View style={styles.noComments}>
            <Text style={styles.noCommentsText}>
              {post.commentCount === 0 ? 'No comments yet. Be the first to respond!' : 'Comments coming soon...'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: Typography.base, color: Colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  headerTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10] },
  commentsSection: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing[4] },
  commentsTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[3] },
  noComments: { paddingVertical: Spacing[4], alignItems: 'center' },
  noCommentsText: { fontSize: Typography.sm, color: Colors.textSecondary },
});
