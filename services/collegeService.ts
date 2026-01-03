import { supabase } from '../lib/supabase';
import { College, CollegeType } from '../types';
import { COLLEGES as MOCK_COLLEGES } from '../constants';

export const fetchColleges = async (): Promise<{ data: College[]; error: string | null }> => {
  try {
    // 1. Fetch Colleges
    const { data: collegesData, error: collegeError } = await supabase
      .from('College')
      .select(`
        *,
        Job (*),
        Contact (*)
      `);

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
      id: row.id,
      name: row.name,
      location: row.location,
      state: row.state,
      coordinates: [row.latitude, row.longitude],
      type: row.type as CollegeType,
      ranking: row.ranking,
      website: row.website,
      description: row.description || '',
      logoUrl: '', // Default or fetch if exists
      contacts: (row.Contact || []).map((c: any) => ({
        role: c.role,
        name: c.name,
        email: c.email,
        phone: c.phone
      })),
      openings: (row.Job || []).map((j: any) => ({
        id: j.id,
        title: j.title,
        type: j.type,
        salary: j.salary,
        postedDate: j.postedDate ? new Date(j.postedDate).toISOString().split('T')[0] : '',
        deadline: j.deadline ? new Date(j.deadline).toISOString().split('T')[0] : 'Open',
        description: j.description || '',
        requirements: j.requirements || []
      }))
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