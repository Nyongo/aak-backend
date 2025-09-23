export interface INewsletterSubscription {
  id: string;
  name: string;
  email: string;
  organization?: string | null;
  interests?: string | null;
  platform?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
// represents the structure of a newsletter subscription