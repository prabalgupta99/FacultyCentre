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
      slug: row.slug || `college-${row.id}`,
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
      scoreHistory: row.score_history || [],
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
    const PAGE_SIZE = 1000;
    const MAX_LIMIT = 5000;

    // 1. Get Total Count first
    let query = supabase
      .from('colleges')
      .select('*', { count: 'exact', head: true })
      .gte('latitude', bounds.minLat)
      .lte('latitude', bounds.maxLat)
      .gte('longitude', bounds.minLng)
      .lte('longitude', bounds.maxLng);

    if (filters?.search) {
      query = query.ilike('college_name_place', `%${filters.search}%`);
    }

    const { count, error: countError } = await query;
    if (countError) throw countError;

    if (!count) return { data: [], error: null };

    // 2. Fetch pages in parallel
    const promises = [];
    const finalCount = Math.min(count, MAX_LIMIT);

    for (let i = 0; i < finalCount; i += PAGE_SIZE) {
      // Re-construct query for each page to avoid state issues
      let pageQuery = supabase
        .from('colleges')
        .select('*')
        .gte('latitude', bounds.minLat)
        .lte('latitude', bounds.maxLat)
        .gte('longitude', bounds.minLng)
        .lte('longitude', bounds.maxLng);

      if (filters?.search) {
        pageQuery = pageQuery.ilike('college_name_place', `%${filters.search}%`);
      }

      promises.push(pageQuery.range(i, i + PAGE_SIZE - 1));
    }

    const results = await Promise.all(promises);

    // 3. Flatten and process results
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.warn("Some page fetches failed:", errors);
      // Depending on severity, we could throw or just process what we got
      // For now, let's process successes
    }

    const allCollegesData = results
      .filter(r => r.data)
      .flatMap(r => r.data || []);

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
      slug: row.slug || `college-${row.id}`,
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

    if (error) {
      console.error("Supabase Edge Function 'analyze-careers' returned an error:", error);
      throw error;
    }
    return data;
  } catch (error: any) {
    console.error("Error analyzing career page (analyzeCollegeCareerPage):", error);
    console.dir(error);
    return { isHiring: false, score: 0, reasons: [], error: error.message || 'Unknown edge function error' };
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
    return true;
  } catch (error) {
    console.error("Error checking iframe compatibility:", error);
    return true;
  }
};

export const saveScoreHistory = async (collegeId: string, historyEntry: any): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Fetch current history first to append
    const { data: current, error: fetchError } = await supabase
      .from('colleges')
      .select('score_history')
      .eq('id', collegeId)
      .single();

    if (fetchError) throw fetchError;

    let history = current?.score_history || [];
    if (!Array.isArray(history)) history = [];

    // Append new history
    let newHistory = history;
    if (Array.isArray(historyEntry)) {
      newHistory = historyEntry; // Replace if array provided
    } else {
      newHistory.push(historyEntry); // Append if single object
    }

    const { error: updateError } = await supabase
      .from('colleges')
      .update({ score_history: newHistory })
      .eq('id', collegeId);

    if (updateError) throw updateError;
    return { success: true };

  } catch (error: any) {
    console.error("Error saving score history:", error);
    return { success: false, error: error.message };
  }
};