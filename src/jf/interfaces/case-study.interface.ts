import { JsonValue } from '@prisma/client/runtime/library';

export interface CaseStudy {
  id: string;
  link: string;
  order: number;
  title: string;
  description: string;
  stats: JsonValue;      // stored as JSON in Prisma
  isActive: boolean;

  // Banner stored as blob in DB
  bannerMime?: string;
  bannerBlob?: Uint8Array;

  createdAt: Date;
  updatedAt: Date;
}
