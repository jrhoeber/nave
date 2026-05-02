import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';

const NON_NOTIFICATION_ITEMS = ['Privacy & Safety', 'Blocked Users', 'Help & Support', 'About Nave'];

interface NotificationPrefs {
  push_notifications_enabled: boolean;
  notify_group_messages: boolean;
  notify_friend_requests: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onBlockedUsersPress?: () => void;
}

export function SettingsModal({ visible, onClose, onBlockedUsersPress }: Props) {
  const { logout } = useAuthStore();
  const [notifExpanded, setNotifExpanded] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (visible && !prefs) {
      setLoading(true);
      api.getNotificationPreferences()
        .then((data) => setPrefs(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This action is irreversible. Your account, posts, and messages will be deleted forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      await api.deleteAccount();
                      await logout();
                    } catch {
                      setDeletingAccount(false);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const updatePref = async (patch: Partial<NotificationPrefs>) => {
    if (!prefs) return;
    const optimistic = { ...prefs, ...patch };
    setPrefs(optimistic);
    try {
      const updated = await api.updateNotificationPreferences(patch);
      setPrefs(updated);
    } catch {
      setPrefs(prefs); // Rollback
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          {/* Notifications — expandable */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setNotifExpanded((v) => !v)}
          >
            <Text style={styles.menuLabel}>Notifications</Text>
            <Icon
              name={notifExpanded ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={Colors.textLight}
            />
          </TouchableOpacity>

          {notifExpanded && (
            <View style={styles.notifPanel}>
              {loading || !prefs ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: Spacing[3] }} />
              ) : (
                <>
                  {/* Master switch */}
                  <View style={styles.prefRow}>
                    <Text style={styles.prefLabel}>Push Notifications</Text>
                    <Switch
                      value={prefs.push_notifications_enabled}
                      onValueChange={(v) => updatePref({ push_notifications_enabled: v })}
                      trackColor={{ false: Colors.border, true: Colors.accent }}
                      thumbColor={Colors.surface}
                    />
                  </View>

                  {/* Sub-options — only shown when master is on */}
                  {prefs.push_notifications_enabled && (
                    <>
                      <View style={styles.prefRowIndented}>
                        <Text style={styles.prefLabelSub}>Group Messages</Text>
                        <Switch
                          value={prefs.notify_group_messages}
                          onValueChange={(v) => updatePref({ notify_group_messages: v })}
                          trackColor={{ false: Colors.border, true: Colors.accent }}
                          thumbColor={Colors.surface}
                        />
                      </View>
                      <View style={[styles.prefRowIndented, styles.prefRowLast]}>
                        <Text style={styles.prefLabelSub}>Friend Requests</Text>
                        <Switch
                          value={prefs.notify_friend_requests}
                          onValueChange={(v) => updatePref({ notify_friend_requests: v })}
                          trackColor={{ false: Colors.border, true: Colors.accent }}
                          thumbColor={Colors.surface}
                        />
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )}

          <View style={styles.menuDivider} />

          {NON_NOTIFICATION_ITEMS.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.menuItem, i === NON_NOTIFICATION_ITEMS.length - 1 && styles.menuItemLast]}
              activeOpacity={0.7}
              onPress={label === 'Blocked Users' ? onBlockedUsersPress : undefined}
            >
              <Text style={styles.menuLabel}>{label}</Text>
              <Icon name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <View style={styles.signOutSection}>
          <Button
            label="Sign Out"
            variant="outline"
            size="md"
            fullWidth
            onPress={async () => { await logout(); }}
            style={styles.signOutBtn}
            textStyle={styles.signOutText}
            testID="settings-sign-out-btn"
          />
          <Button
            label={deletingAccount ? 'Deleting…' : 'Delete Account'}
            variant="danger"
            size="md"
            fullWidth
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            style={styles.deleteAccountBtn}
            testID="settings-delete-account-btn"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    borderRadius: Radius.xl,
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuDivider: { height: 1, backgroundColor: Colors.borderLight },
  menuLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  notifPanel: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
  prefRowIndented: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    paddingLeft: Spacing[4],
  },
  prefRowLast: { paddingBottom: Spacing[3] },
  prefLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  prefLabelSub: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary },
  signOutSection: { marginHorizontal: Spacing[4], marginTop: Spacing[4] },
  signOutBtn: { borderColor: Colors.error },
  signOutText: { color: Colors.error },
  deleteAccountBtn: { marginTop: Spacing[3] },
});
