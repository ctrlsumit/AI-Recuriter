"use client";
import { useUser } from "@/app/provider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/services/supabaseClient";
import axios from "axios";
import { Loader2Icon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

function QuestionList({ formData, onCreateLink }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const { user } = useUser();
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (formData) {
      // Generate AI interview Questions
      GenerateQuestionList();
    }
  }, [formData]);

  const GenerateQuestionList = async () => {
    setLoading(true);
    try {
      console.log("Sending data to AI model:", formData);
      const result = await axios.post("/api/ai-model", {
        ...formData,
      });
      console.log("API response:", result.data);
      setQuestions(result.data.questions || []); // Handle if API returns null
    } catch (error) {
      // Improved error handling
      if (error.response) {
        // The server responded with an error status code
        console.error("Server Error:", error.response.status);
        console.error("Error details:", error.response.data);
        toast(`Server Error: ${error.response.data.error || "Unknown error"}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Network Error:", error.message);
        toast("Network Error: No response received from server");
      } else {
        // Error in setting up the request
        console.error("Request Error:", error.message);
        toast(`Request Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Finish Button
  const onFinish = async () => {
    try {
      const interview_id = uuidv4();
      setSaveLoading(true);
      
      const { data, error } = await supabase
        .from("Interviews")
        .insert([
          {
            ...formData,
            questions: questions,
            userEmail: user?.email,
            interview_id: interview_id,
          }
        ])
        .select();
        
      if (error) {
        console.error("Supabase error:", error);
        toast("Failed to save interview data");
        return;
      }
      
      console.log("Interview saved:", data);
      onCreateLink(interview_id);
      toast("Interview created successfully!");
    } catch (error) {
      console.error("Error saving interview:", error);
      toast("An error occurred while saving");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-2">
            <Loader2Icon className="h-5 w-5 animate-spin text-slate-700" />
            <h3 className="text-lg font-medium">Generating Interview Questions</h3>
          </div>
          <p className="text-sm text-slate-500">
            Our AI is crafting personalized questions
          </p>
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            Generated Interview Questions:
          </h2>

          <div className="space-y-6">
            {Object.entries(
              questions.reduce((acc, curr) => {
                const type = curr.type || "Other";
                if (!acc[type]) acc[type] = [];
                acc[type].push(curr);
                return acc;
              }, {})
            ).map(([type, qs], i) => (
              <div key={i} className="space-y-3">
                <h3 className="text-lg font-medium">{type}</h3>
                <div className="space-y-2">
                  {qs.map((q, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-md border border-slate-200">
                      {q.question}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 text-center bg-slate-50 rounded-lg border border-slate-200">
          No questions found.
        </div>
      )}

      <Button 
        className="w-full" 
        onClick={onFinish}
        disabled={saveLoading || questions.length === 0}
      >
        {saveLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
        Create Interview Link & Finish
      </Button>
    </div>
  );
}

export default QuestionList;
