
import React, { useState, useEffect } from 'react';
import { College } from '../types';
import { fetchColleges, saveScoreHistory, analyzeCollegeCareerPage } from '../services/collegeService';
import { Play, Check, AlertTriangle, Save, Loader2, MessageSquare, X, Clipboard, Info } from 'lucide-react';

const LogicTester: React.FC = () => {
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [filter, setFilter] = useState<'with_url' | 'all'>('with_url');

    // Feedback Modal State
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [selectedResult, setSelectedResult] = useState<any>(null);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackIsValid, setFeedbackIsValid] = useState<boolean | null>(null);
    const [feedbackScreenshot, setFeedbackScreenshot] = useState<string | null>(null);

    useEffect(() => {
        loadColleges();
    }, []);

    // Paste Listener for Modal
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (!feedbackModalOpen) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (!blob) continue;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            // Resize logic
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 800;
                            const scale = MAX_WIDTH / img.width;
                            const width = Math.min(MAX_WIDTH, img.width);
                            const height = img.height * (scale < 1 ? scale : 1);

                            canvas.width = width;
                            canvas.height = height;

                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);

                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                            setFeedbackScreenshot(compressedBase64);
                        };
                        img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(blob);
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [feedbackModalOpen]);

    const loadColleges = async () => {
        setLoading(true);
        const { data } = await fetchColleges();
        setColleges(data || []);
        setLoading(false);
    };

    const getTargetColleges = () => {
        if (filter === 'with_url') {
            // Filter: Must have a career page URL
            return colleges.filter(c => c.careerPageUrl && c.careerPageUrl.trim() !== '');
        }
        return colleges;
    };

    const runTest = async () => {
        setTesting(true);
        setResults([]);

        const targets = getTargetColleges();
        const newResults = [];

        for (const college of targets) {
            if (!college.careerPageUrl) continue;

            try {
                let analysisResult;
                let fetchStatus = 'success';

                analysisResult = await analyzeCollegeCareerPage(college.careerPageUrl);

                console.log(`[LogicTester] Edge function mapping for ${college.name}:`, analysisResult);

                if (analysisResult.error) {
                    fetchStatus = 'error';
                }

                // Check for manual overrides or DB status
                const dbIsHiring = college.isHiring || (college.manualHiringPosts && college.manualHiringPosts.length > 0);

                const manualReview = (college.scoreHistory || []).slice().reverse().find((h: any) => h.type === 'manual' && h.feedback);

                newResults.push({
                    id: college.id,
                    name: college.name,
                    url: college.careerPageUrl,
                    oldScore: getLatestScore(college),
                    newScore: analysisResult.score || 0,
                    isHiringV4: analysisResult.isHiring || false, // Logic V4 Result
                    isHiringV2: getLatestScore(college) >= 40 && (college.scoreHistory || []).length > 0, // Logic V2 assumption
                    isHiringDB: dbIsHiring, // Actual DB Status (what user sees in product)
                    reason: analysisResult.reasons?.[0] || analysisResult.error || 'No reason provided',
                    status: fetchStatus,
                    rawHistory: college.scoreHistory,
                    manualPostsCount: college.manualHiringPosts?.length || 0,
                    feedback: null,
                    pastManualReview: manualReview
                });

                setResults([...newResults]); // Real-time update
            } catch (e) {
                console.error(e);
            }
        }
        setTesting(false);
    };

    const getLatestScore = (college: College) => {
        if (college.scoreHistory && college.scoreHistory.length > 0) {
            return college.scoreHistory[college.scoreHistory.length - 1].score;
        }
        return 0;
    };

    const openFeedbackModal = (result: any) => {
        setSelectedResult(result);
        setFeedbackComment('');
        setFeedbackIsValid(null);
        setFeedbackScreenshot(null);
        setFeedbackModalOpen(true);
    };

    const saveFeedback = async () => {
        if (!selectedResult || feedbackIsValid === null) {
            alert("Please mark valid/invalid first.");
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        const entry = {
            date: today,
            score: selectedResult.newScore,
            type: 'manual',
            version: 'logic-v2-test',
            feedback: {
                isValid: feedbackIsValid,
                comment: feedbackComment,
                screenshot: feedbackScreenshot // Base64 string
            }
        };

        // Update local state to show feedback saved
        const updatedResults = results.map(r =>
            r.id === selectedResult.id ? { ...r, feedback: { feedback: entry.feedback } } : r
        );
        setResults(updatedResults);

        // Save to DB immediately
        let history = selectedResult.rawHistory || [];
        if (!Array.isArray(history)) history = [];
        history = history.filter((h: any) => !(h.date === today && h.type === 'manual'));
        history.push(entry);

        await saveScoreHistory(selectedResult.id, history);

        setFeedbackModalOpen(false);
    };

    return (
        <div className="space-y-6 relative">
            {/* Feedback Modal */}
            {feedbackModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Validating Selection</h3>
                            <button onClick={() => setFeedbackModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Is the logic result correct?</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setFeedbackIsValid(true)}
                                        className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${feedbackIsValid === true ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Check size={18} /> Yes, Correct
                                    </button>
                                    <button
                                        onClick={() => setFeedbackIsValid(false)}
                                        className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${feedbackIsValid === false ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <X size={18} /> No, Incorrect
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    rows={3}
                                    placeholder="Explain why the logic failed or passed..."
                                    value={feedbackComment}
                                    onChange={(e) => setFeedbackComment(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Screenshot</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center relative group hover:border-indigo-400 transition-colors">
                                    {feedbackScreenshot ? (
                                        <div className="relative">
                                            <img src={feedbackScreenshot} alt="Pasted" className="max-h-48 mx-auto rounded shadow-sm" />
                                            <button
                                                onClick={() => setFeedbackScreenshot(null)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400">
                                            <Clipboard className="mx-auto mb-2 opacity-50" size={24} />
                                            <p className="text-xs">Paste image from clipboard (Click here then Ctrl+V)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={saveFeedback}
                                disabled={feedbackIsValid === null}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Save Feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Logic Lab</h2>
                    <p className="text-gray-500 text-sm mt-1">Test scoring logic changes on live sites locally.</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium"
                    >
                        <option value="with_url">With Career Page (Standard)</option>
                        <option value="all">All Colleges (Includes No URL)</option>
                    </select>
                    <button
                        onClick={runTest}
                        disabled={testing || loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-sm"
                    >
                        {testing ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                        {testing ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                </div>
            </div>

            {results.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Summary Header with Explainer */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700">Results ({results.length})</h3>
                            <div className="flex gap-4 text-sm">
                                <span className="text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full flex items-center gap-1.5" title="Matches New Logic V4">
                                    <Check size={14} /> Logic V4 Hiring: {results.filter(r => r.isHiringV4).length}
                                </span>
                                <span className="text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1.5" title="Matches DB Status (Product View)">
                                    <Info size={14} /> Product Count: {results.filter(r => r.isHiringDB).length}
                                </span>
                            </div>
                        </div>
                        {/* Discrepancy Note */}
                        {results.filter(r => r.isHiringV4).length !== results.filter(r => r.isHiringDB).length && (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                <strong>Note:</strong> Discrepancy detected. "Product Count" includes Manual Posts + Old Logic results. "Logic V4" is purely what the new logic sees. Validating correct results here will help align the two over time.
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 font-medium">College</th>
                                    <th className="px-6 py-3 font-medium text-center">Scores (V2 &rarr; V4)</th>
                                    <th className="px-6 py-3 font-medium text-center">V2 Logic</th>
                                    <th className="px-6 py-3 font-medium text-center">User Review</th>
                                    <th className="px-6 py-3 font-medium text-center">V4 Logic</th>
                                    <th className="px-6 py-3 font-medium text-center">Product Status</th>
                                    <th className="px-6 py-3 font-medium w-1/4">Reason (V4)</th>
                                    <th className="px-6 py-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {results.map((res, i) => (
                                    <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {res.name}
                                            <a href={res.url} target="_blank" rel="noreferrer" className="block text-xs text-indigo-600 hover:text-indigo-800 font-normal mt-0.5 truncate max-w-[200px]">{res.url}</a>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-gray-400 line-through text-xs">{res.oldScore}</span>
                                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded">{res.newScore}</span>
                                            </div>
                                        </td>
                                        {/* Logic V2 Status */}
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${res.isHiringV2 ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                {res.isHiringV2 ? 'Hiring (V2)' : 'Not Hiring'}
                                            </span>
                                        </td>
                                        {/* User Review Status */}
                                        <td className="px-6 py-4 text-center">
                                            {res.pastManualReview ? (
                                                <div className="flex flex-col items-center gap-1 group relative">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${res.pastManualReview.feedback.isValid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                        {res.pastManualReview.feedback.isValid ? <Check size={12} /> : <X size={12} />}
                                                        {res.pastManualReview.feedback.isValid ? 'Valid' : 'Invalid'}
                                                    </span>
                                                    {res.pastManualReview.feedback.comment && (
                                                        <div className="hidden group-hover:block absolute z-[100] w-64 p-3 mt-6 text-xs bg-gray-900 text-white rounded shadow-xl text-left whitespace-normal bottom-full mb-2 -translate-x-1/2 left-1/2">
                                                            {res.pastManualReview.feedback.comment}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        {/* Logic V4 Status (Current execution) */}
                                        <td className="px-6 py-4 text-center">
                                            {res.isHiringV4 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 shadow-sm">
                                                    Hiring (V4)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                    Not Hiring
                                                </span>
                                            )}
                                        </td>
                                        {/* Real Product Status */}
                                        <td className="px-6 py-4 text-center">
                                            {res.isHiringDB ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                        Hiring
                                                    </span>
                                                    {res.manualPostsCount > 0 && <span className="text-[10px] text-gray-500 mt-0.5">(Manual Post)</span>}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-xs leading-relaxed max-w-xs truncate" title={res.reason}>
                                            {res.reason}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {res.feedback ? (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${res.feedback.feedback.isValid ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}>
                                                    {res.feedback.feedback.isValid ? <Check size={12} /> : <X size={12} />}
                                                    {res.feedback.feedback.isValid ? 'Validated' : 'Incorrect'}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => openFeedbackModal(res)}
                                                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 hover:border-indigo-300 bg-white px-3 py-1.5 rounded-lg transition-all"
                                                >
                                                    <MessageSquare size={14} /> Review
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogicTester;
