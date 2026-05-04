import { create } from 'zustand';
import type { Post } from '../types';
import { api, mapPost } from '../lib/apiClient';

interface FeedState {
  posts: Post[];
  isLoading: boolean;
  hasFetched: boolean;
  lastFetchedAt: number;
  hasMore: boolean;
  cursor: string | null;
  fetchFeed: () => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  togglePraying: (postId: string) => Promise<void>;
  clearAll: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  isLoading: false,
  hasFetched: false,
  lastFetchedAt: 0,
  hasMore: true,
  cursor: null,

  fetchFeed: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const data = await api.getFeed();
      set({
        posts: data.posts.map(mapPost),
        hasMore: data.next_cursor !== null,
        cursor: data.next_cursor,
        isLoading: false,
        hasFetched: true,
        lastFetchedAt: Date.now(),
      });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleLike: async (postId: string) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked;
    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !wasLiked, likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1 }
          : p,
      ),
    }));
    try {
      const result = wasLiked ? await api.unlikePost(postId) : await api.likePost(postId);
      // Reconcile count with server
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, likeCount: result.like_count } : p,
        ),
      }));
    } catch {
      // Roll back on failure
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, isLiked: wasLiked, likeCount: wasLiked ? p.likeCount + 1 : p.likeCount - 1 }
            : p,
        ),
      }));
    }
  },

  clearAll: () => {
    set({ posts: [], isLoading: false, hasFetched: false, lastFetchedAt: 0, hasMore: true, cursor: null });
  },

  togglePraying: async (postId: string) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const wasPraying = post.isPraying;
    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, isPraying: !wasPraying, prayerCount: wasPraying ? p.prayerCount - 1 : p.prayerCount + 1 }
          : p,
      ),
    }));
    try {
      const result = wasPraying ? await api.unprayPost(postId) : await api.prayPost(postId);
      // Reconcile count with server
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, prayerCount: result.prayer_count } : p,
        ),
      }));
    } catch {
      // Roll back on failure
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, isPraying: wasPraying, prayerCount: wasPraying ? p.prayerCount + 1 : p.prayerCount - 1 }
            : p,
        ),
      }));
    }
  },
}));
