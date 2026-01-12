
import React, { useState } from 'react';
import { College, Job } from '../types';
import { X, ChevronRight, Clock, MapPin, ExternalLink, Globe } from 'lucide-react';

interface JobDetailsSheetProps {
    college: College;
    onClose: () => void;
}

const JobDetailsSheet: React.FC<JobDetailsSheetProps> = ({ college, onClose }) => {
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [activeTab, setActiveTab] = useState<'jobs' | 'website' | 'career' | 'about'>('jobs');



    return (
        <div
            className={`fixed z-[600] flex flex-col shadow-shadow_floating transform transition-transform duration-300 border-colors_border_border_secondary bg-colors_background_bg_primary
        bottom-0 left-0 right-0 w-full h-[85vh] rounded-t-lg border-t translate-y-0
        md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-width_sm md:h-full md:rounded-none md:border-l md:border-t-0
        `}
            style={{ animation: 'slideIn 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
        >
            <style>{`
        @keyframes slideIn {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        @media (min-width: 768px) {
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        }
      `}</style>

            <div className="px-spacing_3xl py-spacing_2xl border-b border-colors_border_border_secondary flex justify-between items-start sticky top-0 z-10 bg-colors_background_bg_primary">
                <div className="pr-spacing_xl">
                    <h2 className="text-text-lg-bold leading-snug text-colors_text_text_primary_900_">{college.name}</h2>
                    <p className="text-text-sm-regular flex items-center gap-spacing_sm mt-spacing_xs text-colors_text_text_secondary_700_">
                        <MapPin size={13} /> {college.location}
                    </p>
                </div>
                <button onClick={onClose} className="p-spacing_md -mr-spacing_md rounded-radius_full transition-colors text-colors_text_text_secondary_700_ hover:bg-colors_background_bg_secondary">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="flex border-b border-colors_border_border_secondary px-spacing_3xl overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'jobs' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                            }`}
                    >
                        Jobs {college.isHiring || college.openings.length > 0 ? `(${college.openings.length})` : ''}
                    </button>
                    <button
                        onClick={() => setActiveTab('website')}
                        className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'website' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                            }`}
                    >
                        College Website
                    </button>
                    <button
                        onClick={() => setActiveTab('career')}
                        className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'career' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                            }`}
                    >
                        Career Page
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'about' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                            }`}
                    >
                        About College
                    </button>
                </div>

                <div className="p-spacing_3xl">
                    {activeTab === 'jobs' ? (
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
                    ) : activeTab === 'website' ? (
                        <div className="h-[calc(85vh-200px)] md:h-[calc(100vh-200px)]">
                            {college.website ? (
                                <iframe
                                    src={college.website}
                                    className="w-full h-full border-0 rounded-radius_md"
                                    title="College Website"
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-colors_text_text_tertiary_600_">
                                    <p>Website URL not available</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'career' ? (
                        <div className="h-[calc(85vh-200px)] md:h-[calc(100vh-200px)]">
                            {college.careerPageUrl ? (
                                <iframe
                                    src={college.careerPageUrl}
                                    className="w-full h-full border-0 rounded-radius_md"
                                    title="Career Page"
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-colors_text_text_tertiary_600_">
                                    <p>Career page URL not available</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'about' ? (
                        <div className="space-y-spacing_4xl">
                            {college.affiliatingUniversity && (
                                <div>
                                    <h3 className="text-text-sm-semibold mb-spacing_lg text-colors_text_text_primary_900_">Affiliating University</h3>
                                    <p className="text-text-sm-regular leading-relaxed text-colors_text_text_secondary_700_">{college.affiliatingUniversity}</p>
                                </div>
                            )}

                            <div>
                                <h3 className="text-text-sm-semibold mb-spacing_lg text-colors_text_text_primary_900_">About</h3>
                                <p className="text-text-sm-regular leading-relaxed text-colors_text_text_secondary_700_">{college.description || 'No description available.'}</p>
                            </div>

                            <div className="flex gap-spacing_md">
                                {college.website && (
                                    <a
                                        href={college.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 flex items-center justify-center gap-spacing_md py-spacing_lg border border-colors_border_border_secondary rounded-radius_md text-text-sm-medium transition-colors hover:bg-colors_background_bg_secondary text-colors_text_text_primary_900_"
                                    >
                                        <Globe size={14} />
                                        Website
                                    </a>
                                )}
                                {college.careerPageUrl && (
                                    <a
                                        href={college.careerPageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 flex items-center justify-center gap-spacing_md py-spacing_lg border border-colors_border_border_secondary rounded-radius_md text-text-sm-medium transition-colors hover:bg-colors_background_bg_secondary text-colors_text_text_primary_900_"
                                    >
                                        <ExternalLink size={14} />
                                        Careers
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default JobDetailsSheet;
