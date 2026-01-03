export enum CollegeType {
    NLU = 'NLU',
    PRIVATE = 'Private',
    CENTRAL = 'Central',
    STATE = 'State'
  }
  
  export interface Contact {
    role: string;
    name: string;
    email: string;
    phone?: string;
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
    ranking?: number; // NIRF ranking
    website: string;
    logoUrl?: string;
    contacts: Contact[];
    openings: Job[];
    description: string;
  }
  
  export interface FilterState {
    searchQuery: string;
    types: CollegeType[];
    hiringOnly: boolean;
  }