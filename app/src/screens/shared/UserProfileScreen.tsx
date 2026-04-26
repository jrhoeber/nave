import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileView, AvatarRing, profileStyles } from '../../components/profile/ProfileView';
import { useFriendsStore } from '../../store/friendsStore';
import { useBlocksStore } from '../../store/blocksStore';
import { api, mapUser } from '../../lib/apiClient';
import { Colors, Spacing } from '../../theme';
import type { User } from '../../types';
import type { UserProfileRouteProp } from '../../types/navigation';

export function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<UserProfileRouteProp>();
  const { friends, removeFriend } = useFriendsStore();
  const { blockUser } = useBlocksStore();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const friendship = friends.find((f) => f.user.id === route.params.id);
  const isFriend = !!friendship;

  useEffect(() => {
    (async () => {
      try {
        const raw = await api.getUser(route.params.id);
        const mapped = mapUser(raw);
        setUser(mapped);
        setIsPending(!!mapped.isPendingFriend);
      } catch {
        Alert.alert('Error', 'Could not load profile.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params.id]);

  const handleRemoveFriend = async () => {
    if (!friendship) return;
    setActionLoading(true);
    try {
      await removeFriend(friendship.id);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not remove friend. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await api.sendFriendRequest(route.params.id);
      setIsPending(true);
    } catch {
      Alert.alert('Error', 'Could not send friend request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      `Block ${user?.displayName ?? 'User'}`,
      'They won\'t be able to see your profile or send you friend requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(route.params.id);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Could not block user. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleKebabPress = () => {
    Alert.alert(
      user?.displayName ?? 'User',
      undefined,
      [
        { text: 'Block User', style: 'destructive', onPress: handleBlockUser },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const actionIcon = isFriend ? 'person-remove-outline' : 'person-add-outline';
  const actionLabel = isFriend ? 'Remove Friend' : isPending ? 'Pending' : 'Add Friend';
  const actionColor = isFriend ? Colors.error : Colors.accent;
  const actionDisabled = (isPending && !isFriend) || actionLoading;

  // Show a minimal loading state while profile fetches
  if (loading || !user) {
    return (
      <ProfileView
        user={{ id: '', username: '', displayName: '', friendCount: 0, prayerGroupCount: 0, createdAt: '' }}
        paddingTop={insets.top + Spacing[4]}
        headerSlot={
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[profileStyles.heroBtn, { alignSelf: 'flex-start' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="chevron-back" size={24} color={Colors.accentLight} />
          </TouchableOpacity>
        }
        avatarSlot={<AvatarRing name="" />}
        actionSlot={<ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing[4] }} />}
      />
    );
  }

  return (
    <ProfileView
      user={user}
      paddingTop={insets.top + Spacing[4]}
      headerSlot={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={profileStyles.heroBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="chevron-back" size={24} color={Colors.accentLight} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleKebabPress}
            style={profileStyles.heroBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="ellipsis-horizontal" size={24} color={Colors.accentLight} />
          </TouchableOpacity>
        </View>
      }
      avatarSlot={<AvatarRing uri={user.avatarUrl} name={user.displayName} />}
      actionSlot={
        <TouchableOpacity
          style={[
            profileStyles.actionBtn,
            { borderColor: actionDisabled ? Colors.border : actionColor },
          ]}
          onPress={isFriend ? handleRemoveFriend : handleAddFriend}
          disabled={actionDisabled}
          activeOpacity={0.7}
        >
          {actionLoading
            ? <ActivityIndicator size="small" color={actionColor} />
            : <>
                <Icon name={actionIcon} size={14} color={actionDisabled ? Colors.textLight : actionColor} />
                <Text style={[profileStyles.actionBtnText, { color: actionDisabled ? Colors.textLight : actionColor }]}>
                  {actionLabel}
                </Text>
              </>
          }
        </TouchableOpacity>
      }
    />
  );
}
