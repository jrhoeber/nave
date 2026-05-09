import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Parish } from '../types';

const KEY = 'cached_parish';

let memoryCache: Parish | null = null;

export function getCachedParishSync(): Parish | null {
  return memoryCache;
}

export async function loadCachedParish(): Promise<Parish | null> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    if (!json) return null;
    const parsed = JSON.parse(json) as Parish;
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedParish(parish: Parish): Promise<void> {
  memoryCache = parish;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(parish));
  } catch {
    // ignore
  }
}

export async function clearCachedParish(): Promise<void> {
  memoryCache = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
