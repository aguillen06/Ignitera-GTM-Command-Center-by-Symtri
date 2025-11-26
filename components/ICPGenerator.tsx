
import React, { useState, useEffect } from 'react';
import { Startup, ICPProfile } from '../types';
import { supabase } from '../services/supabase';
import { searchMarketAnalysis, generateDeepStrategy, generateBooleanSearch } from '../services/gemini';
import { Loader2, Save, CheckCircle, AlertTriangle, Globe, BrainCircuit, XCircle, Search, Copy, Target, MessageSquare, Briefcase, Zap } from 'lucide-react';

interface ICPGeneratorProps {
  startup: Startup;
}

const ICPGenerator: React.FC<ICPGeneratorProps> = ({ startup }) => {
  const [profiles, setProfiles] = useState<ICPProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  
  // Distinct Loading States
  const [isResearching, setIsResearching] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    profile_name: '',
    region: 'US',
    focus_segment: '',
    product_description: ''
  });

  // Display Tabs
  const [displayTab, setDisplayTab] = useState<'strategy' | 'execution' | 'messaging'>('strategy');

  // Generated Data State
  const [generatedData, setGeneratedData] = useState<Partial<ICPProfile> | null>(null);
  
  // Grounding Data (from search)
  const [groundingSources, setGroundingSources] = useState<{title: string, uri: string}[]>([]);
  
  // Boolean Search Queries
  const [searchQueries, setSearchQueries] = useState<string[]>([]);

  useEffect(() => {
    fetchProfiles();
  }, [startup.id]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('icp_profiles').select('*').eq('startup_id', startup.id).order('created_at', { ascending: false });
    if (data) {
        setProfiles(data as ICPProfile[]);
        if (data.length > 0 && !generatedData) {
            setActiveProfileId(data[0].id);
        }
    }
  };

  // MODE 1: Quick Research (Search Grounding)
  const handleMarketResearch = async () => {
    setIsResearching(true);
    setErrorMsg(null);
    setGeneratedData(null);
    setActiveProfileId(null);
    setGroundingSources([]);
    setSearchQueries([]);
    
    try {
        const query = `Analyze the market for a startup named "${startup.name}" offering "${formData.product_description}" targeting "${formData.focus_segment}" in "${formData.region}". Identify competitors, trends, and risks.`;
        const { text, sources } = await searchMarketAnalysis(query);
        
        setGeneratedData({
            name: formData.profile_name || 'Market Research Draft',
            region: formData.region,
            market_summary: text,
            key_segments: "See Market Summary for details (Generated via Search)",
            competitors: "See Market Summary (Generated via Search)",
            buying_motion: "N/A in Research Mode",
            risks_landmines: "N/A in Research Mode",
            icp_company: { industries_included: [], industries_excluded: [], employee_ranges: [], geographies: [], company_types: [], cloud_environments: [], must_have_attributes: [], nice_to_have_attributes: [], disqualifiers: [] },
            icp_persona: { primary_personas: [], secondary_personas: [] },
            icp_triggers: { events: [], keywords_for_search: [] },
            value_props: "Available in Deep Strategy Mode",
            messaging_framework: "Available in Deep Strategy Mode",
            outbound_sequences: "Available in Deep Strategy Mode",
            meddic_insights: "Available in Deep Strategy Mode",
            expansion_guidance: "Available in Deep Strategy Mode",
        });
        setGroundingSources(sources);
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Error during market research. Check console and API Key.');
    } finally {
        setIsResearching(false);
    }
  };

  // MODE 2: Deep Strategy (Thinking Model)
  const handleDeepStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsThinking(true);
    setErrorMsg(null);
    setGeneratedData(null);
    setActiveProfileId(null);
    setGroundingSources([]);
    setSearchQueries([]);
    
    try {
        const result = await generateDeepStrategy(
            startup.name,
            startup.notes || '',
            formData.region,
            formData.focus_segment,
            formData.product_description
        );
        setGeneratedData({
            ...result,
            name: formData.profile_name,
            region: formData.region
        });
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Error generating deep strategy. Check console and API Key.');
    } finally {
        setIsThinking(false);
    }
  };

  const handleSave = async () => {
    if (!generatedData) return;
    setIsSaving(true);

    const payload = {
        startup_id: startup.id,
        name: generatedData.name || formData.profile_name,
        region: generatedData.region || formData.region,
        notes: formData.product_description,
        market_summary: generatedData.market_summary,
        key_segments: generatedData.key_segments,
        competitors: generatedData.competitors,
        buying_motion: generatedData.buying_motion,
        risks_landmines: generatedData.risks_landmines,
        icp_company: generatedData.icp_company,
        icp_persona: generatedData.icp_persona,
        icp_triggers: generatedData.icp_triggers,
        
        value_props: generatedData.value_props,
        messaging_framework: generatedData.messaging_framework,
        outbound_sequences: generatedData.outbound_sequences,
        meddic_insights: generatedData.meddic_insights,
        expansion_guidance: generatedData.expansion_guidance
    };

    const { data, error } = await supabase.from('icp_profiles').insert([payload]).select().single();

    if (!error && data) {
        const newProfile = data as ICPProfile;
        setProfiles([newProfile, ...profiles]);
        setActiveProfileId(newProfile.id);
        setGeneratedData(null); 
        setFormData({ ...formData, profile_name: '' });
        setGroundingSources([]);
    } else {
        console.error(error);
        setErrorMsg('Failed to save profile to database.');
    }
    setIsSaving(false);
  };

  const handleGetQueries = async () => {
    const target = activeProfile || (generatedData as ICPProfile);
    if (!target) return;
    
    setIsGeneratingQueries(true);
    try {
        const queries = await generateBooleanSearch(target);
        setSearchQueries(queries);
    } catch (e) {
        console.error(e);
    } finally {
        setIsGeneratingQueries(false);
    }
  };

  const activeProfile = activeProfileId ? profiles.find(p => p.id === activeProfileId) : null;
  const displayData = activeProfile || generatedData;

  const isLoading = isResearching || isThinking;

  return (
    <div className="h-full flex gap-6">
      {/* Left Column: Controls & History */}
      <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                Strategy Generator
            </h3>
            
            {errorMsg && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{errorMsg}</p>
                </div>
            )}

            <form onSubmit={handleDeepStrategy} className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Profile Name</label>
                    <input 
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
                        placeholder="e.g. US Mid-Market Fintech"
                        value={formData.profile_name}
                        onChange={e => setFormData({...formData, profile_name: e.target.value})}
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Region</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-1"
                            value={formData.region}
                            onChange={e => setFormData({...formData, region: e.target.value})}
                        >
                            <option value="US">United States</option>
                            <option value="France">France</option>
                            <option value="UK">UK</option>
                            <option value="DACH">DACH</option>
                            <option value="EU">Europe (Gen)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Focus</label>
                        <input 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-1" 
                            placeholder="e.g. Series B"
                            value={formData.focus_segment}
                            onChange={e => setFormData({...formData, focus_segment: e.target.value})}
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                        Product / Service
                        <span className="font-normal text-gray-400 lowercase">(What do they sell?)</span>
                    </label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm h-24 mt-1 resize-none" 
                        placeholder="e.g. An agentic AI platform that automates penetration testing for cloud infrastructure..."
                        value={formData.product_description}
                        onChange={e => setFormData({...formData, product_description: e.target.value})}
                        required
                    />
                </div>
                
                <div className="flex flex-col gap-2 pt-2">
                    <button 
                        type="button"
                        onClick={handleMarketResearch}
                        disabled={isLoading || !formData.product_description}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                    >
                        {isResearching ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Globe className="w-4 h-4 text-blue-500" />}
                        {isResearching ? 'Researching...' : 'Quick Research (Google Search)'}
                    </button>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-70 flex justify-center items-center gap-2 transition-all shadow-sm"
                    >
                        {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        {isThinking ? 'Thinking deeply...' : 'Deep Strategy (Thinking Model)'}
                    </button>
                </div>
            </form>
        </div>

        {/* Action Buttons for Active Profile */}
        {displayData && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Prospecting Tools</h3>
                <button 
                    onClick={handleGetQueries}
                    disabled={isGeneratingQueries}
                    className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                    {isGeneratingQueries ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Get Search Queries
                </button>
                
                {searchQueries.length > 0 && (
                    <div className="bg-gray-50 p-2 rounded border border-gray-200 space-y-2">
                        {searchQueries.map((q, i) => (
                            <div key={i} className="flex gap-2 items-start bg-white p-2 rounded border border-gray-100 shadow-sm">
                                <p className="text-xs text-gray-600 font-mono break-all flex-1">{q}</p>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(q)}
                                    className="text-gray-400 hover:text-indigo-600"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {profiles.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1">
                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Saved Profiles</h4>
                <div className="space-y-2">
                    {profiles.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { setActiveProfileId(p.id); setGeneratedData(null); setGroundingSources([]); setErrorMsg(null); setSearchQueries([]); }}
                            className={`w-full text-left p-3 rounded-lg text-sm border transition-all ${
                                activeProfileId === p.id 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium' 
                                : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <div className="flex justify-between items-center">
                                <span>{p.name}</span>
                                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-400">{p.region}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Right Column: Display */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {!displayData ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a profile or generate a new one.</p>
            </div>
        ) : (
            <>
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{displayData.name} <span className="font-normal text-gray-500">({displayData.region})</span></h2>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            {groundingSources.length > 0 ? (
                                <><span className="inline-block w-2 h-2 rounded-full bg-green-500"></span> Grounded with Google Search</>
                            ) : (
                                <><span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span> Deep Thinking Analysis</>
                            )}
                        </p>
                    </div>
                    {!activeProfileId && (
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save to Database
                        </button>
                    )}
                    {activeProfileId && <div className="flex items-center gap-1 text-green-600 text-sm font-medium"><CheckCircle className="w-4 h-4"/> Saved</div>}
                </div>
                
                {/* Result Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button 
                        onClick={() => setDisplayTab('strategy')}
                        className={`py-3 text-sm font-medium mr-6 flex items-center gap-2 ${displayTab === 'strategy' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        <Target className="w-4 h-4" /> Market & ICP
                    </button>
                    <button 
                        onClick={() => setDisplayTab('messaging')}
                        className={`py-3 text-sm font-medium mr-6 flex items-center gap-2 ${displayTab === 'messaging' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        <MessageSquare className="w-4 h-4" /> Messaging & Value
                    </button>
                    <button 
                        onClick={() => setDisplayTab('execution')}
                        className={`py-3 text-sm font-medium mr-6 flex items-center gap-2 ${displayTab === 'execution' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        <Zap className="w-4 h-4" /> Execution (MEDDIC/Outbound)
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    {/* Grounding Sources */}
                    {groundingSources.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                            <h4 className="text-xs font-bold text-blue-900 uppercase mb-2">Sources Used</h4>
                            <div className="flex flex-wrap gap-2">
                                {groundingSources.slice(0, 5).map((s, i) => (
                                    <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline bg-white px-2 py-1 rounded border border-blue-100 truncate max-w-[200px]">
                                        {s.title}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- TAB 1: STRATEGY --- */}
                    {displayTab === 'strategy' && (
                        <>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 border-b border-gray-100 pb-1">Market Summary</h3>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{displayData.market_summary}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 border-b border-gray-100 pb-1">Key Segments</h3>
                                        <p className="text-sm text-gray-700 whitespace-pre-line">{displayData.key_segments}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 border-b border-gray-100 pb-1">Risks & Landmines</h3>
                                        <p className="text-sm text-gray-700 whitespace-pre-line">{displayData.risks_landmines}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 border-b border-gray-100 pb-1">Competitors</h3>
                                        <p className="text-sm text-gray-700 whitespace-pre-line">{displayData.competitors}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 border-b border-gray-100 pb-1">Buying Motion</h3>
                                        <p className="text-sm text-gray-700 whitespace-pre-line">{displayData.buying_motion}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Structured Data Section */}
                            {displayData.icp_company && (
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mt-6">
                                    <h3 className="text-sm font-bold text-slate-900 mb-4">Structured ICP Definition</h3>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-500 mb-2">Company Criteria</h4>
                                            <div className="bg-white p-3 rounded border border-slate-200 text-xs font-mono text-slate-700 h-64 overflow-y-auto">
                                                <pre>{JSON.stringify(displayData.icp_company, null, 2)}</pre>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xs font-semibold text-slate-500 mb-2">Personas</h4>
                                                <div className="bg-white p-3 rounded border border-slate-200 text-xs font-mono text-slate-700 h-28 overflow-y-auto">
                                                    <pre>{JSON.stringify(displayData.icp_persona, null, 2)}</pre>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-semibold text-slate-500 mb-2">Triggers</h4>
                                                <div className="bg-white p-3 rounded border border-slate-200 text-xs font-mono text-slate-700 h-28 overflow-y-auto">
                                                    <pre>{JSON.stringify(displayData.icp_triggers, null, 2)}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- TAB 2: MESSAGING --- */}
                    {displayTab === 'messaging' && (
                        <div className="space-y-8">
                             <div>
                                <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-2">Value Propositions</h3>
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                                    {displayData.value_props || "Generate a Deep Strategy to see value props."}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Messaging Framework</h3>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                    {displayData.messaging_framework || "Generate a Deep Strategy to see messaging frameworks."}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 3: EXECUTION --- */}
                    {displayTab === 'execution' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">MEDDIC Qualification</h3>
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-sm text-gray-800 leading-relaxed whitespace-pre-line h-[400px] overflow-y-auto">
                                        {displayData.meddic_insights || "Generate a Deep Strategy to see MEDDIC insights."}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Outbound Sequences</h3>
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-line h-[400px] overflow-y-auto">
                                        {displayData.outbound_sequences || "Generate a Deep Strategy to see outbound sequences."}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Expansion Guidance</h3>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                    {displayData.expansion_guidance || "Generate a Deep Strategy to see expansion guidance."}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ICPGenerator;
