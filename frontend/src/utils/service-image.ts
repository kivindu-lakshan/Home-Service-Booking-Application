import { api } from '@/api/client';
export function serviceImageUri(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const uri = value.trim();
  try {
    const url = uri.startsWith('/') ? new URL(uri, api.defaults.baseURL) : new URL(uri);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.toString() : undefined;
  } catch { return undefined; }
}

