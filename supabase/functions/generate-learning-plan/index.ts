// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import Groq from "https://esm.sh/groq-sdk@0.7.0"

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

interface RequestBody {
  incorrectAnswers: string[];
}

interface ResponseBody {
  learningPlan: string;
  newQuizQuestions: QuizQuestion[];
}

console.log("Generate Learning Plan Function Started (Groq)")

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Parse the incoming request body
    const body: RequestBody = await req.json()
    const { incorrectAnswers } = body

    if (!incorrectAnswers || !Array.isArray(incorrectAnswers)) {
      return new Response(
        JSON.stringify({ error: "Invalid request body. Expected 'incorrectAnswers' array." }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Initialize Groq client
    const apiKey = Deno.env.get("GROQ_API_KEY")
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Groq API key not configured" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    const groq = new Groq({ apiKey })

    // First AI Call: Generate Learning Plan
    const learningPlanPrompt = `
You are an educational AI assistant. I have a list of quiz questions that a student answered incorrectly. 
Please generate a detailed learning plan with explanations for each topic covered in these questions.

Incorrect Questions:
${incorrectAnswers.map((q, index) => `${index + 1}. ${q}`).join('\n')}

Please provide:
1. A detailed explanation for each topic covered in the questions
2. Key concepts and definitions  
3. Examples to illustrate the concepts
4. Tips for better understanding

Format your response as clean, semantic HTML that can be directly inserted into a web page with a dark theme. 
Use appropriate HTML tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, etc.

Structure your content as follows:
- Use <h2> for main topic headings
- Use <h3> for subtopic headings  
- Use <p> for explanatory paragraphs
- Use <ul> and <li> for lists
- Use <strong> for important terms
- Use <em> for emphasis
- Use <blockquote> for key concepts or important notes
- Use <code> for technical terms or syntax

Do NOT include any CSS classes in your HTML. The styling will be handled by the application.
Make sure the content is educational, comprehensive, and well-structured with proper semantic HTML.
Focus on clear explanations and practical examples that will help the student understand the concepts they missed.
`

    const learningPlanCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: learningPlanPrompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 4000,
    })

    const learningPlan = learningPlanCompletion.choices[0]?.message?.content || ""

    // Calculate dynamic number of practice questions
    const questionCount = Math.min(Math.ceil(incorrectAnswers.length / 2), 5);

    // Second AI Call: Generate Follow-up Quiz
    const quizPrompt = `
Based on the following learning content, generate ${questionCount} multiple-choice quiz questions that test understanding of the key concepts covered.

Learning Content:
${learningPlan}

Requirements:
- Create exactly ${questionCount} questions based ONLY on the provided learning content
- Each question should test understanding of key concepts
- Provide exactly 4 multiple-choice options for each question
- Indicate the correct answer as a 0-indexed integer (0, 1, 2, or 3) for each question
- Make the questions challenging but fair
- Ensure questions cover different aspects of the learning content

You MUST respond with a valid JSON object in this exact format:
{
  "quiz": [
    {
      "question": "Your first question here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_answer": 0
    },
    {
      "question": "Your second question here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_answer": 2
    }
  ]
}

Respond with ONLY the JSON object, no additional text, markdown formatting, or code blocks.
`

    const quizCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: quizPrompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 2000,
    })

    let quizResponse = quizCompletion.choices[0]?.message?.content || ""
    
    // Clean up the response to ensure it's valid JSON
    quizResponse = quizResponse.replace(/```json\n?/, '').replace(/```\n?$/, '').trim()
    
    let newQuizQuestions: QuizQuestion[]
    try {
      const parsedQuiz = JSON.parse(quizResponse)
      newQuizQuestions = parsedQuiz.quiz || []
      
      // Validate the quiz structure
      if (!Array.isArray(newQuizQuestions) || newQuizQuestions.length === 0) {
        throw new Error("Invalid quiz structure")
      }
      
      // Validate each question
      newQuizQuestions.forEach(q => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer > 3) {
          throw new Error("Invalid question structure")
        }
      })
      
    } catch (parseError) {
      console.error("Failed to parse quiz JSON:", parseError)
      console.error("Raw response:", quizResponse)
      
      // Fallback: create fallback questions if parsing fails
      const fallbackQuestions = [
        {
          question: "Which of these is a good study habit?",
          options: [
            "Review material regularly and take practice tests",
            "Only study the night before an exam", 
            "Memorize without understanding concepts",
            "Skip reviewing incorrect answers"
          ],
          correct_answer: 0
        },
        {
          question: "What is the best approach when you make mistakes on a quiz?",
          options: [
            "Ignore them and move on",
            "Analyze the mistakes and understand the concepts", 
            "Just memorize the correct answers",
            "Avoid similar topics in the future"
          ],
          correct_answer: 1
        },
        {
          question: "How should you approach learning new concepts?",
          options: [
            "Rush through to cover more material",
            "Focus only on memorization", 
            "Take time to understand and practice applications",
            "Skip the difficult parts"
          ],
          correct_answer: 2
        }
      ];
      
      // Use only the number of questions we need
      newQuizQuestions = fallbackQuestions.slice(0, questionCount);
    }

    // Prepare the final response
    const responseData: ResponseBody = {
      learningPlan,
      newQuizQuestions
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        } 
      }
    )

  } catch (error) {
    console.error("Error in generate-learning-plan function:", error)
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-learning-plan' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"incorrectAnswers":["What is the capital of France?", "What is 2+2?"]}'

  Note: Make sure to set the GROQ_API_KEY environment variable in your Supabase project settings.

*/
