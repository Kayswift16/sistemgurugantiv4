import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/genai";

// Pastikan API key ada dalam Netlify Environment Variables
const apiKey = process.env.API_KEY!;
const ai = new GoogleGenerativeAI(apiKey);

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Allow": "POST",
        "Content-Type": "application/json",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Allow": "POST",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { prompt } = body;

    if (!prompt) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Prompt is required" }),
      };
    }

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    // ✅ gunakan output_text, bukan output
    const jsonText = response.output_text?.trim();
    if (!jsonText) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "AI response kosong atau tidak sah" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: jsonText,
    };
  } catch (error: any) {
    console.error("Error in gemini function:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Error", detail: error.message }),
    };
  }
};

export { handler };
