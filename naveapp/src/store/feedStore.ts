import { create } from 'zustand';
import type { Post } from '../../types';

interface FeedState {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  fetchFeed: () => Promise<void>;
  toggleLike: (postId: string) => void;
  togglePraying: (postId: string) => void;
}

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    author: {
      id: '2',
      username: 'sister_teresa',
      displayName: 'Sister Teresa',
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
      parish: 'Holy Family Parish',
      friendCount: 142,
      prayerGroupCount: 5,
      createdAt: new Date().toISOString(),
    },
    type: 'scripture',
    content:
      '"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." — Proverbs 3:5-6\n\nMay this verse bring peace to whoever needs it today. 🕊️',
    likeCount: 48,
    commentCount: 7,
    prayerCount: 32,
    isLiked: false,
    isPraying: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    author: {
      id: '3',
      username: 'mike_chicago',
      displayName: 'Michael Torres',
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
      parish: 'St. Patrick Cathedral',
      friendCount: 57,
      prayerGroupCount: 2,
      createdAt: new Date().toISOString(),
    },
    type: 'prayer_request',
    content:
      'Please keep my father in your prayers — he\'s going in for surgery tomorrow morning. We are trusting in God\'s plan. Thank you, Nave family. 🙏',
    likeCount: 102,
    commentCount: 23,
    prayerCount: 89,
    isLiked: true,
    isPraying: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    author: {
      id: '4',
      username: 'mary_grace',
      displayName: 'Mary Grace Kim',
      avatarUrl: 'https://i.pravatar.cc/150?img=47',
      parish: 'Our Lady of Guadalupe',
      friendCount: 88,
      prayerGroupCount: 4,
      createdAt: new Date().toISOString(),
    },
    type: 'testimony',
    content:
      "Beautiful morning Mass today at Our Lady of Guadalupe. The homily was on St. Joseph and his quiet faithfulness. I left feeling so renewed. Grateful for this community and for our faith. ✝️",
    imageUrl: 'https://images.unsplash.com/photo-1548625361-58a9d86b2a0e?w=800',
    likeCount: 74,
    commentCount: 11,
    prayerCount: 41,
    isLiked: false,
    isPraying: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '4',
    author: {
      id: '5',
      username: 'deacon_james',
      displayName: 'Deacon James Walsh',
      avatarUrl: 'https://i.pravatar.cc/150?img=56',
      parish: 'Sacred Heart Parish',
      friendCount: 310,
      prayerGroupCount: 7,
      createdAt: new Date().toISOString(),
    },
    type: 'event',
    content:
      "📢 Reminder: Men's Bible Study this Thursday at 7 PM in the Sacred Heart hall. We're continuing our study of the Gospel of John. All are welcome — no experience necessary. See you there!",
    likeCount: 36,
    commentCount: 8,
    prayerCount: 14,
    isLiked: false,
    isPraying: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  isLoading: false,
  hasMore: true,

  fetchFeed: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));
    set({ posts: MOCK_POSTS, isLoading: false });
  },

  toggleLike: (postId) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 }
          : p,
      ),
    }));
  },

  togglePraying: (postId) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              isPraying: !p.isPraying,
              prayerCount: p.isPraying ? p.prayerCount - 1 : p.prayerCount + 1,
            }
          : p,
      ),
    }));
  },
}));
