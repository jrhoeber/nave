import React from 'react';
import { Image as ExpoImage, type ImageProps as ExpoImageProps, type ImageContentFit } from 'expo-image';

type ResizeMode = 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';

type RNCompatSource =
  | string
  | number
  | { uri?: string; width?: number; height?: number; cache?: string; headers?: Record<string, string> }
  | Array<{ uri?: string; width?: number; height?: number; cache?: string; headers?: Record<string, string> }>;

type ImageXProps = Omit<ExpoImageProps, 'source' | 'contentFit'> & {
  source?: RNCompatSource;
  resizeMode?: ResizeMode;
  contentFit?: ImageContentFit;
};

const RESIZE_TO_FIT: Record<ResizeMode, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
  repeat: 'cover',
};

function stripCacheHint(s: any): any {
  if (s && typeof s === 'object' && !Array.isArray(s) && 'cache' in s) {
    const { cache: _drop, ...rest } = s;
    return rest;
  }
  return s;
}

// Signed URLs (e.g. GCS) put the same object behind a query string that rotates
// each fetch. Cache by the path so the same image reuses the cache across rotations.
function deriveCacheKey(uri?: string): string | undefined {
  if (!uri) return undefined;
  const q = uri.indexOf('?');
  return q >= 0 ? uri.slice(0, q) : uri;
}

export function ImageX({ source, resizeMode, contentFit, ...rest }: ImageXProps) {
  const stripped = stripCacheHint(source);
  const fit = contentFit ?? (resizeMode ? RESIZE_TO_FIT[resizeMode] : 'cover');
  let src: any = stripped;
  let recyclingKey: string | undefined;
  if (stripped && typeof stripped === 'object' && !Array.isArray(stripped) && 'uri' in stripped) {
    const uri = (stripped as { uri?: string }).uri;
    const cacheKey = deriveCacheKey(uri);
    src = cacheKey ? { ...stripped, cacheKey } : stripped;
    recyclingKey = cacheKey;
  }
  return (
    <ExpoImage
      {...(rest as any)}
      source={src}
      contentFit={fit}
      cachePolicy="memory-disk"
      transition={0}
      recyclingKey={recyclingKey}
    />
  );
}

export { Image as RawImage } from 'expo-image';
