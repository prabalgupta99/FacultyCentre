
import { supabase } from "../lib/supabase";
import { Job, College } from "../types";

export const generateCoverLetter = async (
  job: Job,
  college: College,
  userBio: string
): Promise<string> => {
  try {
    const prompt = `
      You are an expert career consultant for legal academia.
      Write a professional, compelling, and academic cover letter for the following position:
      
      Role: ${job.title}
      Institution: ${college.name}
      About the Institution: ${college.description}
      Job Description: ${job.description}
      
      My Background (User Bio):
      ${userBio}
      
      Requirements to highlight: ${job.requirements.join(', ')}
      
      Keep it formal, concise (under 300 words), and tailored to the ethos of an Indian law university.
      Return ONLY the body of the letter. Do not include placeholders like [Your Name] at the top, just the content.
    `;

    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: { prompt },
    });

    if (error) {
      console.error("Supabase Function Error:", error);
      return "Could not generate cover letter at this time.";
    }

    return data.text || "Could not generate cover letter at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error generating the draft. Please try again.";
  }
};

export const analyzeJobFit = async (
  job: Job,
  userBio: string
): Promise<string> => {
  try {
    const prompt = `
        Analyze the fit for this candidate for the following job:
        
        Job: ${job.title}
        Requirements: ${job.requirements.join(', ')}
        
        Candidate Bio: ${userBio}
        
        Provide a 2-sentence summary of why this candidate is a good fit, and 1 sentence on what they might be missing.
      `;

    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: { prompt },
    });

    if (error) {
      return "Analysis unavailable.";
    }

    return data.text || "Could not analyze fit.";
  } catch (error) {
    return "Analysis unavailable.";
  }
};
