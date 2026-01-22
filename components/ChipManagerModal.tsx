import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Loader2, Save } from 'lucide-react';
import { FormOption, fetchFormOptions, addFormOption, updateFormOption, deleteFormOption } from '../services/hiringPostService';

interface ChipManagerModalProps {
    category: 'POSITION' | 'SALARY' | 'APPLICATION_MEDIUM' | 'APPLICATION_FEE';
    title: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Trigger parent to refetch options
}

const ChipManagerModal: React.FC<ChipManagerModalProps> = ({
    category,
    title,
    isOpen,
    onClose,
    onUpdate
}) => {
    const [options, setOptions] = useState<FormOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Add new option state
    const [newOptionLabel, setNewOptionLabel] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Edit option state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch options on mount
    useEffect(() => {
        if (isOpen) {
            loadOptions();
        }
    }, [isOpen, category]);

    const loadOptions = async () => {
        setIsLoading(true);
        setError(null);
        const { data, error } = await fetchFormOptions(category);
        if (error) {
            setError(error);
        } else {
            setOptions(data);
        }
        setIsLoading(false);
    };

    const handleAdd = async () => {
        if (!newOptionLabel.trim()) return;

        setIsAdding(true);
        const { data, error } = await addFormOption(category, newOptionLabel.trim());

        if (error) {
            setError(error);
        } else if (data) {
            setOptions([...options, data]);
            setNewOptionLabel('');
            onUpdate(); // Notify parent
        }
        setIsAdding(false);
    };

    const startEdit = (option: FormOption) => {
        setEditingId(option.id);
        setEditLabel(option.label);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditLabel('');
    };

    const saveEdit = async (id: number) => {
        if (!editLabel.trim()) return;
        if (editLabel.trim() === options.find(o => o.id === id)?.label) {
            cancelEdit();
            return;
        }

        setIsSaving(true);
        const { data, error } = await updateFormOption(id, editLabel.trim());

        if (error) {
            setError(error);
        } else if (data) {
            setOptions(options.map(o => o.id === id ? data : o));
            cancelEdit();
            onUpdate(); // Notify parent
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this option? It will be removed from the quick-select list.')) {
            return;
        }

        // Optimistic update
        const previousOptions = [...options];
        setOptions(options.filter(o => o.id !== id));

        const { success, error } = await deleteFormOption(id);

        if (!success) {
            setError(error);
            setOptions(previousOptions); // Revert
        } else {
            onUpdate(); // Notify parent
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-spacing_md bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-colors_background_bg_primary w-full max-w-lg rounded-radius_xl shadow-shadow_modal border border-colors_border_border_secondary flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-spacing_xl border-b border-colors_border_border_secondary">
                    <div>
                        <h3 className="text-text-lg-semibold text-colors_text_text_primary_900_">
                            Manage {title} Options
                        </h3>
                        <p className="text-text-xs-regular text-colors_text_text_secondary_700_ mt-1">
                            Add, edit, or remove quick-select chips
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-spacing_sm text-colors_text_text_tertiary_600_ hover:text-colors_text_text_primary_900_ hover:bg-colors_background_bg_secondary rounded-radius_full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-spacing_xl space-y-spacing_lg">

                    {error && (
                        <div className="p-spacing_md bg-colors_background_bg_error_primary text-colors_text_text_error_primary_600_ text-text-sm-regular rounded-radius_md flex items-start gap-2">
                            <span>{error}</span>
                            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
                        </div>
                    )}

                    {/* Add New Input */}
                    <div className="flex gap-spacing_md">
                        <input
                            type="text"
                            placeholder={`Add new ${title.toLowerCase()}...`}
                            value={newOptionLabel}
                            onChange={(e) => setNewOptionLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            className="flex-1 px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newOptionLabel.trim() || isAdding}
                            className="px-spacing_lg py-spacing_md bg-colors_background_bg_brand_solid text-white rounded-radius_md text-text-sm-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Add
                        </button>
                    </div>

                    {/* List */}
                    {isLoading ? (
                        <div className="flex justify-center py-spacing_3xl">
                            <Loader2 size={24} className="text-colors_text_text_brand_primary_600_ animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-spacing_xs">
                            {options.length === 0 ? (
                                <p className="text-center text-colors_text_text_tertiary_600_ py-spacing_xl text-text-sm-regular italic">
                                    No options found. Add one above!
                                </p>
                            ) : (
                                options.map((option) => (
                                    <div
                                        key={option.id}
                                        className="group flex items-center gap-spacing_md p-spacing_md rounded-radius_md hover:bg-colors_background_bg_secondary border border-transparent hover:border-colors_border_border_secondary transition-all"
                                    >
                                        {editingId === option.id ? (
                                            /* Edit Mode */
                                            <div className="flex-1 flex gap-spacing_sm animate-in fade-in">
                                                <input
                                                    type="text"
                                                    value={editLabel}
                                                    onChange={(e) => setEditLabel(e.target.value)}
                                                    className="flex-1 px-spacing_sm py-1 rounded-radius_sm border border-colors_border_border_brand_solid bg-white text-text-sm-regular focus:outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => saveEdit(option.id)}
                                                    disabled={isSaving}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-radius_sm"
                                                    title="Save"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-radius_sm"
                                                    title="Cancel"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            /* View Mode */
                                            <>
                                                <span className="flex-1 text-text-sm-regular text-colors_text_text_primary_900_ break-words">
                                                    {option.label}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEdit(option)}
                                                        className="p-1.5 text-colors_text_text_tertiary_600_ hover:text-colors_text_text_brand_primary_600_ hover:bg-colors_background_bg_tertiary rounded-radius_sm"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(option.id)}
                                                        className="p-1.5 text-colors_text_text_tertiary_600_ hover:text-red-500 hover:bg-red-50 rounded-radius_sm"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-spacing_xl border-t border-colors_border_border_secondary bg-colors_background_bg_secondary/50 rounded-b-radius_xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-spacing_xl py-spacing_md bg-colors_background_bg_brand_solid text-white rounded-radius_md text-text-sm-medium hover:opacity-90 shadow-shadow_xs"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChipManagerModal;
