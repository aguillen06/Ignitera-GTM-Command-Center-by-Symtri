

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Startup {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  direction: 'FRANCE_TO_US' | 'US_TO_FRANCE' | 'OTHER';
  notes: string | null;
  created_at: string;
}

export interface ICPProfile {
  id: string;
  startup_id: string;
  name: string;
  region: string;
  notes: string | null;
  
  // Strategy
  market_summary: string | null;
  key_segments: string | null;
  competitors: string | null;
  buying_motion: string | null;
  risks_landmines: string | null;
  
  // Structured ICP
  icp_company: ICPCompany | null;
  icp_persona: ICPPersona | null;
  icp_triggers: ICPTriggers | null;

  // Execution & Messaging (New)
  value_props: string | null;
  messaging_framework: string | null;
  outbound_sequences: string | null;
  meddic_insights: string | null;
  expansion_guidance: string | null;

  created_at: string;
}

export interface ICPCompany {
  industries_included: string[];
  industries_excluded: string[];
  employee_ranges: { min: number; max: number }[];
  geographies: string[];
  company_types: string[];
  cloud_environments: string[];
  must_have_attributes: string[];
  nice_to_have_attributes: string[];
  disqualifiers: string[];
}

export interface ICPPersona {
  primary_personas: PersonaDetail[];
  secondary_personas: PersonaDetail[];
}

export interface PersonaDetail {
  title_keywords: string[];
  departments: string[];
  seniority: string[];
  role_in_deal: string;
}

export interface ICPTriggers {
  events: string[];
  keywords_for_search: string[];
}

export interface Lead {
  id: string;
  startup_id: string;
  contact_name: string;
  title: string | null;
  seniority: string | null;
  email: string | null;
  linkedin_url: string | null;
  phone: string | null;
  persona: string | null;
  company_name: string | null;
  website: string | null;
  hq_country: string | null;
  company_type: string | null;
  industry: string | null;
  employees_min: number | null;
  employees_max: number | null;
  cloud_env: string | null;
  direction: string | null;
  icp_fit: 'High' | 'Medium' | 'Low' | null;
  segment: string | null;
  stage: LeadStage;
  last_touch_at: string | null;
  last_touch_type: string | null;
  account_summary: string | null;
  personalized_hook: string | null;
  pain_hypothesis: string | null;
  source: string | null;
  
  // New: AI Outbound Worker
  active_draft: {
    subject?: string;
    body: string;
    type: 'email' | 'linkedin';
    generated_at: string;
  } | null;

  // New: Live Enrichment Data
  funding_status: string | null;
  tech_stack: string[] | null;
  recent_news: string | null;
  hiring_trends: string | null;

  raw_data: Json | null;
  created_at: string;
  updated_at: string;
}

export type LeadStage = 'Prospect' | 'Researched' | 'Contacted' | 'Meeting' | 'Proposal' | 'Won' | 'Lost';

export interface Activity {
  id: string;
  lead_id: string;
  activity_type: 'email' | 'linkedin' | 'call' | 'meeting' | 'note';
  direction: 'outbound' | 'inbound';
  subject: string | null;
  body: string | null;
  done_at: string;
  created_at: string;
}

export const LEAD_STAGES: LeadStage[] = ['Prospect', 'Researched', 'Contacted', 'Meeting', 'Proposal', 'Won', 'Lost'];
