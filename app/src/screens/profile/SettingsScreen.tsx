import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FormHeader } from '../../components/ui/FormHeader';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import type { RootNavigationProp } from '../../types/navigation';

interface NotificationPrefs {
  push_notifications_enabled: boolean;
  notify_group_messages: boolean;
  notify_friend_requests: boolean;
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { logout } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    api.getNotificationPreferences()
      .then((data) => setPrefs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePref = async (patch: Partial<NotificationPrefs>) => {
    if (!prefs) return;
    const prev = { ...prefs };
    const optimistic = { ...prefs, ...patch };
    setPrefs(optimistic);
    try {
      const updated = await api.updateNotificationPreferences(patch);
      setPrefs(updated);
    } catch {
      setPrefs(prev);
    }
  };

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <FormHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Notifications ── */}
        <SectionLabel>NOTIFICATIONS</SectionLabel>
        <View style={styles.card}>
          {loading || !prefs ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.accent} />
            </View>
          ) : (
            <>
              <SettingsRow
                icon="notifications-outline"
                label="All Notifications"
                subtitle="Prayer requests, group activity"
                toggle
                value={prefs.push_notifications_enabled}
                onToggle={(v) => updatePref({ push_notifications_enabled: v })}
              />
              <View style={styles.sep} />
              <SettingsRow
                icon="chatbubble-outline"
                label="Messages"
                subtitle="Group messages and replies"
                toggle
                value={prefs.notify_group_messages}
                onToggle={(v) => updatePref({ notify_group_messages: v })}
                disabled={!prefs.push_notifications_enabled}
              />
              <View style={styles.sep} />
              <SettingsRow
                icon="person-add-outline"
                label="Friend Requests"
                subtitle="New requests and acceptances"
                toggle
                value={prefs.notify_friend_requests}
                onToggle={(v) => updatePref({ notify_friend_requests: v })}
                disabled={!prefs.push_notifications_enabled}
              />
            </>
          )}
        </View>

        {/* ── Users ── */}
        <SectionLabel>USERS</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            icon="ban-outline"
            label="Blocked Users"
            subtitle="Manage blocked accounts"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
        </View>

        {/* ── About Nave ── */}
        <SectionLabel>ABOUT NAVE</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://naveapp.co/terms')}
          />
          <View style={styles.sep} />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://naveapp.co/privacy')}
          />
          <View style={styles.sep} />
          <SettingsRow
            icon="code-slash-outline"
            label="Open Source Notices"
            onPress={() => navigation.navigate('OpenSourceNotices')}
          />
        </View>

        {/* ── Account ── */}
        <SectionLabel>ACCOUNT</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={async () => { await logout(); }}
          />
        </View>

        {/* ── Delete account — de-emphasized text link ── */}
        <TouchableOpacity
          style={styles.deleteLink}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          activeOpacity={0.6}
          testID="settings-delete-account-btn"
        >
          <Text style={styles.deleteLinkText}>
            {deletingAccount ? 'Deleting\u2026' : 'Delete Account'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ── Settings Row ── */

interface SettingsRowProps {
  icon: string;
  label: string;
  subtitle?: string;
  toggle?: boolean;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  disabled?: boolean;
}

function SettingsRow({ icon, label, subtitle, toggle, value, onToggle, onPress, disabled }: SettingsRowProps) {
  const content = (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowIconWrap}>
        <Icon name={icon} size={18} color={Colors.accent} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {toggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: Colors.border, true: Colors.accent }}
          thumbColor={Colors.surface}
        />
      ) : (
        <Icon name="chevron-forward" size={16} color={Colors.textLight} />
      )}
    </View>
  );

  if (toggle) return content;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Spacing[12],
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing[5],
    overflow: 'hidden',
  },
  loadingRow: {
    paddingVertical: Spacing[6],
    alignItems: 'center',
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: Spacing[4] + 40 + Spacing[3], // align with text after icon
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deleteLink: {
    alignSelf: 'center',
    marginTop: Spacing[3],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  deleteLinkText: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.error,
  },
});
