
import React, { useState } from 'react';
import { X, Clipboard, ArrowRight, Check, Loader2 } from 'lucide-react';
import { parseLeadFromText } from '../services/gemini';
import { Lead } from '../types';
import { useToast } from './Toast';

interface QuickCaptureProps {
    onClose: () => void;
    onSave: (leadData: Partial<Lead>) => void;
}

const QuickCapture = ({ onClose, onSave }: QuickCaptureProps) => {
    const { showSuccess, showError } = useToast();
    const [text, setText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedData, setParsedData] = useState<Partial<Lead> | null>(null);

    const handleProcess = async () => {
        if (!text.trim()) return;
        setIsProcessing(true);
        try {
            const result = await parseLeadFromText(text);
            setParsedData(result);
            showSuccess('Text Parsed', 'Lead information has been extracted.');
        } catch (e: any) {
            console.error('[handleProcess] Error:', e);
            showError('Parsing Failed', e.message || 'Failed to parse text. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = () => {
        if (parsedData) {
            onSave(parsedData);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Clipboard className="w-5 h-5" /> Quick Capture (Web Clipper)
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {!parsedData ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Paste any unstructured text here (LinkedIn 'About' section, email signature, website text) and AI will extract the lead details.
                            </p>
                            <textarea
                                className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Paste text here..."
                                value={text}
                                onChange={e => setText(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleProcess}
                                    disabled={isProcessing || !text.trim()}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                    {isProcessing ? 'Analyzing...' : 'Parse Lead Info'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-start gap-2">
                                <Check className="w-4 h-4 text-green-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-green-800">Extraction Successful</p>
                                    <p className="text-xs text-green-600">Review the data before saving.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-medium">Name</label>
                                        <input
                                            value={parsedData.contact_name || ''}
                                            onChange={e => setParsedData({...parsedData, contact_name: e.target.value})}
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-medium">Title</label>
                                        <input
                                            value={parsedData.title || ''}
                                            onChange={e => setParsedData({...parsedData, title: e.target.value})}
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-medium">Company</label>
                                    <input
                                        value={parsedData.company_name || ''}
                                        onChange={e => setParsedData({...parsedData, company_name: e.target.value})}
                                        className="w-full border rounded p-2 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-medium">Email</label>
                                        <input
                                            value={parsedData.email || ''}
                                            onChange={e => setParsedData({...parsedData, email: e.target.value})}
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-medium">LinkedIn</label>
                                        <input
                                            value={parsedData.linkedin_url || ''}
                                            onChange={e => setParsedData({...parsedData, linkedin_url: e.target.value})}
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                             <div className="flex justify-between pt-4">
                                <button onClick={() => setParsedData(null)} className="text-gray-500 text-sm hover:underline">Back</button>
                                <button
                                    onClick={handleSave}
                                    className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Save to Database
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickCapture;
