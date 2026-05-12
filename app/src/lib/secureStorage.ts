import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.nave.refreshToken';

export async function getRefreshToken(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('refresh', token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  });
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // ignore
  }
}
