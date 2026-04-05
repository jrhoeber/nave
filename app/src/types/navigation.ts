import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  PostDetail: { id: string };
  UserProfile: { id: string };
  PrayerGroupDetail: { id: string };
  Compose: { postType?: string } | undefined;
  CreatePrayerGroup: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
};

export type AppTabParamList = {
  Feed: undefined;
  Groups: undefined;
  Parish: undefined;
  Friends: undefined;
  Profile: undefined;
};

// Convenience types for screens inside tabs that also need root stack navigation
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export type PostDetailRouteProp = RouteProp<RootStackParamList, 'PostDetail'>;
export type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;
export type PrayerGroupDetailRouteProp = RouteProp<RootStackParamList, 'PrayerGroupDetail'>;
export type ComposeRouteProp = RouteProp<RootStackParamList, 'Compose'>;
