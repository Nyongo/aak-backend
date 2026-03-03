// Utility functions for working with Tiptap JSON stored in blog sections.

/**
 * Section shape stored in BlogPostTranslation.sections (Prisma Json field).
 * We cast the raw Json value to this type after fetching from DB.
 */
export interface BlogSection {
  id: string;
  type: 'TEXT' | 'AD';
  order: number;
  content?: TiptapDoc;   // only present when type === 'TEXT'
  adSlotId?: string;     // only present when type === 'AD'
}

export interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

/**
 * Recursively walks a Tiptap JSON document and returns
 * every cloudinaryPublicId stored on image nodes.
 *
 * Image nodes in Tiptap are stored as:
 * {
 *   "type": "image",
 *   "attrs": {
 *     "src": "https://res.cloudinary.com/...",
 *     "cloudinaryPublicId": "blogs/inline/abc123"
 *   }
 * }
 */
export function extractPublicIdsFromTiptapDoc(doc: TiptapDoc | undefined | null): string[] {
  if (!doc) return [];
  const ids: string[] = [];
  walkNodes(doc.content ?? [], ids);
  return ids;
}

function walkNodes(nodes: TiptapNode[], ids: string[]): void {
  for (const node of nodes) {
    if (node.type === 'image' && node.attrs?.cloudinaryPublicId) {
      ids.push(node.attrs.cloudinaryPublicId as string);
    }
    if (node.content?.length) {
      walkNodes(node.content, ids);
    }
  }
}

/**
 * Given the raw sections Json array from the database,
 * extracts all Cloudinary public IDs from all TEXT section Tiptap docs.
 *
 * Use this before deleting a BlogPost to know which inline images to purge.
 */
export function extractAllPublicIdsFromSections(
  sections: unknown,
): string[] {
  if (!Array.isArray(sections)) return [];

  const ids: string[] = [];
  for (const section of sections as BlogSection[]) {
    if (section.type === 'TEXT' && section.content) {
      ids.push(...extractPublicIdsFromTiptapDoc(section.content));
    }
  }
  return ids;
}

/**
 * Sorts an array of sections by their `order` field ascending.
 * Safe to call with any unknown JSON — filters out malformed entries.
 */
export function sortSections(sections: unknown): BlogSection[] {
  if (!Array.isArray(sections)) return [];
  return (sections as BlogSection[])
    .filter((s) => s && typeof s.order === 'number')
    .sort((a, b) => a.order - b.order);
}
