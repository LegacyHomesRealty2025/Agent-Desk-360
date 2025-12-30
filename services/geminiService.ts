import { GoogleGenAI } from "@google/genai";
import { Lead } from "../types";

export const getLeadInsight = async (lead: Lead) => {
  // Initialize GoogleGenAI inside the function to ensure the most up-to-date API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a 2-sentence tactical sales advice for a real estate agent dealing with this lead: 
      Name: ${lead.firstName} ${lead.lastName}, 
      Source: ${lead.source}, 
      Budget: $${lead.budget}, 
      Temperature: ${lead.temperature}, 
      Notes: ${lead.notes}.`,
      config: {
        systemInstruction: "You are a senior real estate sales coach focused on high conversion and tactical follow-ups."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate insights at this time.";
  }
};

export const getMarketSummary = async (leads: Lead[]) => {
  // Initialize GoogleGenAI inside the function to ensure the most up-to-date API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const leadData = leads.map(l => ({ budget: l.budget, status: l.status, source: l.source }));
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these real estate leads and provide a short summary of the brokerage performance and market focus: ${JSON.stringify(leadData)}`,
      config: {
        systemInstruction: "You are a strategic business analyst for a real estate brokerage."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Summary currently unavailable.";
  }
};
