import type { DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate } from '../utils/formatDate';
import { slugify, uniqueSlug } from '../utils/slugify';
import { TAG_COLORS, type NewTagInput, type Tag, type TagColor, type UpdatableTagFields } from '../types/tag';

function mapTagDoc(id: string, data: DocumentData): Tag {
  const color = data.color;
  return {
    id,
    userId: data.userId,
    slug: data.slug ?? '',
    name: data.name ?? '',
    color: (TAG_COLORS as readonly string[]).includes(color) ? (color as TagColor) : 'default',
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

// Not ordered server-side, same reasoning `categoryService.ts` gives for
// `expenseCategories` — a user realistically has a handful to a few dozen
// tags, sorted client-side by name needs no composite index at all.
const tagsCollection = createUserScopedCollection<Tag>('tags', mapTagDoc);

export function subscribeToTags(
  userId: string,
  onData: (tags: Tag[]) => void,
  onError: (error: Error) => void,
): () => void {
  return tagsCollection.subscribeForUser(userId, (tags) => onData(sortTags(tags)), onError);
}

export function sortTags(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => a.name.localeCompare(b.name));
}

export function createTag(userId: string, existingSlugs: readonly string[], input: NewTagInput): Promise<string> {
  const slug = uniqueSlug(slugify(input.name), existingSlugs);
  return tagsCollection.create(userId, { name: input.name, slug, color: input.color });
}

/** `slug` is immutable once created (transactions reference it) — only
 * `name`/`color` can change, same pattern as `renameExpenseCategory`. */
export function updateTag(id: string, input: UpdatableTagFields): Promise<void> {
  return tagsCollection.update(id, { name: input.name, color: input.color });
}

export function deleteTag(id: string): Promise<void> {
  return tagsCollection.remove(id);
}
