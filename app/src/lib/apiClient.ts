import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, PrayerGroup, PrayerGroupCategory, Parish, ParishPost, ParishPostAuthor, ParishReactionType, ParishComment, GroupMessage, GroupMessageAuthor, MessageReaction, GroupMessageReactionEmoji, Friendship, FriendSearchResult, BlockedUser, GroupInvitation } from '../types';
import { API_BASE_URL } from './config';

// ─── Raw API shapes (snake_case) — private to this file ──────────────────────

interface ApiMutualFriendBrief {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface ApiUser {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  parish_id?: string;
  parish?: string;   // parish name, joined from parishes table
  parish_city?: string;
  parish_cover_photo_url?: string;
  diocese?: string;
  location?: string;
  birthday?: string;
  friend_count: number;
  prayer_group_count: number;
  post_count: number;
  created_at: string;
  is_friend?: boolean;
  is_pending_friend?: boolean;
  mutual_friend_count?: number;
  mutual_friends?: ApiMutualFriendBrief[];
  shared_group_count?: number;
  friendship_created_at?: string;
}

interface ApiPrayerGroup {
  id: string;
  name: string;
  description: string;
  category: PrayerGroupCategory;
  avatar_url?: string;
  member_count: number;
  post_count: number;
  is_private: boolean;
  is_member: boolean;
  is_pending_approval?: boolean;
  admin: ApiUser;
  parish?: string;
  diocese?: string;
  meeting_schedule?: string;
  created_at: string;
}

interface ApiGroupInvitation {
  id: string;
  group: ApiPrayerGroup;
  invited_by: { id: string; display_name: string; avatar_url?: string };
  invited_at: string;
}

interface ApiParish {
  id: string;
  name: string;
  city: string;
  state: string;
  diocese: string;
  member_count: number;
  group_count: number;
  street_address?: string;
  postal_code?: string;
  established?: number;
  cover_photo_url?: string;
  mass_schedule?: string;
  website?: string;
  is_parish_admin?: boolean;
}

interface ApiParishPostAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface ApiParishPost {
  id: string;
  parish_id: string;
  author: ApiParishPostAuthor;
  content: string;
  status: 'Pending' | 'Posted' | 'Deleted' | 'Rejected';
  is_announcement: boolean;
  created_at: string;
  reactions: Record<string, number>;
  user_reactions: string[];
  comment_count: number;
}

interface ApiParishPostsResponse {
  posts: ApiParishPost[];
  next_cursor: string | null;
}

interface ApiParishComment {
  id: string;
  post_id: string;
  author: ApiParishPostAuthor;
  content: string;
  status: 'Pending' | 'Posted' | 'Deleted' | 'Rejected';
  reply_to_id?: string;
  reply_to_author?: ApiParishPostAuthor;
  created_at: string;
  updated_at: string;
  reactions: Record<string, number>;
  user_reactions: string[];
}

interface ApiParishCommentsResponse {
  comments: ApiParishComment[];
  total_count: number;
  next_cursor: string | null;
}

interface ApiReactionResponse {
  reactions: Record<string, number>;
  user_reactions: string[];
}

interface ApiGroupMessageAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface ApiMessageReaction {
  emoji: string;
  count: number;
  user_reacted: boolean;
}

interface ApiGroupMessage {
  id: string;
  group_id: string;
  author: ApiGroupMessageAuthor;
  content?: string;
  image_url?: string;
  reactions: ApiMessageReaction[];
  created_at: string;
}

interface ApiGroupMessagesResponse {
  messages: ApiGroupMessage[];
  next_cursor: string | null;
}

interface ApiFriendUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  parish?: string;
  prayer_group_count: number;
}

interface ApiFriendship {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_requester: boolean;
  created_at: string;
  user: ApiFriendUser;
}

interface ApiFriendSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  parish?: string;
  friendship_id?: string;
  friendship_status?: 'pending' | 'accepted' | 'rejected';
  is_requester?: boolean;
}

interface ApiBlockedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  blocked_at: string;
}

interface ApiTokenResponse {
  access_token: string;
  user: ApiUser;
  is_new_user: boolean;
}

interface ApiGroupsResponse {
  groups: ApiPrayerGroup[];
  next_cursor: string | null;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function mapParish(raw: ApiParish): Parish {
  return {
    id: raw.id,
    name: raw.name,
    city: raw.city,
    state: raw.state,
    diocese: raw.diocese,
    memberCount: raw.member_count,
    groupCount: raw.group_count,
    streetAddress: raw.street_address,
    postalCode: raw.postal_code,
    established: raw.established,
    coverPhotoUrl: raw.cover_photo_url?.startsWith('http') ? raw.cover_photo_url : undefined,
    massSchedule: raw.mass_schedule,
    website: raw.website,
    isParishAdmin: raw.is_parish_admin,
  };
}

export function mapUser(raw: ApiUser): User {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.display_name,
    bio: raw.bio,
    avatarUrl: raw.avatar_url?.startsWith('http') ? raw.avatar_url : undefined,
    parishId: raw.parish_id,
    parish: raw.parish,
    parishCity: raw.parish_city,
    parishCoverPhotoUrl: raw.parish_cover_photo_url,
    diocese: raw.diocese,
    location: raw.location,
    birthday: raw.birthday,
    friendCount: raw.friend_count,
    prayerGroupCount: raw.prayer_group_count,
    createdAt: raw.created_at,
    isFriend: raw.is_friend,
    isPendingFriend: raw.is_pending_friend,
    mutualFriendCount: raw.mutual_friend_count,
    mutualFriends: raw.mutual_friends?.map((m) => ({
      id: m.id,
      displayName: m.display_name,
      avatarUrl: m.avatar_url?.startsWith('http') ? m.avatar_url : undefined,
    })),
    sharedGroupCount: raw.shared_group_count,
    friendshipCreatedAt: raw.friendship_created_at,
  };
}

export function mapPrayerGroup(raw: ApiPrayerGroup): PrayerGroup {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    avatarUrl: raw.avatar_url?.startsWith('http') ? raw.avatar_url : undefined,
    memberCount: raw.member_count,
    postCount: raw.post_count,
    isPrivate: raw.is_private,
    isMember: raw.is_member,
    isPendingApproval: raw.is_pending_approval,
    admin: mapUser(raw.admin),
    parish: raw.parish,
    diocese: raw.diocese,
    meetingSchedule: raw.meeting_schedule,
    createdAt: raw.created_at,
  };
}

export function mapGroupInvitation(raw: ApiGroupInvitation): GroupInvitation {
  return {
    id: raw.id,
    group: mapPrayerGroup(raw.group),
    invitedBy: {
      id: raw.invited_by.id,
      displayName: raw.invited_by.display_name,
      avatarUrl: raw.invited_by.avatar_url?.startsWith('http') ? raw.invited_by.avatar_url : undefined,
    },
    invitedAt: raw.invited_at,
  };
}

export function mapParishPost(raw: ApiParishPost): ParishPost {
  const author: ParishPostAuthor = {
    id: raw.author.id,
    username: raw.author.username,
    displayName: raw.author.display_name,
    avatarUrl: raw.author.avatar_url?.startsWith('http') ? raw.author.avatar_url : undefined,
  };
  const defaultReactions: Record<ParishReactionType, number> = { '👍': 0, '🙏': 0, '❤️': 0 };
  return {
    id: raw.id,
    parishId: raw.parish_id,
    author,
    content: raw.content,
    status: raw.status,
    isAnnouncement: raw.is_announcement ?? false,
    createdAt: raw.created_at,
    reactions: { ...defaultReactions, ...(raw.reactions ?? {}) } as Record<ParishReactionType, number>,
    userReactions: (raw.user_reactions ?? []) as ParishReactionType[],
    commentCount: raw.comment_count ?? 0,
  };
}

function mapParishPostAuthor(raw: ApiParishPostAuthor): ParishPostAuthor {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.display_name,
    avatarUrl: raw.avatar_url?.startsWith('http') ? raw.avatar_url : undefined,
  };
}

export function mapParishComment(raw: ApiParishComment): ParishComment {
  const defaultReactions: Record<ParishReactionType, number> = { '👍': 0, '🙏': 0, '❤️': 0 };
  return {
    id: raw.id,
    postId: raw.post_id,
    author: mapParishPostAuthor(raw.author),
    content: raw.content,
    status: raw.status,
    replyToId: raw.reply_to_id,
    replyToAuthor: raw.reply_to_author ? mapParishPostAuthor(raw.reply_to_author) : undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    reactions: { ...defaultReactions, ...(raw.reactions ?? {}) } as Record<ParishReactionType, number>,
    userReactions: (raw.user_reactions ?? []) as ParishReactionType[],
  };
}

export function mapGroupMessageAuthor(raw: ApiGroupMessageAuthor): GroupMessageAuthor {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.display_name,
    avatarUrl: raw.avatar_url?.startsWith('http') ? raw.avatar_url : undefined,
  };
}

export function mapMessageReaction(raw: ApiMessageReaction): MessageReaction {
  return {
    emoji: raw.emoji as GroupMessageReactionEmoji,
    count: raw.count,
    userReacted: raw.user_reacted,
  };
}

export function mapGroupMessage(raw: ApiGroupMessage): GroupMessage {
  return {
    id: raw.id,
    groupId: raw.group_id,
    author: mapGroupMessageAuthor(raw.author),
    content: raw.content,
    imageUrl: raw.image_url,
    reactions: (raw.reactions ?? []).map(mapMessageReaction),
    createdAt: raw.created_at,
  };
}

function mapFriendUser(raw: ApiFriendUser): Friendship['user'] {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.display_name,
    avatarUrl: raw.avatar_url?.startsWith('http') ? raw.avatar_url : undefined,
    parish: raw.parish,
    prayerGroupCount: raw.prayer_group_count,
  };
}

export function mapFriendship(raw: ApiFriendship): Friendship {
  return {
    id: raw.id,
    status: raw.status,
    isRequester: raw.is_requester,
    createdAt: raw.created_at,
    user: mapFriendUser(raw.user),
  };
}

export function mapBlockedUser(raw: ApiBlockedUser): BlockedUser {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.display_name,
    avatarUrl: raw.avatar_url?.startsWith('http') ? raw.avatar_url : undefined,
    blockedAt: raw.blocked_at,
  };
}

export function mapFriendSearchResult(raw: ApiFriendSearchResult): FriendSearchResult {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.display_name,
    avatarUrl: raw.avatar_url?.startsWith('http') ? raw.avatar_url : undefined,
    parish: raw.parish,
    friendshipId: raw.friendship_id,
    friendshipStatus: raw.friendship_status,
    isRequester: raw.is_requester,
  };
}

// ─── 401 handler ─────────────────────────────────────────────────────────────
// Registered by authStore after the store is created to avoid a circular import.

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(API_BASE_URL + path, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
      throw new Error('Session expired');
    }
    let detail = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') {
        detail = body.detail;
      } else if (typeof body?.detail === 'object' && body.detail !== null) {
        detail = body.detail.message ?? JSON.stringify(body.detail);
        code = body.detail.code;
      }
    } catch {}
    throw new ApiError(response.status, detail, code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Do NOT set Content-Type — the browser/RN sets it with the multipart boundary.
  const response = await fetch(API_BASE_URL + path, { method: 'POST', headers, body: formData });

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
      throw new Error('Session expired');
    }
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) {
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      }
    } catch {}
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  firebaseAuth(idToken: string) {
    return apiFetch<ApiTokenResponse>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
  },

  // Prayer groups
  getMyGroups() {
    return apiFetch<{ groups: ApiPrayerGroup[] }>('/prayer-groups/mine');
  },

  searchParishGroups(parishName: string, search?: string) {
    const params = new URLSearchParams({ parish_name: parishName, limit: '50' });
    if (search) params.set('search', search);
    return apiFetch<ApiGroupsResponse>(`/prayer-groups?${params}`);
  },

  getGroup(groupId: string) {
    return apiFetch<ApiPrayerGroup>(`/prayer-groups/${groupId}`);
  },

  joinGroup(groupId: string) {
    return apiFetch<{ status: 'pending' | 'member' }>(`/prayer-groups/${groupId}/join`, { method: 'POST' });
  },

  leaveGroup(groupId: string) {
    return apiFetch<{ success: boolean }>(`/prayer-groups/${groupId}/leave`, { method: 'DELETE' });
  },

  getGroupMembers(groupId: string) {
    return apiFetch<{ members: Array<{ id: string; username: string; display_name: string; avatar_url?: string; joined_at: string }> }>(`/prayer-groups/${groupId}/members`);
  },

  createGroup(data: {
    name: string;
    description: string;
    category: PrayerGroupCategory;
    is_private: boolean;
    meeting_schedule?: string;
    parish?: string;
  }) {
    return apiFetch<ApiPrayerGroup>('/prayer-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteGroup(groupId: string) {
    return apiFetch<{ success: boolean }>(`/prayer-groups/${groupId}`, { method: 'DELETE' });
  },

  updateGroup(groupId: string, data: {
    name?: string;
    description?: string;
    category?: PrayerGroupCategory;
    is_private?: boolean;
    meeting_schedule?: string;
    parish?: string;
  }) {
    return apiFetch<ApiPrayerGroup>(`/prayer-groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  uploadGroupAvatar(groupId: string, uri: string, type: string) {
    const formData = new FormData();
    formData.append('file', { uri, type, name: 'avatar.jpg' } as unknown as Blob);
    return apiUpload<ApiPrayerGroup>(`/prayer-groups/${groupId}/avatar`, formData);
  },

  removeGroupAvatar(groupId: string) {
    return apiFetch<ApiPrayerGroup>(`/prayer-groups/${groupId}/avatar`, { method: 'DELETE' });
  },

  getPendingMembers(groupId: string) {
    return apiFetch<{ members: Array<{ id: string; username: string; display_name: string; avatar_url?: string; requested_at: string }> }>(`/prayer-groups/${groupId}/members/pending`);
  },

  approveMember(groupId: string, userId: string) {
    return apiFetch<{ status: string }>(`/prayer-groups/${groupId}/members/${userId}/approve`, { method: 'POST' });
  },

  removeMember(groupId: string, userId: string) {
    return apiFetch<{ success: boolean }>(`/prayer-groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },

  addMember(groupId: string, userId: string) {
    return apiFetch<{ status: 'member' | 'pending' | 'invited' }>(`/prayer-groups/${groupId}/members/${userId}`, { method: 'POST' });
  },

  getMyInvitations() {
    return apiFetch<{ invitations: ApiGroupInvitation[] }>('/prayer-groups/invitations');
  },

  acceptInvitation(groupId: string) {
    return apiFetch<{ status: 'member' | 'pending' }>(`/prayer-groups/${groupId}/invitations/accept`, { method: 'POST' });
  },

  declineInvitation(groupId: string) {
    return apiFetch<{ success: boolean }>(`/prayer-groups/${groupId}/invitations/decline`, { method: 'POST' });
  },

  getPendingInvitations(groupId: string) {
    return apiFetch<{ invitations: Array<{ invitation_id: string; id: string; username: string; display_name: string; avatar_url?: string; inviter_display_name: string; requested_at: string }> }>(`/prayer-groups/${groupId}/invitations/pending`);
  },

  approveInvitation(groupId: string, userId: string) {
    return apiFetch<{ status: string }>(`/prayer-groups/${groupId}/invitations/${userId}/approve`, { method: 'POST' });
  },

  declineInvitationApproval(groupId: string, userId: string) {
    return apiFetch<{ success: boolean }>(`/prayer-groups/${groupId}/invitations/${userId}/decline-approval`, { method: 'POST' });
  },

  // Parishes
  searchParishes(q: string) {
    return apiFetch<{ parishes: ApiParish[] }>(`/parishes/search?q=${encodeURIComponent(q)}&limit=10`);
  },

  getParish(id: string) {
    return apiFetch<ApiParish>(`/parishes/${id}`);
  },

  // Parish posts
  getParishPosts(parishId: string, cursor?: string) {
    const query = cursor ? `limit=10&cursor=${encodeURIComponent(cursor)}` : 'limit=10';
    return apiFetch<ApiParishPostsResponse>(`/parishes/${parishId}/posts?${query}`);
  },

  updateParish(parishId: string, data: { website?: string; mass_schedule?: string; cover_photo_url?: string }) {
    return apiFetch<ApiParish>(`/parishes/${parishId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  uploadParishCoverPhoto(parishId: string, uri: string, type: string) {
    const formData = new FormData();
    formData.append('file', { uri, type, name: 'cover.jpg' } as unknown as Blob);
    return apiUpload<{ cover_photo_url: string }>(`/parishes/${parishId}/cover-photo`, formData);
  },

  createParishPost(parishId: string, content: string, isAnnouncement = false) {
    return apiFetch<ApiParishPost>(`/parishes/${parishId}/posts`, {
      method: 'POST',
      body: JSON.stringify({ content, is_announcement: isAnnouncement }),
    });
  },

  updateParishPost(parishId: string, postId: string, content: string) {
    return apiFetch<ApiParishPost>(`/parishes/${parishId}/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },

  deleteParishPost(parishId: string, postId: string) {
    return apiFetch<void>(`/parishes/${parishId}/posts/${postId}`, { method: 'DELETE' });
  },

  addParishPostReaction(parishId: string, postId: string, reaction: ParishReactionType) {
    return apiFetch<ApiReactionResponse>(`/parishes/${parishId}/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
  },

  removeParishPostReaction(parishId: string, postId: string, reaction: ParishReactionType) {
    return apiFetch<ApiReactionResponse>(`/parishes/${parishId}/posts/${postId}/reactions/${encodeURIComponent(reaction)}`, {
      method: 'DELETE',
    });
  },

  // Parish post comments
  getParishPostComments(parishId: string, postId: string, cursor?: string) {
    const query = cursor ? `limit=30&cursor=${encodeURIComponent(cursor)}` : 'limit=30';
    return apiFetch<ApiParishCommentsResponse>(`/parishes/${parishId}/posts/${postId}/comments?${query}`);
  },

  createParishPostComment(parishId: string, postId: string, content: string, replyToId?: string) {
    return apiFetch<ApiParishComment>(`/parishes/${parishId}/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, reply_to_id: replyToId }),
    });
  },

  updateParishPostComment(parishId: string, postId: string, commentId: string, content: string) {
    return apiFetch<ApiParishComment>(`/parishes/${parishId}/posts/${postId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },

  deleteParishPostComment(parishId: string, postId: string, commentId: string) {
    return apiFetch<void>(`/parishes/${parishId}/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
  },

  toggleParishCommentReaction(parishId: string, postId: string, commentId: string, reaction: ParishReactionType) {
    return apiFetch<ApiReactionResponse>(`/parishes/${parishId}/posts/${postId}/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
  },

  // Group messages
  getGroupMessages(groupId: string, cursor?: string, limit = 50, after?: string) {
    let query = `limit=${limit}`;
    if (cursor) query += `&cursor=${encodeURIComponent(cursor)}`;
    if (after) query += `&after=${encodeURIComponent(after)}`;
    return apiFetch<ApiGroupMessagesResponse>(`/prayer-groups/${groupId}/messages?${query}`);
  },

  sendGroupMessage(groupId: string, content: string) {
    return apiFetch<ApiGroupMessage>(`/prayer-groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  sendGroupImageMessage(groupId: string, imageObjectName: string, content?: string) {
    return apiFetch<ApiGroupMessage>(`/prayer-groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ image_url: imageObjectName, content: content ?? null }),
    });
  },

  uploadGroupMessageImage(groupId: string, uri: string, type: string) {
    const formData = new FormData();
    formData.append('file', { uri, type, name: 'photo.jpg' } as unknown as Blob);
    return apiUpload<{ object_name: string; url: string | null }>(
      `/prayer-groups/${groupId}/messages/upload-image`,
      formData,
    );
  },

  deleteGroupMessage(groupId: string, messageId: string) {
    return apiFetch<void>(`/prayer-groups/${groupId}/messages/${messageId}`, { method: 'DELETE' });
  },

  toggleGroupMessageReaction(groupId: string, messageId: string, emoji: string) {
    return apiFetch<ApiMessageReaction[]>(
      `/prayer-groups/${groupId}/messages/${messageId}/reactions`,
      { method: 'POST', body: JSON.stringify({ emoji }) },
    );
  },

  // Friends
  getFriends() {
    return apiFetch<{ friends: ApiFriendship[] }>('/friends');
  },

  getIncomingRequests() {
    return apiFetch<{ requests: ApiFriendship[] }>('/friends/requests/incoming');
  },

  searchFriends(q: string) {
    return apiFetch<{ users: ApiFriendSearchResult[] }>(`/friends/search?q=${encodeURIComponent(q)}&limit=20`);
  },

  sendFriendRequest(addresseeId: string) {
    return apiFetch<{ message: string }>('/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ addressee_id: addresseeId }),
    });
  },

  respondToFriendRequest(friendshipId: string, status: 'accepted' | 'rejected') {
    return apiFetch<{ status: string }>(`/friends/requests/${friendshipId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  removeFriendship(friendshipId: string) {
    return apiFetch<void>(`/friends/${friendshipId}`, { method: 'DELETE' });
  },

  // Blocks
  blockUser(blockedId: string) {
    return apiFetch<{ message: string }>('/blocks', {
      method: 'POST',
      body: JSON.stringify({ blocked_id: blockedId }),
    });
  },

  unblockUser(blockedId: string) {
    return apiFetch<void>(`/blocks/${blockedId}`, { method: 'DELETE' });
  },

  getBlockedUsers() {
    return apiFetch<{ blocked_users: ApiBlockedUser[] }>('/blocks');
  },

  // Notifications
  registerDeviceToken(token: string, platform: 'ios' | 'android') {
    return apiFetch<void>('/notifications/device-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  },

  unregisterDeviceToken(token: string, platform: 'ios' | 'android') {
    return apiFetch<void>('/notifications/device-token', {
      method: 'DELETE',
      body: JSON.stringify({ token, platform }),
    });
  },

  getUnreadNotificationCount() {
    return apiFetch<{ count: number }>('/notifications/unread-count');
  },

  markNotificationsRead(filter: { type?: string; entityId?: string } = {}) {
    return apiFetch<{ updated: number; count: number }>('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({
        type: filter.type,
        entity_id: filter.entityId,
      }),
    });
  },

  getNotificationPreferences() {
    return apiFetch<{ push_notifications_enabled: boolean; notify_group_messages: boolean; notify_friend_requests: boolean }>('/notifications/preferences');
  },

  updateNotificationPreferences(prefs: {
    push_notifications_enabled?: boolean;
    notify_group_messages?: boolean;
    notify_friend_requests?: boolean;
  }) {
    return apiFetch<{ push_notifications_enabled: boolean; notify_group_messages: boolean; notify_friend_requests: boolean }>(
      '/notifications/preferences',
      { method: 'PATCH', body: JSON.stringify(prefs) },
    );
  },

  getGroupMuteStatus(groupId: string) {
    return apiFetch<{ muted: boolean }>(`/notifications/prayer-groups/${groupId}/mute`);
  },

  muteGroup(groupId: string) {
    return apiFetch<void>(`/notifications/prayer-groups/${groupId}/mute`, { method: 'POST' });
  },

  unmuteGroup(groupId: string) {
    return apiFetch<void>(`/notifications/prayer-groups/${groupId}/mute`, { method: 'DELETE' });
  },

  // Reports
  reportContent(contentType: 'post' | 'group_message' | 'comment', contentId: string, reason: string) {
    return apiFetch<{ id: string }>('/reports', {
      method: 'POST',
      body: JSON.stringify({ content_type: contentType, content_id: contentId, reason }),
    });
  },

  // Users
  getMe() {
    return apiFetch<ApiUser>('/users/me');
  },

  getUser(id: string) {
    return apiFetch<ApiUser>(`/users/${id}`);
  },

  updateProfile(data: { display_name?: string; username?: string; parish_id?: string; bio?: string; location?: string; avatar_url?: string; birthday?: string }) {
    return apiFetch<ApiUser>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  checkUsernameAvailable(username: string) {
    return apiFetch<{ available: boolean; reason: string | null }>(
      `/users/username-available?username=${encodeURIComponent(username)}`,
    );
  },

  uploadAvatar(uri: string, type: string) {
    const formData = new FormData();
    formData.append('file', { uri, type, name: 'avatar.jpg' } as unknown as Blob);
    return apiUpload<ApiUser>('/users/me/avatar', formData);
  },

  deleteAccount() {
    return apiFetch<void>('/users/me', { method: 'DELETE' });
  },
};
