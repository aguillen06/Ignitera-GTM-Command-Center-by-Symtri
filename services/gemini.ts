import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ICPProfile, Lead, Startup } from "../types";

// NOTE: Expects process.env.API_KEY to be populated
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// --- GTM Command Center Persona ---
const GTM_SYSTEM_INSTRUCTION = `
You are **GTM Command Center**, an expert Go-To-Market strategist.
Your job is to generate complete GTM strategies, ICP definitions, messaging frameworks, and outbound content.
Your output must always be structured, professional, and actionable.
`;

// --- Helpers ---

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "");
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  return cleaned.trim();
};

// --- 1. Market Research (Grounding) ---
export const searchMarketAnalysis = async (
  query: string
): Promise<{ text: string; sources: { title: string; uri: string }[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a market researcher. Provide up-to-date information.",
      },
    });

    const text = response.text || "No analysis generated.";
    const sources: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { text, sources };
  } catch (error) {
    console.error("Market Search Error:", error);
    throw error;
  }
};

// --- 2. Deep Strategy (Thinking) ---
export const generateDeepStrategy = async (
  startupName: string,
  startupNotes: string,
  region: string,
  focusSegment: string,
  productDescription: string,
  direction?: 'FRANCE_TO_US' | 'US_TO_FRANCE' | 'OTHER'
): Promise<Partial<ICPProfile>> => {
  try {
    const directionContext = direction === 'FRANCE_TO_US' ? "Expanding from France/Europe TO the USA." :
                             direction === 'US_TO_FRANCE' ? "Expanding from USA TO France/Europe." :
                             "General Expansion.";

    const prompt = `
      Analyze the following startup deeply and define their full GTM Strategy.
      
      Startup: ${startupName}
      Context: ${startupNotes}
      Target Region: ${region}
      Expansion Direction: ${directionContext}
      Focus Segment: ${focusSegment}
      Product: ${productDescription}
      
      Output pure JSON fitting the schema for ICP, Market Summary, Competitors, Risks, Messaging, and Outbound.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: GTM_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: "application/json"
      },
    });

    return JSON.parse(cleanJson(response.text || "{}"));
  } catch (error) {
    console.error("Deep Strategy Error:", error);
    throw error;
  }
};

// --- 3. Boolean Search Strings ---
export const generateBooleanSearch = async (icp: ICPProfile): Promise<string[]> => {
    const prompt = `
        Based on this ICP, generate 5 Boolean Search Strings for LinkedIn Sales Navigator.
        ICP Persona: ${JSON.stringify(icp.icp_persona)}
        ICP Company: ${JSON.stringify(icp.icp_company)}
        Region: ${icp.region}
        
        Output valid JSON array of strings: ["string1", "string2"]
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(cleanJson(response.text || "[]"));
};

// --- 4. Auto-Prospecting (Search) ---
export const findProspects = async (icp: ICPProfile): Promise<Partial<Lead>[]> => {
    const prompt = `
        Find 5 real companies in ${icp.region} that match this ICP:
        Segment: ${icp.key_segments}
        Criteria: ${JSON.stringify(icp.icp_company)}
        
        Use Google Search to find ACTUAL companies.
        IMPORTANT: Return ONLY a valid JSON array. No markdown formatting.
        Example JSON: [{"company_name": "Acme", "website": "acme.com", "industry": "Tech", "account_summary": "Fits due to..."}]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            tools: [{ googleSearch: {} }],
            // Removed responseMimeType: 'application/json' to allow tool use
        }
    });

    const raw = JSON.parse(cleanJson(response.text || "[]"));
    return Array.isArray(raw) ? raw : [];
};

// --- 5. Lead Enrichment (AI Insights) ---
export const enrichLead = async (lead: Lead, startup: Startup, icp: ICPProfile | null): Promise<Partial<Lead>> => {
    const prompt = `
        Generate sales insights for this lead:
        Lead: ${lead.contact_name}, ${lead.title} at ${lead.company_name}
        Startup: ${startup.name} (${startup.notes})
        ICP Context: ${icp ? icp.name : 'General'}
        
        Output JSON: { "account_summary": "...", "personalized_hook": "...", "pain_hypothesis": "...", "icp_fit": "High/Medium/Low" }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(cleanJson(response.text || "{}"));
};

// --- 6. Live Enrichment (Google Search) ---
export const enrichLeadWithLiveSearch = async (lead: Lead): Promise<Partial<Lead>> => {
    const query = `
        Find recent news, funding status, tech stack, and active hiring roles for ${lead.company_name}.
        Return a valid JSON object with keys: funding_status, tech_stack (array of strings), recent_news, hiring_trends, account_summary.
        Do not use markdown.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: { 
            tools: [{ googleSearch: {} }],
            // Removed responseMimeType and responseSchema to compatible with tools
        }
    });

    return JSON.parse(cleanJson(response.text || "{}"));
};

// --- 7. Location Verification (Maps) ---
export const verifyLocation = async (companyName: string, countryHint: string) => {
    const prompt = `
        Where is the HQ of ${companyName}? Check if it matches ${countryHint}. 
        Return valid JSON: { "text": "...", "mapLink": "..." }
        Do not use markdown.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            tools: [{ googleSearch: {} }], 
            // Removed responseMimeType
        }
    });
    
    return JSON.parse(cleanJson(response.text || "{}"));
};

// --- 8. Outbound Writer ---
export const generateOutboundDraft = async (lead: Lead, startup: Startup, icp: ICPProfile, type: 'email' | 'linkedin') => {
    const prompt = `
        Write a ${type} for ${lead.contact_name} at ${lead.company_name}.
        Value Prop: ${icp.value_props}
        Tone: Professional, direct.
        Output JSON: { "subject": "...", "body": "..." }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(cleanJson(response.text || "{}"));
};

// --- 9. Web Clipper Parser ---
export const parseLeadFromText = async (text: string): Promise<Partial<Lead>> => {
    const prompt = `Extract lead info from this text: "${text}". Output JSON matching Lead interface keys.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(cleanJson(response.text || "{}"));
};

// --- 10. Live Client Access ---
export const getLiveClient = () => ai;