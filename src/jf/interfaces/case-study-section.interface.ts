import { JsonValue } from "@prisma/client/runtime/library";

export enum SectionType {
  banner = 'banner',
  content = 'content',
}

export interface SectionMedia {
  id: string;
  mimeType: string;
  blob: Uint8Array;          // Prisma returns Uint8Array, not Buffer
}

export interface CaseStudySection {
  id: string;
  caseStudyId: string;
  order: number;
  type: SectionType;
  data: JsonValue;           // Prisma’s JSON type
  media: SectionMedia[];
  createdAt: Date;
  updatedAt: Date;
}
