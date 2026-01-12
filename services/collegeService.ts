import { supabase } from '../lib/supabase';
import { College, CollegeType } from '../types';
import { COLLEGES as MOCK_COLLEGES } from '../constants';

export const fetchColleges = async (): Promise<{ data: College[]; error: string | null }> => {
  try {
    // 1. Fetch Colleges (no Job relation in new database)
    const { data: collegesData, error: collegeError } = await supabase
      .from('colleges')
      .select('*');

    if (collegeError) {
      console.warn("Supabase Fetch Error (using mock data):", collegeError);
      return {
        data: MOCK_COLLEGES,
        error: `Supabase Fetch Error: ${collegeError.message || JSON.stringify(collegeError)}`
      };
    }

    if (!collegesData || collegesData.length === 0) {
      console.log("Supabase DB is empty. Using mock data.");
      return {
        data: MOCK_COLLEGES,
        error: "Database Empty - Using Mock Data"
      };
    }

    // 2. Map DB structure to App structure
    const mappedColleges: College[] = collegesData.map((row: any) => ({
      id: row.id.toString(),
      name: row.college_name_place || 'Unknown College',
      location: row.college_name_place || 'Unknown Location',
      state: row.state || '',
      coordinates: [row.latitude || 0, row.longitude || 0],
      type: row.type as CollegeType,
      ranking: undefined,
      website: row.college_website_url || '',
      description: row.career_at_college || '',
      logoUrl: undefined,
      affiliatingUniversity: row.affiliating_university || '',
      careerPageUrl: row.career_page_url || '',
      isHiring: row.is_hiring || false,
      openings: [] // No Job table in new database - will be added manually later
    }));

    return { data: mappedColleges, error: null };
  } catch (error: any) {
    console.error("Unexpected error fetching colleges:", error);
    return {
      data: MOCK_COLLEGES,
      error: `Unexpected Error: ${error.message || String(error)}`
    };
  }
};