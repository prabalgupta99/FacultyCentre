import { supabase } from '../lib/supabase';
import { ManualHiringPost } from '../types';

// Database row type (snake_case from Supabase)
interface ManualHiringPostRow {
    id: number;
    college_id: number;
    position_name: string;
    posting_date: string;
    last_date_to_apply: string;
    application_medium: string;
    has_advertisement: boolean;
    advertisement_link: string | null;
    has_email: boolean;
    email_id: string | null;
    salary: string;
    has_application_fee: boolean;
    application_fee: string | null;
    has_postal_address: boolean;
    postal_address: string | null;
    created_at: string;
    updated_at: string;
}

// College search result type
export interface CollegeSearchResult {
    id: number;
    college_name_place: string;
    state: string;
    affiliating_university: string;
}

// New college creation type
export interface NewCollege {
    collegeName: string;
    state: string;
    type: 'Govt.' | 'Private';
    affiliatingUniversity: string;
    city: string;
    careerPageUrl?: string;
    collegeWebsiteUrl?: string;
    latitude?: number;
    longitude?: number;
    careerAtCollege?: string;
}

// College details type for editing existing colleges
export interface CollegeDetails {
    id: number;
    collegeNamePlace: string;  // Combined field as stored in DB
    state: string;
    type: 'Govt.' | 'Private';
    affiliatingUniversity: string;
    careerPageUrl: string;
    collegeWebsiteUrl: string;
    latitude: number;
    longitude: number;
}

// Helper to convert DB row to app type
const mapRowToPost = (row: ManualHiringPostRow): ManualHiringPost => ({
    id: row.id,
    collegeId: row.college_id,
    positionName: row.position_name,
    postingDate: row.posting_date,
    lastDateToApply: row.last_date_to_apply,
    applicationMedium: row.application_medium,
    hasAdvertisement: row.has_advertisement,
    advertisementLink: row.advertisement_link || undefined,
    hasEmail: row.has_email,
    emailId: row.email_id || undefined,
    salary: row.salary,
    hasApplicationFee: row.has_application_fee,
    applicationFee: row.application_fee || undefined,
    hasPostalAddress: row.has_postal_address,
    postalAddress: row.postal_address || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

// Helper to convert app type to DB row (for insert/update)
const mapPostToRow = (post: Omit<ManualHiringPost, 'id' | 'createdAt' | 'updatedAt'>): Omit<ManualHiringPostRow, 'id' | 'created_at' | 'updated_at'> => ({
    college_id: post.collegeId,
    position_name: post.positionName,
    posting_date: post.postingDate,
    last_date_to_apply: post.lastDateToApply,
    application_medium: post.applicationMedium,
    has_advertisement: post.hasAdvertisement,
    advertisement_link: post.advertisementLink || null,
    has_email: post.hasEmail,
    email_id: post.emailId || null,
    salary: post.salary,
    has_application_fee: post.hasApplicationFee,
    application_fee: post.applicationFee || null,
    has_postal_address: post.hasPostalAddress,
    postal_address: post.postalAddress || null,
});

/**
 * Fetch all hiring posts for a specific college
 */
export const fetchHiringPostsByCollegeId = async (collegeId: number): Promise<{ data: ManualHiringPost[]; error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('manual_hiring_posts')
            .select('*')
            .eq('college_id', collegeId)
            .order('last_date_to_apply', { ascending: false });

        if (error) throw error;

        return {
            data: (data || []).map(mapRowToPost),
            error: null
        };
    } catch (error: any) {
        console.error('Error fetching hiring posts:', error);
        return {
            data: [],
            error: error.message || 'Failed to fetch hiring posts'
        };
    }
};

/**
 * Fetch all hiring posts (for admin panel)
 */
export const fetchAllHiringPosts = async (): Promise<{ data: ManualHiringPost[]; error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('manual_hiring_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            data: (data || []).map(mapRowToPost),
            error: null
        };
    } catch (error: any) {
        console.error('Error fetching all hiring posts:', error);
        return {
            data: [],
            error: error.message || 'Failed to fetch hiring posts'
        };
    }
};

/**
 * Create a new hiring post
 */
export const createHiringPost = async (
    post: Omit<ManualHiringPost, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ data: ManualHiringPost | null; error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('manual_hiring_posts')
            .insert(mapPostToRow(post))
            .select()
            .single();

        if (error) throw error;

        // Update college is_hiring status
        if (data) {
            const { error: updateError } = await supabase
                .from('colleges')
                .update({ is_hiring: true, last_checked: new Date().toISOString() })
                .eq('id', post.collegeId);

            if (updateError) {
                console.error('Failed to update college hiring status (create):', updateError);
            }
        }

        return {
            data: data ? mapRowToPost(data) : null,
            error: null
        };
    } catch (error: any) {
        console.error('Error creating hiring post:', error);
        return {
            data: null,
            error: error.message || 'Failed to create hiring post'
        };
    }
};

/**
 * Update an existing hiring post
 */
export const updateHiringPost = async (
    id: number,
    updates: Partial<Omit<ManualHiringPost, 'id' | 'collegeId' | 'createdAt' | 'updatedAt'>>
): Promise<{ data: ManualHiringPost | null; error: string | null }> => {
    try {
        const updateData: any = {};

        if (updates.positionName !== undefined) updateData.position_name = updates.positionName;
        if (updates.postingDate !== undefined) updateData.posting_date = updates.postingDate;
        if (updates.lastDateToApply !== undefined) updateData.last_date_to_apply = updates.lastDateToApply;
        if (updates.applicationMedium !== undefined) updateData.application_medium = updates.applicationMedium;
        if (updates.hasAdvertisement !== undefined) updateData.has_advertisement = updates.hasAdvertisement;
        if (updates.advertisementLink !== undefined) updateData.advertisement_link = updates.advertisementLink || null;
        if (updates.hasEmail !== undefined) updateData.has_email = updates.hasEmail;
        if (updates.emailId !== undefined) updateData.email_id = updates.emailId || null;
        if (updates.salary !== undefined) updateData.salary = updates.salary;
        if (updates.hasApplicationFee !== undefined) updateData.has_application_fee = updates.hasApplicationFee;
        if (updates.applicationFee !== undefined) updateData.application_fee = updates.applicationFee || null;
        if (updates.hasPostalAddress !== undefined) updateData.has_postal_address = updates.hasPostalAddress;
        if (updates.postalAddress !== undefined) updateData.postal_address = updates.postalAddress || null;

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('manual_hiring_posts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update college is_hiring status
        if (data) {
            const { error: updateError } = await supabase
                .from('colleges')
                .update({ is_hiring: true, last_checked: new Date().toISOString() })
                .eq('id', data.college_id);

            if (updateError) {
                console.error('Failed to update college hiring status:', updateError);
                // We don't throw here to avoid failing the post update if only the status sync fails,
                // but we log it. Could optionally return a warning.
            }
        }

        return {
            data: data ? mapRowToPost(data) : null,
            error: null
        };
    } catch (error: any) {
        console.error('Error updating hiring post:', error);
        return {
            data: null,
            error: error.message || 'Failed to update hiring post'
        };
    }
};

/**
 * Delete a hiring post
 */
export const deleteHiringPost = async (id: number): Promise<{ success: boolean; error: string | null }> => {
    try {
        // First, get the college_id of the post we're about to delete
        const { data: postData, error: fetchError } = await supabase
            .from('manual_hiring_posts')
            .select('college_id')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const collegeId = postData?.college_id;

        // Delete the hiring post
        const { error } = await supabase
            .from('manual_hiring_posts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Check if there are any remaining active hiring posts for this college
        if (collegeId) {
            const today = new Date().toISOString().split('T')[0];
            const { data: remainingPosts, error: countError } = await supabase
                .from('manual_hiring_posts')
                .select('id')
                .eq('college_id', collegeId)
                .gte('last_date_to_apply', today)
                .limit(1);

            if (!countError && (!remainingPosts || remainingPosts.length === 0)) {
                // No more active hiring posts - set is_hiring to false
                await supabase
                    .from('colleges')
                    .update({ is_hiring: false })
                    .eq('id', collegeId);

                console.log(`📝 College ${collegeId} is_hiring set to false (no more active posts)`);
            }
        }

        return {
            success: true,
            error: null
        };
    } catch (error: any) {
        console.error('Error deleting hiring post:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete hiring post'
        };
    }
};

/**
 * Search colleges by name, state, university, or ID (for autocomplete)
 * Supports multi-word search: "school kerala" matches colleges with both words
 */
export const searchColleges = async (query: string): Promise<{ data: CollegeSearchResult[]; error: string | null }> => {
    try {
        if (!query || query.trim().length < 2) {
            return { data: [], error: null };
        }

        const trimmedQuery = query.trim();

        // If query is purely numeric, search by ID
        if (/^\d+$/.test(trimmedQuery)) {
            const { data, error } = await supabase
                .from('colleges')
                .select('id, college_name_place, state, affiliating_university')
                .eq('id', parseInt(trimmedQuery, 10))
                .limit(1);

            if (error) throw error;
            return { data: data || [], error: null };
        }

        // Split query into words for multi-word search
        const words = trimmedQuery.toLowerCase().split(/\s+/).filter(w => w.length >= 2);

        if (words.length === 0) {
            return { data: [], error: null };
        }

        // For single word, use simple ILIKE
        if (words.length === 1) {
            const { data, error } = await supabase
                .from('colleges')
                .select('id, college_name_place, state, affiliating_university')
                .or(`college_name_place.ilike.%${words[0]}%,state.ilike.%${words[0]}%,affiliating_university.ilike.%${words[0]}%`)
                .order('id', { ascending: false })
                .limit(50);

            if (error) throw error;
            return { data: data || [], error: null };
        }

        // For multiple words: fetch candidates matching first word, then filter client-side
        // This is more efficient than complex SQL for most use cases
        const { data: candidates, error } = await supabase
            .from('colleges')
            .select('id, college_name_place, state, affiliating_university')
            .or(`college_name_place.ilike.%${words[0]}%,state.ilike.%${words[0]}%,affiliating_university.ilike.%${words[0]}%`)
            .order('id', { ascending: false })
            .limit(200);  // Fetch more to filter down

        if (error) throw error;

        // Filter candidates - all words must appear in combined text
        const filtered = (candidates || []).filter(college => {
            const combinedText = `${college.college_name_place} ${college.state} ${college.affiliating_university}`.toLowerCase();
            return words.every(word => combinedText.includes(word));
        });

        return {
            data: filtered.slice(0, 50),  // Return max 50 results
            error: null
        };
    } catch (error: any) {
        console.error('Error searching colleges:', error);
        return {
            data: [],
            error: error.message || 'Failed to search colleges'
        };
    }
};

/**
 * Check if a hiring post is still active (not expired)
 */
export const isPostActive = (lastDateToApply: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(lastDateToApply);
    deadline.setHours(0, 0, 0, 0);
    return deadline >= today;
};

/**
 * Fetch full college details by ID for editing
 */
export const fetchCollegeById = async (id: number): Promise<{ data: CollegeDetails | null; error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('colleges')
            .select('id, college_name_place, state, type, affiliating_university, career_page_url, college_website_url, latitude, longitude')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return { data: null, error: 'College not found' };
        }

        console.log('📥 Raw college data from DB:', data);

        const processedData = {
            id: data.id,
            collegeNamePlace: data.college_name_place || '',
            state: data.state || '',
            type: (data.type as 'Govt.' | 'Private') || 'Private',
            affiliatingUniversity: data.affiliating_university || '',
            careerPageUrl: data.career_page_url || '',
            collegeWebsiteUrl: data.college_website_url || '',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
        };

        console.log('📤 Processed college data:', processedData);

        return {
            data: processedData,
            error: null
        };
    } catch (error: any) {
        console.error('Error fetching college:', error);
        return {
            data: null,
            error: error.message || 'Failed to fetch college details'
        };
    }
};

/**
 * Fetch paginated list of colleges for the college management list
 * Optimized for 25 items per page for fast loading
 */
export const fetchCollegesPaginated = async (
    page: number = 1,
    pageSize: number = 25
): Promise<{ data: CollegeSearchResult[]; total: number; error: string | null }> => {
    try {
        // Get total count first
        const { count, error: countError } = await supabase
            .from('colleges')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // Calculate offset
        const offset = (page - 1) * pageSize;

        // Fetch paginated data
        const { data, error } = await supabase
            .from('colleges')
            .select('id, college_name_place, state, affiliating_university')
            .order('id', { ascending: false })  // Newest first
            .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return {
            data: data || [],
            total: count || 0,
            error: null
        };
    } catch (error: any) {
        console.error('Error fetching paginated colleges:', error);
        return {
            data: [],
            total: 0,
            error: error.message || 'Failed to fetch colleges'
        };
    }
};

/**
 * Update an existing college's details
 */
export const updateCollege = async (id: number, college: Partial<CollegeDetails>): Promise<{ success: boolean; error: string | null }> => {
    try {
        const updateData: Record<string, any> = {};

        if (college.collegeNamePlace !== undefined) updateData.college_name_place = college.collegeNamePlace;
        if (college.state !== undefined) updateData.state = college.state;
        if (college.type !== undefined) updateData.type = college.type;
        if (college.affiliatingUniversity !== undefined) updateData.affiliating_university = college.affiliatingUniversity;
        if (college.careerPageUrl !== undefined) updateData.career_page_url = college.careerPageUrl;
        if (college.collegeWebsiteUrl !== undefined) updateData.college_website_url = college.collegeWebsiteUrl;
        if (college.latitude !== undefined) updateData.latitude = college.latitude;
        if (college.longitude !== undefined) updateData.longitude = college.longitude;

        console.log('📝 Updating college ID:', id, 'with data:', updateData);

        const { error } = await supabase
            .from('colleges')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        console.log('✅ College updated successfully!');

        return { success: true, error: null };
    } catch (error: any) {
        console.error('Error updating college:', error);
        return {
            success: false,
            error: error.message || 'Failed to update college'
        };
    }
};

/**
 * Create a new college in the database
 * Returns the newly created college ID
 */
export const createCollege = async (college: NewCollege): Promise<{ data: number | null; error: string | null }> => {
    try {
        // Combine college name with city to create the full college_name_place
        const collegeNameWithPlace = college.city
            ? `${college.collegeName}, ${college.city}, ${college.state}`
            : college.collegeName;

        const { data, error } = await supabase
            .from('colleges')
            .insert({
                college_name_place: collegeNameWithPlace,
                state: college.state,
                type: college.type,
                affiliating_university: college.affiliatingUniversity,
                career_page_url: college.careerPageUrl || '',
                college_website_url: college.collegeWebsiteUrl || '',
                latitude: college.latitude || 0,
                longitude: college.longitude || 0,
                career_at_college: college.careerAtCollege || '',
                is_hiring: true, // Set to true immediately since we're adding a hiring post
                last_checked: new Date().toISOString(),
                error_log: ''
            })
            .select('id')
            .single();

        if (error) throw error;

        return {
            data: data?.id || null,
            error: null
        };
    } catch (error: any) {
        console.error('Error creating college:', error);
        return {
            data: null,
            error: error.message || 'Failed to create college'
        };
    }
};

/**
 * Create multiple hiring posts from comma-separated position names
 * All fields except position name are identical
 */
export const createMultipleHiringPosts = async (
    positionNames: string[], // Array of position names
    postData: Omit<ManualHiringPost, 'id' | 'positionName' | 'createdAt' | 'updatedAt'>
): Promise<{ data: ManualHiringPost[]; error: string | null; count: number }> => {
    try {
        const posts = positionNames.map(name => ({
            college_id: postData.collegeId,
            position_name: name.trim(),
            posting_date: postData.postingDate,
            last_date_to_apply: postData.lastDateToApply,
            application_medium: postData.applicationMedium,
            has_advertisement: postData.hasAdvertisement,
            advertisement_link: postData.advertisementLink || null,
            has_email: postData.hasEmail,
            email_id: postData.emailId || null,
            salary: postData.salary,
            has_application_fee: postData.hasApplicationFee,
            application_fee: postData.applicationFee || null,
            has_postal_address: postData.hasPostalAddress,
            postal_address: postData.postalAddress || null,
        }));

        const { data, error } = await supabase
            .from('manual_hiring_posts')
            .insert(posts)
            .select();

        if (error) throw error;

        // Update college is_hiring status
        if (data && data.length > 0) {
            const { error: updateError } = await supabase
                .from('colleges')
                .update({ is_hiring: true, last_checked: new Date().toISOString() })
                .eq('id', postData.collegeId);

            if (updateError) {
                console.error('Failed to update college hiring status (batch create):', updateError);
            }
        }

        return {
            data: (data || []).map(mapRowToPost),
            error: null,
            count: data?.length || 0
        };
    } catch (error: any) {
        console.error('Error creating multiple hiring posts:', error);
        return {
            data: [],
            error: error.message || 'Failed to create hiring posts',
            count: 0
        };
    }
};
