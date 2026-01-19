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
    let allCollegesData: any[] = [];
    let offset = 0;
    const PAGE_SIZE = 1000; // Supabase default max rows
    const MAX_LIMIT = 5000; // Our target limit
    let hasMore = true;

    while (hasMore && allCollegesData.length < MAX_LIMIT) {
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

      // Fetch page
      const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allCollegesData = [...allCollegesData, ...data];
        // If we got less than a full page, we've reached the end
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      offset += PAGE_SIZE;
    }

    const collegesData = allCollegesData;



    if (!collegesData) return { data: [], error: null };

    // Fetch all manual hiring posts for colleges in bounds
    const collegeIds = collegesData.map(row => row.id);
    const { data: hiringPostsData } = await supabase
      .from('manual_hiring_posts')
      .select('*')
      .in('college_id', collegeIds);

    // Group hiring posts by college_id
    const hiringPostsByCollege: Record<number, any[]> = {};
    (hiringPostsData || []).forEach(post => {
      if (!hiringPostsByCollege[post.college_id]) {
        hiringPostsByCollege[post.college_id] = [];
      }
      hiringPostsByCollege[post.college_id].push({
        id: post.id,
        collegeId: post.college_id,
        positionName: post.position_name,
        postingDate: post.posting_date,
        lastDateToApply: post.last_date_to_apply,
        applicationMedium: post.application_medium,
        hasAdvertisement: post.has_advertisement,
        advertisementLink: post.advertisement_link || undefined,
        hasEmail: post.has_email,
        emailId: post.email_id || undefined,
        salary: post.salary,
        hasApplicationFee: post.has_application_fee,
        applicationFee: post.application_fee || undefined,
        hasPostalAddress: post.has_postal_address,
        postalAddress: post.postal_address || undefined,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      });
    });

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
      openings: [],
      manualHiringPosts: hiringPostsByCollege[row.id] || []
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