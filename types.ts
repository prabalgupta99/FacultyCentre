export enum CollegeType {
  GOVT = 'Govt.',
  PRIVATE = 'Private'
}

export interface Job {
  id: string;
  title: string;
  type: 'Assistant Professor' | 'Associate Professor' | 'Professor' | 'Research Associate' | 'VC';
  salary?: string;
  postedDate: string;
  deadline: string;
  description: string;
  requirements: string[];
}

export interface ManualHiringPost {
  id: number;
  collegeId: number;
  positionName: string;
  postingDate: string; // ISO date string (YYYY-MM-DD)
  lastDateToApply: string; // ISO date string (YYYY-MM-DD)
  applicationMedium: string;
  hasAdvertisement: boolean;
  advertisementLink?: string;
  hasEmail: boolean;
  emailId?: string;
  salary: string;
  hasApplicationFee: boolean;
  applicationFee?: string;
  hasPostalAddress: boolean;
  postalAddress?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface College {
  id: string;
  slug: string; // URL Slug (e.g. iit-delhi-123)
  name: string;
  location: string;
  state: string;
  coordinates: [number, number]; // [lat, lng]
  type: CollegeType;
  ranking?: number; // NIRF ranking (optional for compatibility)
  website: string;
  logoUrl?: string; // Optional for compatibility
  openings: Job[];
  description: string;
  // New fields from Supabase
  affiliatingUniversity: string;
  careerPageUrl: string;
  isHiring: boolean;
  scoreHistory?: any[]; // JSONB data
  manualHiringPosts?: ManualHiringPost[]; // Manual hiring posts from admin
}

export interface FilterState {
  searchQuery: string;
  types: CollegeType[];
  hiringOnly: boolean;
  states: string[]; // NEW: State filter
}

// Helper function to check if a hiring post is still active
export const isHiringPostActive = (lastDateToApply: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(lastDateToApply);
  deadline.setHours(0, 0, 0, 0);
  return deadline >= today;
};