import { useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { ProfileView, AvatarRing, profileStyles, AVATAR_SIZE } from '../../components/profile/ProfileView';
import { SettingsModal } from '../../components/profile/SettingsModal';
import { EditProfileModal } from '../../components/profile/EditProfileModal';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';
import { Colors, Spacing } from '../../theme';
import type { RootNavigationProp } from '../../types/navigation';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const { user, updateUser, setAvatarReady } = useAuthStore();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);

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
      const updated = await api.uploadAvatar(asset.uri!, asset.type ?? 'image/jpeg');
      if (updated.avatar_url) {
        await updateUser({ avatarUrl: updated.avatar_url });
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!user) return null;

  return (
    <ProfileView
      testID="profile-scroll"
      user={user}
      paddingTop={insets.top + Spacing[4]}
      headerSlot={
        <TouchableOpacity
          onPress={() => setSettingsVisible(true)}
          style={[profileStyles.heroBtn, { alignSelf: 'flex-end' }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="settings-outline" size={22} color={Colors.accentLight} />
        </TouchableOpacity>
      }
      avatarSlot={
        <TouchableOpacity onPress={handleAvatarPress} disabled={avatarUploading} activeOpacity={0.85}>
          <AvatarRing uri={user.avatarUrl} name={user.displayName} onLoad={setAvatarReady} />
          <View style={profileStyles.cameraBadge}>
            {avatarUploading
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <Icon name="add" size={14} color={Colors.textInverse} />
            }
          </View>
        </TouchableOpacity>
      }
      actionSlot={
        <TouchableOpacity
          style={[profileStyles.actionBtn, { borderColor: Colors.accent }]}
          onPress={() => setEditProfileVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name="pencil-outline" size={14} color={Colors.accent} />
          <Text style={[profileStyles.actionBtnText, { color: Colors.accent }]}>Edit Profile</Text>
        </TouchableOpacity>
      }
      footerSlot={
        <>
          <SettingsModal
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
            onBlockedUsersPress={() => {
              setSettingsVisible(false);
              setTimeout(() => navigation.navigate('BlockedUsers'), 300);
            }}
          />
          <EditProfileModal visible={editProfileVisible} onClose={() => setEditProfileVisible(false)} />
        </>
      }
    />
  );
}
