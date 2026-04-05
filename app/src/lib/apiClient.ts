import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Post, PostType, PrayerGroup, PrayerGroupCategory } from '../types';
import { API_BASE_URL } from './config';

// ─── Raw API shapes (snake_case) — private to this file ──────────────────────

interface ApiUser {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  parish?: string;
  diocese?: string;
  location?: string;
  friend_count: number;
  prayer_group_count: number;
  post_count: number;
  created_at: string;
  is_friend?: boolean;
  is_pending_friend?: boolean;
}

interface ApiPrayerGroupBrief {
  id: string;
  name: string;
  avatar_url?: string;
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
  prayer_group?: ApiPrayerGroupBrief | null;
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

export function mapUser(raw: ApiUser): User {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.display_name,
    bio: raw.bio,
    avatarUrl: raw.avatar_url,
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

function mapPrayerGroupBrief(raw: ApiPrayerGroupBrief): PrayerGroup {
  // Backend returns only brief info on embedded group; fill in zero-value defaults
  const stubAdmin: User = {
    id: '',
    username: '',
    displayName: '',
    friendCount: 0,
    prayerGroupCount: 0,
    createdAt: '',
  };
  return {
    id: raw.id,
    name: raw.name,
    description: '',
    category: 'general',
    avatarUrl: raw.avatar_url,
    memberCount: 0,
    postCount: 0,
    isPrivate: false,
    isMember: false,
    admin: stubAdmin,
    createdAt: '',
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
    prayerGroup: raw.prayer_group ? mapPrayerGroupBrief(raw.prayer_group) : undefined,
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
    parish?: string;
  }) {
    return apiFetch<ApiTokenResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Feed
  getFeed(cursor?: string) {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    return apiFetch<ApiFeedResponse>(`/feed?${params}`);
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
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    return apiFetch<ApiGroupsResponse>(`/prayer-groups?${params}`);
  },

  getMyGroups() {
    return apiFetch<{ groups: ApiPrayerGroup[] }>('/prayer-groups/mine');
  },

  joinGroup(groupId: string) {
    return apiFetch<{ status: 'pending' | 'member' }>(`/prayer-groups/${groupId}/join`, { method: 'POST' });
  },

  leaveGroup(groupId: string) {
    return apiFetch<{ success: boolean }>(`/prayer-groups/${groupId}/leave`, { method: 'DELETE' });
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
};
