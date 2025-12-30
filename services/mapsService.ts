
import { GoogleGenAI } from "@google/genai";

export const getAddressSuggestions = async (input: string, location?: { latitude: number, longitude: number }) => {
  if (!input || input.length < 3) return [];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find 5 valid real estate property addresses matching or similar to: "${input}". 
      Format the output as a simple list of addresses, one per line. Do not include any other text.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: location ? {
              latitude: location.latitude,
              longitude: location.longitude
            } : undefined
          }
        }
      },
    });

    const text = response.text || "";
    // Clean up markdown bullets or numbers if the model adds them despite instructions
    return text
      .split('\n')
      .map(line => line.replace(/^(\*|\d+\.)\s+/, '').trim())
      .filter(line => line.length > 5);
  } catch (error) {
    console.error("Maps Autocomplete Error:", error);
    return [];
  }
};
