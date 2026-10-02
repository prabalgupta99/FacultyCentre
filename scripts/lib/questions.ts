// Per-notice Jev questions. Static ones depend only on the notice text (cacheable by hash).
// The status question depends on today's date, so it is asked fresh each run, only for law-ish job notices.
export const STATIC_QUESTIONS = {
  is_job_notice: {
    type: 'noul',
    instructions: 'Is this a notice that invites applications for a job, post, fellowship or walk-in interview at the institution?',
    criteria: {
      true: 'Invites applications or walk-in interviews for a post (teaching, research, project or non-teaching)',
      false: 'Result, shortlist, merit list, corrigendum only, cancellation, tender, admission, news, event, regulation or pay-scale notice',
    },
  },
  stream: {
    type: 'choice',
    instructions: 'Which subject area is the post in? If the notice names no subject and the institution is a law university or law school, the post is law.',
    criteria: {
      law: 'Law, legal studies, LLB/LLM, a School or Department of Law, or a legal-research or legal-aid post',
      other: 'Another subject (engineering, science, management, commerce, medicine, languages, etc.)',
      mixed: 'Several departments in one notice and law is one of them',
      unclear: 'The subject area cannot be told from the text',
    },
  },
  role_type: {
    type: 'choice',
    instructions: 'What kind of post is it?',
    criteria: {
      faculty_regular: 'Assistant Professor, Associate Professor or Professor on a regular basis',
      faculty_temporary: 'Guest, visiting, ad hoc, contractual or temporary teaching post',
      research_project: 'Project fellow, research associate, JRF/SRF, research consultant',
      non_teaching: 'Administrative, library, technical or support staff, consultant',
      unclear: 'Cannot be told',
    },
  },
} as const;

export const STATUS_QUESTION = {
  status: {
    type: 'choice',
    instructions: "Given today's date (stated in the text), is this notice still accepting applications?",
    criteria: {
      open: 'The last date has not passed, or no last date is given and the notice is recent and not marked closed',
      closed: 'The last date has passed, or the notice says applications are closed',
      post_application_stage: 'Shortlist, eligibility list, interview schedule, result or objections stage',
      unclear: 'Cannot be told',
    },
  },
} as const;

export const MIN_CONFIDENCE = 0.6; // Choice answers below this count as 'unclear'
export const MIN_NOUL = 0.7;       // is_job_notice must reach this to count as a job
export const NOUL_MAYBE = 0.4;     // between NOUL_MAYBE and MIN_NOUL = uncertain, makes the college 'unknown'
export const MODEL = 'jev-latest';

// Boolean (noul) questions. Models answer these reliably; choice questions came back with tiny confidences and invented labels.
export const BOOL_QUESTIONS = {
  is_job_notice: STATIC_QUESTIONS.is_job_notice,
  is_law: {
    type: 'noul',
    instructions: 'Is the post in law (law, legal studies, LLB/LLM, a School or Department of Law, or legal research)? If the notice names no subject and the institution is a law university or law school, answer true.',
    criteria: { true: 'The post is in law or legal studies, or the notice covers many departments and law is one of them', false: 'The post is in another subject (engineering, science, management, commerce, medicine, languages) or is administrative' },
  },
  is_open: {
    type: 'noul',
    instructions: "Given today's date stated in the text, is this notice still accepting applications right now?",
    criteria: { true: 'The last date has not passed, or no last date is given and the notice is recent and not marked closed', false: 'The last date has passed, applications are closed, or it is a shortlist, eligibility list, interview schedule or result' },
  },
  is_faculty: {
    type: 'noul',
    instructions: 'Is this a teaching faculty post (Assistant, Associate or full Professor, or guest, visiting, ad hoc or contractual faculty)?',
    criteria: { true: 'Teaching faculty post', false: 'Research project, administrative, library, technical or support post' },
  },
} as const;
