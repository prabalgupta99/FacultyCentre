import React, { useState } from 'react';
import HiringPostManager from './HiringPostManager';
import CollegeDetailsEditor from './CollegeDetailsEditor';
import { LogOut, Briefcase, GraduationCap } from 'lucide-react';

type TabType = 'hiring' | 'colleges';

interface AdminDashboardProps {
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<TabType>('hiring');

    return (
        <div className="min-h-screen bg-colors_background_bg_primary">
            {/* Header */}
            <header className="bg-colors_background_bg_primary border-b border-colors_border_border_secondary sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-spacing_2xl pt-spacing_xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-display-sm-semibold text-colors_text_text_primary_900_">
                                Faculty Centre Management System
                            </h1>
                            <p className="text-text-sm-regular text-colors_text_text_tertiary_600_ mt-spacing_xs">
                                Admin Panel
                            </p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-spacing_sm px-spacing_lg py-spacing_md rounded-radius_md text-text-sm-medium text-colors_text_text_secondary_700_ hover:bg-colors_background_bg_secondary transition-colors"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-spacing_2xl mt-spacing_xl translate-y-[1px]">
                        <button
                            onClick={() => setActiveTab('hiring')}
                            className={`pb-spacing_md text-text-sm-semibold transition-all relative border-b-2 ${activeTab === 'hiring'
                                    ? 'text-colors_text_text_brand_primary_900_ border-colors_background_bg_brand_solid'
                                    : 'text-colors_text_text_tertiary_600_ border-transparent hover:text-colors_text_text_primary_900_'
                                }`}
                        >
                            Hiring Management
                        </button>
                        <button
                            onClick={() => setActiveTab('colleges')}
                            className={`pb-spacing_md text-text-sm-semibold transition-all relative border-b-2 ${activeTab === 'colleges'
                                    ? 'text-colors_text_text_brand_primary_900_ border-colors_background_bg_brand_solid'
                                    : 'text-colors_text_text_tertiary_600_ border-transparent hover:text-colors_text_text_primary_900_'
                                }`}
                        >
                            College Details
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-spacing_2xl py-spacing_2xl">
                {activeTab === 'hiring' && <HiringPostManager />}
                {activeTab === 'colleges' && <CollegeDetailsEditor />}
            </main>
        </div>
    );
};

export default AdminDashboard;
