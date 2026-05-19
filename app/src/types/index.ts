// ─── User ────────────────────────────────────────────────────────────────────

export interface MutualFriendBrief {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  parishId?: string;
  parish?: string;   // parish name, for display
  parishCity?: string;
  parishCoverPhotoUrl?: string;
  diocese?: string;
  location?: string;
  birthday?: string; // ISO date string YYYY-MM-DD; null until profile setup is complete
  friendCount: number;
  prayerGroupCount: number;
  createdAt: string;
  isFriend?: boolean;
  isPendingFriend?: boolean;
  mutualFriendCount?: number;
  mutualFriends?: MutualFriendBrief[];
  sharedGroupCount?: number;
  friendshipCreatedAt?: string;
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export type PostType = 'general' | 'prayer_request' | 'testimony' | 'event' | 'scripture';

export interface PostParish {
  id: string;
  name: string;
  city: string;
  state: string;
}

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
  parish?: PostParish;
}

// ─── Prayer Groups ────────────────────────────────────────────────────────────

export type PrayerGroupCategory =
  | 'bible_study'
  | 'mens_group'
  | 'womens_group'
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

// ─── Group Invitations ───────────────────────────────────────────────────────

export interface GroupInvitation {
  id: string;
  group: PrayerGroup;
  invitedBy: { id: string; displayName: string; avatarUrl?: string };
  invitedAt: string;
}

// ─── Communities (Parishes / Dioceses) ───────────────────────────────────────

export interface Parish {
  id: string;
  name: string;
  city: string;
  state: string;
  diocese: string;
  memberCount: number;
  groupCount: number;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  streetAddress?: string;
  postalCode?: string;
  established?: number;
  massSchedule?: string;
  website?: string;
  isParishAdmin?: boolean;
}

// ─── Parish Posts ─────────────────────────────────────────────────────────────

export interface ParishPostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ParishPost {
  id: string;
  parishId: string;
  author: ParishPostAuthor;
  content: string;
  status: 'Pending' | 'Posted' | 'Deleted' | 'Rejected';
  isAnnouncement: boolean;
  createdAt: string;
  reactionCount: number;
  userReacted: boolean;
  commentCount: number;
}

// ─── Parish Post Comments ────────────────────────────────────────────────────

export interface ParishComment {
  id: string;
  postId: string;
  author: ParishPostAuthor;
  content: string;
  status: 'Pending' | 'Posted' | 'Deleted' | 'Rejected';
  replyToId?: string;
  replyToAuthor?: ParishPostAuthor;
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  userReacted: boolean;
}

// ─── Group Messages ───────────────────────────────────────────────────────────

export interface GroupMessageAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  author: GroupMessageAuthor;
  content?: string;
  imageUrl?: string;
  // Local file URI for an image just sent by the current user this session.
  // Held alongside `imageUrl` (which becomes the GCS URL after upload) so the
  // rendered URI stays stable across the optimistic→server swap and the image
  // doesn't blink. Not persisted; absent on messages fetched from the server.
  localImageUrl?: string;
  reactionCount: number;
  userReacted: boolean;
  createdAt: string;
  pending?: boolean;
}

// ─── Friends ─────────────────────────────────────────────────────────────────

export interface FriendUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  parish?: string;
  prayerGroupCount: number;
}

export interface Friendship {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  isRequester: boolean;
  createdAt: string;
  user: FriendUser;
}

export interface FriendSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  parish?: string;
  friendshipId?: string;
  friendshipStatus?: 'pending' | 'accepted' | 'rejected';
  isRequester?: boolean;
}

// ─── Blocks ──────────────────────────────────────────────────────────────────

export interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  blockedAt: string;
}

