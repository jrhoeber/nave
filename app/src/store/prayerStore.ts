import { create } from 'zustand';
import type { PrayerGroup } from '../../types';

interface PrayerState {
  groups: PrayerGroup[];
  myGroups: PrayerGroup[];
  isLoading: boolean;
  fetchGroups: () => Promise<void>;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
}

const MOCK_GROUPS: PrayerGroup[] = [
  {
    id: '1',
    name: 'Daily Rosary Circle',
    description:
      'We pray the Holy Rosary together every day at 8 AM and 8 PM. Join us as we meditate on the mysteries and intercede for our intentions.',
    category: 'rosary',
    memberCount: 247,
    postCount: 1842,
    isPrivate: false,
    isMember: true,
    admin: {
      id: '10',
      username: 'rosary_leader',
      displayName: 'Fr. Anthony',
      friendCount: 0,
      prayerGroupCount: 0,
      createdAt: new Date().toISOString(),
    },
    meetingSchedule: 'Daily at 8:00 AM & 8:00 PM CT',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: "Women's Scripture Study",
    description:
      "A welcoming group for women of all ages to study Sacred Scripture together, share reflections, and support one another in faith.",
    category: 'womens_group',
    memberCount: 89,
    postCount: 412,
    isPrivate: false,
    isMember: false,
    admin: {
      id: '11',
      username: 'sarah_faith',
      displayName: 'Sarah Mitchell',
      friendCount: 0,
      prayerGroupCount: 0,
      createdAt: new Date().toISOString(),
    },
    meetingSchedule: 'Tuesdays at 7:00 PM via video call',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: "Men's Emmaus Group",
    description:
      "Brotherhood in Christ. We support one another through life's challenges, hold each other accountable, and grow together in virtue.",
    category: 'mens_group',
    memberCount: 54,
    postCount: 287,
    isPrivate: false,
    isMember: true,
    admin: {
      id: '12',
      username: 'thomas_k',
      displayName: 'Thomas Kowalski',
      friendCount: 0,
      prayerGroupCount: 0,
      createdAt: new Date().toISOString(),
    },
    meetingSchedule: 'Saturdays at 7:30 AM',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Young Adults Faith Community',
    description:
      "A vibrant community for Catholics in their 20s and 30s. Social events, service projects, liturgical celebrations, and deep conversations about faith.",
    category: 'young_adults',
    memberCount: 183,
    postCount: 956,
    isPrivate: false,
    isMember: false,
    admin: {
      id: '13',
      username: 'claire_yac',
      displayName: 'Claire Dubois',
      friendCount: 0,
      prayerGroupCount: 0,
      createdAt: new Date().toISOString(),
    },
    meetingSchedule: 'Every other Friday at 7:00 PM',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Lectio Divina & Contemplative Prayer',
    description:
      'A quiet space to practice Lectio Divina, Centering Prayer, and other contemplative traditions of the Church. All levels of experience welcome.',
    category: 'devotional',
    memberCount: 41,
    postCount: 178,
    isPrivate: false,
    isMember: false,
    admin: {
      id: '14',
      username: 'brother_paul',
      displayName: 'Brother Paul',
      friendCount: 0,
      prayerGroupCount: 0,
      createdAt: new Date().toISOString(),
    },
    meetingSchedule: 'Sundays at 9:00 PM CT',
    createdAt: new Date().toISOString(),
  },
];

export const usePrayerStore = create<PrayerState>((set, get) => ({
  groups: [],
  myGroups: [],
  isLoading: false,

  fetchGroups: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 500));
    const myGroups = MOCK_GROUPS.filter((g) => g.isMember);
    set({ groups: MOCK_GROUPS, myGroups, isLoading: false });
  },

  joinGroup: (groupId) => {
    set((state) => {
      const updated = state.groups.map((g) =>
        g.id === groupId ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g,
      );
      return { groups: updated, myGroups: updated.filter((g) => g.isMember) };
    });
  },

  leaveGroup: (groupId) => {
    set((state) => {
      const updated = state.groups.map((g) =>
        g.id === groupId
          ? { ...g, isMember: false, memberCount: Math.max(0, g.memberCount - 1) }
          : g,
      );
      return { groups: updated, myGroups: updated.filter((g) => g.isMember) };
    });
  },
}));
