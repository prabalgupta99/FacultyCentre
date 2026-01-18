import React, { useState, useEffect } from 'react';
import { College } from '../types';
import JobDetailsSheet from './JobDetailsSheet';

interface CollegeDetailsManagerProps {
    colleges: College[];
    selectedCollegeId: string | null;
    onClose: () => void;
}

const MAX_CACHED_COLLEGES = 3;

const CollegeDetailsManager: React.FC<CollegeDetailsManagerProps> = ({
    colleges,
    selectedCollegeId,
    onClose
}) => {
    // Keep track of which colleges should be rendered
    const [renderedIds, setRenderedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!selectedCollegeId) return;

        setRenderedIds(prev => {
            // If already cached, do nothing (or move to end if we wanted strictly LRU, but simpler is fine)
            if (prev.includes(selectedCollegeId)) {
                return prev;
            }

            // Add new one
            const newIds = [...prev, selectedCollegeId];

            // Limit to MAX_CACHE
            if (newIds.length > MAX_CACHED_COLLEGES) {
                // Remove the oldest one (index 0)
                return newIds.slice(newIds.length - MAX_CACHED_COLLEGES);
            }
            return newIds;
        });
    }, [selectedCollegeId]);

    return (
        <>
            {renderedIds.map(id => {
                const college = colleges.find(c => c.id === id);
                if (!college) return null;

                // Only the currently selected one is "open" (visual state).
                // Others are rendered but "closed" (slid out).
                const isOpen = id === selectedCollegeId;

                return (
                    <JobDetailsSheet
                        key={id}
                        college={college}
                        isOpen={isOpen}
                        onClose={onClose}
                    />
                );
            })}
        </>
    );
};

export default CollegeDetailsManager;
