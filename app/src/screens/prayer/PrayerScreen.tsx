import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrayerGroupCard } from '../../components/prayer/PrayerGroupCard';
import { usePrayerStore } from '../../store/prayerStore';
import { Colors, Spacing, Typography } from '../../theme';
import type { PrayerGroup } from '../../types';
import type { RootNavigationProp } from '../../types/navigation';

type Tab = 'discover' | 'my_groups';

export function PrayerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const [activeTab, setActiveTab] = useState<Tab>('my_groups');
  const { groups, myGroups, isLoading, fetchGroups, joinGroup, leaveGroup } = usePrayerStore();

  useEffect(() => { fetchGroups(); }, []);

  const displayedGroups = activeTab === 'my_groups' ? myGroups : groups;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Prayer Groups</Text>
          <Text style={styles.subtitle}>Pray together, grow together</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreatePrayerGroup')}>
          <Icon name="add" size={22} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['my_groups', 'discover'] as Tab[]).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'my_groups' ? `My Groups (${myGroups.length})` : 'Discover'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayedGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: PrayerGroup }) => (
          <PrayerGroupCard
            group={item}
            onPress={(id) => navigation.navigate('PrayerGroupDetail', { id })}
            onJoin={joinGroup}
            onLeave={leaveGroup}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchGroups} tintColor={Colors.primary} />}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🙏</Text>
            <Text style={styles.emptyTitle}>{activeTab === 'my_groups' ? 'No groups yet' : 'No groups found'}</Text>
            <Text style={styles.emptySubtitle}>{activeTab === 'my_groups' ? 'Join a prayer group to see it here, or create your own.' : 'Check back soon.'}</Text>
            {activeTab === 'my_groups' && (
              <TouchableOpacity onPress={() => setActiveTab('discover')} style={styles.discoverLink}>
                <Text style={styles.discoverLinkText}>Browse groups →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[5], paddingVertical: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], gap: Spacing[2], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: Spacing[2], borderRadius: 20, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  tabLabelActive: { color: Colors.textInverse },
  list: { padding: Spacing[4], paddingBottom: Spacing[10] },
  empty: { alignItems: 'center', paddingVertical: Spacing[16], paddingHorizontal: Spacing[8] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[2] },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.base * Typography.normal },
  discoverLink: { marginTop: Spacing[4] },
  discoverLinkText: { color: Colors.primary, fontWeight: Typography.semibold, fontSize: Typography.base },
});
