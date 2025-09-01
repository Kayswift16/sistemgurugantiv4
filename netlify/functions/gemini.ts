import { Handler } from "@netlify/functions";
import GoogleGenerativeAI from "@google/genai";

const apiKey = process.env.API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// Handler untuk Netlify Function
const handler: Handler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }

    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Prompt is required" }),
      };
    }

    // Panggil Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(prompt);

    // Dalam SDK baru, hasil teks diambil begini:
    const text = response.response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ result: text }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Internal server error",
      }),
    };
  }
};

export { handler };
