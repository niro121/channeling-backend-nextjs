export type SlugifyOptions = {
  /** Max length of the resulting slug (default 80). */
  maxLength?: number;
  /** Returned when input yields an empty slug (default `'item'`). */
  fallback?: string;
};

/**
 * Convert free text into a URL-safe kebab-case slug.
 * Reusable across forms/services (job posts, public pages, etc.).
 */
export function slugify(
  input: string,
  options: SlugifyOptions = {}
): string {
  const maxLength = options.maxLength ?? 80;
  const fallback = options.fallback ?? 'item';

  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');

  return base || fallback;
}
