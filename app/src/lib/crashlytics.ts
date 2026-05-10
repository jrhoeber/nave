// Thin wrapper around @react-native-firebase/crashlytics so callers don't have
// to handle the dev short-circuit or the Error coercion. In __DEV__ we skip
// the bridge call and just log so local crashes don't pollute Crashlytics.
import crashlytics from '@react-native-firebase/crashlytics';

export const recordError = (error: unknown, context?: string): void => {
  if (__DEV__) {
    console.warn('[crashlytics:dev]', context ?? '', error);
    return;
  }
  const err = error instanceof Error ? error : new Error(String(error));
  crashlytics().recordError(err, context);
};

export const setUser = (userId: string | null): void => {
  if (__DEV__) return;
  crashlytics().setUserId(userId ?? '');
};

export const log = (msg: string): void => {
  if (__DEV__) return;
  crashlytics().log(msg);
};
