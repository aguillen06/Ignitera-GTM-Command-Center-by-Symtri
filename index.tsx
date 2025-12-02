
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Startup, Lead, LeadStage, LEAD_STAGES, ICPProfile } from './types';
import { supabase, isRateLimitError } from './services/supabase';
import { findProspects, generateOutboundDraft, isRateLimitError as isGeminiRateLimitError } from './services/gemini';
import { Plus, ArrowRight, Layout, Users, PieChart, Globe, Search, Filter, ChevronLeft, Sparkles, Loader2, Zap, Clipboard, Trash2, Command, Hexagon, LogOut } from 'lucide-react';

// Components
import ICPGenerator from './components/ICPGenerator';
import LeadDetail from './components/LeadDetail';
import PipelineView from './components/PipelineView';
import VoiceAssistant from './components/VoiceAssistant';
import QuickCapture from './components/QuickCapture';
import { Auth } from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';

const AppContent = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'list' | 'workspace'>('list');
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [isCreatingStartup, setIsCreatingStartup] = useState(false);
  const [isLoadingStartups, setIsLoadingStartups] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  
  // Workspace State
  const [activeTab, setActiveTab] = useState<'market' | 'leads' | 'pipeline'>('market');
  
  // Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadFilter, setLeadFilter] = useState<LeadStage | 'All'>('All');
  const [isAutoProspecting, setIsAutoProspecting] = useState(false);
  
  // Quick Capture State
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  
  // Auth error state (for handling auth errors during initial load)
  const [authError, setAuthError] = useState<string | null>(null);

  // App Initialization & Auth Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }).catch((error) => {
      console.error('[Auth] Session check failed:', error);
      setAuthError(error.message || 'Failed to check login status. Please refresh the page.');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Show auth error as toast once toast provider is ready
  useEffect(() => {
    if (authError) {
      showError('Authentication Error', authError);
      setAuthError(null);
    }
  }, [authError, showError]);

  useEffect(() => {
    if (session) {
        fetchStartups();
    }
  }, [session]);

  useEffect(() => {
    if (selectedStartup) {
        fetchLeads();
    }
  }, [selectedStartup]);

  const fetchStartups = async () => {
    setIsLoadingStartups(true);
    try {
      const { data, error } = await supabase.from('startups').select('*').order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      if (data) setStartups(data as Startup[]);
    } catch (error: any) {
      console.error('[fetchStartups] Error:', error);
      showError('Failed to load startups', error.message || 'Please try refreshing the page.');
    } finally {
      setIsLoadingStartups(false);
    }
  };

  const fetchLeads = async () => {
    if (!selectedStartup) return;
    setIsLoadingLeads(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').eq('startup_id', selectedStartup.id).order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      if (data) setLeads(data as Lead[]);
    } catch (error: any) {
      console.error('[fetchLeads] Error:', error);
      showError('Failed to load leads', error.message || 'Please try again.');
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const handleCreateStartup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const website = formData.get('website') as string;
    const direction = formData.get('direction') as any;
    const notes = formData.get('notes') as string;

    try {
      const { data, error } = await supabase.from('startups').insert([{
          name, website, direction, notes
      }]).select().single();

      if (error) {
        throw error;
      }

      if (data) {
          setStartups([data, ...startups]);
          setIsCreatingStartup(false);
          showSuccess('Startup created', `${name} has been added to your portfolio.`);
      }
    } catch (error: any) {
      console.error('[handleCreateStartup] Error:', error);
      showError('Failed to create startup', error.message || 'Please try again.');
    }
  };

  const handleDeleteStartup = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this startup? This will delete all associated leads and strategies.")) return;

    try {
      const { error } = await supabase.from('startups').delete().eq('id', id);
      if (error) {
        throw error;
      }
      
      setStartups(startups.filter(s => s.id !== id));
      if (selectedStartup?.id === id) {
          setSelectedStartup(null);
          setView('list');
      }
      showSuccess('Startup deleted', 'The startup and all associated data have been removed.');
    } catch (error: any) {
      console.error('[handleDeleteStartup] Error:', error);
      showError('Failed to delete startup', error.message || 'Please try again.');
    }
  };

  const handleCreateLead = async () => {
    if (!selectedStartup) return;
    const newLead = {
        startup_id: selectedStartup.id,
        contact_name: 'To be identified',
        title: 'Target Decision Maker',
        company_name: 'Target Company',
        stage: 'Prospect' as LeadStage
    };
    
    try {
      const { data, error } = await supabase.from('leads').insert([newLead]).select().single();
      if (error) {
        throw error;
      }
      if (data) {
          setLeads([data, ...leads]);
          setSelectedLead(data);
          showSuccess('Lead created', 'A new lead has been added to your database.');
      }
    } catch (error: any) {
      console.error('[handleCreateLead] Error:', error);
      showError('Failed to create lead', error.message || 'Please try again.');
    }
  };

  const handleSaveLead = (leadData: Partial<Lead>) => {
    if (!selectedStartup) return;
    // If coming from Quick Capture, we need to insert
    const payload = { ...leadData, startup_id: selectedStartup.id, stage: 'Prospect' };
    
    supabase.from('leads').insert([payload]).select().single().then(({ data, error }) => {
        if (error) {
          console.error('[handleSaveLead] Error:', error);
          showError('Failed to save lead', error.message || 'Please try again.');
          return;
        }
        if (data) {
          setLeads([data, ...leads]);
          showSuccess('Lead saved', 'The lead has been added to your database.');
        }
    });
  };

  const handleAutoProspect = async () => {
    if (!selectedStartup) return;
    setIsAutoProspecting(true);
    
    try {
        // 1. Get Active ICP
        const { data: icps, error: icpError } = await supabase.from('icp_profiles').select('*').eq('startup_id', selectedStartup.id).limit(1);
        if (icpError) {
          throw new Error('Failed to load ICP profile: ' + icpError.message);
        }
        if (!icps || icps.length === 0) {
            showWarning('No ICP Profile', "Please go to 'Market & ICP' and generate a strategy first.");
            setIsAutoProspecting(false);
            return;
        }
        
        const activeICP = icps[0] as ICPProfile;

        // 2. Call Gemini
        const prospects = await findProspects(activeICP);
        
        // 3. Insert Leads
        const newLeads = [];
        for (const p of prospects) {
             const payload = {
                startup_id: selectedStartup.id,
                contact_name: "To be identified",
                title: "Target Decision Maker",
                company_name: p.company_name,
                website: p.website,
                industry: p.industry,
                account_summary: p.account_summary,
                stage: 'Prospect',
                icp_fit: 'Medium',
                source: 'AI Auto-Prospect'
             };
             const { data, error } = await supabase.from('leads').insert([payload]).select().single();
             if (error) {
               console.error('[handleAutoProspect] Lead insert error:', error);
               continue; // Skip failed inserts but continue with others
             }
             if (data) newLeads.push(data);
        }

        setLeads([...newLeads, ...leads]);
        showSuccess('Auto-Prospect Complete', `Successfully added ${newLeads.length} new companies to the pipeline.`);

    } catch (e: any) {
        console.error('[handleAutoProspect] Error:', e);
        // Handle rate limit errors with a more helpful message
        if (isGeminiRateLimitError(e) || isRateLimitError(e)) {
          showWarning('Rate Limit Reached', e.message || 'Please wait a moment before trying again.');
        } else {
          showError('Auto-Prospect Failed', e.message || 'Check API limits and try again.');
        }
    } finally {
        setIsAutoProspecting(false);
    }
  };
  
  const handleBulkDrafts = async () => {
      if (!selectedStartup) return;
      const confirmRun = confirm("This will generate generic cold emails for all 'Prospect' stage leads. Continue?");
      if (!confirmRun) return;

      const prospects = leads.filter(l => l.stage === 'Prospect');
      if (prospects.length === 0) {
          showWarning('No Prospects', "No leads in 'Prospect' stage.");
          return;
      }

      // Get ICP
      try {
        const { data: icps, error: icpError } = await supabase.from('icp_profiles').select('*').eq('startup_id', selectedStartup.id).limit(1);
        if (icpError) {
          throw new Error('Failed to load ICP profile: ' + icpError.message);
        }
        
        const activeICP = icps?.[0] as ICPProfile;
        if (!activeICP) {
          showWarning('No ICP Profile', "Please go to 'Market & ICP' and generate a strategy first.");
          return;
        }

        let count = 0;
        let errorCount = 0;
        let rateLimitHit = false;
        
        for (const lead of prospects) {
            try {
                const draft = await generateOutboundDraft(lead, selectedStartup, activeICP, 'email');
                const active_draft = { ...draft, type: 'email', generated_at: new Date().toISOString() };
                
                const { error } = await supabase.from('leads').update({ active_draft }).eq('id', lead.id);
                if (error) {
                  console.error('[handleBulkDrafts] Update error:', error);
                  errorCount++;
                  continue;
                }
                
                setLeads(current => current.map(l => l.id === lead.id ? { ...l, active_draft } : l));
                count++;
            } catch(e: any) { 
              console.error('[handleBulkDrafts] Draft generation error:', e);
              // Check if this is a rate limit error
              if (isGeminiRateLimitError(e) || isRateLimitError(e)) {
                rateLimitHit = true;
                showWarning('Rate Limit Reached', `Generated ${count} drafts before hitting rate limit. ${e.message || 'Please wait before continuing.'}`);
                break; // Stop processing more leads
              }
              errorCount++;
            }
        }
        
        if (!rateLimitHit) {
          if (errorCount > 0) {
            showWarning('Drafts Generated with Errors', `Generated ${count} drafts. ${errorCount} failed.`);
          } else {
            showSuccess('Drafts Generated', `Successfully generated drafts for ${count} leads.`);
          }
        }
      } catch (error: any) {
        console.error('[handleBulkDrafts] Error:', error);
        // Handle rate limit errors with a more helpful message
        if (isGeminiRateLimitError(error) || isRateLimitError(error)) {
          showWarning('Rate Limit Reached', error.message || 'Please wait a moment before trying again.');
        } else {
          showError('Failed to Generate Drafts', error.message || 'Please try again.');
        }
      }
  };

  const handleLogout = async () => {
      try {
        await supabase.auth.signOut();
        showSuccess('Signed Out', 'You have been successfully signed out.');
      } catch (error: any) {
        console.error('[handleLogout] Error:', error);
        showError('Sign Out Failed', error.message || 'Please try again.');
      }
  };

  if (!session) {
      return <Auth />;
  }

  const filteredLeads = leadFilter === 'All' ? leads : leads.filter(l => l.stage === leadFilter);

  return (
    <div className="min-h-screen bg-gray-50/50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Navigation Bar - Dark Command Center Style */}
      <nav className="bg-slate-900 border-b border-slate-800 h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
            {view === 'workspace' && (
                <button 
                    onClick={() => { setView('list'); setSelectedStartup(null); }}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            )}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                    <Hexagon className="w-5 h-5 text-white fill-current" />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg tracking-tight text-white">Ignitera</span>
                        <span className="text-slate-500 font-light hidden sm:inline">|</span>
                        <span className="text-slate-300 text-sm font-medium tracking-wide hidden sm:inline">GTM Command Center</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">by Symtri</span>
                </div>
            </div>
            {selectedStartup && (
                <>
                    <span className="text-slate-600 text-xl font-light">/</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                        <span className="font-medium text-slate-200 text-sm">{selectedStartup.name}</span>
                    </div>
                </>
            )}
        </div>
        <div className="flex items-center gap-4">
            <div className="text-[10px] font-semibold px-3 py-1 bg-slate-800 text-emerald-400 border border-slate-700 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                System Active
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors p-2" title="Sign Out">
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </nav>

      <main className="p-6 h-[calc(100vh-64px)] overflow-hidden">
        {view === 'list' ? (
            <div className="max-w-6xl mx-auto pt-8">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Startup Portfolio</h1>
                        <p className="text-slate-500 text-lg">Manage your expansion strategies and execution pipelines.</p>
                    </div>
                    <button 
                        onClick={() => setIsCreatingStartup(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" /> Add Startup
                    </button>
                </div>

                {isCreatingStartup && (
                    <div className="mb-10 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-in fade-in slide-in-from-top-4 max-w-2xl mx-auto ring-1 ring-gray-100">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">Initialize New Workspace</h3>
                        <form onSubmit={handleCreateStartup} className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Startup Name</label>
                                    <input name="name" placeholder="e.g. Acme Corp" required className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Website</label>
                                    <input name="website" placeholder="e.g. acme.com" className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Expansion Vector</label>
                                <select name="direction" className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="OTHER">Select Direction...</option>
                                    <option value="FRANCE_TO_US">🇫🇷 France → 🇺🇸 US Expansion</option>
                                    <option value="US_TO_FRANCE">🇺🇸 US → 🇫🇷 France Expansion</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Context & Notes</label>
                                <textarea name="notes" placeholder="Brief description of product and current status..." className="border border-gray-300 p-3 rounded-lg w-full text-sm h-24 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsCreatingStartup(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-600 py-3 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm font-medium transition-colors shadow-md">Create Workspace</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoadingStartups ? (
                        <div className="col-span-3 text-center py-20">
                            <Loader2 className="w-8 h-8 text-indigo-600 mx-auto mb-3 animate-spin" />
                            <p className="text-gray-500">Loading startups...</p>
                        </div>
                    ) : (
                      <>
                        {startups.map(startup => (
                            <div 
                                key={startup.id} 
                                onClick={() => { setSelectedStartup(startup); setView('workspace'); }}
                                className="group bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => handleDeleteStartup(e, startup.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl font-bold text-slate-700 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        {startup.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">
                                        {startup.direction === 'FRANCE_TO_US' ? 'FR → US' : startup.direction === 'US_TO_FRANCE' ? 'US → FR' : 'Global'}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">{startup.name}</h3>
                                <div className="flex items-center gap-1 text-slate-400 text-xs mb-4">
                                    <Globe className="w-3 h-3" />
                                    <span className="truncate max-w-[200px]">{startup.website || 'No website'}</span>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{startup.notes || 'No description provided.'}</p>
                                
                                <div className="flex items-center text-indigo-600 text-sm font-medium gap-1 group-hover:translate-x-1 transition-transform">
                                    Open Workspace <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        ))}
                        
                        {startups.length === 0 && !isCreatingStartup && (
                            <div className="col-span-3 text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Layout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-900">No startups configured</h3>
                                <p className="text-gray-500 mb-4">Add your first startup to begin generating strategies.</p>
                                <button onClick={() => setIsCreatingStartup(true)} className="text-indigo-600 font-medium hover:underline">Create Startup</button>
                            </div>
                        )}
                      </>
                    )}
                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col">
                {/* Workspace Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                    <button 
                        onClick={() => setActiveTab('market')}
                        className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'market' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Layout className="w-4 h-4" /> Market & ICP
                    </button>
                    <button 
                        onClick={() => setActiveTab('leads')}
                        className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'leads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Users className="w-4 h-4" /> Leads Database
                    </button>
                    <button 
                        onClick={() => setActiveTab('pipeline')}
                        className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'pipeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <PieChart className="w-4 h-4" /> Pipeline
                    </button>
                </div>

                {/* Workspace Content */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'market' && selectedStartup && (
                        <ICPGenerator startup={selectedStartup} />
                    )}

                    {activeTab === 'leads' && (
                        <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Toolbar */}
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            placeholder="Search contacts..." 
                                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-1 focus:ring-indigo-500 outline-none" 
                                        />
                                    </div>
                                    <div className="relative">
                                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                        <select 
                                            value={leadFilter}
                                            onChange={(e) => setLeadFilter(e.target.value as any)}
                                            className="pl-8 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none appearance-none cursor-pointer hover:border-gray-400"
                                        >
                                            <option value="All">All Stages</option>
                                            {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowQuickCapture(true)}
                                        className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-gray-50"
                                    >
                                        <Clipboard className="w-4 h-4" /> Quick Capture
                                    </button>
                                    <button 
                                        onClick={handleBulkDrafts}
                                        className="bg-white border border-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-indigo-50"
                                    >
                                        <Sparkles className="w-4 h-4" /> Auto-Write Drafts
                                    </button>
                                    <button 
                                        onClick={handleAutoProspect}
                                        disabled={isAutoProspecting}
                                        className="bg-white border border-orange-200 text-orange-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-orange-50 disabled:opacity-50"
                                    >
                                        {isAutoProspecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        Auto-Prospect
                                    </button>
                                    <button 
                                        onClick={handleCreateLead}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" /> New Lead
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3">Name</th>
                                            <th className="px-6 py-3">Title</th>
                                            <th className="px-6 py-3">Company</th>
                                            <th className="px-6 py-3">Email</th>
                                            <th className="px-6 py-3">LinkedIn</th>
                                            <th className="px-6 py-3">Fit</th>
                                            <th className="px-6 py-3">Stage</th>
                                            <th className="px-6 py-3">Last Touch</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {isLoadingLeads ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-20">
                                                    <Loader2 className="w-6 h-6 text-indigo-600 mx-auto mb-2 animate-spin" />
                                                    <span className="text-gray-400">Loading leads...</span>
                                                </td>
                                            </tr>
                                        ) : filteredLeads.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-20 text-gray-400">
                                                    No leads found. Add one manually or use Auto-Prospect.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredLeads.map(lead => (
                                                <tr 
                                                    key={lead.id} 
                                                    onClick={() => setSelectedLead(lead)}
                                                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                                >
                                                    <td className="px-6 py-3 font-medium text-gray-900">{lead.contact_name}</td>
                                                    <td className="px-6 py-3 text-gray-600">{lead.title || '-'}</td>
                                                    <td className="px-6 py-3 text-gray-600">{lead.company_name}</td>
                                                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{lead.email || '-'}</td>
                                                    <td className="px-6 py-3 text-blue-600 hover:underline text-xs">
                                                        {lead.linkedin_url ? <a href={lead.linkedin_url} target="_blank" onClick={e=>e.stopPropagation()}>Link</a> : '-'}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            lead.icp_fit === 'High' ? 'bg-green-100 text-green-700' :
                                                            lead.icp_fit === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {lead.icp_fit || 'Medium'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 text-xs">
                                                            {lead.stage}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-400 text-xs">
                                                        {lead.last_touch_at ? new Date(lead.last_touch_at).toLocaleDateString() : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pipeline' && (
                        <div className="h-full overflow-hidden">
                            <PipelineView 
                                leads={leads} 
                                onLeadClick={setSelectedLead}
                                onLeadUpdate={fetchLeads}
                            />
                        </div>
                    )}

                    {/* Lead Detail Modal/Drawer */}
                    {selectedLead && selectedStartup && (
                        <LeadDetail 
                            lead={selectedLead} 
                            startup={selectedStartup}
                            // In a real app we'd fetch the ICP correctly
                            icp={undefined} 
                            onClose={() => setSelectedLead(null)}
                            onUpdate={(updated) => {
                                setLeads(leads.map(l => l.id === updated.id ? updated : l));
                                setSelectedLead(updated);
                            }}
                        />
                    )}

                    {/* Quick Capture Modal */}
                    {showQuickCapture && (
                        <QuickCapture 
                            onClose={() => setShowQuickCapture(false)}
                            onSave={handleSaveLead}
                        />
                    )}
                </div>
            </div>
        )}
      </main>
      
      {/* Voice Assistant Overlay */}
      <VoiceAssistant />
    </div>
  );
};

// Wrapper component with providers
const App = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
