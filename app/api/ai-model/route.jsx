import { INTERVIEW_PROMPT } from "@/services/Constants";
import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Validate input parameters
    const body = await req.json();
    const { jobPosition, jobDescription, duration, type } = body;
    
    if (!jobPosition || !jobDescription) {
      return NextResponse.json(
        { error: "Missing required fields: jobPosition or jobDescription" },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.OPENAPI_ROUTER_KEY) {
      console.error("❌ Missing OpenAI API key");
      return NextResponse.json(
        { error: "Server configuration error: API key not found" },
        { status: 500 }
      );
    }

    const FINAL_PROMPT = INTERVIEW_PROMPT
      .replace("{{jobPosition}}", jobPosition)
      .replace("{{jobDescription}}", jobDescription)
      .replace("{{duration}}", duration || "30 minutes")
      .replace("{{type}}", type || "General");

    console.log("🔍 Prompt sent to AI:\n", FINAL_PROMPT);

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAPI_ROUTER_KEY,
    });

    // You can change the fallback model here if needed
    const model = "mistralai/mistral-7b-instruct:free";

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ 
        role: "user", 
        content: FINAL_PROMPT 
      }],
      response_format: { type: "json" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log("🧪 Raw Completion received");

    if (!completion.choices || completion.choices.length === 0) {
      console.error("❌ No choices returned by model.");
      return NextResponse.json(
        { error: "AI didn't return any content." },
        { status: 500 }
      );
    }

    const responseMessage = completion.choices[0].message;

    let questions = [];
    try {
      // Handle potential JSON parsing issues
      const content = responseMessage.content.trim();
      console.log("Raw AI response:", content);
      
      // Handle cases where JSON might be embedded within non-JSON text
      let jsonContent = content;
      
      // Try to extract JSON if it's embedded in other text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonContent);
      questions = parsed.questions || [];
      
      if (questions.length === 0) {
        console.warn("⚠️ AI returned empty questions array");
      }
    } catch (err) {
      console.error("❌ Failed to parse AI JSON:", err);
      console.error("Raw content:", responseMessage.content);
      
      // Attempt to create a minimal valid response even if parsing fails
      return NextResponse.json({
        error: "AI returned invalid JSON. Please try again.",
        questions: []
      }, { status: 200 }); // Return 200 but with error message to prevent retries
    }

    return NextResponse.json({
      questions,
    });
  } catch (e) {
    console.error("❌ OpenAI Error:", e);

    // Extract detailed error information
    const errorMessage = e?.error?.message || e?.message || "Unknown error";
    const errorStatus = e?.status || 500;
    const errorType = e?.type || "server_error";

    console.error(`Error details: ${errorStatus} - ${errorType} - ${errorMessage}`);

    return NextResponse.json({ 
      error: errorMessage,
      type: errorType
    }, { status: 500 });
  }
}
