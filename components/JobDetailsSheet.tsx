
import React, { useState } from 'react';
import { College, Job } from '../types';
import { X, Mail, Phone, ExternalLink, Sparkles, ChevronRight, Clock, MapPin, Copy, Check } from 'lucide-react';
import { generateCoverLetter } from '../services/geminiService';

interface JobDetailsSheetProps {
  college: College;
  onClose: () => void;
}

const JobDetailsSheet: React.FC<JobDetailsSheetProps> = ({ college, onClose }) => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [userBio, setUserBio] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'jobs'>('jobs');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!selectedJob || !userBio.trim()) return;
    setIsGenerating(true);
    setGeneratedContent('Consulting AI Career Assistant...');
    const letter = await generateCoverLetter(selectedJob, college, userBio);
    setGeneratedContent(letter);
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <div className="flex border-b border-colors_border_border_secondary px-spacing_3xl">
            <button 
                onClick={() => setActiveTab('jobs')}
                className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors ${
                    activeTab === 'jobs' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                }`}
            >
                Open positions ({college.openings.length})
            </button>
            <button 
                onClick={() => setActiveTab('info')}
                className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors ${
                    activeTab === 'info' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                }`}
            >
                Directory & info
            </button>
        </div>

        <div className="p-spacing_3xl">
            {activeTab === 'jobs' ? (
                <div className="space-y-spacing_xl">
                    {college.openings.length === 0 ? (
                        <div className="text-center py-spacing_6xl rounded-radius_md border border-dashed border-colors_border_border_secondary bg-colors_background_bg_secondary">
                            <p className="text-text-sm-medium text-colors_text_text_secondary_700_">No current openings listed.</p>
                            <p className="text-text-xs-regular mt-spacing_md text-colors_text_text_tertiary_600_">Check their official website for latest updates.</p>
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
                                        {selectedJob?.id === job.id ? <div className="h-spacing_sm w-spacing_sm rounded-full bg-colors_background_bg_brand_solid mt-spacing_md flex-shrink-0"/> : <ChevronRight size={16} className="text-colors_text_text_tertiary_600_ mt-spacing_xs flex-shrink-0"/>}
                                    </div>
                                    <div className="flex items-center gap-spacing_xl text-text-xs-regular text-colors_text_text_secondary_700_">
                                        <span className="flex items-center gap-spacing_sm"><Clock size={12}/> Deadline: {job.deadline}</span>
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

                                        <div className="rounded-radius_md p-spacing_xl shadow-shadow_card border border-colors_border_border_secondary bg-colors_background_bg_secondary">
                                            <div className="flex items-center gap-spacing_md mb-spacing_lg">
                                                <Sparkles className="text-colors_background_bg_brand_solid" size={15} />
                                                <h4 className="text-text-sm-semibold text-colors_text_text_primary_900_">AI application assistant</h4>
                                            </div>
                                            
                                            {!generatedContent ? (
                                                <>
                                                    <p className="text-text-xs-regular mb-spacing_lg text-colors_text_text_secondary_700_">
                                                        Enter your background summary below, and I'll draft a tailored cover letter for this {job.title} role.
                                                    </p>
                                                    <textarea 
                                                        className="w-full text-text-sm-regular p-spacing_lg border border-colors_border_border_secondary rounded-radius_sm focus:ring-2 focus:ring-colors_background_bg_brand_secondary focus:outline-none mb-spacing_lg bg-colors_background_bg_primary text-colors_text_text_primary_900_"
                                                        rows={3}
                                                        placeholder="e.g. I have a PhD in Consti Law from NLU Delhi..."
                                                        value={userBio}
                                                        onChange={(e) => setUserBio(e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={handleGenerate}
                                                        disabled={isGenerating || !userBio.trim()}
                                                        className={`w-full py-spacing_lg rounded-radius_sm text-text-sm-medium transition-all ${
                                                            isGenerating || !userBio.trim() ? 'bg-colors_background_bg_secondary text-colors_text_text_tertiary_600_ cursor-not-allowed border border-colors_border_border_secondary' : 'bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg'
                                                        }`}
                                                    >
                                                        {isGenerating ? 'Drafting...' : 'Draft cover letter'}
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="animate-in fade-in zoom-in duration-300">
                                                    <div className="flex justify-between items-center mb-spacing_md">
                                                        <h5 className="text-text-xs-bold text-colors_text_text_tertiary_600_">Draft result</h5>
                                                        <button onClick={() => setGeneratedContent('')} className="text-text-xs-medium hover:underline text-colors_text_text_brand_primary_900_">Reset</button>
                                                    </div>
                                                    <div className="p-spacing_lg rounded-radius_sm text-text-sm-regular whitespace-pre-wrap max-h-60 overflow-y-auto border border-colors_border_border_secondary mb-spacing_lg bg-colors_background_bg_primary text-colors_text_text_primary_900_ leading-relaxed">
                                                        {generatedContent}
                                                    </div>
                                                    <button 
                                                        onClick={copyToClipboard}
                                                        className="w-full py-spacing_lg border border-colors_border_border_secondary text-text-sm-medium rounded-radius_sm hover:opacity-80 bg-colors_background_bg_secondary text-colors_text_text_primary_900_ flex items-center justify-center gap-spacing_md"
                                                    >
                                                        {copied ? <Check size={14} className="text-colors_text_text_success_primary_600_" /> : <Copy size={14} />}
                                                        {copied ? 'Copied' : 'Copy to clipboard'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button className="w-full mt-spacing_2xl py-spacing_lg rounded-radius_md text-text-sm-semibold bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg">
                                            Apply now via official portal
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-spacing_4xl">
                    <div>
                        <h3 className="text-text-sm-semibold mb-spacing_lg text-colors_text_text_primary_900_">About</h3>
                        <p className="text-text-sm-regular leading-relaxed text-colors_text_text_secondary_700_">{college.description}</p>
                    </div>

                    <div>
                        <h3 className="text-text-sm-semibold mb-spacing_lg text-colors_text_text_primary_900_">Key contacts</h3>
                        <div className="space-y-spacing_lg">
                            {college.contacts.length > 0 ? (
                                college.contacts.map((contact, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-spacing_xl rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_secondary">
                                        <div>
                                            <div className="text-text-sm-medium text-colors_text_text_primary_900_">{contact.name}</div>
                                            <div className="text-text-xs-regular text-colors_text_text_secondary_700_ mt-spacing_xxs">{contact.role}</div>
                                        </div>
                                        <div className="flex gap-spacing_md">
                                            <a href={`mailto:${contact.email}`} className="p-spacing_lg rounded-radius_full border border-colors_border_border_secondary hover:opacity-80 bg-colors_background_bg_primary text-colors_text_text_secondary_700_ transition-transform hover:scale-105">
                                                <Mail size={15} />
                                            </a>
                                            {contact.phone && (
                                                <a href={`tel:${contact.phone}`} className="p-spacing_lg rounded-radius_full border border-colors_border_border_secondary hover:opacity-80 bg-colors_background_bg_primary text-colors_text_text_secondary_700_ transition-transform hover:scale-105">
                                                    <Phone size={15} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-text-sm-regular italic text-colors_text_text_tertiary_600_">No public contacts listed.</p>
                            )}
                        </div>
                    </div>

                    <a 
                        href={college.website} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-spacing_md w-full py-spacing_lg border border-colors_border_border_secondary rounded-radius_md text-text-sm-medium transition-colors hover:bg-colors_background_bg_secondary text-colors_text_text_primary_900_"
                    >
                        Visit official website <ExternalLink size={14} />
                    </a>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsSheet;
