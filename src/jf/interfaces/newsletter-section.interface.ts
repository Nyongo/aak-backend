export enum SectionType {
  banner = 'banner',
  content = 'content',
}

export interface BannerData {
  eyebrow: string;
  headline: string;
  description?: string;
}

export interface ContentData {
  title: string;
  intro?: string;
  body?: string;
  outro?: string;
  hasImage: boolean;
  imageSide?: 'left' | 'right';
  twoColumnText?: boolean;
  showDivider?: boolean;
}

export interface NewsletterSection {
  id: string;
  newsletterId: string;
  order: number;
  type: SectionType;
  data: BannerData | ContentData;
  media: { id: string; mimeType: string; blob: Uint8Array }[];
  createdAt: Date;
  updatedAt: Date;
}
