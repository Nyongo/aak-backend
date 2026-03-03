// Generates unique, URL-safe slugs from blog post titles.
// Appends -2, -3, ... until the slug is unique in the database.

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BlogSlugService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converts a string to a URL-safe kebab-case slug.
   * e.g. "School Fees Loan in Kenya!" → "school-fees-loan-in-kenya"
   */
  private toKebab(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')   // remove special chars except hyphens
      .replace(/[\s_]+/g, '-')    // spaces/underscores → hyphens
      .replace(/-+/g, '-')        // collapse multiple hyphens
      .replace(/^-+|-+$/g, '');   // strip leading/trailing hyphens
  }

  /**
   * Generates a slug from `title` that is guaranteed unique in blog_posts.
   * If "school-fees-loan" exists, returns "school-fees-loan-2", then "-3", etc.
   *
   * @param title       - the blog post title (any language, typically EN)
   * @param excludeId   - optional post id to exclude when checking uniqueness
   *                      (pass this when updating an existing post so it does not
   *                       collide with its own current slug)
   */
  async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = this.toKebab(title);
    let candidate = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      // No collision, or collision is with the post we're updating
      if (!existing || (excludeId && existing.id === excludeId)) {
        return candidate;
      }

      candidate = `${base}-${counter}`;
      counter++;
    }
  }
}
