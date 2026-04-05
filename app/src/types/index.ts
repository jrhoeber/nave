// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  parishId?: string;
  parish?: string;   // parish name, for display
  diocese?: string;
  location?: string;
  friendCount: number;
  prayerGroupCount: number;
  createdAt: string;
  isFriend?: boolean;
  isPendingFriend?: boolean;
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export type PostType = 'general' | 'prayer_request' | 'testimony' | 'event' | 'scripture';

export interface Post {
  id: string;
  author: User;
  type: PostType;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  prayerCount: number;
  isLiked: boolean;
  isPraying: boolean;
  createdAt: string;
  prayerGroup?: PrayerGroup;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

// ─── Prayer Groups ────────────────────────────────────────────────────────────

export type PrayerGroupCategory =
  | 'rosary'
  | 'scripture_study'
  | 'mens_group'
  | 'womens_group'
  | 'youth'
  | 'young_adults'
  | 'families'
  | 'devotional'
  | 'general';

export interface PrayerGroup {
  id: string;
  name: string;
  description: string;
  category: PrayerGroupCategory;
  avatarUrl?: string;
  memberCount: number;
  postCount: number;
  isPrivate: boolean;
  isMember: boolean;
  isPendingApproval?: boolean;
  admin: User;
  parish?: string;
  diocese?: string;
  meetingSchedule?: string;
  createdAt: string;
}

// ─── Communities (Parishes / Dioceses) ───────────────────────────────────────

export interface Parish {
  id: string;
  name: string;
  city: string;
  state: string;
  diocese: string;
  memberCount: number;
  avatarUrl?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'post_like'
  | 'post_comment'
  | 'prayer_group_invite'
  | 'prayer_group_post'
  | 'prayer_received';

export interface Notification {
  id: string;
  type: NotificationType;
  actor: User;
  message: string;
  isRead: boolean;
  createdAt: string;
  targetId?: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
};

export type AuthStackParamList = {
  welcome: undefined;
  login: undefined;
  signup: undefined;
};

export type TabParamList = {
  index: undefined;
  prayer: undefined;
  community: undefined;
  friends: undefined;
  profile: undefined;
};

export type FeedStackParamList = {
  feed: undefined;
  'post-detail': { postId: string };
  'user-profile': { userId: string };
};

export type PrayerStackParamList = {
  'prayer-groups': undefined;
  'prayer-group-detail': { groupId: string };
  'create-prayer-group': undefined;
};
