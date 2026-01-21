import React, { useState, useEffect, useCallback } from 'react';
import { ManualHiringPost } from '../types';
import { searchColleges, CollegeSearchResult, NewCollege, createCollege, createMultipleHiringPosts, CollegeDetails, fetchCollegeById, updateCollege } from '../services/hiringPostService';
import { X, Search, Calendar, Plus, Loader2 } from 'lucide-react';

interface HiringPostFormProps {
    initialData?: ManualHiringPost;
    onSave: (post: Omit<ManualHiringPost, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

// Quick-fill options
const POSITION_OPTIONS = [
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Vice Chancellor',
    'Registrar',
    'Deputy Registrar',
    'Librarian',
    'Assistant Librarian',
    'Controller of Examination',
    'Head of Department',
    'Principal',
    'Dean'
];

const APPLICATION_MEDIUM_OPTIONS = [
    'Interested candidates can apply with updated bio-data and relevant documents through Email within 10 days from the date of advertisement.',
    'Interested and Eligible candidates may apply through Email by sending their resume and other supporting documents immediately'
];

const SALARY_OPTIONS = [
    'As per norms',
    'Strictly follows the UGC and CPC norms'
];

const APPLICATION_FEE_OPTIONS = [
    'UR- Rs. 2000/-',
    'OBC/EWS – Rs. 1000/-',
    'SC/ST/PwD/Women- Exempted'
];

// Indian States
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const HiringPostForm: React.FC<HiringPostFormProps> = ({
    initialData,
    onSave,
    onCancel,
    isLoading = false
}) => {
    const [collegeMode, setCollegeMode] = useState<'existing' | 'new'>('existing');
    const [collegeId, setCollegeId] = useState(initialData?.collegeId || 0);
    const [collegeName, setCollegeName] = useState('');
    const [collegeQuery, setCollegeQuery] = useState('');
    const [collegeSuggestions, setCollegeSuggestions] = useState<CollegeSearchResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // New college form data
    const [newCollegeData, setNewCollegeData] = useState<NewCollege>({
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

    // Edit existing college functionality
    const [editCollegeEnabled, setEditCollegeEnabled] = useState(false);
    const [collegeDetails, setCollegeDetails] = useState<CollegeDetails | null>(null);
    const [isLoadingCollegeDetails, setIsLoadingCollegeDetails] = useState(false);
    const [editedCollegeData, setEditedCollegeData] = useState<CollegeDetails | null>(null);

    const [formData, setFormData] = useState({
        positionName: initialData?.positionName || '',
        postingDate: initialData?.postingDate || '',
        lastDateToApply: initialData?.lastDateToApply || '',
        applicationMedium: initialData?.applicationMedium || '',
        hasAdvertisement: initialData?.hasAdvertisement || false,
        advertisementLink: initialData?.advertisementLink || '',
        hasEmail: initialData?.hasEmail || false,
        emailId: initialData?.emailId || '',
        salary: initialData?.salary || '',
        hasApplicationFee: initialData?.hasApplicationFee || false,
        applicationFee: initialData?.applicationFee || '',
        hasPostalAddress: initialData?.hasPostalAddress || false,
        postalAddress: initialData?.postalAddress || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Debounced college search
    useEffect(() => {
        if (collegeQuery.trim().length < 2 || collegeMode === 'new') {
            setCollegeSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            const { data } = await searchColleges(collegeQuery);
            setCollegeSuggestions(data);
        }, 300);

        return () => clearTimeout(timer);
    }, [collegeQuery, collegeMode]);

    // Fetch college details when edit mode is enabled
    useEffect(() => {
        if (editCollegeEnabled && collegeId > 0 && !collegeDetails) {
            setIsLoadingCollegeDetails(true);
            fetchCollegeById(collegeId).then(({ data, error }) => {
                if (data) {
                    setCollegeDetails(data);
                    setEditedCollegeData(data);
                } else if (error) {
                    setErrors(prev => ({ ...prev, editCollege: error }));
                }
                setIsLoadingCollegeDetails(false);
            });
        }
    }, [editCollegeEnabled, collegeId, collegeDetails]);

    const handleSelectCollege = (college: CollegeSearchResult) => {
        setCollegeId(college.id);
        setCollegeName(college.college_name_place);
        setCollegeQuery(college.college_name_place);
        setShowSuggestions(false);
        setErrors({ ...errors, college: '', editCollege: '' });
        // Reset edit state when college changes
        setEditCollegeEnabled(false);
        setCollegeDetails(null);
        setEditedCollegeData(null);
    };

    const addChipValue = (field: 'positionName' | 'applicationMedium' | 'salary' | 'applicationFee', value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field] ? `${prev[field]}, ${value}` : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: Record<string, string> = {};

        if (collegeMode === 'existing' && !collegeId) {
            newErrors.college = 'Please select a college or choose "Other" to add a new one';
        }

        if (collegeMode === 'new') {
            if (!newCollegeData.collegeName.trim()) newErrors.newCollegeName = 'College name is required';
            if (!newCollegeData.state) newErrors.newState = 'State is required';
            if (!newCollegeData.affiliatingUniversity.trim()) newErrors.newAffiliatingUniversity = 'Affiliating university is required';
            if (!newCollegeData.city.trim()) newErrors.newCity = 'City is required';
        }

        // Validation for edit college mode
        if (collegeMode === 'existing' && editCollegeEnabled && editedCollegeData) {
            if (!editedCollegeData.collegeNamePlace.trim()) newErrors.editCollegeName = 'College name is required';
            if (!editedCollegeData.state) newErrors.editState = 'State is required';
            if (!editedCollegeData.affiliatingUniversity.trim()) newErrors.editAffiliatingUniversity = 'Affiliating university is required';
        }

        if (!formData.positionName.trim()) newErrors.positionName = 'Position name is required';
        if (!formData.postingDate) newErrors.postingDate = 'Posting date is required';
        if (!formData.lastDateToApply) newErrors.lastDateToApply = 'Last date to apply is required';
        if (!formData.applicationMedium.trim()) newErrors.applicationMedium = 'Application medium is required';
        if (!formData.salary.trim()) newErrors.salary = 'Salary information is required';

        if (formData.hasEmail && !formData.emailId.trim()) {
            newErrors.emailId = 'Email ID is required when "Has Email" is checked';
        }

        if (formData.hasAdvertisement && !formData.advertisementLink.trim()) {
            newErrors.advertisementLink = 'Advertisement link is required when "Has Advertisement" is checked';
        }

        if (formData.hasApplicationFee && !formData.applicationFee.trim()) {
            newErrors.applicationFee = 'Application fee details are required when "Has Application Fee" is checked';
        }

        if (formData.hasPostalAddress && !formData.postalAddress.trim()) {
            newErrors.postalAddress = 'Postal address is required when "Has Postal Address" is checked';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSaving(true);

        try {
            let finalCollegeId = collegeId;

            // If editing existing college, update it first
            if (collegeMode === 'existing' && editCollegeEnabled && editedCollegeData) {
                const { success, error: updateError } = await updateCollege(collegeId, editedCollegeData);
                if (!success) {
                    setErrors({ editCollege: updateError || 'Failed to update college' });
                    setIsSaving(false);
                    return;
                }
            }

            // If creating a new college, create it first
            if (collegeMode === 'new') {
                const { data: newId, error: collegeError } = await createCollege(newCollegeData);

                if (collegeError || !newId) {
                    setErrors({ college: collegeError || 'Failed to create college' });
                    setIsSaving(false);
                    return;
                }

                finalCollegeId = newId;
            }

            // Parse comma-separated positions
            const positions = formData.positionName
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            if (positions.length === 0) {
                setErrors({ positionName: 'At least one position name is required' });
                setIsSaving(false);
                return;
            }

            // If editing existing post
            if (initialData) {
                // Update the current post with the PRIMARY (first) position
                await onSave({
                    collegeId: finalCollegeId,
                    positionName: positions[0],
                    postingDate: formData.postingDate,
                    lastDateToApply: formData.lastDateToApply,
                    applicationMedium: formData.applicationMedium.trim(),
                    hasAdvertisement: formData.hasAdvertisement,
                    advertisementLink: formData.hasAdvertisement ? formData.advertisementLink.trim() : undefined,
                    hasEmail: formData.hasEmail,
                    emailId: formData.hasEmail ? formData.emailId.trim() : undefined,
                    salary: formData.salary.trim(),
                    hasApplicationFee: formData.hasApplicationFee,
                    applicationFee: formData.hasApplicationFee ? formData.applicationFee.trim() : undefined,
                    hasPostalAddress: formData.hasPostalAddress,
                    postalAddress: formData.hasPostalAddress ? formData.postalAddress.trim() : undefined,
                });

                // If user added MORE positions during edit, create them as NEW posts
                if (positions.length > 1) {
                    const newPositions = positions.slice(1);
                    const postData = {
                        collegeId: finalCollegeId,
                        postingDate: formData.postingDate,
                        lastDateToApply: formData.lastDateToApply,
                        applicationMedium: formData.applicationMedium.trim(),
                        hasAdvertisement: formData.hasAdvertisement,
                        advertisementLink: formData.hasAdvertisement ? formData.advertisementLink.trim() : undefined,
                        hasEmail: formData.hasEmail,
                        emailId: formData.hasEmail ? formData.emailId.trim() : undefined,
                        salary: formData.salary.trim(),
                        hasApplicationFee: formData.hasApplicationFee,
                        applicationFee: formData.hasApplicationFee ? formData.applicationFee.trim() : undefined,
                        hasPostalAddress: formData.hasPostalAddress,
                        postalAddress: formData.hasPostalAddress ? formData.postalAddress.trim() : undefined,
                    };

                    const { error: batchError, count } = await createMultipleHiringPosts(newPositions, postData);

                    if (batchError) {
                        // Even if update succeeded, show error for creation
                        alert(`Updated post but failed to create ${newPositions.length} new posts: ${batchError}`);
                    } else {
                        alert(`Updated post and created ${count} new post${count > 1 ? 's' : ''}!`);
                        onCancel(); // Close form and refresh list
                    }
                }
            }
            // Creating new post(s)
            else {
                // Single new post
                if (positions.length === 1) {
                    await onSave({
                        collegeId: finalCollegeId,
                        positionName: positions[0],
                        postingDate: formData.postingDate,
                        lastDateToApply: formData.lastDateToApply,
                        applicationMedium: formData.applicationMedium.trim(),
                        hasAdvertisement: formData.hasAdvertisement,
                        advertisementLink: formData.hasAdvertisement ? formData.advertisementLink.trim() : undefined,
                        hasEmail: formData.hasEmail,
                        emailId: formData.hasEmail ? formData.emailId.trim() : undefined,
                        salary: formData.salary.trim(),
                        hasApplicationFee: formData.hasApplicationFee,
                        applicationFee: formData.hasApplicationFee ? formData.applicationFee.trim() : undefined,
                        hasPostalAddress: formData.hasPostalAddress,
                        postalAddress: formData.hasPostalAddress ? formData.postalAddress.trim() : undefined,
                    });
                } else {
                    // Multiple positions - use batch creation
                    const postData = {
                        collegeId: finalCollegeId,
                        postingDate: formData.postingDate,
                        lastDateToApply: formData.lastDateToApply,
                        applicationMedium: formData.applicationMedium.trim(),
                        hasAdvertisement: formData.hasAdvertisement,
                        advertisementLink: formData.hasAdvertisement ? formData.advertisementLink.trim() : undefined,
                        hasEmail: formData.hasEmail,
                        emailId: formData.hasEmail ? formData.emailId.trim() : undefined,
                        salary: formData.salary.trim(),
                        hasApplicationFee: formData.hasApplicationFee,
                        applicationFee: formData.hasApplicationFee ? formData.applicationFee.trim() : undefined,
                        hasPostalAddress: formData.hasPostalAddress,
                        postalAddress: formData.hasPostalAddress ? formData.postalAddress.trim() : undefined,
                    };

                    const { error: batchError, count } = await createMultipleHiringPosts(positions, postData);

                    if (batchError) {
                        setErrors({ general: batchError });
                        setIsSaving(false);
                        return;
                    }

                    // Success - navigate back to list
                    alert(`Successfully created ${count} hiring post${count > 1 ? 's' : ''}!`);
                    onCancel(); // Close form and refresh list
                    return;
                }
            }
        } catch (error: any) {
            setErrors({ general: error.message || 'An error occurred while saving' });
        } finally {
            setIsSaving(false);
        }
    };

    const QuickFillChips: React.FC<{ options: string[]; onSelect: (value: string) => void }> = ({ options, onSelect }) => (
        <div className="flex flex-wrap gap-spacing_sm mt-spacing_sm">
            {options.map((option, idx) => (
                <button
                    key={idx}
                    type="button"
                    onClick={() => onSelect(option)}
                    className="px-spacing_md py-spacing_xs rounded-radius_full text-text-xs-medium bg-colors_background_bg_tertiary text-colors_text_text_secondary_700_ border border-colors_border_border_secondary hover:bg-colors_background_bg_brand_secondary hover:text-colors_text_text_brand_primary_600_ hover:border-colors_border_border_brand_solid transition-colors"
                >
                    <Plus size={10} className="inline mr-spacing_xs" />
                    {option.length > 40 ? `${option.substring(0, 40)}...` : option}
                </button>
            ))}
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-spacing_2xl">
            {errors.general && (
                <div className="p-spacing_lg rounded-radius_md bg-red-50 border border-red-200">
                    <p className="text-text-sm-regular text-red-600">{errors.general}</p>
                </div>
            )}

            {/* College Selection */}
            <div>
                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                    College <span className="text-red-500">*</span>
                </label>

                {!initialData && (
                    <div className="flex gap-spacing_md mb-spacing_md">
                        <button
                            type="button"
                            onClick={() => {
                                setCollegeMode('existing');
                                setCollegeId(0);
                            }}
                            className={`px-spacing_lg py-spacing_md rounded-radius_md text-text-sm-medium transition-colors ${collegeMode === 'existing'
                                ? 'bg-colors_background_bg_brand_solid text-white'
                                : 'bg-colors_background_bg_secondary text-colors_text_text_secondary_700_ border border-colors_border_border_secondary'
                                }`}
                        >
                            Select Existing College
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setCollegeMode('new');
                                setCollegeId(0);
                                setCollegeQuery('');
                            }}
                            className={`px-spacing_lg py-spacing_md rounded-radius_md text-text-sm-medium transition-colors ${collegeMode === 'new'
                                ? 'bg-colors_background_bg_brand_solid text-white'
                                : 'bg-colors_background_bg_secondary text-colors_text_text_secondary_700_ border border-colors_border_border_secondary'
                                }`}
                        >
                            Add New College
                        </button>
                    </div>
                )}

                {collegeMode === 'existing' && !initialData && (
                    <div className="relative">
                        <Search className="absolute left-spacing_md top-1/2 -translate-y-1/2 text-colors_text_text_tertiary_600_" size={16} />
                        <input
                            type="text"
                            value={collegeQuery}
                            onChange={(e) => {
                                setCollegeQuery(e.target.value);
                                setShowSuggestions(true);
                                if (!e.target.value) {
                                    setCollegeId(0);
                                    setCollegeName('');
                                }
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            className="w-full pl-10 pr-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                            placeholder="Search college by name..."
                            autoComplete="off"
                        />

                        {showSuggestions && collegeSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-spacing_xs bg-colors_background_bg_primary border border-colors_border_border_secondary rounded-radius_md shadow-shadow_floating max-h-64 overflow-y-auto">
                                {collegeSuggestions.map((college) => (
                                    <button
                                        key={college.id}
                                        type="button"
                                        onClick={() => handleSelectCollege(college)}
                                        className="w-full text-left px-spacing_lg py-spacing_md hover:bg-colors_background_bg_secondary transition-colors border-b border-colors_border_border_secondary last:border-b-0"
                                    >
                                        <div className="text-text-sm-medium text-colors_text_text_primary_900_">
                                            {college.college_name_place}
                                        </div>
                                        {college.affiliating_university && (
                                            <div className="text-text-xs-regular text-colors_text_text_secondary_700_ mt-spacing_xs">
                                                {college.affiliating_university}
                                            </div>
                                        )}
                                        <div className="text-text-xs-regular text-colors_text_text_tertiary_600_ mt-spacing_xs flex justify-between">
                                            <span>{college.state}</span>
                                            <span className="text-colors_text_text_quaternary_500_">ID: {college.id}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {errors.college && (
                            <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.college}</p>
                        )}
                        {collegeId > 0 && (
                            <p className="text-text-xs-regular text-colors_text_text_tertiary_600_ mt-spacing_xs">
                                College ID: {collegeId}
                            </p>
                        )}
                    </div>
                )}

                {/* Edit College Details - only shown when a college is selected */}
                {collegeMode === 'existing' && !initialData && collegeId > 0 && (
                    <div className="p-spacing_xl rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_secondary">
                        <div className="flex items-center gap-spacing_md mb-spacing_lg">
                            <input
                                id="editCollegeEnabled"
                                type="checkbox"
                                checked={editCollegeEnabled}
                                onChange={(e) => {
                                    setEditCollegeEnabled(e.target.checked);
                                    if (!e.target.checked) {
                                        // Reset to original data when unchecking
                                        setEditedCollegeData(collegeDetails);
                                    }
                                }}
                                className="w-4 h-4 rounded border-colors_border_border_secondary text-colors_background_bg_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                            />
                            <label htmlFor="editCollegeEnabled" className="text-text-sm-medium text-colors_text_text_primary_900_">
                                Edit college details
                            </label>
                        </div>

                        {editCollegeEnabled && (
                            <>
                                {isLoadingCollegeDetails ? (
                                    // Skeleton loading state
                                    <div className="space-y-spacing_lg animate-pulse">
                                        <div className="h-10 bg-colors_background_bg_tertiary rounded-radius_md"></div>
                                        <div className="grid grid-cols-2 gap-spacing_lg">
                                            <div className="h-10 bg-colors_background_bg_tertiary rounded-radius_md"></div>
                                            <div className="h-10 bg-colors_background_bg_tertiary rounded-radius_md"></div>
                                        </div>
                                        <div className="h-10 bg-colors_background_bg_tertiary rounded-radius_md"></div>
                                        <div className="grid grid-cols-2 gap-spacing_lg">
                                            <div className="h-10 bg-colors_background_bg_tertiary rounded-radius_md"></div>
                                            <div className="h-10 bg-colors_background_bg_tertiary rounded-radius_md"></div>
                                        </div>
                                    </div>
                                ) : editedCollegeData ? (
                                    <div className="space-y-spacing_lg">
                                        {/* College Name (with location) */}
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                                College Name (with location) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editedCollegeData.collegeNamePlace}
                                                onChange={(e) => setEditedCollegeData({ ...editedCollegeData, collegeNamePlace: e.target.value })}
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                                placeholder="e.g., ABC Law College, Mumbai, Maharashtra"
                                            />
                                            {errors.editCollegeName && (
                                                <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.editCollegeName}</p>
                                            )}
                                        </div>

                                        {/* State & Type */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_lg">
                                            <div>
                                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                                    State <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={editedCollegeData.state}
                                                    onChange={(e) => setEditedCollegeData({ ...editedCollegeData, state: e.target.value })}
                                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                                >
                                                    <option value="">Select State</option>
                                                    {INDIAN_STATES.map(state => (
                                                        <option key={state} value={state}>{state}</option>
                                                    ))}
                                                </select>
                                                {errors.editState && (
                                                    <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.editState}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                                    Type <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={editedCollegeData.type}
                                                    onChange={(e) => setEditedCollegeData({ ...editedCollegeData, type: e.target.value as 'Govt.' | 'Private' })}
                                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                                >
                                                    <option value="Private">Private</option>
                                                    <option value="Govt.">Government</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Affiliating University */}
                                        <div>
                                            <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                                Affiliating University <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editedCollegeData.affiliatingUniversity}
                                                onChange={(e) => setEditedCollegeData({ ...editedCollegeData, affiliatingUniversity: e.target.value })}
                                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                                placeholder="e.g., Mumbai University"
                                            />
                                            {errors.editAffiliatingUniversity && (
                                                <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.editAffiliatingUniversity}</p>
                                            )}
                                        </div>

                                        {/* URLs */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_lg">
                                            <div>
                                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                                    Career Page URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={editedCollegeData.careerPageUrl}
                                                    onChange={(e) => setEditedCollegeData({ ...editedCollegeData, careerPageUrl: e.target.value })}
                                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                                    placeholder="https://..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                                    College Website URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={editedCollegeData.collegeWebsiteUrl}
                                                    onChange={(e) => setEditedCollegeData({ ...editedCollegeData, collegeWebsiteUrl: e.target.value })}
                                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>

                                        {/* Coordinates */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_lg">
                                            <div>
                                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                                    Latitude
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={editedCollegeData.latitude || ''}
                                                    onChange={(e) => setEditedCollegeData({ ...editedCollegeData, latitude: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                                    placeholder="e.g., 19.0760"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                                    Longitude
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={editedCollegeData.longitude || ''}
                                                    onChange={(e) => setEditedCollegeData({ ...editedCollegeData, longitude: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                                    placeholder="e.g., 72.8777"
                                                />
                                            </div>
                                        </div>

                                        {errors.editCollege && (
                                            <p className="text-text-xs-regular text-red-600">{errors.editCollege}</p>
                                        )}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                )}

                {collegeMode === 'new' && !initialData && (
                    <div className="space-y-spacing_lg p-spacing_xl rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_secondary">
                        <p className="text-text-sm-regular text-colors_text_text_secondary_700_ mb-spacing_lg">
                            Fill in the details to add a new college to the database
                        </p>

                        {/* College Name */}
                        <div>
                            <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                College Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={newCollegeData.collegeName}
                                onChange={(e) => {
                                    setNewCollegeData({ ...newCollegeData, collegeName: e.target.value });
                                    setErrors({ ...errors, newCollegeName: '' });
                                }}
                                className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                placeholder="e.g., ABC Law College"
                            />
                            {errors.newCollegeName && (
                                <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.newCollegeName}</p>
                            )}
                        </div>

                        {/* State & City */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_lg">
                            <div>
                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    State <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={newCollegeData.state}
                                    onChange={(e) => {
                                        setNewCollegeData({ ...newCollegeData, state: e.target.value });
                                        setErrors({ ...errors, newState: '' });
                                    }}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                >
                                    <option value="">Select State</option>
                                    {INDIAN_STATES.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                                {errors.newState && (
                                    <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.newState}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    City <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCollegeData.city}
                                    onChange={(e) => {
                                        setNewCollegeData({ ...newCollegeData, city: e.target.value });
                                        setErrors({ ...errors, newCity: '' });
                                    }}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                    placeholder="e.g., Mumbai"
                                />
                                {errors.newCity && (
                                    <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.newCity}</p>
                                )}
                            </div>
                        </div>

                        {/* Type & Affiliating University */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_lg">
                            <div>
                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={newCollegeData.type}
                                    onChange={(e) => setNewCollegeData({ ...newCollegeData, type: e.target.value as 'Govt.' | 'Private' })}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                >
                                    <option value="Private">Private</option>
                                    <option value="Govt.">Government</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    Affiliating University <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCollegeData.affiliatingUniversity}
                                    onChange={(e) => {
                                        setNewCollegeData({ ...newCollegeData, affiliatingUniversity: e.target.value });
                                        setErrors({ ...errors, newAffiliatingUniversity: '' });
                                    }}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                    placeholder="e.g., University of Mumbai"
                                />
                                {errors.newAffiliatingUniversity && (
                                    <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.newAffiliatingUniversity}</p>
                                )}
                            </div>
                        </div>

                        {/* Website URLs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_lg">
                            <div>
                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    College Website URL
                                </label>
                                <input
                                    type="url"
                                    value={newCollegeData.collegeWebsiteUrl}
                                    onChange={(e) => setNewCollegeData({ ...newCollegeData, collegeWebsiteUrl: e.target.value })}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    Career Page URL
                                </label>
                                <input
                                    type="url"
                                    value={newCollegeData.careerPageUrl}
                                    onChange={(e) => setNewCollegeData({ ...newCollegeData, careerPageUrl: e.target.value })}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                    placeholder="https://example.com/careers"
                                />
                            </div>
                        </div>

                        {/* Coordinates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_lg">
                            <div>
                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    Latitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={newCollegeData.latitude || ''}
                                    onChange={(e) => setNewCollegeData({ ...newCollegeData, latitude: parseFloat(e.target.value) || undefined })}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                    placeholder="e.g., 19.0760"
                                />
                            </div>

                            <div>
                                <label className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    Longitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={newCollegeData.longitude || ''}
                                    onChange={(e) => setNewCollegeData({ ...newCollegeData, longitude: parseFloat(e.target.value) || undefined })}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                    placeholder="e.g., 72.8777"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {initialData && (
                    <p className="text-text-sm-regular text-colors_text_text_tertiary_600_">
                        Editing existing post - college cannot be changed
                    </p>
                )}
            </div>

            {/* Position Name with Quick Fill */}
            <div>
                <label htmlFor="positionName" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                    Position Name <span className="text-red-500">*</span>
                </label>
                <p className="text-text-xs-regular text-colors_text_text_tertiary_600_ mb-spacing_sm">
                    {initialData ? 'Enter position name' : 'Comma-separated for multiple positions (e.g., "Assistant Professor, Associate Professor")'}
                </p>
                <input
                    id="positionName"
                    type="text"
                    value={formData.positionName}
                    onChange={(e) => {
                        setFormData({ ...formData, positionName: e.target.value });
                        setErrors({ ...errors, positionName: '' });
                    }}
                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                    placeholder="e.g., Assistant Professor"
                />
                {errors.positionName && (
                    <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.positionName}</p>
                )}
                <QuickFillChips
                    options={POSITION_OPTIONS}
                    onSelect={(val) => addChipValue('positionName', val)}
                />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_xl">
                <div>
                    <label htmlFor="postingDate" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                        Posting Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-spacing_md top-1/2 -translate-y-1/2 text-colors_text_text_tertiary_600_ pointer-events-none" size={16} />
                        <input
                            id="postingDate"
                            type="date"
                            value={formData.postingDate}
                            onChange={(e) => {
                                setFormData({ ...formData, postingDate: e.target.value });
                                setErrors({ ...errors, postingDate: '' });
                            }}
                            className="w-full pl-10 pr-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                        />
                    </div>
                    {errors.postingDate && (
                        <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.postingDate}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="lastDateToApply" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                        Last Date to Apply <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-spacing_md top-1/2 -translate-y-1/2 text-colors_text_text_tertiary_600_ pointer-events-none" size={16} />
                        <input
                            id="lastDateToApply"
                            type="date"
                            value={formData.lastDateToApply}
                            onChange={(e) => {
                                setFormData({ ...formData, lastDateToApply: e.target.value });
                                setErrors({ ...errors, lastDateToApply: '' });
                            }}
                            className="w-full pl-10 pr-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                        />
                    </div>
                    {errors.lastDateToApply && (
                        <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.lastDateToApply}</p>
                    )}
                </div>
            </div>

            {/* Application Medium with Quick Fill */}
            <div>
                <label htmlFor="applicationMedium" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                    Application Medium <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="applicationMedium"
                    value={formData.applicationMedium}
                    onChange={(e) => {
                        setFormData({ ...formData, applicationMedium: e.target.value });
                        setErrors({ ...errors, applicationMedium: '' });
                    }}
                    rows={3}
                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20 resize-none"
                    placeholder="e.g., Interested and eligible candidates may apply through email..."
                />
                {errors.applicationMedium && (
                    <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.applicationMedium}</p>
                )}
                <QuickFillChips
                    options={APPLICATION_MEDIUM_OPTIONS}
                    onSelect={(val) => addChipValue('applicationMedium', val)}
                />
            </div>

            {/* Salary with Quick Fill */}
            <div>
                <label htmlFor="salary" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                    Salary <span className="text-red-500">*</span>
                </label>
                <input
                    id="salary"
                    type="text"
                    value={formData.salary}
                    onChange={(e) => {
                        setFormData({ ...formData, salary: e.target.value });
                        setErrors({ ...errors, salary: '' });
                    }}
                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                    placeholder="e.g., As per norms"
                />
                {errors.salary && (
                    <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.salary}</p>
                )}
                <QuickFillChips
                    options={SALARY_OPTIONS}
                    onSelect={(val) => addChipValue('salary', val)}
                />
            </div>

            {/* Email Section */}
            <div className="p-spacing_xl rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_secondary">
                <div className="flex items-center gap-spacing_md mb-spacing_lg">
                    <input
                        id="hasEmail"
                        type="checkbox"
                        checked={formData.hasEmail}
                        onChange={(e) => {
                            setFormData({ ...formData, hasEmail: e.target.checked });
                            if (!e.target.checked) {
                                setFormData(prev => ({ ...prev, emailId: '' }));
                                setErrors({ ...errors, emailId: '' });
                            }
                        }}
                        className="w-4 h-4 rounded border-colors_border_border_secondary text-colors_background_bg_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                    />
                    <label htmlFor="hasEmail" className="text-text-sm-medium text-colors_text_text_primary_900_">
                        Has Email ID
                    </label>
                </div>

                {formData.hasEmail && (
                    <div>
                        <label htmlFor="emailId" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                            Email ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="emailId"
                            type="email"
                            value={formData.emailId}
                            onChange={(e) => {
                                setFormData({ ...formData, emailId: e.target.value });
                                setErrors({ ...errors, emailId: '' });
                            }}
                            className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                            placeholder="e.g., careers@kccitm.edu.in"
                        />
                        {errors.emailId && (
                            <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.emailId}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Advertisement Section */}
            <div className="p-spacing_xl rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_secondary">
                <div className="flex items-center gap-spacing_md mb-spacing_lg">
                    <input
                        id="hasAdvertisement"
                        type="checkbox"
                        checked={formData.hasAdvertisement}
                        onChange={(e) => {
                            setFormData({ ...formData, hasAdvertisement: e.target.checked });
                            if (!e.target.checked) {
                                setFormData(prev => ({ ...prev, advertisementLink: '' }));
                                setErrors({ ...errors, advertisementLink: '' });
                            }
                        }}
                        className="w-4 h-4 rounded border-colors_border_border_secondary text-colors_background_bg_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                    />
                    <label htmlFor="hasAdvertisement" className="text-text-sm-medium text-colors_text_text_primary_900_">
                        Has Advertisement
                    </label>
                </div>

                {formData.hasAdvertisement && (
                    <div>
                        <label htmlFor="advertisementLink" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                            Advertisement Link <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="advertisementLink"
                            type="url"
                            value={formData.advertisementLink}
                            onChange={(e) => {
                                setFormData({ ...formData, advertisementLink: e.target.value });
                                setErrors({ ...errors, advertisementLink: '' });
                            }}
                            className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                            placeholder="https://example.com/advertisement.pdf"
                        />
                        {errors.advertisementLink && (
                            <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.advertisementLink}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Application Fee Section */}
            <div className="p-spacing_xl rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_secondary">
                <div className="flex items-center gap-spacing_md mb-spacing_lg">
                    <input
                        id="hasApplicationFee"
                        type="checkbox"
                        checked={formData.hasApplicationFee}
                        onChange={(e) => {
                            setFormData({ ...formData, hasApplicationFee: e.target.checked });
                            if (!e.target.checked) {
                                setFormData(prev => ({ ...prev, applicationFee: '' }));
                                setErrors({ ...errors, applicationFee: '' });
                            }
                        }}
                        className="w-4 h-4 rounded border-colors_border_border_secondary text-colors_background_bg_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                    />
                    <label htmlFor="hasApplicationFee" className="text-text-sm-medium text-colors_text_text_primary_900_">
                        Has Application Fee
                    </label>
                </div>

                {formData.hasApplicationFee && (
                    <div>
                        <label htmlFor="applicationFee" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                            Application Fee <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="applicationFee"
                            type="text"
                            value={formData.applicationFee}
                            onChange={(e) => {
                                setFormData({ ...formData, applicationFee: e.target.value });
                                setErrors({ ...errors, applicationFee: '' });
                            }}
                            className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                            placeholder="e.g., UR- Rs. 2000/-"
                        />
                        {errors.applicationFee && (
                            <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.applicationFee}</p>
                        )}
                        <QuickFillChips
                            options={APPLICATION_FEE_OPTIONS}
                            onSelect={(val) => addChipValue('applicationFee', val)}
                        />
                    </div>
                )}
            </div>

            {/* Postal Address Section */}
            <div className="p-spacing_xl rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_secondary">
                <div className="flex items-center gap-spacing_md mb-spacing_lg">
                    <input
                        id="hasPostalAddress"
                        type="checkbox"
                        checked={formData.hasPostalAddress}
                        onChange={(e) => {
                            setFormData({ ...formData, hasPostalAddress: e.target.checked });
                            if (!e.target.checked) {
                                setFormData(prev => ({ ...prev, postalAddress: '' }));
                                setErrors({ ...errors, postalAddress: '' });
                            }
                        }}
                        className="w-4 h-4 rounded border-colors_border_border_secondary text-colors_background_bg_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                    />
                    <label htmlFor="hasPostalAddress" className="text-text-sm-medium text-colors_text_text_primary_900_">
                        Has Postal Address
                    </label>
                </div>

                {formData.hasPostalAddress && (
                    <div>
                        <label htmlFor="postalAddress" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                            Postal Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="postalAddress"
                            rows={3}
                            value={formData.postalAddress}
                            onChange={(e) => {
                                setFormData({ ...formData, postalAddress: e.target.value });
                                setErrors({ ...errors, postalAddress: '' });
                            }}
                            className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20 resize-none"
                            placeholder="e.g., The Principal, ABC College, Mumbai - 400001"
                        />
                        {errors.postalAddress && (
                            <p className="text-text-xs-regular text-red-600 mt-spacing_xs">{errors.postalAddress}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-spacing_lg pt-spacing_xl border-t border-colors_border_border_secondary">
                <button
                    type="submit"
                    disabled={isLoading || isSaving}
                    className="flex-1 py-spacing_lg rounded-radius_md text-text-sm-semibold bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                    {isSaving ? 'Saving...' : initialData ? 'Update Post' : 'Create Post(s)'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading || isSaving}
                    className="flex-1 py-spacing_lg rounded-radius_md text-text-sm-semibold bg-colors_background_bg_secondary text-colors_text_text_secondary_700_ border border-colors_border_border_secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-colors_background_bg_tertiary transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default HiringPostForm;
