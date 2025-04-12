 
import { FEEDBACK_PROMPT } from "@/services/constants";
import OpenAI from "openai";
export async function POST(request) {

  const {converstion} = await request.json();

  const PROMPT = FEEDBACK_PROMPT.replace('{{conservation}}' ,JSON.stringify(converstion));
  
   try {
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENAPI_ROUTER_KEY,
      });
  
      // You can change the fallback model here if needed
      const model = "mistralai/mistral-7b-instruct:free"; // fallback while Gemini quota resets
  
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: FINAL_PROMPT }],
        response_format: { type: "json" },
      });
  
      console.log("🧪 Raw Completion:", completion);
  
      if (!completion.choices || completion.choices.length === 0) {
        console.error("❌ No choices returned by model.");
        return NextResponse.json(
          { error: "AI didn't return any content." },
          { status: 500 }
        );
      }
  
      const responseMessage = completion.choices[0].message;
  
      console.log("✅ AI Response:", responseMessage);
  
      return NextResponse.json({
        questions,
      });
    } catch (e) {
      console.error("❌ OpenAI Error:", e);
  
      // Try to extract clean error message
      const errorMessage =
        e?.error?.message ||
        e?.message ||
        "AI generation failed due to an unknown error.";
  
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}