import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Spacing, Typography } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: Props) {
  const { user, updateUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setDisplayName(user?.displayName ?? '');
    setBio(user?.bio ?? '');
    setLocation(user?.location ?? '');
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required.');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
      });
      await updateUser({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
      });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
            <Button label="Save" size="sm" onPress={handleSave} loading={saving} />
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Input
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              autoCapitalize="words"
              maxLength={60}
            />
            <Input
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              leftIcon="location-outline"
              autoCapitalize="words"
              maxLength={80}
            />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell your community about yourself"
              multiline
              numberOfLines={4}
              maxLength={200}
              style={styles.bioInput}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  title: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  form: { padding: Spacing[5] },
  bioInput: { height: 100, textAlignVertical: 'top' },
});
