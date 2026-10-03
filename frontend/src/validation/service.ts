import type { ServiceInput } from '@/api/services';
export type ServiceDraft = Omit<ServiceInput, 'basePrice' | 'inclusions'> & { basePrice: string; inclusions: string };
export type ServiceErrors = Partial<Record<keyof ServiceDraft, string>>;
export const emptyService: ServiceDraft = { name: '', category: '', description: '', basePrice: '', imageUrl: '', estDurationHours: '', serviceType: 'on_site', inclusions: '', isActive: true };
export function validateService(draft: ServiceDraft): ServiceErrors {
  const errors: ServiceErrors = {};
  if (draft.name.trim().length < 2 || draft.name.trim().length > 120) errors.name = 'Enter a service name of 2–120 characters.';
  if (!/^[a-f\d]{24}$/i.test(draft.category)) errors.category = 'Select an existing category.';
  if (!draft.basePrice.trim() || !/^\d+(\.\d+)?$/.test(draft.basePrice.trim()) || !Number.isFinite(Number(draft.basePrice)) || Number(draft.basePrice) > 100000000) errors.basePrice = 'Enter a starting price between 0 and 100,000,000.';
  if (draft.description.length > 4000) errors.description = 'Description must be at most 4,000 characters.';
  if (draft.estDurationHours.length > 100) errors.estDurationHours = 'Duration must be at most 100 characters.';
  if (draft.imageUrl.trim() && !/^\/api\/services\/images\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\.(png|jpg)$/i.test(draft.imageUrl.trim())) {
    try { const url = new URL(draft.imageUrl.trim()); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || draft.imageUrl.length > 2048) throw new Error(); }
    catch { errors.imageUrl = 'Enter a valid HTTP or HTTPS image URL.'; }
  }
  const inclusions = draft.inclusions.split('\n').map(value => value.trim()).filter(Boolean);
  if (inclusions.length > 30 || inclusions.some(value => value.length > 200)) errors.inclusions = 'Use up to 30 lines, each at most 200 characters.';
  return errors;
}
export function servicePayload(draft: ServiceDraft): ServiceInput {
  return { ...draft, name: draft.name.trim(), description: draft.description.trim(), imageUrl: draft.imageUrl.trim(), estDurationHours: draft.estDurationHours.trim(), basePrice: Number(draft.basePrice), inclusions: draft.inclusions.split('\n').map(value => value.trim()).filter(Boolean) };
}
