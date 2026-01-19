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
    created_at: string;
    updated_at: string;
}

// College search result type
export interface CollegeSearchResult {
    id: number;
    college_name_place: string;
    state: string;
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
        const { error } = await supabase
            .from('manual_hiring_posts')
            .delete()
            .eq('id', id);

        if (error) throw error;

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
 * Search colleges by name (for autocomplete)
 */
export const searchColleges = async (query: string): Promise<{ data: CollegeSearchResult[]; error: string | null }> => {
    try {
        if (!query || query.trim().length < 2) {
            return { data: [], error: null };
        }

        const { data, error } = await supabase
            .from('colleges')
            .select('id, college_name_place, state')
            .ilike('college_name_place', `%${query.trim()}%`)
            .limit(10);

        if (error) throw error;

        return {
            data: data || [],
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
 * Create a new college in the database
 * Returns the newly created college ID
 */
export const createCollege = async (college: NewCollege): Promise<{ data: number | null; error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('colleges')
            .insert({
                college_name_place: college.collegeName,
                state: college.state,
                type: college.type,
                affiliating_university: college.affiliatingUniversity,
                career_page_url: college.careerPageUrl || '',
                college_website_url: college.collegeWebsiteUrl || '',
                latitude: college.latitude || 0,
                longitude: college.longitude || 0,
                career_at_college: college.careerAtCollege || '',
                is_hiring: false,
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
