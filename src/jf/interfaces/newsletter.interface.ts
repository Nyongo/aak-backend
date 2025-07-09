export interface Newsletter {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: string;
  imageBlob: Uint8Array;
  imageMimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum NewsletterCategory {
  IMPACT_STORIES = 'IMPACT_STORIES',
  SUCCESS_STORIES = 'SUCCESS_STORIES',
  PARTNERSHIPS = 'PARTNERSHIPS',
  ALL_UPDATES = 'ALL_UPDATES',
}
