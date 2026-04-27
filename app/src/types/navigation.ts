import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  ProfileSetup: undefined;
  ParishSetup: undefined;
  App: undefined;
  UserProfile: { id: string };
  GroupMessage: { id: string };
  GroupProfile: { id: string };
  CreateGroup: undefined;
  BlockedUsers: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
};

export type AppTabParamList = {
  Parish: undefined;
  Groups: undefined;
  Friends: undefined;
  Profile: undefined;
};

// Convenience types for screens inside tabs that also need root stack navigation
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;
export type GroupMessageRouteProp = RouteProp<RootStackParamList, 'GroupMessage'>;
export type GroupProfileRouteProp = RouteProp<RootStackParamList, 'GroupProfile'>;
