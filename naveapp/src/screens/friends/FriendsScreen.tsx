import React, { useState } from 'react';
import { FlatList, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';
import type { User } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

const MOCK_FRIENDS: User[] = [
  { id: '2', username: 'sister_teresa', displayName: 'Sister Teresa', avatarUrl: 'https://i.pravatar.cc/150?img=5', parish: 'Holy Family Parish', friendCount: 142, prayerGroupCount: 5, createdAt: new Date().toISOString(), isFriend: true },
  { id: '3', username: 'mike_chicago', displayName: 'Michael Torres', avatarUrl: 'https://i.pravatar.cc/150?img=11', parish: 'St. Patrick Cathedral', friendCount: 57, prayerGroupCount: 2, createdAt: new Date().toISOString(), isFriend: true },
  { id: '4', username: 'mary_grace', displayName: 'Mary Grace Kim', avatarUrl: 'https://i.pravatar.cc/150?img=47', parish: 'Our Lady of Guadalupe', friendCount: 88, prayerGroupCount: 4, createdAt: new Date().toISOString(), isFriend: true },
];

const MOCK_SUGGESTIONS: User[] = [
  { id: '5', username: 'deacon_james', displayName: 'Deacon James Walsh', avatarUrl: 'https://i.pravatar.cc/150?img=56', parish: 'Sacred Heart Parish', friendCount: 310, prayerGroupCount: 7, createdAt: new Date().toISOString(), isFriend: false },
  { id: '6', username: 'anna_rosario', displayName: 'Anna Rosario', avatarUrl: 'https://i.pravatar.cc/150?img=36', parish: 'St. Michael the Archangel', friendCount: 43, prayerGroupCount: 2, createdAt: new Date().toISOString(), isFriend: false },
  { id: '7', username: 'peter_v', displayName: 'Peter Vaughan', avatarUrl: 'https://i.pravatar.cc/150?img=67', parish: 'Holy Family Parish', friendCount: 29, prayerGroupCount: 1, createdAt: new Date().toISOString(), isFriend: false },
];

type Tab = 'friends' | 'discover';

export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [search, setSearch] = useState('');
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const data = (activeTab === 'friends' ? MOCK_FRIENDS : MOCK_SUGGESTIONS).filter(
    (u) => u.displayName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const renderUser = ({ item }: { item: User }) => {
    const isRequested = sentRequests.includes(item.id);
    return (
      <TouchableOpacity style={styles.userCard} onPress={() => navigation.navigate('UserProfile', { id: item.id })} activeOpacity={0.85}>
        <Avatar uri={item.avatarUrl} name={item.displayName} size={50} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userHandle}>@{item.username}</Text>
          {item.parish && (
            <View style={styles.parishRow}>
              <Icon name="business-outline" size={11} color={Colors.textLight} />
              <Text style={styles.userParish}>{item.parish}</Text>
            </View>
          )}
        </View>
        {activeTab === 'friends' ? (
          <TouchableOpacity style={styles.messageBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="chatbubble-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <Button label={isRequested ? 'Requested' : 'Add Friend'} variant={isRequested ? 'outline' : 'primary'}
            size="sm" disabled={isRequested} onPress={() => setSentRequests((p) => [...p, item.id])} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.subtitle}>Your Catholic community</Text>
      </View>
      <View style={styles.tabs}>
        {(['friends', 'discover'] as Tab[]).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'friends' ? `Friends (${MOCK_FRIENDS.length})` : 'Find Friends'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={17} color={Colors.textSecondary} />
        <TextInput value={search} onChangeText={setSearch} placeholder={activeTab === 'friends' ? 'Search your friends...' : 'Search Catholics near you...'} placeholderTextColor={Colors.textLight} style={styles.searchInput} />
      </View>
      <FlatList data={data} keyExtractor={(item) => item.id} renderItem={renderUser} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{activeTab === 'friends' ? '👐' : '🔍'}</Text>
            <Text style={styles.emptyTitle}>{search ? 'No matches found' : activeTab === 'friends' ? 'No friends yet' : 'Search to connect'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing[5], paddingVertical: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], gap: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  tab: { flex: 1, paddingVertical: Spacing[2], borderRadius: 20, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  tabLabelActive: { color: Colors.textInverse },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing[4], marginVertical: Spacing[3], borderRadius: Radius.md, paddingHorizontal: Spacing[3], borderWidth: 1.5, borderColor: Colors.border, gap: Spacing[2] },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, paddingVertical: Spacing[3] },
  list: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[10] },
  userCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing[4], flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[3], ...Shadows.sm },
  userInfo: { flex: 1 },
  userName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  userHandle: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  parishRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: Spacing[1] },
  userParish: { fontSize: Typography.xs, color: Colors.textLight },
  messageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing[12] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
});
