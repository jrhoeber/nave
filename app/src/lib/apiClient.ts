import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Post, PostType, PrayerGroup, PrayerGroupCategory, Parish, MassScheduleEntry, ParishPost, ParishPostAuthor, ParishReactionType, GroupMessage, GroupMessageAuthor, MessageReaction, GroupMessageReactionEmoji } from '../types';
import { API_BASE_URL } from './config';

// ─── Raw API shapes (snake_case) — private to this file ──────────────────────

interface ApiUser {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  parish_id?: string;
  parish?: string;   // parish name, joined from parishes table
  diocese?: string;
  location?: string;
  friend_count: number;
  prayer_group_count: number;
  post_count: number;
  created_at: string;
  is_friend?: boolean;
  is_pending_friend?: boolean;
}

interface ApiParishBrief {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface ApiPost {
  id: string;
  author: ApiUser;
  type: PostType;
  content: string;
  image_url?: string;
  like_count: number;
  comment_count: number;
  prayer_count: number;
  is_liked: boolean;
  is_praying: boolean;
  created_at: string;
  parish?: ApiParishBrief | null;
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

interface ApiParish {
  id: string;
  name: string;
  city: string;
  state: string;
  diocese: string;
  member_count: number;
  street_address?: string;
  postal_code?: string;
  established?: number;
  cover_photo_url?: string;
  mass_schedule?: MassScheduleEntry[];
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
  created_at: string;
  reactions: Record<string, number>;
  user_reactions: string[];
}

interface ApiParishPostsResponse {
  posts: ApiParishPost[];
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

interface ApiTokenResponse {
  access_token: string;
  user: ApiUser;
}

interface ApiFeedResponse {
  posts: ApiPost[];
  next_cursor: string | null;
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
    streetAddress: raw.street_address,
    postalCode: raw.postal_code,
    established: raw.established,
    coverPhotoUrl: raw.cover_photo_url,
    massSchedule: raw.mass_schedule,
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
    diocese: raw.diocese,
    location: raw.location,
    friendCount: raw.friend_count,
    prayerGroupCount: raw.prayer_group_count,
    createdAt: raw.created_at,
    isFriend: raw.is_friend,
    isPendingFriend: raw.is_pending_friend,
  };
}

export function mapPost(raw: ApiPost): Post {
  return {
    id: raw.id,
    author: mapUser(raw.author),
    type: raw.type,
    content: raw.content,
    imageUrl: raw.image_url,
    likeCount: raw.like_count,
    commentCount: raw.comment_count,
    prayerCount: raw.prayer_count,
    isLiked: raw.is_liked,
    isPraying: raw.is_praying,
    createdAt: raw.created_at,
    parish: raw.parish
      ? { id: raw.parish.id, name: raw.parish.name, city: raw.parish.city, state: raw.parish.state }
      : undefined,
  };
}

export function mapPrayerGroup(raw: ApiPrayerGroup): PrayerGroup {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    avatarUrl: raw.avatar_url,
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
    createdAt: raw.created_at,
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

// ─── 401 handler ─────────────────────────────────────────────────────────────
// Registered by authStore after the store is created to avoid a circular import.

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

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
    try {
      const body = await response.json();
      if (body?.detail) {
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      }
    } catch {}
    throw new Error(detail);
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
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login(email: string, password: string) {
    return apiFetch<ApiTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  signup(data: {
    username: string;
    display_name: string;
    email: string;
    password: string;
    parish_id?: string;
  }) {
    return apiFetch<ApiTokenResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Feed
  getFeed(cursor?: string) {
    const query = cursor ? `limit=20&cursor=${encodeURIComponent(cursor)}` : 'limit=20';
    return apiFetch<ApiFeedResponse>(`/feed?${query}`);
  },

  likePost(postId: string) {
    return apiFetch<{ liked: boolean; like_count: number }>(`/feed/posts/${postId}/like`, { method: 'POST' });
  },

  unlikePost(postId: string) {
    return apiFetch<{ liked: boolean; like_count: number }>(`/feed/posts/${postId}/like`, { method: 'DELETE' });
  },

  prayPost(postId: string) {
    return apiFetch<{ praying: boolean; prayer_count: number }>(`/feed/posts/${postId}/pray`, { method: 'POST' });
  },

  unprayPost(postId: string) {
    return apiFetch<{ praying: boolean; prayer_count: number }>(`/feed/posts/${postId}/pray`, { method: 'DELETE' });
  },

  // Prayer groups
  getGroups(cursor?: string) {
    const query = cursor ? `limit=20&cursor=${encodeURIComponent(cursor)}` : 'limit=20';
    return apiFetch<ApiGroupsResponse>(`/prayer-groups?${query}`);
  },

  getMyGroups() {
    return apiFetch<{ groups: ApiPrayerGroup[] }>('/prayer-groups/mine');
  },

  searchParishGroups(parishName: string, search?: string) {
    const params = new URLSearchParams({ parish_name: parishName, limit: '50' });
    if (search) params.set('search', search);
    return apiFetch<ApiGroupsResponse>(`/prayer-groups?${params}`);
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
  }) {
    return apiFetch<ApiPrayerGroup>(`/prayer-groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
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

  createParishPost(parishId: string, content: string) {
    return apiFetch<ApiParishPost>(`/parishes/${parishId}/posts`, {
      method: 'POST',
      body: JSON.stringify({ content }),
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

  // Group messages
  getGroupMessages(groupId: string, cursor?: string, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return apiFetch<ApiGroupMessagesResponse>(`/prayer-groups/${groupId}/messages?${params}`);
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

  // Users
  getMe() {
    return apiFetch<ApiUser>('/users/me');
  },

  updateProfile(data: { parish_id?: string; bio?: string; location?: string; avatar_url?: string }) {
    return apiFetch<ApiUser>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar(uri: string, type: string) {
    const formData = new FormData();
    formData.append('file', { uri, type, name: 'avatar.jpg' } as unknown as Blob);
    return apiUpload<ApiUser>('/users/me/avatar', formData);
  },
};
