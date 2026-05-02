import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { useBlocksStore } from '../../store/blocksStore';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { BlockedUser } from '../../types';

export function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { blockedUsers, isLoading, fetchBlockedUsers, unblockUser } = useBlocksStore();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchBlockedUsers();
    }, []),
  );

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${user.displayName}? They will be able to see your profile and send you friend requests again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setUnblockingId(user.id);
            try {
              await unblockUser(user.id);
            } catch {
              Alert.alert('Error', 'Could not unblock user. Please try again.');
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.card}>
      <Avatar uri={item.avatarUrl} name={item.displayName} size={44} />
      <View style={styles.cardText}>
        <Text style={styles.displayName} numberOfLines={1}>{item.displayName}</Text>
        <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.unblockBtn}
        onPress={() => handleUnblock(item)}
        disabled={unblockingId === item.id}
        activeOpacity={0.7}
      >
        {unblockingId === item.id
          ? <ActivityIndicator size="small" color={Colors.error} />
          : <Text style={styles.unblockText}>Unblock</Text>
        }
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Users</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && blockedUsers.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={blockedUsers.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="shield-checkmark-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptySubtitle}>
                Users you block won't be able to see your profile or contact you.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  loader: { marginTop: Spacing[8] },
  listContent: { paddingVertical: Spacing[2] },
  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
    marginTop: Spacing[16],
  },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textSecondary },
  emptySubtitle: { fontSize: Typography.sm, color: Colors.textLight, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    borderRadius: Radius.lg,
    ...Shadows.sm,
    gap: Spacing[3],
  },
  cardText: { flex: 1 },
  displayName: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  username: { fontSize: Typography.sm, color: Colors.textLight, marginTop: 2 },
  unblockBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    minWidth: 72,
    alignItems: 'center',
  },
  unblockText: { fontSize: Typography.sm, color: Colors.error, fontWeight: Typography.medium },
});
