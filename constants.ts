import { College, CollegeType } from './types';

export const COLLEGES: College[] = [
  {
    id: '1',
    name: 'National Law School of India University (NLSIU)',
    location: 'Bengaluru',
    state: 'Karnataka',
    coordinates: [12.9667, 77.5122],
    type: CollegeType.NLU,
    ranking: 1,
    website: 'https://www.nls.ac.in',
    description: 'The premier national law university in India, located in Bengaluru.',
    logoUrl: 'https://picsum.photos/200',
    contacts: [
      { role: 'Registrar', name: 'Dr. N.S. Nigam', email: 'registrar@nls.ac.in' },
      { role: 'Recruitment', name: 'HR Team', email: 'recruitment@nls.ac.in' }
    ],
    openings: [
      {
        id: 'j1',
        title: 'Assistant Professor of Law',
        type: 'Assistant Professor',
        salary: 'Level 10 (UGC)',
        postedDate: '2023-10-01',
        deadline: '2023-11-15',
        description: 'Seeking candidates with strong research capabilities in Constitutional Law.',
        requirements: ['Ph.D. in Law', 'NET Qualified', '2+ Publications']
      },
      {
        id: 'j2',
        title: 'Research Associate (Tech Law)',
        type: 'Research Associate',
        salary: '₹55,000 / month',
        postedDate: '2023-10-10',
        deadline: '2023-10-30',
        description: 'For the Centre for Internet and Society projects.',
        requirements: ['LLM in Tech Law', 'Writing sample required']
      }
    ]
  },
  {
    id: '2',
    name: 'NALSAR University of Law',
    location: 'Hyderabad',
    state: 'Telangana',
    coordinates: [17.5684, 78.5361],
    type: CollegeType.NLU,
    ranking: 3,
    website: 'https://www.nalsar.ac.in',
    description: 'NALSAR is known for its liberal academic culture and strong student body.',
    logoUrl: 'https://picsum.photos/201',
    contacts: [
      { role: 'Vice Chancellor', name: 'Prof. Srikrishna', email: 'vc@nalsar.ac.in' }
    ],
    openings: [
      {
        id: 'j3',
        title: 'Associate Professor (Criminal Law)',
        type: 'Associate Professor',
        salary: 'Level 13A',
        postedDate: '2023-09-15',
        deadline: '2023-12-01',
        description: 'Senior faculty position for Criminal Law department.',
        requirements: ['Ph.D.', '8 Years Teaching Experience']
      }
    ]
  },
  {
    id: '3',
    name: 'Symbiosis Law School',
    location: 'Pune',
    state: 'Maharashtra',
    coordinates: [18.5779, 73.9130],
    type: CollegeType.PRIVATE,
    ranking: 6,
    website: 'https://www.symlaw.ac.in',
    description: 'A constituent of Symbiosis International University.',
    logoUrl: 'https://picsum.photos/202',
    contacts: [
      { role: 'HR Manager', name: 'Aditi Sharma', email: 'hr@symlaw.ac.in' }
    ],
    openings: [] 
  },
  {
    id: '4',
    name: 'National Law University, Delhi',
    location: 'New Delhi',
    state: 'Delhi',
    coordinates: [28.6006, 77.0264],
    type: CollegeType.NLU,
    ranking: 2,
    website: 'https://nludelhi.ac.in',
    description: 'A premier law university in the capital city.',
    logoUrl: 'https://picsum.photos/203',
    contacts: [],
    openings: [
      {
        id: 'j4',
        title: 'Professor of Law',
        type: 'Professor',
        salary: 'Level 14',
        postedDate: '2023-10-05',
        deadline: '2023-11-20',
        description: 'Leadership role in academic curriculum design.',
        requirements: ['Ph.D.', '10 Years Experience', 'Significant Research Output']
      }
    ]
  },
  {
    id: '5',
    name: 'Jindal Global Law School',
    location: 'Sonipat',
    state: 'Haryana',
    coordinates: [28.9228, 77.0945],
    type: CollegeType.PRIVATE,
    ranking: 1,
    website: 'https://jgls.edu.in',
    description: 'Indias number 1 ranked private law school.',
    logoUrl: 'https://picsum.photos/204',
    contacts: [
        { role: 'Dean of Hiring', name: 'Prof. Kumar', email: 'careers@jgu.edu.in'}
    ],
    openings: [
         {
        id: 'j5',
        title: 'Assistant Professor (General)',
        type: 'Assistant Professor',
        salary: 'Competitive',
        postedDate: '2023-10-12',
        deadline: 'Rolling',
        description: 'Hiring for multiple subjects including Torts, Contracts, and Corporate Law.',
        requirements: ['LLM from top university', 'Ph.D. preferred']
      }
    ]
  },
  {
    id: '6',
    name: 'West Bengal National University of Juridical Sciences',
    location: 'Kolkata',
    state: 'West Bengal',
    coordinates: [22.5646, 88.4063],
    type: CollegeType.NLU,
    ranking: 4,
    website: 'https://www.nujs.edu',
    description: 'Top tier NLU in the cultural capital of India.',
    logoUrl: 'https://picsum.photos/205',
    contacts: [],
    openings: []
  }
];