
import React, { useState } from 'react';
import { College, Job } from '../types';
import { ChevronRight, Clock, MapPin, ExternalLink, Globe, ArrowLeft } from 'lucide-react';

interface JobDetailsSheetProps {
    college: College;
    isOpen: boolean;
    onClose: () => void;
}

const JobDetailsSheet: React.FC<JobDetailsSheetProps> = ({ college, isOpen, onClose }) => {
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [activeTab, setActiveTab] = useState<'career' | 'website' | 'jobs'>('career');

    const renderIframeWithHeader = (url: string | undefined, title: string, emptyMessage: string) => (
        <div className="h-[calc(100vh-200px)] flex flex-col gap-spacing_sm">
            {url ? (
                <>
                    <div className="flex items-center justify-between px-spacing_xs flex-shrink-0">
                        <span className="text-text-xs-regular text-colors_text_text_tertiary_600_ truncate flex-1 mr-spacing_md font-mono bg-colors_background_bg_secondary px-spacing_sm py-spacing_xxs rounded-radius_sm">
                            {url}
                        </span>
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-text-xs-medium text-colors_text_text_brand_primary_600_ hover:text-colors_text_text_brand_primary_800_ flex items-center gap-spacing_xs whitespace-nowrap transition-colors"
                        >
                            Open in new tab <ExternalLink size={12} />
                        </a>
                    </div>
                    <iframe
                        key={url}
                        src={url}
                        className="w-full flex-1 border border-colors_border_border_secondary rounded-radius_md bg-white"
                        title={title}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                </>
            ) : (
                <div className="flex items-center justify-center h-full text-colors_text_text_tertiary_600_">
                    <p>{emptyMessage}</p>
                </div>
            )}
        </div>
    );



    return (
        <div
            className={`fixed inset-0 z-[600] flex flex-col shadow-shadow_floating transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) bg-colors_background_bg_primary w-full h-full`}
            style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >

            <div className="px-spacing_xl md:px-spacing_3xl py-spacing_lg md:py-spacing_2xl border-b border-colors_border_border_secondary flex items-start gap-spacing_lg sticky top-0 z-10 bg-colors_background_bg_primary">
                <button
                    onClick={onClose}
                    className="mt-1 p-spacing_sm -ml-spacing_sm rounded-radius_full transition-colors text-colors_text_text_secondary_700_ hover:bg-colors_background_bg_secondary hover:text-colors_text_text_primary_900_"
                    aria-label="Back"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h2 className="text-text-lg-bold leading-snug text-colors_text_text_primary_900_">{college.name}</h2>
                    <p className="text-text-sm-regular flex items-center gap-spacing_sm mt-spacing_xs text-colors_text_text_secondary_700_">
                        <MapPin size={13} /> {college.location}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="flex border-b border-colors_border_border_secondary px-spacing_3xl overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('career')}
                        className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'career' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                            }`}
                    >
                        Career Page
                    </button>
                    <button
                        onClick={() => setActiveTab('website')}
                        className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'website' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                            }`}
                    >
                        College Website
                    </button>
                    {(college.isHiring || college.openings.length > 0) && (
                        <button
                            onClick={() => setActiveTab('jobs')}
                            className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'jobs' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                                }`}
                        >
                            Jobs {college.openings.length > 0 ? `(${college.openings.length})` : ''}
                        </button>
                    )}
                </div>

                <div className="p-spacing_3xl">
                    <div className={activeTab === 'jobs' ? 'block' : 'hidden'}>
                        <div className="space-y-spacing_xl">
                            {college.openings.length === 0 ? (
                                <div className="text-center py-spacing_6xl rounded-radius_md border border-dashed border-colors_border_border_secondary bg-colors_background_bg_secondary">
                                    <p className="text-text-sm-medium text-colors_text_text_secondary_700_">
                                        {college.isHiring ? 'This college is currently hiring' : 'No current openings listed'}
                                    </p>
                                    <p className="text-text-xs-regular mt-spacing_md text-colors_text_text_tertiary_600_">
                                        {college.isHiring ? 'Visit their career page for details' : 'Check their career page for latest updates'}
                                    </p>
                                </div>
                            ) : (
                                college.openings.map(job => (
                                    <div key={job.id} className="border border-colors_border_border_secondary rounded-radius_md overflow-hidden transition-colors">
                                        <div
                                            className="p-spacing_2xl cursor-pointer bg-colors_background_bg_secondary hover:bg-colors_background_bg_active"
                                            onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                                        >
                                            <div className="flex justify-between items-start mb-spacing_lg">
                                                <h3 className="text-text-sm-semibold text-colors_text_text_primary_900_">{job.title}</h3>
                                                {selectedJob?.id === job.id ? <div className="h-spacing_sm w-spacing_sm rounded-full bg-colors_background_bg_brand_solid mt-spacing_md flex-shrink-0" /> : <ChevronRight size={16} className="text-colors_text_text_tertiary_600_ mt-spacing_xs flex-shrink-0" />}
                                            </div>
                                            <div className="flex items-center gap-spacing_xl text-text-xs-regular text-colors_text_text_secondary_700_">
                                                <span className="flex items-center gap-spacing_sm"><Clock size={12} /> Deadline: {job.deadline}</span>
                                                <span className="px-spacing_md py-spacing_xxs rounded-radius_full border border-colors_border_border_secondary bg-colors_background_bg_primary">{job.type}</span>
                                            </div>
                                        </div>

                                        {selectedJob?.id === job.id && (
                                            <div className="p-spacing_2xl border-t border-colors_border_border_secondary bg-colors_background_bg_primary">
                                                <div className="mb-spacing_2xl">
                                                    <h4 className="text-[11px] font-bold uppercase tracking-wider mb-spacing_md text-colors_text_text_tertiary_600_">Description</h4>
                                                    <p className="text-text-sm-regular leading-relaxed text-colors_text_text_secondary_700_">{job.description}</p>
                                                </div>
                                                <div className="mb-spacing_3xl">
                                                    <h4 className="text-[11px] font-bold uppercase tracking-wider mb-spacing_md text-colors_text_text_tertiary_600_">Requirements</h4>
                                                    <ul className="list-disc list-inside text-text-sm-regular leading-relaxed text-colors_text_text_secondary_700_ space-y-spacing_xs">
                                                        {job.requirements.map((req, i) => <li key={i}>{req}</li>)}
                                                    </ul>
                                                </div>

                                                <a
                                                    href={college.careerPageUrl || college.website}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-full mt-spacing_2xl py-spacing_lg rounded-radius_md text-text-sm-semibold bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg flex items-center justify-center gap-spacing_md hover:opacity-90"
                                                >
                                                    Apply via official portal <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className={activeTab === 'website' ? 'block' : 'hidden'}>
                        {renderIframeWithHeader(college.website, "College Website", "Website URL not available")}
                    </div>
                    <div className={activeTab === 'career' ? 'block' : 'hidden'}>
                        {renderIframeWithHeader(college.careerPageUrl, "Career Page", "Career page URL not available")}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetailsSheet;
