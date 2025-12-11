import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
// NOTE: This requires REACT_APP_API_KEY or similar to be set in the build environment,
// mapped to process.env.API_KEY.
const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!ai) {
    console.warn("Gemini API Key is missing. Image generation skipped.");
    return null;
  }

  // Attempt 1: Gemini 2.5 Flash Image (Primary)
  try {
    // Using gemini-2.5-flash-image as per recommendations for general image tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        // Explicitly requesting 1:1 aspect ratio as default
        imageConfig: {
           aspectRatio: "1:1"
        }
      }
    });

    // Iterate through parts to find the inlineData (image)
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error) {
    console.warn("Gemini 2.5 Flash Image generation failed (RPC/XHR error). Attempting fallback to Imagen...", error);
  }

  // Attempt 2: Imagen 3.0 (Fallback)
  // If the primary model fails (e.g., 500 RPC error), try the Imagen model via generateImages
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg'
      },
    });

    if (response.generatedImages && response.generatedImages[0]?.image?.imageBytes) {
       return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
    }
  } catch (fallbackError) {
    console.error("All image generation strategies failed:", fallbackError);
  }

  return null;
};