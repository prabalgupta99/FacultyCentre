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

export interface College {
  id: string;
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
}

export interface FilterState {
  searchQuery: string;
  types: CollegeType[];
  hiringOnly: boolean;
  states: string[]; // NEW: State filter
}