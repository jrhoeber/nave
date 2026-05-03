import type { PrayerGroupCategory } from '../../types';

export const NAME_MAX = 64;
export const DESC_MAX = 200;
export const SCHEDULE_MAX = 100;

export const CATEGORIES: { value: PrayerGroupCategory; label: string }[] = [
  { value: 'bible_study', label: 'Bible Study' },
  { value: 'mens_group', label: "Men's Group" },
  { value: 'womens_group', label: "Women's Group" },
  { value: 'young_adults', label: 'Young Adults' },
  { value: 'families', label: 'Families' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'general', label: 'General' },
];
