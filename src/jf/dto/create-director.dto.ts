export class CreateDirectorDto {
  borrowerId: string;
  Name: string;
  'National ID Number': string;
  'KRA Pin Number': string;
  'Phone Number': string;
  Status: 'Active' | 'Blacklist';
  'Date Of Birth': string;
  Gender: 'Male' | 'Female' | 'Other';
  Email?: string;
}
