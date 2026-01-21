import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Loader2, ChevronLeft, ChevronRight, X, Building2 } from 'lucide-react';
import {
    searchColleges,
    fetchCollegesPaginated,
    fetchCollegeById,
    updateCollege,
    createCollege,
    CollegeSearchResult,
    CollegeDetails,
    NewCollege
} from '../services/hiringPostService';

const STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
    'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep'
];

const CollegeDetailsEditor: React.FC = () => {
    // List state
    const [colleges, setColleges] = useState<CollegeSearchResult[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalColleges, setTotalColleges] = useState(0);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const pageSize = 25;

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Form state for editing
    const [editFormData, setEditFormData] = useState<Partial<CollegeDetails>>({});

    // Form state for adding new
    const [newFormData, setNewFormData] = useState<NewCollege>({
        collegeName: '',
        state: '',
        type: 'Private',
        affiliatingUniversity: '',
        city: '',
        careerPageUrl: '',
        collegeWebsiteUrl: '',
        latitude: undefined,
        longitude: undefined,
    });

    // Load paginated list on mount
    useEffect(() => {
        loadColleges(1);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setIsSearchMode(false);
            loadColleges(1);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            setIsSearchMode(true);
            const { data, error } = await searchColleges(searchQuery);
            if (!error) {
                setColleges(data);
            }
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadColleges = async (page: number) => {
        setIsLoadingList(true);
        const { data, total, error } = await fetchCollegesPaginated(page, pageSize);
        if (!error) {
            setColleges(data);
            setTotalColleges(total);
            setCurrentPage(page);
        }
        setIsLoadingList(false);
    };

    const totalPages = Math.ceil(totalColleges / pageSize);

    const handleOpenAddModal = () => {
        setModalMode('add');
        setNewFormData({
            collegeName: '',
            state: '',
            type: 'Private',
            affiliatingUniversity: '',
            city: '',
            careerPageUrl: '',
            collegeWebsiteUrl: '',
            latitude: undefined,
            longitude: undefined,
        });
        setError('');
        setShowModal(true);
    };

    const handleOpenEditModal = async (collegeId: number) => {
        setModalMode('edit');
        setSelectedCollegeId(collegeId);
        setIsLoadingDetails(true);
        setError('');
        setShowModal(true);

        const { data, error } = await fetchCollegeById(collegeId);
        if (error) {
            setError(error);
        } else if (data) {
            setEditFormData(data);
        }
        setIsLoadingDetails(false);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCollegeId(null);
        setEditFormData({});
        setError('');
    };

    const handleSaveEdit = async () => {
        if (!selectedCollegeId) return;

        setIsSaving(true);
        setError('');

        const { success, error } = await updateCollege(selectedCollegeId, editFormData);

        if (success) {
            handleCloseModal();
            // Refresh list
            if (isSearchMode && searchQuery) {
                const { data } = await searchColleges(searchQuery);
                setColleges(data);
            } else {
                loadColleges(currentPage);
            }
        } else {
            setError(error || 'Failed to update college');
        }
        setIsSaving(false);
    };

    const handleSaveNew = async () => {
        // Validation
        if (!newFormData.collegeName.trim() || !newFormData.state || !newFormData.affiliatingUniversity.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        setIsSaving(true);
        setError('');

        const { data, error } = await createCollege(newFormData);

        if (data) {
            handleCloseModal();
            loadColleges(1); // Go to first page to see new college
        } else {
            setError(error || 'Failed to create college');
        }
        setIsSaving(false);
    };

    return (
        <div>
            {/* Header with search and add button */}
            <div className="flex flex-col sm:flex-row gap-spacing_lg justify-between items-start sm:items-center mb-spacing_xl">
                <div className="relative flex-1 w-full sm:max-w-md">
                    <Search size={18} className="absolute left-spacing_lg top-1/2 -translate-y-1/2 text-colors_text_text_quaternary_500_" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, state, university, or ID..."
                        className="w-full pl-10 pr-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                    />
                    {isSearching && (
                        <Loader2 size={18} className="absolute right-spacing_lg top-1/2 -translate-y-1/2 text-colors_text_text_quaternary_500_ animate-spin" />
                    )}
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-spacing_sm px-spacing_xl py-spacing_md rounded-radius_md bg-colors_background_bg_brand_solid text-white text-text-sm-semibold hover:bg-colors_background_bg_brand_solid_hover transition-colors"
                >
                    <Plus size={18} />
                    Add New College
                </button>
            </div>

            {/* Stats */}
            {!isSearchMode && (
                <p className="text-text-sm-regular text-colors_text_text_tertiary_600_ mb-spacing_lg">
                    Showing {colleges.length} of {totalColleges} colleges
                </p>
            )}
            {isSearchMode && (
                <p className="text-text-sm-regular text-colors_text_text_tertiary_600_ mb-spacing_lg">
                    Found {colleges.length} matching colleges
                </p>
            )}

            {/* College List */}
            {isLoadingList ? (
                <div className="flex justify-center py-spacing_4xl">
                    <Loader2 size={32} className="text-colors_background_bg_brand_solid animate-spin" />
                </div>
            ) : colleges.length === 0 ? (
                <div className="text-center py-spacing_4xl text-colors_text_text_tertiary_600_">
                    <Building2 size={48} className="mx-auto mb-spacing_lg opacity-50" />
                    <p className="text-text-md-regular">No colleges found</p>
                </div>
            ) : (
                <div className="space-y-spacing_sm">
                    {colleges.map((college) => (
                        <div
                            key={college.id}
                            onClick={() => handleOpenEditModal(college.id)}
                            className="flex items-center justify-between p-spacing_lg bg-colors_background_bg_secondary rounded-radius_md border border-colors_border_border_secondary hover:border-colors_border_border_brand_solid hover:bg-colors_background_bg_tertiary transition-colors cursor-pointer group"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-text-sm-semibold text-colors_text_text_primary_900_ truncate">
                                    {college.college_name_place}
                                </div>
                                {college.affiliating_university && (
                                    <div className="text-text-xs-regular text-colors_text_text_secondary_700_ mt-spacing_xs truncate">
                                        {college.affiliating_university}
                                    </div>
                                )}
                                <div className="text-text-xs-regular text-colors_text_text_tertiary_600_ mt-spacing_xs flex items-center gap-spacing_lg">
                                    <span>{college.state}</span>
                                    <span className="text-colors_text_text_quaternary_500_">ID: {college.id}</span>
                                </div>
                            </div>
                            <Edit2
                                size={18}
                                className="text-colors_text_text_quaternary_500_ group-hover:text-colors_background_bg_brand_solid transition-colors flex-shrink-0 ml-spacing_lg"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!isSearchMode && totalPages > 1 && (
                <div className="flex items-center justify-center gap-spacing_lg mt-spacing_2xl">
                    <button
                        onClick={() => loadColleges(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-spacing_xs px-spacing_lg py-spacing_sm rounded-radius_md border border-colors_border_border_secondary text-text-sm-medium text-colors_text_text_secondary_700_ hover:bg-colors_background_bg_secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <span className="text-text-sm-regular text-colors_text_text_tertiary_600_">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => loadColleges(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-spacing_xs px-spacing_lg py-spacing_sm rounded-radius_md border border-colors_border_border_secondary text-text-sm-medium text-colors_text_text_secondary_700_ hover:bg-colors_background_bg_secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-spacing_xl">
                    <div className="bg-colors_background_bg_primary rounded-radius_lg shadow-shadow_floating w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-spacing_xl border-b border-colors_border_border_secondary sticky top-0 bg-colors_background_bg_primary">
                            <h2 className="text-text-lg-semibold text-colors_text_text_primary_900_">
                                {modalMode === 'add' ? 'Add New College' : 'Edit College Details'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="p-spacing_sm rounded-radius_md hover:bg-colors_background_bg_secondary transition-colors"
                            >
                                <X size={20} className="text-colors_text_text_quaternary_500_" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-spacing_xl space-y-spacing_lg">
                            {error && (
                                <div className="p-spacing_md rounded-radius_md bg-red-50 border border-red-200 text-text-sm-regular text-red-600">
                                    {error}
                                </div>
                            )}

                            {isLoadingDetails ? (
                                <div className="flex justify-center py-spacing_4xl">
                                    <Loader2 size={32} className="text-colors_background_bg_brand_solid animate-spin" />
                                </div>
                            ) : modalMode === 'edit' ? (
                                /* Edit Form */
                                <>
                                    <div>
                                        <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                            College Name (with location) *
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.collegeNamePlace || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, collegeNamePlace: e.target.value })}
                                            className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-spacing_lg">
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                State *
                                            </label>
                                            <select
                                                value={editFormData.state || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            >
                                                <option value="">Select state</option>
                                                {STATES.map(state => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Type *
                                            </label>
                                            <select
                                                value={editFormData.type || 'Private'}
                                                onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as 'Govt.' | 'Private' })}
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            >
                                                <option value="Govt.">Government</option>
                                                <option value="Private">Private</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                            Affiliating University *
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.affiliatingUniversity || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, affiliatingUniversity: e.target.value })}
                                            className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-spacing_lg">
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Career Page URL
                                            </label>
                                            <input
                                                type="url"
                                                value={editFormData.careerPageUrl || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, careerPageUrl: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                College Website URL
                                            </label>
                                            <input
                                                type="url"
                                                value={editFormData.collegeWebsiteUrl || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, collegeWebsiteUrl: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-spacing_lg">
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Latitude
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={editFormData.latitude || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                placeholder="e.g., 28.6139"
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Longitude
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={editFormData.longitude || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                placeholder="e.g., 77.2090"
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Add New Form */
                                <>
                                    <div>
                                        <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                            College Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={newFormData.collegeName}
                                            onChange={(e) => setNewFormData({ ...newFormData, collegeName: e.target.value })}
                                            placeholder="e.g., XYZ College of Engineering"
                                            className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-spacing_lg">
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                City *
                                            </label>
                                            <input
                                                type="text"
                                                value={newFormData.city}
                                                onChange={(e) => setNewFormData({ ...newFormData, city: e.target.value })}
                                                placeholder="e.g., Mumbai"
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                State *
                                            </label>
                                            <select
                                                value={newFormData.state}
                                                onChange={(e) => setNewFormData({ ...newFormData, state: e.target.value })}
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            >
                                                <option value="">Select state</option>
                                                {STATES.map(state => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-spacing_lg">
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Type *
                                            </label>
                                            <select
                                                value={newFormData.type}
                                                onChange={(e) => setNewFormData({ ...newFormData, type: e.target.value as 'Govt.' | 'Private' })}
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            >
                                                <option value="Govt.">Government</option>
                                                <option value="Private">Private</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Affiliating University *
                                            </label>
                                            <input
                                                type="text"
                                                value={newFormData.affiliatingUniversity}
                                                onChange={(e) => setNewFormData({ ...newFormData, affiliatingUniversity: e.target.value })}
                                                placeholder="e.g., Mumbai University"
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-spacing_lg">
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Career Page URL
                                            </label>
                                            <input
                                                type="url"
                                                value={newFormData.careerPageUrl}
                                                onChange={(e) => setNewFormData({ ...newFormData, careerPageUrl: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                College Website URL
                                            </label>
                                            <input
                                                type="url"
                                                value={newFormData.collegeWebsiteUrl}
                                                onChange={(e) => setNewFormData({ ...newFormData, collegeWebsiteUrl: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-spacing_lg">
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Latitude
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={newFormData.latitude || ''}
                                                onChange={(e) => setNewFormData({ ...newFormData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                placeholder="e.g., 28.6139"
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_secondary_700_ mb-spacing_sm">
                                                Longitude
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={newFormData.longitude || ''}
                                                onChange={(e) => setNewFormData({ ...newFormData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                placeholder="e.g., 77.2090"
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-spacing_md p-spacing_xl border-t border-colors_border_border_secondary sticky bottom-0 bg-colors_background_bg_primary">
                            <button
                                onClick={handleCloseModal}
                                className="px-spacing_xl py-spacing_md rounded-radius_md border border-colors_border_border_secondary text-text-sm-medium text-colors_text_text_secondary_700_ hover:bg-colors_background_bg_secondary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={modalMode === 'edit' ? handleSaveEdit : handleSaveNew}
                                disabled={isSaving}
                                className="flex items-center gap-spacing_sm px-spacing_xl py-spacing_md rounded-radius_md bg-colors_background_bg_brand_solid text-white text-text-sm-semibold hover:bg-colors_background_bg_brand_solid_hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                {modalMode === 'edit' ? 'Save Changes' : 'Add College'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollegeDetailsEditor;
