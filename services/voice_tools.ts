
import { FunctionDeclaration, Type } from "@google/genai";
import { supabase } from "./supabase";

// --- Tool Definitions (Schema) ---

const TOOL_COUNT_LEADS: FunctionDeclaration = {
  name: "count_leads",
  description: "Count the total number of leads in the database, optionally filtered by stage.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      stage: {
        type: Type.STRING,
        description: "The stage to filter by (e.g., 'Prospect', 'Contacted'). Optional.",
      },
    },
  },
};

const TOOL_GET_RECENT_LEADS: FunctionDeclaration = {
  name: "get_recent_leads",
  description: "Get a list of the most recently updated leads.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "Number of leads to return (default 5).",
      },
    },
  },
};

const TOOL_CREATE_NOTE: FunctionDeclaration = {
  name: "create_quick_note",
  description: "Create a generic note or idea. Useful when the user wants to remember something quickly.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: {
        type: Type.STRING,
        description: "The content of the note.",
      },
    },
    required: ["content"],
  },
};

export const VOICE_TOOLS = [
  { functionDeclarations: [TOOL_COUNT_LEADS, TOOL_GET_RECENT_LEADS, TOOL_CREATE_NOTE] }
];

// --- Tool Execution Logic ---

export const executeVoiceTool = async (name: string, args: any): Promise<any> => {
  console.log(`[Voice Tool] Executing ${name} with args:`, args);

  try {
    switch (name) {
      case "count_leads": {
        let query = supabase.from('leads').select('*', { count: 'exact', head: true });
        if (args.stage) {
          query = query.eq('stage', args.stage);
        }
        const { count, error } = await query;
        if (error) throw error;
        return { count: count || 0, filter: args.stage || 'all' };
      }

      case "get_recent_leads": {
        const limit = args.limit || 5;
        const { data, error } = await supabase
          .from('leads')
          .select('contact_name, company_name, stage, icp_fit')
          .order('updated_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        return { leads: data };
      }

      case "create_quick_note": {
        // Since notes usually belong to a startup/lead, we'll create a dummy 'General' startup if it doesn't exist, 
        // or just log it to console for this v1 demo if no context is available.
        // For now, let's just return a success message to simulate the action.
        return { status: "success", message: "Note saved to your log (simulated)." };
      }

      default:
        return { error: "Unknown tool" };
    }
  } catch (err: any) {
    console.error("[Voice Tool Error]", err);
    return { error: err.message };
  }
};
