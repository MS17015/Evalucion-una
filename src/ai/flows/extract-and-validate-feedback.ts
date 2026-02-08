'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting and validating customer feedback.
 * The prompt is designed to evaluate a student's system instruction, meaning the logic
 * must strictly follow what the student provides.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FeedbackSchema = z.object({
  entidad: z.string().describe('Name of the service/person'),
  polaridad: z.enum(['Amor', 'Odio']).describe('Sentiment expressed (Amor/Odio)'),
  categoria: z.array(z.enum(['Atención', 'App', 'Cajeros'])).describe('Categories related to the feedback'),
  urgencia: z.boolean().describe('Indicates if the feedback is urgent'),
});

const ExtractAndValidateFeedbackInputSchema = z.object({
  systemInstruction: z.string().describe('System instruction for the AI agent'),
  textContent: z.string().describe('Text content containing customer feedback examples'),
});
export type ExtractAndValidateFeedbackInput = z.infer<typeof ExtractAndValidateFeedbackInputSchema>;

const ExtractAndValidateFeedbackOutputSchema = z.object({
  rawResponse: z.string().describe('The raw JSON response from the AI agent'),
  validatedResults: z.array(
    z.object({
      originalText: z.string().describe('Original feedback text'),
      parsedResult: z.union([FeedbackSchema, z.null()]).describe('The validated JSON, or null if validation fails'),
      validationStatus: z.enum(['Success', 'Failure']).describe('Validation status of the extracted data'),
    })
  ),
});
export type ExtractAndValidateFeedbackOutput = z.infer<typeof ExtractAndValidateFeedbackOutputSchema>;

/**
 * Robust wrapper for the extraction flow.
 */
export async function extractAndValidateFeedback(
  input: ExtractAndValidateFeedbackInput
): Promise<ExtractAndValidateFeedbackOutput> {
  try {
    return await extractAndValidateFeedbackFlow(input);
  } catch (error: any) {
    console.error('Extraction flow failed:', error);
    const textLines = input.textContent.split('\n').filter(line => line.trim().length > 0);
    return {
      rawResponse: `Error crítico en el modelo: ${error.message || 'Sin respuesta del agente'}`,
      validatedResults: textLines.map(line => ({
        originalText: line,
        parsedResult: null,
        validationStatus: 'Failure' as const,
      })),
    };
  }
}

const extractFeedbackPrompt = ai.definePrompt({
  name: 'extractFeedbackPrompt',
  input: {schema: ExtractAndValidateFeedbackInputSchema},
  output: {schema: z.any()},
  config: {
    temperature: 0.1, // Low temperature to be more literal with student's instructions
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `
    You are a simulator that evaluates a Student's Prompt Engineering skills.
    
    CRITICAL: You must follow the logic and rules provided in the "STUDENT INSTRUCTION" section below.
    If the Student Instruction is missing rules, logic, or is incorrect, you must NOT "fix" it or use your own knowledge to fill the gaps. Your output must reflect EXACTLY what the student instructed.
    
    STUDENT INSTRUCTION (The source of all logic):
    """
    {{{systemInstruction}}}
    """
    
    DATA TO PROCESS (One example per line):
    {{{textContent}}}
    
    OUTPUT FORMAT REQUIREMENTS:
    - You must ALWAYS return a JSON array of objects.
    - Each object in the array must match this schema:
      {
        "entidad": string,
        "polaridad": "Amor" | "Odio",
        "categoria": ["Atención" | "App" | "Cajeros"],
        "urgencia": boolean
      }
    - If the student's instruction did not provide enough info to fill a field, leave it null or as an empty string according to your best literal interpretation of their bad prompt.
    - Do NOT include markdown blocks or any text other than the JSON array.
  `,
});

const extractAndValidateFeedbackFlow = ai.defineFlow(
  {
    name: 'extractAndValidateFeedbackFlow',
    inputSchema: ExtractAndValidateFeedbackInputSchema,
    outputSchema: ExtractAndValidateFeedbackOutputSchema,
  },
  async input => {
    const {output} = await extractFeedbackPrompt(input);
    
    const rawResponse = typeof output === 'string' ? output : JSON.stringify(output, null, 2) || '[]';
    const textLines = input.textContent.split('\n').filter(line => line.trim().length > 0);

    let jsonResults: any[] = [];
    try {
      const parsed = typeof output === 'string' ? JSON.parse(output) : output;
      if (Array.isArray(parsed)) {
        jsonResults = parsed;
      } else if (parsed && typeof parsed === 'object') {
        jsonResults = [parsed];
      }
    } catch (e) {
      jsonResults = [];
    }

    const validatedResults = textLines.map((line, index) => {
      let parsedResult = null;
      let validationStatus: 'Success' | 'Failure' = 'Failure';

      const candidate = jsonResults[index];
      if (candidate) {
        try {
          // Strict validation against what the app expects
          parsedResult = FeedbackSchema.parse(candidate);
          validationStatus = 'Success';
        } catch (e) {
          parsedResult = null;
          validationStatus = 'Failure';
        }
      }

      return {
        originalText: line,
        parsedResult,
        validationStatus,
      };
    });

    return {
      rawResponse,
      validatedResults,
    };
  }
);
