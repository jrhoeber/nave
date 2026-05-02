import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../theme';

const AVATAR_SIZE = 110;
const AVATAR_BORDER = 2;
const AVATAR_GAP = 4;
const AVATAR_TOTAL = AVATAR_SIZE + (AVATAR_BORDER + AVATAR_GAP) * 2;

const NAME_MAX = 32;
const LOCATION_MAX = 48;
const BIO_MAX = 140;

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, updateUser, setAvatarReady } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const hasChanges =
    displayName.trim() !== (user?.displayName ?? '') ||
    location.trim() !== (user?.location ?? '') ||
    bio.trim() !== (user?.bio ?? '');

  const handleAvatarPress = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.8,
    });

    if (result.didCancel || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const localUri = asset.uri!;
      await updateUser({ avatarUrl: localUri });
      const updated = await api.uploadAvatar(localUri, asset.type ?? 'image/jpeg');
      if (updated.avatar_url) {
        await updateUser({ avatarUrl: updated.avatar_url });
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
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
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges) return;
      e.preventDefault();
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, hasChanges]);

  const handleBack = () => {
    navigation.goBack();
  };

  if (!user) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !hasChanges}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={[styles.saveText, (!hasChanges) && styles.saveTextDisabled]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarCenter}>
            <TouchableOpacity onPress={handleAvatarPress} disabled={avatarUploading} activeOpacity={0.85}>
              <View style={styles.avatarRing}>
                <Avatar uri={user.avatarUrl} name={user.displayName} size={AVATAR_SIZE} onLoad={setAvatarReady} />
              </View>
              <View style={styles.cameraBadge}>
                {avatarUploading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Icon name="camera-outline" size={14} color={Colors.textPrimary} />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAvatarPress} disabled={avatarUploading}>
              <Text style={styles.changePhotoText}>CHANGE PHOTO</Text>
            </TouchableOpacity>
          </View>

          {/* Identity section */}
          <Text style={styles.sectionLabel}>IDENTITY</Text>
          <View style={styles.card}>
            {/* Display Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
              <View style={styles.fieldRow}>
                <View style={styles.fieldIcon}>
                  <Icon name="person-outline" size={13} color={Colors.accent} />
                </View>
                <TextInput
                  style={styles.fieldInput}
                  value={displayName}
                  onChangeText={(t) => setDisplayName(t.slice(0, NAME_MAX))}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  maxLength={NAME_MAX}
                />
              </View>
              <Text style={styles.charCount}>
                {displayName.length}/{NAME_MAX}
              </Text>
            </View>

            <View style={styles.fieldSep} />

            {/* Location */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>LOCATION</Text>
              <View style={styles.fieldRow}>
                <View style={styles.fieldIcon}>
                  <Icon name="location-outline" size={13} color={Colors.accent} />
                </View>
                <TextInput
                  style={styles.fieldInput}
                  value={location}
                  onChangeText={(t) => setLocation(t.slice(0, LOCATION_MAX))}
                  placeholder="City, State"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  maxLength={LOCATION_MAX}
                />
              </View>
              <Text style={styles.charCount}>
                {location.length}/{LOCATION_MAX}
              </Text>
            </View>
          </View>

          {/* About section */}
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.card}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>A SHORT VERSE, INTENTION, OR SENTENCE</Text>
              <View style={styles.fieldRow}>
                <View style={styles.fieldIcon}>
                  <Icon name="pencil-outline" size={13} color={Colors.accent} />
                </View>
                <TextInput
                  style={[styles.fieldInput, styles.bioInput]}
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
                  placeholder="Share something meaningful..."
                  placeholderTextColor={Colors.textLight}
                  multiline
                  maxLength={BIO_MAX}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.charCount}>
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  saveText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.primaryDark,
  },
  saveTextDisabled: {
    opacity: 0.4,
  },

  scroll: {
    paddingBottom: Spacing[12],
  },

  // Avatar
  avatarCenter: {
    alignItems: 'center',
    marginTop: Spacing[4],
    marginBottom: Spacing[6],
  },
  avatarRing: {
    width: AVATAR_TOTAL,
    height: AVATAR_TOTAL,
    borderRadius: AVATAR_TOTAL / 2,
    borderWidth: AVATAR_BORDER,
    borderColor: Colors.accent,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
    ...Shadows.sm,
  },
  changePhotoText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 1.5,
    marginTop: Spacing[2],
  },

  // Sections
  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 1.5,
    marginBottom: Spacing[3],
    marginHorizontal: Spacing[5],
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[6],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
  },

  // Fields
  fieldContainer: {
    paddingVertical: Spacing[1],
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 0,
    marginLeft: 26 + Spacing[3],
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
    marginTop: 5,
  },
  fieldInput: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    paddingVertical: Spacing[2],
    paddingHorizontal: 0,
  },
  bioInput: {
    minHeight: 60,
    fontWeight: Typography.regular,
    lineHeight: Typography.base * 1.5,
  },
  charCount: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: Spacing[1],
  },
  fieldSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing[2],
  },
});
