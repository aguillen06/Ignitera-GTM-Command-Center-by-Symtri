
import React from 'react';
import { Lead, LEAD_STAGES, LeadStage } from '../types';
import { supabase } from '../services/supabase';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from './Toast';

interface PipelineViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onLeadUpdate: () => void;
}

const PipelineView: React.FC<PipelineViewProps> = ({ leads, onLeadClick, onLeadUpdate }) => {
  const { showSuccess, showError } = useToast();
  
  const handleDrop = async (e: React.DragEvent, newStage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', leadId);
      
      if (error) {
        throw error;
      }
      
      onLeadUpdate();
      showSuccess('Stage Updated', `Lead moved to ${newStage}.`);
    } catch (error: any) {
      console.error('[handleDrop] Error:', error);
      showError('Update Failed', error.message || 'Failed to update lead stage.');
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const getLeadsByStage = (stage: LeadStage) => leads.filter(l => l.stage === stage);

  // Helper: Logic for Next Best Action
  const getNextAction = (lead: Lead): { label: string; urgent: boolean } | null => {
    const daysSinceTouch = lead.last_touch_at 
        ? Math.floor((new Date().getTime() - new Date(lead.last_touch_at).getTime()) / (1000 * 3600 * 24)) 
        : 99; // If never touched, treat as old

    if (daysSinceTouch > 7) return { label: 'Stalled: Bump Now', urgent: true };
    
    switch (lead.stage) {
        case 'Prospect': return { label: 'Research & Enrich', urgent: false };
        case 'Researched': return { label: 'Send First Draft', urgent: false };
        case 'Contacted': return { label: 'Follow Up (3d)', urgent: false };
        case 'Meeting': return { label: 'Send Proposal', urgent: false };
        case 'Proposal': return { label: 'Close / Sign', urgent: true };
        default: return null;
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] items-start">
      {LEAD_STAGES.map(stage => (
        <div 
            key={stage} 
            className="min-w-[280px] w-[280px] bg-gray-50 rounded-lg border border-gray-200 flex flex-col max-h-full"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, stage)}
        >
          <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg sticky top-0 z-10">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase text-gray-600 tracking-wider">{stage}</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{getLeadsByStage(stage).length}</span>
            </div>
          </div>
          
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {getLeadsByStage(stage).map(lead => {
                const action = getNextAction(lead);
                
                return (
                  <div 
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => onLeadClick(lead)}
                    className={`bg-white p-3 rounded border shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-95 group relative ${action?.urgent ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'}`}
                  >
                    {action?.urgent && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                    
                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">{lead.contact_name}</h4>
                    <p className="text-xs text-gray-500 truncate">{lead.title}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate">{lead.company_name}</p>
                    
                    {/* Next Action Chip */}
                    {action && (
                        <div className={`mt-2 text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 font-medium ${action.urgent ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
                            {action.urgent ? <AlertCircle className="w-3 h-3"/> : <ArrowRight className="w-3 h-3"/>}
                            {action.label}
                        </div>
                    )}

                    <div className="mt-2 flex items-center justify-between border-t border-gray-50 pt-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            lead.icp_fit === 'High' ? 'bg-green-100 text-green-700' : 
                            lead.icp_fit === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {lead.icp_fit ? `${lead.icp_fit} Fit` : 'Unscored'}
                        </span>
                        {lead.last_touch_at && (
                            <span className="text-[10px] text-gray-400">
                                {new Date(lead.last_touch_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric'})}
                            </span>
                        )}
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PipelineView;
