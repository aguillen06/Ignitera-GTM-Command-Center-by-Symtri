
import React, { useState, useEffect } from 'react';
import { Lead, Startup, ICPProfile, Activity } from '../types';
import { X, Wand2, User, Building, MapPin, Briefcase, Check, ExternalLink, Send, MessageSquare, Mail, RefreshCw, Zap, TrendingUp, Cpu, Newspaper, Users } from 'lucide-react';
import ActivityLog from './ActivityLog';
import { supabase } from '../services/supabase';
import { enrichLead, verifyLocation, generateOutboundDraft, enrichLeadWithLiveSearch } from '../services/gemini';
import { useToast } from './Toast';

interface LeadDetailProps {
  lead: Lead;
  startup: Startup;
  icp?: ICPProfile;
  onClose: () => void;
  onUpdate: (updatedLead: Lead) => void;
}

const LeadDetail: React.FC<LeadDetailProps> = ({ lead, startup, icp, onClose, onUpdate }) => {
  const { showSuccess, showError, showWarning } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLiveEnriching, setIsLiveEnriching] = useState(false);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [locationData, setLocationData] = useState<{text: string, mapLink?: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'outbound' | 'activities'>('details');

  // Draft State
  const [draft, setDraft] = useState<{subject?: string, body: string, type: 'email'|'linkedin'} | null>(lead.active_draft || null);
  const [isWritingDraft, setIsWritingDraft] = useState(false);

  useEffect(() => {
    fetchActivities();
    setDraft(lead.active_draft || null);
  }, [lead.id]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('done_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      if (data) setActivities(data as Activity[]);
    } catch (error: any) {
      console.error('[fetchActivities] Error:', error);
      showError('Failed to load activities', error.message || 'Please try again.');
    }
  };

  const handleAddActivity = async (newAct: any) => {
    try {
      const { data, error } = await supabase.from('activities').insert([{
          ...newAct,
          lead_id: lead.id
      }]).select().single();

      if (error) {
        throw error;
      }

      if (data) {
          setActivities([data, ...activities]);
          // Update last touch on lead
          const { data: updatedLead, error: updateError } = await supabase.from('leads').update({
              last_touch_at: data.done_at,
              last_touch_type: data.activity_type
          }).eq('id', lead.id).select().single();
          
          if (updateError) {
            console.error('[handleAddActivity] Lead update error:', updateError);
          }
          if (updatedLead) onUpdate(updatedLead);
          showSuccess('Activity Added', 'Activity has been logged successfully.');
      }
    } catch (error: any) {
      console.error('[handleAddActivity] Error:', error);
      showError('Failed to add activity', error.message || 'Please try again.');
    }
  };

  const handleEnrich = async () => {
    setIsGenerating(true);
    try {
        const enrichment = await enrichLead(lead, startup, icp || null);
        const { data, error } = await supabase
            .from('leads')
            .update(enrichment)
            .eq('id', lead.id)
            .select()
            .single();
        
        if (error) {
          throw error;
        }
        if (data) {
          onUpdate(data as Lead);
          showSuccess('Enrichment Complete', 'AI insights have been generated.');
        }
    } catch (e: any) {
        console.error('[handleEnrich] Error:', e);
        showError('Enrichment Failed', e.message || 'Failed to generate AI insights.');
    } finally {
        setIsGenerating(false);
    }
  };

  const handleLiveEnrich = async () => {
    setIsLiveEnriching(true);
    try {
        const enrichment = await enrichLeadWithLiveSearch(lead);
        const { data, error } = await supabase
            .from('leads')
            .update(enrichment)
            .eq('id', lead.id)
            .select()
            .single();
        
        if (error) {
          throw error;
        }
        if (data) {
          onUpdate(data as Lead);
          showSuccess('Live Enrichment Complete', 'Latest company data has been fetched.');
        }
    } catch (e: any) {
        console.error('[handleLiveEnrich] Error:', e);
        showError('Live Enrichment Failed', e.message || 'Failed to perform live enrichment.');
    } finally {
        setIsLiveEnriching(false);
    }
  };

  const handleVerifyLocation = async () => {
    if (!lead.company_name) return;
    setIsVerifyingLocation(true);
    try {
        const result = await verifyLocation(lead.company_name, lead.hq_country || 'US');
        setLocationData(result);
    } catch (e: any) {
        console.error('[handleVerifyLocation] Error:', e);
        showError('Location Verification Failed', e.message || 'Could not verify the location.');
    } finally {
        setIsVerifyingLocation(false);
    }
  };

  const handleGenerateDraft = async (type: 'email' | 'linkedin') => {
    if (!icp) {
        showWarning('No ICP Profile', "Please go to 'Market & ICP' tab and generate/select one first.");
        return;
    }
    setIsWritingDraft(true);
    try {
        const generated = await generateOutboundDraft(lead, startup, icp, type);
        const newDraft = { ...generated, type, generated_at: new Date().toISOString() };
        
        setDraft(newDraft);
        
        // Save to DB
        const { error } = await supabase.from('leads').update({ active_draft: newDraft }).eq('id', lead.id);
        if (error) {
          console.error('[handleGenerateDraft] Save error:', error);
        }
        
        // Update local lead state
        onUpdate({ ...lead, active_draft: newDraft });
        showSuccess('Draft Generated', `${type === 'email' ? 'Email' : 'LinkedIn DM'} draft is ready.`);
        
    } catch (e: any) {
        console.error('[handleGenerateDraft] Error:', e);
        showError('Draft Generation Failed', e.message || 'Failed to generate draft.');
    } finally {
        setIsWritingDraft(false);
    }
  };

  const handleSendDraft = async () => {
    if (!draft) return;
    
    try {
      // 1. Open Email Client (if Email) or Copy to Clipboard (LinkedIn)
      if (draft.type === 'email' && lead.email) {
          const subject = encodeURIComponent(draft.subject || '');
          const body = encodeURIComponent(draft.body || '');
          window.location.href = `mailto:${lead.email}?subject=${subject}&body=${body}`;
      } else {
          // LinkedIn / Fallback: Copy to clipboard
          navigator.clipboard.writeText(`${draft.subject ? draft.subject + '\n\n' : ''}${draft.body}`);
          showSuccess('Copied to Clipboard', draft.type === 'linkedin' ? 'Opening LinkedIn...' : 'Draft copied. Paste into your email client.');
          if (draft.type === 'linkedin' && lead.linkedin_url) {
              window.open(lead.linkedin_url, '_blank');
          }
      }

      // 2. Log Activity
      const activityPayload = {
          activity_type: draft.type,
          direction: 'outbound',
          subject: draft.subject || `${draft.type} Outreach`,
          body: draft.body,
          done_at: new Date().toISOString()
      };
      
      const { data: act, error: actError } = await supabase.from('activities').insert([{ ...activityPayload, lead_id: lead.id }]).select().single();
      if (actError) {
        console.error('[handleSendDraft] Activity insert error:', actError);
      }
      if (act) setActivities([act, ...activities]);

      // 3. Clear Draft & Update Lead Stage (Simple Logic: Move to Contacted)
      const { data: updatedLead, error: updateError } = await supabase.from('leads').update({
          active_draft: null,
          stage: lead.stage === 'Prospect' || lead.stage === 'Researched' ? 'Contacted' : lead.stage,
          last_touch_at: new Date().toISOString(),
          last_touch_type: draft.type
      }).eq('id', lead.id).select().single();

      if (updateError) {
        throw updateError;
      }

      if (updatedLead) {
          setDraft(null);
          onUpdate(updatedLead);
          setActiveTab('activities');
          showSuccess('Outreach Logged', 'Activity recorded and stage updated.');
      }
    } catch (error: any) {
      console.error('[handleSendDraft] Error:', error);
      showError('Failed to log outreach', error.message || 'Please try again.');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl transform transition-transform border-l border-gray-200 overflow-hidden flex flex-col z-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
            <h2 className="text-lg font-bold text-gray-900">{lead.contact_name}</h2>
            <p className="text-sm text-gray-500">{lead.title} @ {lead.company_name}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('details')}
        >
            Insights & Details
        </button>
        <button 
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'outbound' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('outbound')}
        >
            <Send className="w-3 h-3" /> Outbound <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full">New</span>
        </button>
        <button 
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'activities' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('activities')}
        >
            Activity Log
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {activeTab === 'details' && (
            <div className="space-y-6">
                {/* AI Actions */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                            <Wand2 className="w-4 h-4" /> Intelligence
                        </h3>
                        <div className="flex gap-2">
                             <button 
                                onClick={handleLiveEnrich}
                                disabled={isLiveEnriching}
                                className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1 shadow-sm"
                            >
                                {isLiveEnriching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-yellow-500" />}
                                {isLiveEnriching ? 'Searching...' : 'Live Enrich'}
                            </button>
                            <button 
                                onClick={handleEnrich}
                                disabled={isGenerating}
                                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                            >
                                {isGenerating ? 'Thinking...' : 'Summary & Hook'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Account Summary</span>
                            <p className="text-gray-700 mt-1">{lead.account_summary || <span className="italic text-gray-400">Not generated yet</span>}</p>
                        </div>
                        
                        {/* Live Enrichment Section */}
                        {(lead.funding_status || lead.tech_stack || lead.recent_news || lead.hiring_trends) && (
                            <div className="mt-4 pt-4 border-t border-indigo-200 grid grid-cols-1 gap-3">
                                {lead.funding_status && (
                                    <div>
                                        <span className="text-xs font-bold text-green-700 uppercase tracking-wide flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Funding / Financials</span>
                                        <p className="text-gray-700 mt-1">{lead.funding_status}</p>
                                    </div>
                                )}
                                {lead.hiring_trends && (
                                    <div>
                                        <span className="text-xs font-bold text-orange-700 uppercase tracking-wide flex items-center gap-1"><Users className="w-3 h-3"/> Hiring Signals</span>
                                        <p className="text-gray-700 mt-1 text-xs leading-relaxed">{lead.hiring_trends}</p>
                                    </div>
                                )}
                                {lead.tech_stack && lead.tech_stack.length > 0 && (
                                    <div>
                                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1"><Cpu className="w-3 h-3"/> Tech Stack</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {lead.tech_stack.map((t, i) => (
                                                <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {lead.recent_news && (
                                    <div>
                                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide flex items-center gap-1"><Newspaper className="w-3 h-3"/> Recent Signals</span>
                                        <p className="text-gray-700 mt-1 text-xs leading-relaxed">{lead.recent_news}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Personalized Hook</span>
                            <p className="text-gray-700 mt-1 border-l-2 border-indigo-300 pl-2 italic">{lead.personalized_hook || <span className="not-italic text-gray-400">Not generated yet</span>}</p>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Pain Hypothesis</span>
                            <p className="text-gray-700 mt-1">{lead.pain_hypothesis || <span className="italic text-gray-400">Not generated yet</span>}</p>
                        </div>
                    </div>
                </div>

                {/* Core Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium uppercase">Location (Maps Check)</label>
                        <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 text-sm text-gray-800">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {lead.hq_country || 'Unknown'}
                            </div>
                            {!locationData && (
                                <button 
                                    onClick={handleVerifyLocation}
                                    disabled={isVerifyingLocation}
                                    className="text-xs text-blue-600 hover:underline text-left"
                                >
                                    {isVerifyingLocation ? 'Verifying...' : 'Verify HQ with Google Maps'}
                                </button>
                            )}
                            {locationData && (
                                <div className="bg-green-50 p-2 rounded text-xs border border-green-100 mt-1">
                                    <p className="text-gray-700 mb-1">{locationData.text}</p>
                                    {locationData.mapLink && (
                                        <a href={locationData.mapLink} target="_blank" className="flex items-center gap-1 text-green-700 font-medium hover:underline">
                                            <ExternalLink className="w-3 h-3" /> View on Maps
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium uppercase">Segment</label>
                        <div className="flex items-center gap-2 text-sm text-gray-800">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                            {lead.segment || 'N/A'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium uppercase">Employees</label>
                        <div className="flex items-center gap-2 text-sm text-gray-800">
                            <Building className="w-3.5 h-3.5 text-gray-400" />
                            {lead.employees_min}-{lead.employees_max}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium uppercase">ICP Fit</label>
                        <div className="flex items-center gap-2 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                lead.icp_fit === 'High' ? 'bg-green-100 text-green-800' :
                                lead.icp_fit === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {lead.icp_fit || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                     <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Contact Info</h3>
                     <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500 w-16 inline-block">Email:</span> {lead.email || '-'}</p>
                        <p><span className="text-gray-500 w-16 inline-block">Phone:</span> {lead.phone || '-'}</p>
                        <p><span className="text-gray-500 w-16 inline-block">LinkedIn:</span> <a href={lead.linkedin_url || '#'} target="_blank" className="text-indigo-600 hover:underline truncate">{lead.linkedin_url || '-'}</a></p>
                     </div>
                </div>
            </div>
        )}

        {activeTab === 'outbound' && (
            <div className="h-full flex flex-col">
                <div className="mb-6 flex gap-3">
                    <button 
                        onClick={() => handleGenerateDraft('email')}
                        disabled={isWritingDraft}
                        className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isWritingDraft ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        Generate Email
                    </button>
                    <button 
                        onClick={() => handleGenerateDraft('linkedin')}
                        disabled={isWritingDraft}
                        className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isWritingDraft ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                        Generate DM
                    </button>
                </div>

                {draft ? (
                    <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                    {draft.type === 'email' ? <Mail className="w-3 h-3"/> : <MessageSquare className="w-3 h-3"/>}
                                    {draft.type === 'email' ? 'Cold Email Draft' : 'LinkedIn DM Draft'}
                                </span>
                                <span className="text-[10px] text-gray-400">Generated {new Date(draft.generated_at!).toLocaleTimeString()}</span>
                            </div>

                            {draft.type === 'email' && (
                                <div className="mb-3">
                                    <input 
                                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={draft.subject}
                                        onChange={(e) => setDraft({...draft, subject: e.target.value})}
                                        placeholder="Subject Line"
                                    />
                                </div>
                            )}
                            
                            <textarea 
                                className="w-full flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                                value={draft.body}
                                onChange={(e) => setDraft({...draft, body: e.target.value})}
                                placeholder="Write your message here..."
                            />
                        </div>

                        <button 
                            onClick={handleSendDraft}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                            <Send className="w-4 h-4" /> 
                            {draft.type === 'email' ? 'Open in Mail App & Log' : 'Copy & Log as Sent'}
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <Wand2 className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-sm">No active draft.</p>
                        <p className="text-xs">Select a format above to generate one.</p>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'activities' && (
            <ActivityLog activities={activities} onAddActivity={handleAddActivity} />
        )}
      </div>
    </div>
  );
};

export default LeadDetail;
