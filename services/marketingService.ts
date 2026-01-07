import { GoogleGenAI } from "@google/genai";

interface PropertyDetails {
  address: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
}

interface GeneratedCaptions {
  instagram: string;
  facebook: string;
  linkedin: string;
}

export const generateSocialCaptions = async (property: PropertyDetails): Promise<GeneratedCaptions> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const propertyInfo = `
Property: ${property.address}
Price: ${property.price}
${property.beds ? `Bedrooms: ${property.beds}` : ''}
${property.baths ? `Bathrooms: ${property.baths}` : ''}
${property.sqft ? `Square Feet: ${property.sqft}` : ''}
    `.trim();

    const instagramResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create an engaging Instagram caption for this property listing. Use emojis, keep it under 150 characters, and include relevant hashtags. Make it exciting and attention-grabbing:\n\n${propertyInfo}`,
      config: {
        systemInstruction: "You are a real estate social media expert who creates compelling, engaging posts that drive engagement and inquiries."
      }
    });

    const facebookResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a Facebook post for this property listing. Make it informative yet conversational, around 200 characters, highlighting key features:\n\n${propertyInfo}`,
      config: {
        systemInstruction: "You are a real estate social media expert who creates compelling, engaging posts that drive engagement and inquiries."
      }
    });

    const linkedinResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a professional LinkedIn post for this property listing. Focus on investment potential, market insights, and professional tone, around 250 characters:\n\n${propertyInfo}`,
      config: {
        systemInstruction: "You are a real estate social media expert who creates compelling, engaging posts that drive engagement and inquiries."
      }
    });

    return {
      instagram: instagramResponse.text || `New listing alert! ${property.address} | ${property.price} 🏡✨ ${property.beds}BR ${property.baths}BA. DM for details! #RealEstate #NewListing #DreamHome`,
      facebook: facebookResponse.text || `Exciting new listing at ${property.address}! This beautiful ${property.beds} bedroom, ${property.baths} bathroom home is now available for ${property.price}. Contact me today for a private showing!`,
      linkedin: linkedinResponse.text || `New market opportunity: ${property.address}. Listed at ${property.price}, this ${property.beds}BR/${property.baths}BA property represents excellent value in today's market. Reach out to discuss investment potential and market analysis.`
    };
  } catch (error) {
    console.error("AI Caption Generation Error:", error);
    return {
      instagram: `New listing alert! ${property.address} | ${property.price} 🏡✨ ${property.beds ? property.beds + 'BR' : ''} ${property.baths ? property.baths + 'BA' : ''}. DM for details! #RealEstate #NewListing #DreamHome`,
      facebook: `Exciting new listing at ${property.address}! ${property.beds && property.baths ? `This beautiful ${property.beds} bedroom, ${property.baths} bathroom home` : 'This amazing property'} is now available for ${property.price}. Contact me today for a private showing!`,
      linkedin: `New market opportunity: ${property.address}. Listed at ${property.price}, this ${property.beds && property.baths ? property.beds + 'BR/' + property.baths + 'BA' : ''} property represents excellent value in today's market. Reach out to discuss investment potential.`
    };
  }
};
