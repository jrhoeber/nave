import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';

const MENU_ITEMS = ['Notifications', 'Privacy & Safety', 'Blocked Users', 'Help & Support', 'About Nave'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: Props) {
  const { logout } = useAuthStore();

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
          {MENU_ITEMS.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.menuItem, i === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              activeOpacity={0.7}
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
  menuLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  signOutSection: { marginHorizontal: Spacing[4], marginTop: Spacing[4] },
  signOutBtn: { borderColor: Colors.error },
  signOutText: { color: Colors.error },
});
