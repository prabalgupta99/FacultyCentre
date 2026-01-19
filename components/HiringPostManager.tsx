import React, { useState, useEffect } from 'react';
import { ManualHiringPost } from '../types';
import {
    fetchAllHiringPosts,
    createHiringPost,
    updateHiringPost,
    deleteHiringPost,
    isPostActive
} from '../services/hiringPostService';
import HiringPostForm from './HiringPostForm';
import { Plus, Edit2, Trash2, Calendar, Mail, ExternalLink, AlertCircle, ArrowLeft } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit';

interface PostWithCollege extends ManualHiringPost {
    collegeName?: string;
}

const HiringPostManager: React.FC = () => {
    const [posts, setPosts] = useState<PostWithCollege[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [editingPost, setEditingPost] = useState<ManualHiringPost | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    useEffect(() => {
        loadPosts();

        // Handle URL hash routing
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.endsWith('/new')) {
                setViewMode('create');
            } else if (hash.endsWith('/edit')) {
                setViewMode('edit');
                // Note: editingPost must be set before navigation or handled via ID lookup if persistence is needed.
                // For now, if editingPost is missing on refresh, we'll redirect or show error, 
                // but since this is client-side state for now, we assume user navigates from list.
            } else {
                setViewMode('list');
                setEditingPost(null);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial check

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const loadPosts = async () => {
        setIsFetching(true);
        const { data, error } = await fetchAllHiringPosts();
        if (error) {
            setError(error);
        } else {
            setPosts(data);
        }
        setIsFetching(false);
    };

    const handleCreate = async (post: Omit<ManualHiringPost, 'id' | 'createdAt' | 'updatedAt'>) => {
        setIsLoading(true);
        setError('');
        const { data, error } = await createHiringPost(post);
        setIsLoading(false);

        if (error) {
            setError(error);
        } else if (data) {
            await loadPosts();
            window.history.back();
        }
    };

    const handleUpdate = async (post: Omit<ManualHiringPost, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!editingPost) return;

        setIsLoading(true);
        setError('');
        const { data, error } = await updateHiringPost(editingPost.id, post);
        setIsLoading(false);

        if (error) {
            setError(error);
        } else if (data) {
            await loadPosts();
            window.history.back();
            setEditingPost(null);
        }
    };

    const handleDelete = async (id: number) => {
        setIsLoading(true);
        setError('');
        const { success, error } = await deleteHiringPost(id);
        setIsLoading(false);
        setDeleteConfirm(null);

        if (error) {
            setError(error);
        } else if (success) {
            await loadPosts();
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (viewMode === 'create') {
        return (
            <div>
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-spacing_sm text-colors_text_text_secondary_700_ hover:text-colors_text_text_primary_900_ mb-spacing_lg transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="text-text-sm-medium">Back to List</span>
                </button>

                <div className="mb-spacing_3xl">
                    <h2 className="text-text-xl-bold text-colors_text_text_primary_900_">Add New Hiring Post</h2>
                    <p className="text-text-sm-regular text-colors_text_text_secondary_700_ mt-spacing_xs">
                        Fill in the details to create a new hiring post
                    </p>
                </div>

                {error && (
                    <div className="mb-spacing_xl p-spacing_lg rounded-radius_md bg-red-50 border border-red-200 flex items-start gap-spacing_md">
                        <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-text-sm-medium text-red-800">Error</p>
                            <p className="text-text-sm-regular text-red-600 mt-spacing_xs">{error}</p>
                        </div>
                    </div>
                )}

                <div className="bg-colors_background_bg_secondary rounded-radius_lg p-spacing_3xl border border-colors_border_border_secondary">
                    <HiringPostForm
                        onSave={handleCreate}
                        onCancel={() => {
                            window.history.back();
                            setError('');
                        }}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        );
    }

    if (viewMode === 'edit' && editingPost) {
        return (
            <div>
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-spacing_sm text-colors_text_text_secondary_700_ hover:text-colors_text_text_primary_900_ mb-spacing_lg transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="text-text-sm-medium">Back to List</span>
                </button>

                <div className="mb-spacing_3xl">
                    <h2 className="text-text-xl-bold text-colors_text_text_primary_900_">Edit Hiring Post</h2>
                    <p className="text-text-sm-regular text-colors_text_text_secondary_700_ mt-spacing_xs">
                        Update the hiring post details
                    </p>
                </div>

                {error && (
                    <div className="mb-spacing_xl p-spacing_lg rounded-radius_md bg-red-50 border border-red-200 flex items-start gap-spacing_md">
                        <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-text-sm-medium text-red-800">Error</p>
                            <p className="text-text-sm-regular text-red-600 mt-spacing_xs">{error}</p>
                        </div>
                    </div>
                )}

                <div className="bg-colors_background_bg_secondary rounded-radius_lg p-spacing_3xl border border-colors_border_border_secondary">
                    <HiringPostForm
                        initialData={editingPost}
                        onSave={handleUpdate}
                        onCancel={() => {
                            window.history.back();
                            setEditingPost(null);
                            setError('');
                        }}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-spacing_3xl">
                <div>
                    <h2 className="text-text-xl-bold text-colors_text_text_primary_900_">Manual Hiring Posts</h2>
                    <p className="text-text-sm-regular text-colors_text_text_secondary_700_ mt-spacing_xs">
                        Manage all manually added hiring posts
                    </p>
                </div>
                <button
                    onClick={() => window.location.hash = '#/admin/hiring-manager/new'}
                    className="flex items-center gap-spacing_sm px-spacing_xl py-spacing_md rounded-radius_md text-text-sm-semibold bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg hover:opacity-90 transition-opacity"
                >
                    <Plus size={16} />
                    Add New Post
                </button>
            </div>

            {error && (
                <div className="mb-spacing_xl p-spacing_lg rounded-radius_md bg-red-50 border border-red-200 flex items-start gap-spacing_md">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-text-sm-medium text-red-800">Error</p>
                        <p className="text-text-sm-regular text-red-600 mt-spacing_xs">{error}</p>
                    </div>
                </div>
            )}

            {isFetching ? (
                <div className="py-spacing_6xl text-center">
                    <div className="inline-block w-8 h-8 border-4 border-colors_border_border_secondary border-t-colors_border_border_brand_solid rounded-full animate-spin"></div>
                    <p className="text-text-sm-regular text-colors_text_text_tertiary_600_ mt-spacing_lg">
                        Loading hiring posts...
                    </p>
                </div>
            ) : posts.length === 0 ? (
                <div className="py-spacing_6xl text-center rounded-radius_md border border-dashed border-colors_border_border_secondary bg-colors_background_bg_secondary">
                    <p className="text-text-sm-medium text-colors_text_text_secondary_700_">
                        No hiring posts added yet
                    </p>
                    <p className="text-text-xs-regular text-colors_text_text_tertiary_600_ mt-spacing_md">
                        Click "Add New Post" to create your first hiring post
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-spacing_lg">
                    {posts.map((post) => {
                        const active = isPostActive(post.lastDateToApply);
                        return (
                            <div
                                key={post.id}
                                className="bg-colors_background_bg_secondary rounded-radius_lg border border-colors_border_border_secondary p-spacing_2xl hover:border-colors_border_border_brand_solid transition-colors h-full flex flex-col"
                            >
                                <div className="flex items-start justify-between gap-spacing_xl mb-spacing_lg">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-spacing_md mb-spacing_sm">
                                            <h3 className="text-text-lg-semibold text-colors_text_text_primary_900_">
                                                {post.positionName}
                                            </h3>
                                            {!active && (
                                                <span className="px-spacing_md py-spacing_xxs rounded-radius_full text-text-xs-medium bg-red-100 text-red-700 border border-red-200">
                                                    Expired
                                                </span>
                                            )}
                                            {active && (
                                                <span className="px-spacing_md py-spacing_xxs rounded-radius_full text-text-xs-medium bg-green-100 text-green-700 border border-green-200">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-text-sm-regular text-colors_text_text_tertiary_600_">
                                            College ID: {post.collegeId}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-spacing_sm">
                                        <button
                                            onClick={() => {
                                                setEditingPost(post);
                                                window.location.hash = '#/admin/hiring-manager/edit';
                                            }}
                                            className="p-spacing_sm rounded-radius_md text-colors_text_text_secondary_700_ hover:bg-colors_background_bg_tertiary transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(post.id)}
                                            className="p-spacing_sm rounded-radius_md text-red-600 hover:bg-red-50 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_lg text-text-sm-regular">
                                    <div className="flex items-center gap-spacing_sm text-colors_text_text_secondary_700_">
                                        <Calendar size={14} className="text-colors_text_text_tertiary_600_" />
                                        <span className="text-text-xs-medium text-colors_text_text_tertiary_600_">Posted:</span>
                                        {formatDate(post.postingDate)}
                                    </div>
                                    <div className="flex items-center gap-spacing_sm text-colors_text_text_secondary_700_">
                                        <Calendar size={14} className="text-colors_text_text_tertiary_600_" />
                                        <span className="text-text-xs-medium text-colors_text_text_tertiary_600_">Deadline:</span>
                                        {formatDate(post.lastDateToApply)}
                                    </div>
                                </div>

                                <div className="mt-spacing_lg pt-spacing_lg border-t border-colors_border_border_secondary">
                                    <div className="text-text-xs-medium text-colors_text_text_tertiary_600_ mb-spacing_sm">
                                        APPLICATION MEDIUM
                                    </div>
                                    <p className="text-text-sm-regular text-colors_text_text_secondary_700_ whitespace-pre-wrap">
                                        {post.applicationMedium}
                                    </p>
                                </div>

                                <div className="mt-spacing_lg grid grid-cols-1 md:grid-cols-3 gap-spacing_lg">
                                    <div>
                                        <div className="text-text-xs-medium text-colors_text_text_tertiary_600_ mb-spacing_xs">
                                            SALARY
                                        </div>
                                        <p className="text-text-sm-regular text-colors_text_text_secondary_700_">
                                            {post.salary}
                                        </p>
                                    </div>

                                    {post.hasEmail && post.emailId && (
                                        <div>
                                            <div className="text-text-xs-medium text-colors_text_text_tertiary_600_ mb-spacing_xs">
                                                EMAIL
                                            </div>
                                            <a
                                                href={`mailto:${post.emailId}`}
                                                className="text-text-sm-regular text-colors_text_text_brand_primary_600_ hover:text-colors_text_text_brand_primary_800_ flex items-center gap-spacing_xs"
                                            >
                                                <Mail size={14} />
                                                {post.emailId}
                                            </a>
                                        </div>
                                    )}

                                    {post.hasAdvertisement && post.advertisementLink && (
                                        <div>
                                            <div className="text-text-xs-medium text-colors_text_text_tertiary_600_ mb-spacing_xs">
                                                ADVERTISEMENT
                                            </div>
                                            <a
                                                href={post.advertisementLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-text-sm-regular text-colors_text_text_brand_primary_600_ hover:text-colors_text_text_brand_primary_800_ flex items-center gap-spacing_xs"
                                            >
                                                <ExternalLink size={14} />
                                                View Link
                                            </a>
                                        </div>
                                    )}

                                    {post.hasPostalAddress && post.postalAddress && (
                                        <div className="md:col-span-3">
                                            <div className="text-text-xs-medium text-colors_text_text_tertiary_600_ mb-spacing_xs">
                                                POSTAL ADDRESS
                                            </div>
                                            <p className="text-text-sm-regular text-colors_text_text_secondary_700_ whitespace-pre-wrap">
                                                {post.postalAddress}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Delete Confirmation */}
                                {deleteConfirm === post.id && (
                                    <div className="mt-spacing_xl pt-spacing_xl border-t border-colors_border_border_secondary">
                                        <div className="bg-red-50 border border-red-200 rounded-radius_md p-spacing_lg">
                                            <p className="text-text-sm-medium text-red-800 mb-spacing_lg">
                                                Are you sure you want to delete this hiring post? This action cannot be undone.
                                            </p>
                                            <div className="flex items-center gap-spacing_md">
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    disabled={isLoading}
                                                    className="px-spacing_xl py-spacing_md rounded-radius_md text-text-sm-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {isLoading ? 'Deleting...' : 'Yes, Delete'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    disabled={isLoading}
                                                    className="px-spacing_xl py-spacing_md rounded-radius_md text-text-sm-semibold bg-colors_background_bg_primary text-colors_text_text_secondary_700_ border border-colors_border_border_secondary hover:bg-colors_background_bg_tertiary disabled:opacity-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HiringPostManager;
