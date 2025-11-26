

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Startup, Lead, LeadStage, LEAD_STAGES, ICPProfile } from './types';
import { supabase } from './services/supabase';
import { findProspects, generateOutboundDraft } from './services/gemini';
import { Plus, ArrowRight, Layout, Users, PieChart, Globe, Search, Filter, ChevronLeft, Sparkles, Loader2, Zap, Clipboard } from 'lucide-react';

// Components
import ICPGenerator from './components/ICPGenerator';
import LeadDetail from './components/LeadDetail';
import PipelineView from './components/PipelineView';
import VoiceAssistant from './components/VoiceAssistant';
import QuickCapture from './components/QuickCapture';

const App = () => {
  const [view, setView] = useState<'list' | 'workspace'>('list');
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [isCreatingStartup, setIsCreatingStartup] = useState(false);
  
  // App Initialization
  useEffect(() => {
    fetchStartups();
  }, []);

  const fetchStartups = async () => {
    const { data } = await supabase.from('startups').select('*').order('created_at', { ascending: false });
    if (data) setStartups(data as Startup[]);
  };

  const handleCreateStartup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const website = formData.get('website') as string;
    const direction = formData.get('direction') as any;
    const notes = formData.get('notes') as string;

    const { data, error } = await supabase.from('startups').insert([{
        name, website, direction, notes
    }]).select().single();

    if (data) {
        setStartups([data, ...startups]);
        setIsCreatingStartup(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
            {view === 'workspace' && (
                <button 
                    onClick={() => { setView('list'); setSelectedStartup(null); }}
                    className="p-2 hover:bg-gray-100 rounded-full mr-2 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
            )}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight text-gray-900">GTM Command</span>
            </div>
            {selectedStartup && (
                <>
                    <span className="text-gray-300 text-xl font-light">/</span>
                    <span className="font-medium text-gray-700">{selectedStartup.name}</span>
                </>
            )}
        </div>
        <div className="flex items-center gap-4">
            <div className="text-xs font-medium px-3 py-1 bg-green-100 text-green-700 rounded-full">
                Local System Active
            </div>
        </div>
      </nav>

      <main className="p-6 h-[calc(100vh-64px)] overflow-hidden">
        {view === 'list' ? (
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Your Portfolio</h1>
                        <p className="text-gray-500">Manage your expansion startups and strategy (Local Storage).</p>
                    </div>
                    <button 
                        onClick={() => setIsCreatingStartup(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                    >
                        <Plus className="w-4 h-4" /> Add Startup
                    </button>
                </div>

                {isCreatingStartup && (
                    <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-lg font-semibold mb-4">Add New Startup</h3>
                        <form onSubmit={handleCreateStartup} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input name="name" placeholder="Startup Name" required className="border p-2 rounded w-full text-sm" />
                                <input name="website" placeholder="Website URL" className="border p-2 rounded w-full text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select name="direction" className="border p-2 rounded w-full text-sm">
                                    <option value="OTHER">Select Expansion Direction</option>
                                    <option value="FRANCE_TO_US">France → US</option>
                                    <option value="US_TO_FRANCE">US → France</option>
                                </select>
                            </div>
                            <textarea name="notes" placeholder="Brief description and notes..." className="border p-2 rounded w-full text-sm h-20" />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreatingStartup(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">Create Startup</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {startups.map(startup => (
                        <div 
                            key={startup.id} 
                            onClick={() => { setSelectedStartup(startup); setView('workspace'); }}
                            className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{startup.name}</h3>
                            <a href={startup.website || '#'} onClick={e => e.stopPropagation()} className="text-sm text-gray-500 hover:text-indigo-600 mb-4 block">{startup.website || 'No website'}</a>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 font-medium">
                                    {startup.direction === 'FRANCE_TO_US' ? '🇫🇷 → 🇺🇸' : startup.direction === 'US_TO_FRANCE' ? '🇺🇸 → 🇫🇷' : 'Expansion'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2">{startup.notes}</p>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <Workspace startup={selectedStartup!} />
        )}
        
        {/* Global Voice Assistant */}
        <VoiceAssistant />
      </main>
    </div>
  );
};

// --- Workspace Component ---

const Workspace = ({ startup }: { startup: Startup }) => {
    const [activeTab, setActiveTab] = useState<'market' | 'leads' | 'pipeline'>('market');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isProspecting, setIsProspecting] = useState(false);
    const [isBulkWriting, setIsBulkWriting] = useState(false);
    const [showQuickCapture, setShowQuickCapture] = useState(false);
    
    // Filters
    const [stageFilter, setStageFilter] = useState<string>('ALL');
    // Active ICP Profile for actions
    const [activeIcp, setActiveIcp] = useState<ICPProfile | null>(null);

    useEffect(() => {
        fetchLeads();
        fetchActiveIcp();
    }, [startup.id]);

    const fetchActiveIcp = async () => {
        const { data } = await supabase.from('icp_profiles').select('*').eq('startup_id', startup.id).order('created_at', { ascending: false }).limit(1);
        if (data && data.length > 0) setActiveIcp(data[0] as ICPProfile);
    }

    const fetchLeads = async () => {
        setLoadingLeads(true);
        const { data } = await supabase
            .from('leads')
            .select('*')
            .eq('startup_id', startup.id)
            .order('updated_at', { ascending: false });
        if (data) setLeads(data as Lead[]);
        setLoadingLeads(false);
    };

    const handleCreateLead = async () => {
        const name = prompt("Contact Name:");
        if (!name) return;
        
        const { data, error } = await supabase.from('leads').insert([{
            startup_id: startup.id,
            contact_name: name,
            stage: 'Prospect',
            icp_fit: 'Low' // default
        }]).select().single();

        if (data) setLeads([data, ...leads]);
    };

    const handleSaveCapture = async (leadData: Partial<Lead>) => {
        const { data } = await supabase.from('leads').insert([{
            ...leadData,
            startup_id: startup.id,
            stage: 'Prospect',
            icp_fit: 'Medium'
        }]).select().single();
        
        if (data) {
            setLeads([data, ...leads]);
        }
    };

    const handleAutoProspect = async () => {
        if (!activeIcp) {
            alert("Please generate an ICP profile first in 'Market & ICP' tab.");
            return;
        }

        setIsProspecting(true);
        try {
            const newProspects = await findProspects(activeIcp);
            if (newProspects.length > 0) {
                const leadsToInsert = newProspects.map(p => ({
                    ...p,
                    startup_id: startup.id,
                    stage: 'Prospect',
                    icp_fit: 'Medium',
                    contact_name: 'To be identified',
                    title: 'Target Decision Maker'
                }));
                
                const { data } = await supabase.from('leads').insert(leadsToInsert).select();
                if (data) {
                    setLeads([...(data as Lead[]), ...leads]);
                }
            } else {
                alert("No prospects found using Google Search. Try adjusting the ICP keywords or region.");
            }
        } catch (e: any) {
            console.error("Prospecting failed", e);
            alert(`Prospecting failed: ${e.message}. Please check API key/console.`);
        } finally {
            setIsProspecting(false);
        }
    };

    const handleBulkDrafts = async () => {
        if (!activeIcp) {
            alert("No ICP Profile available to guide the writing.");
            return;
        }
        
        // Find visible leads that don't have a draft yet
        const targetLeads = filteredLeads.filter(l => !l.active_draft && (l.stage === 'Prospect' || l.stage === 'Researched')).slice(0, 5); // Limit to 5 for demo safety
        
        if (targetLeads.length === 0) {
            alert("No eligible leads found (Prospect/Researched stage, no draft).");
            return;
        }
        
        setIsBulkWriting(true);
        try {
            // Process sequentially to be safe with rate limits
            for (const lead of targetLeads) {
                const draft = await generateOutboundDraft(lead, startup, activeIcp, 'email');
                const newDraft = { ...draft, type: 'email' as const, generated_at: new Date().toISOString() };
                
                // Update DB
                await supabase.from('leads').update({ active_draft: newDraft }).eq('id', lead.id);
                
                // Update Local State
                setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, active_draft: newDraft } : l));
            }
        } catch (e) {
            console.error(e);
            alert("Error during bulk writing.");
        } finally {
            setIsBulkWriting(false);
        }
    };

    const handleUpdateLead = (updated: Lead) => {
        setLeads(leads.map(l => l.id === updated.id ? updated : l));
        if (selectedLead?.id === updated.id) setSelectedLead(updated);
    };

    const filteredLeads = leads.filter(l => stageFilter === 'ALL' || l.stage === stageFilter);

    return (
        <div className="h-full flex flex-col">
            {/* Workspace Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setActiveTab('market')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'market' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <Layout className="w-4 h-4" /> Market & ICP
                </button>
                <button 
                    onClick={() => setActiveTab('leads')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'leads' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <Users className="w-4 h-4" /> Leads Database
                </button>
                <button 
                    onClick={() => setActiveTab('pipeline')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'pipeline' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <PieChart className="w-4 h-4" /> Pipeline
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'market' && <ICPGenerator startup={startup} />}
                
                {activeTab === 'leads' && (
                    <div className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" placeholder="Search contacts..." />
                                </div>
                                <div className="relative">
                                    <Filter className="w-3 h-3 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <select 
                                        className="pl-8 pr-8 py-2 border rounded-lg text-sm appearance-none bg-white"
                                        value={stageFilter}
                                        onChange={(e) => setStageFilter(e.target.value)}
                                    >
                                        <option value="ALL">All Stages</option>
                                        {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleBulkDrafts}
                                    disabled={isBulkWriting}
                                    className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isBulkWriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-purple-500" />}
                                    {isBulkWriting ? 'Writing...' : 'Auto-Write Drafts'}
                                </button>
                                <button 
                                    onClick={handleAutoProspect}
                                    disabled={isProspecting}
                                    className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isProspecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-500" />}
                                    {isProspecting ? 'Searching Google...' : 'Auto-Prospect'}
                                </button>
                                <button 
                                    onClick={() => setShowQuickCapture(true)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Clipboard className="w-4 h-4" /> Quick Capture
                                </button>
                                <button onClick={handleCreateLead} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> New Lead
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg flex-1 overflow-hidden flex flex-col">
                            <div className="overflow-y-auto flex-1">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3">Title</th>
                                            <th className="px-4 py-3">Company</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">LinkedIn</th>
                                            <th className="px-4 py-3">Fit</th>
                                            <th className="px-4 py-3">Stage</th>
                                            <th className="px-4 py-3">Last Touch</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredLeads.map(lead => (
                                            <tr 
                                                key={lead.id} 
                                                onClick={() => setSelectedLead(lead)}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            >
                                                <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                                                    {lead.contact_name}
                                                    {lead.active_draft && <span className="w-2 h-2 rounded-full bg-purple-500" title="Draft Ready"></span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]">{lead.title}</td>
                                                <td className="px-4 py-3 text-gray-500">{lead.company_name}</td>
                                                <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{lead.email || '-'}</td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {lead.linkedin_url ? (
                                                        <a 
                                                            href={lead.linkedin_url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-indigo-600 hover:underline"
                                                        >
                                                            View
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        lead.icp_fit === 'High' ? 'bg-green-100 text-green-800' :
                                                        lead.icp_fit === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {lead.icp_fit || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs border border-gray-200">
                                                        {lead.stage}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">
                                                    {lead.last_touch_at ? new Date(lead.last_touch_at).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredLeads.length === 0 && (
                                    <div className="p-8 text-center text-gray-400">No leads found.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'pipeline' && (
                    <PipelineView 
                        leads={leads} 
                        onLeadClick={setSelectedLead} 
                        onLeadUpdate={fetchLeads} 
                    />
                )}
            </div>

            {/* Slide-over Detail Panel */}
            {selectedLead && (
                <LeadDetail 
                    lead={selectedLead} 
                    startup={startup}
                    icp={activeIcp || undefined}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={handleUpdateLead}
                />
            )}

            {/* Quick Capture Modal */}
            {showQuickCapture && (
                <QuickCapture 
                    onClose={() => setShowQuickCapture(false)} 
                    onSave={handleSaveCapture} 
                />
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
