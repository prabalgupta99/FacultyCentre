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

export const fetchCollegesInBounds = async (
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  filters?: { search?: string; isHiring?: boolean }
): Promise<{ data: College[]; error: string | null }> => {
  try {
    let query = supabase
      .from('colleges')
      .select('*')
      .gte('latitude', bounds.minLat)
      .lte('latitude', bounds.maxLat)
      .gte('longitude', bounds.minLng)
      .lte('longitude', bounds.maxLng);

    // Apply Filters
    if (filters?.isHiring) {
      query = query.eq('is_hiring', true);
    }

    if (filters?.search) {
      query = query.ilike('college_name_place', `%${filters.search}%`);
    }

    // Limit to prevent massive payloads if zoomed out too far
    // Google Maps strategy: Caps results to keep performance high
    const { data: collegesData, error } = await query.limit(1000);

    if (error) throw error;

    if (!collegesData) return { data: [], error: null };

    const mappedColleges: College[] = collegesData.map((row: any) => ({
      id: row.id.toString(),
      name: row.college_name_place || 'Unknown College',
      location: row.college_name_place || 'Unknown Location',
      state: row.state || '',
      coordinates: [row.latitude || 0, row.longitude || 0],
      type: row.type as CollegeType,
      website: row.college_website_url || '',
      description: row.career_at_college || '',
      affiliatingUniversity: row.affiliating_university || '',
      careerPageUrl: row.career_page_url || '',
      isHiring: row.is_hiring || false,
      openings: []
    }));

    return { data: mappedColleges, error: null };
  } catch (error: any) {
    console.error("Error fetching colleges in bounds:", error);
    return { data: [], error: error.message };
  }
};

export const analyzeCollegeCareerPage = async (url: string): Promise<{ isHiring: boolean; score: number; reasons: string[]; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-careers', {
      body: { url }
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error("Error analyzing career page:", error);
    return { isHiring: false, score: 0, reasons: [], error: error.message };
  }
};

export const checkIframeCompatibility = async (url: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-iframe', {
      body: { url }
    });

    if (error) {
      console.warn('Edge function check failed, defaulting to true (Allow) to ensure valid sites work.', error);
      return true;
    }
    return data?.embeddable ?? true;
  } catch (error) {
    console.error("Error checking iframe compatibility:", error);
    return true;
  }
};