
import React, { useState, useEffect, useCallback } from 'react';
import { College, Job, isHiringPostActive } from '../types';
import { ChevronRight, Clock, MapPin, ExternalLink, Globe, ArrowLeft, AlertCircle, Mail, FileText, Check, Copy } from 'lucide-react';
import { checkIframeCompatibility } from '../services/collegeService';

interface JobDetailsSheetProps {
    college: College;
    isOpen: boolean;
    onClose: () => void;
}

const JobDetailsSheet: React.FC<JobDetailsSheetProps> = ({ college, isOpen, onClose }) => {
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [copiedEmailPostId, setCopiedEmailPostId] = useState<number | null>(null);
    const [copiedPostalPostId, setCopiedPostalPostId] = useState<number | null>(null);

    // Calculate active manual posts count
    const activeManualPosts = (college.manualHiringPosts || []).filter(post =>
        isHiringPostActive(post.lastDateToApply)
    );
    const hasActivePosts = activeManualPosts.length > 0;

    const [activeTab, setActiveTab] = useState<'career' | 'website' | 'jobs'>(
        hasActivePosts ? 'jobs' : 'career'
    );
    const [embeddableStatus, setEmbeddableStatus] = useState<Record<string, boolean>>({});
    const [checkingStatus, setCheckingStatus] = useState<Record<string, boolean>>({});

    const checkUrl = useCallback(async (url: string) => {
        if (!url || embeddableStatus[url] !== undefined || checkingStatus[url]) return;

        // Check local storage first
        const cached = localStorage.getItem(`embed_check_v2_${url}`);
        if (cached) {
            setEmbeddableStatus(prev => ({ ...prev, [url]: cached === 'true' }));
            return;
        }

        // Wait 2 seconds before showing the warning to give iframe time to load
        const timer = setTimeout(() => {
            setCheckingStatus(prev => ({ ...prev, [url]: true }));
        }, 2000); // 2 second delay to match previous UI behavior

        const isEmbeddable = await checkIframeCompatibility(url);
        clearTimeout(timer);

        setEmbeddableStatus(prev => ({ ...prev, [url]: isEmbeddable }));
        setCheckingStatus(prev => ({ ...prev, [url]: false }));
        localStorage.setItem(`embed_check_v2_${url}`, String(isEmbeddable));
    }, [embeddableStatus, checkingStatus]);

    useEffect(() => {
        if (activeTab === 'website' && college.website) checkUrl(college.website);
        if (activeTab === 'career' && college.careerPageUrl) checkUrl(college.careerPageUrl);
    }, [activeTab, college.website, college.careerPageUrl, checkUrl]);



    const renderIframeWithHeader = (url: string | undefined, title: string, emptyMessage: string) => {
        const isBlocked = url ? embeddableStatus[url] === false : false;

        return (
            <div className="h-[calc(100vh-200px)] flex flex-col gap-spacing_sm">
                {url ? (
                    <>
                        <div className="flex items-center justify-between px-spacing_lg py-spacing_md bg-colors_background_bg_brand_solid_subtle border border-colors_border_border_secondary rounded-radius_sm">
                            <div className="flex items-center gap-spacing_xs text-text-xs-regular text-colors_text_text_tertiary_600_">
                                <span className="hidden sm:inline">Page not loading here?</span>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-text-xs-semibold text-colors_text_text_brand_action hover:text-colors_background_bg_brand_section transition-colors whitespace-nowrap hover:underline"
                                >
                                    Open website in new tab
                                </a>
                            </div>
                            <span className="text-text-xs-regular text-colors_text_text_tertiary_600_ truncate font-mono ml-spacing_md max-w-[200px] sm:max-w-[300px]">
                                {url}
                            </span>
                        </div>
                        {isBlocked ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-colors_background_bg_secondary border border-colors_border_border_secondary rounded-radius_md p-spacing_xl text-center">
                                <div className="w-16 h-16 rounded-full bg-colors_background_bg_tertiary flex items-center justify-center mb-spacing_lg text-colors_text_text_tertiary_600_">
                                    <AlertCircle size={32} />
                                </div>
                                <h3 className="text-text-lg-bold text-colors_text_text_primary_900_ mb-spacing_sm">
                                    Website cannot be embedded
                                </h3>
                                <p className="text-text-sm-regular text-colors_text_text_secondary_700_ mb-spacing_xl max-w-sm mx-auto">
                                    This college's website has security settings (like X-Frame-Options) that prevent it from being displayed inside the Faculty Centre.
                                </p>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-spacing_xl py-spacing_md rounded-radius_md text-text-sm-semibold bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg flex items-center gap-spacing_md hover:opacity-90 transition-opacity"
                                >
                                    Open Official Website <ExternalLink size={16} />
                                </a>
                            </div>
                        ) : (
                            <iframe
                                key={url}
                                src={url}
                                className="w-full flex-1 border border-colors_border_border_secondary rounded-radius_md bg-white"
                                title={title}
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                            />
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-colors_text_text_tertiary_600_">
                        <p>{emptyMessage}</p>
                    </div>
                )}
            </div>
        );
    };

    const renderTextWithLinks = (text: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, index) => {
            if (urlRegex.test(part)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-colors_text_text_brand_primary_600_ hover:underline break-all inline-block py-spacing_xs px-spacing_sm -ml-spacing_sm rounded-radius_md hover:bg-colors_background_bg_brand_solid_subtle transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };



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
                        <span className="material-symbols-rounded text-[18px]">school</span> Affiliated to {college.affiliatingUniversity}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="flex border-b border-colors_border_border_secondary px-spacing_3xl overflow-x-auto">
                    {/* Jobs tab first when there are active posts */}
                    {hasActivePosts && (
                        <button
                            onClick={() => setActiveTab('jobs')}
                            className={`py-spacing_lg px-spacing_xl text-text-sm-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'jobs' ? 'border-colors_border_border_brand_solid text-colors_text_text_primary_900_' : 'border-transparent text-colors_text_text_tertiary_600_'
                                }`}
                        >
                            Jobs ({activeManualPosts.length})
                        </button>
                    )}
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
                </div>

                <div className="p-spacing_3xl">
                    <div className={activeTab === 'jobs' ? 'block' : 'hidden'}>
                        <div className="space-y-spacing_xl">
                            {(college.manualHiringPosts || []).length === 0 ? (
                                <div className="text-center py-spacing_6xl rounded-radius_md border border-dashed border-colors_border_border_secondary bg-colors_background_bg_secondary">
                                    <p className="text-text-sm-medium text-colors_text_text_secondary_700_">
                                        {college.isHiring ? 'This college is currently hiring' : 'No current openings listed'}
                                    </p>
                                    <p className="text-text-xs-regular mt-spacing_md text-colors_text_text_tertiary_600_">
                                        {college.isHiring ? 'Visit their career page for details' : 'Check their career page for latest updates'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-spacing_lg">
                                    {(college.manualHiringPosts || []).map(post => {
                                        const isActive = isHiringPostActive(post.lastDateToApply);
                                        const formatDate = (dateStr: string) => {
                                            const date = new Date(dateStr);
                                            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                        };

                                        return (
                                            <div key={post.id} className="border border-colors_border_border_secondary rounded-radius_md overflow-hidden h-full flex flex-col">
                                                <div className="p-spacing_2xl bg-colors_background_bg_secondary">
                                                    <div className="flex justify-between items-start mb-spacing_lg">
                                                        <div className="flex-1 pr-spacing_lg">
                                                            <h3 className="text-text-md-semibold text-colors_text_text_primary_900_">
                                                                {post.positionName}
                                                            </h3>
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            {!isActive && (
                                                                <span className="px-spacing_md py-spacing_xxs rounded-radius_full text-text-xs-medium bg-red-100 text-red-700 border border-red-200">
                                                                    Not hiring anymore
                                                                </span>
                                                            )}
                                                            {isActive && (
                                                                <span className="px-spacing_md py-spacing_xxs rounded-radius_full text-text-xs-medium bg-green-100 text-green-700 border border-green-200">
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing_md text-text-xs-regular text-colors_text_text_secondary_700_">
                                                        <div className="flex items-center gap-spacing_sm">
                                                            <Clock size={12} className="text-colors_text_text_tertiary_600_" />
                                                            <span>Posted: {formatDate(post.postingDate)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-spacing_sm">
                                                            <Clock size={12} className="text-colors_text_text_tertiary_600_" />
                                                            <span>Deadline: {formatDate(post.lastDateToApply)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-spacing_2xl border-t border-colors_border_border_secondary bg-colors_background_bg_primary flex-1">
                                                    <div className="flex flex-col gap-spacing_3xl">
                                                        <div>
                                                            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-spacing_sm text-colors_text_text_tertiary_600_">
                                                                Application Medium
                                                            </h4>
                                                            <p className="text-text-sm-regular leading-relaxed text-colors_text_text_secondary_700_ whitespace-pre-wrap">
                                                                {renderTextWithLinks(post.applicationMedium || '')}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-spacing_sm text-colors_text_text_tertiary_600_">
                                                                Salary
                                                            </h4>
                                                            <p className="text-text-sm-regular text-colors_text_text_secondary_700_">
                                                                {post.salary}
                                                            </p>
                                                        </div>

                                                        {post.hasApplicationFee && post.applicationFee && (
                                                            <div>
                                                                <h4 className="text-[11px] font-bold uppercase tracking-wider mb-spacing_sm text-colors_text_text_tertiary_600_">
                                                                    Application Fee
                                                                </h4>
                                                                <p className="text-text-sm-regular text-colors_text_text_secondary_700_">
                                                                    {post.applicationFee}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {post.hasEmail && post.emailId && (
                                                            <div>
                                                                <div className="flex items-center gap-spacing_sm mb-spacing_sm">
                                                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-colors_text_text_tertiary_600_">
                                                                        Email
                                                                    </h4>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(post.emailId!);
                                                                            setCopiedEmailPostId(post.id);
                                                                            setTimeout(() => setCopiedEmailPostId(null), 2000);
                                                                        }}
                                                                        className="p-spacing_xs rounded-radius_md text-colors_text_text_tertiary_600_ hover:bg-colors_background_bg_tertiary hover:text-colors_text_text_primary_900_ transition-colors"
                                                                        title="Copy email to clipboard"
                                                                    >
                                                                        {copiedEmailPostId === post.id ? (
                                                                            <Check size={14} className="text-green-600" />
                                                                        ) : (
                                                                            <Copy size={14} />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <a
                                                                    href={`mailto:${post.emailId}`}
                                                                    className="text-text-sm-regular text-colors_text_text_brand_primary_600_ hover:text-colors_text_text_brand_primary_800_ transition-colors"
                                                                >
                                                                    {post.emailId}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {post.hasPostalAddress && post.postalAddress && (
                                                            <div>
                                                                <div className="flex items-center gap-spacing_sm mb-spacing_sm">
                                                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-colors_text_text_tertiary_600_">
                                                                        Postal Address
                                                                    </h4>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(post.postalAddress!);
                                                                            setCopiedPostalPostId(post.id);
                                                                            setTimeout(() => setCopiedPostalPostId(null), 2000);
                                                                        }}
                                                                        className="p-spacing_xs rounded-radius_md text-colors_text_text_tertiary_600_ hover:bg-colors_background_bg_tertiary hover:text-colors_text_text_primary_900_ transition-colors"
                                                                        title="Copy address to clipboard"
                                                                    >
                                                                        {copiedPostalPostId === post.id ? (
                                                                            <Check size={14} className="text-green-600" />
                                                                        ) : (
                                                                            <Copy size={14} />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <p className="text-text-sm-regular text-colors_text_text_secondary_700_ whitespace-pre-wrap">
                                                                    {post.postalAddress}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {post.hasAdvertisement && post.advertisementLink && (
                                                            <a
                                                                href={post.advertisementLink}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="w-full py-spacing_lg rounded-radius_md text-text-sm-semibold bg-colors_background_bg_secondary text-colors_text_text_primary_900_ border border-colors_border_border_secondary flex items-center justify-center gap-spacing_md hover:bg-colors_background_bg_tertiary transition-colors"
                                                            >
                                                                <FileText size={14} />
                                                                View Advertisement
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
