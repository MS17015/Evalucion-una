'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting and validating customer feedback from text files.
 *
 * extractAndValidateFeedback - An async function that takes a system instruction and text content, extracts feedback, and validates it against a JSON schema.
 * ExtractAndValidateFeedbackInput - The input type for the extractAndValidateFeedback function, including system instruction and text content.
 * ExtractAndValidateFeedbackOutput - The output type for the extractAndValidateFeedback function, including the raw response and validated results.
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
 * Robust wrapper for the extraction flow that catches potential AI or validation errors.
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
      rawResponse: `Error en la evaluación: ${error.message || 'Error desconocido del motor de IA'}`,
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
  output: {schema: z.any()}, // Using any to prevent Genkit validation crashes if the model returns null or non-string
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `
    You are an expert data extraction assistant specialized in customer feedback analysis.
    
    SYSTEM INSTRUCTION:
    {{{systemInstruction}}}
    
    TASK:
    Analyze the text content provided below and extract structured information for EACH line of feedback.
    Return the result as a valid JSON array of objects.
    
    JSON STRUCTURE FOR EACH ITEM:
    {
      "entidad": string,
      "polaridad": "Amor" | "Odio",
      "categoria": ["Atención" | "App" | "Cajeros"],
      "urgencia": boolean
    }
    
    CONSTRAINTS:
    - Return ONLY the JSON array. Do not include markdown code blocks or explanations.
    - Match the number of items in the array to the number of non-empty lines in the input text.
    - Ensure enums like "Amor"/"Odio" and categories are matched exactly as specified.
    
    TEXT CONTENT:
    {{{textContent}}}
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
    
    // Prepare the raw response for display
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
      console.warn('Failed to parse model output as JSON:', e);
      jsonResults = [];
    }

    const validatedResults = textLines.map((line, index) => {
      let parsedResult = null;
      let validationStatus: 'Success' | 'Failure' = 'Failure';

      // Attempt to validate the corresponding result from the AI
      const candidate = jsonResults[index];
      if (candidate) {
        try {
          // Strict validation against the student's expected schema
          parsedResult = FeedbackSchema.parse(candidate);
          validationStatus = 'Success';
        } catch (e) {
          // Validation failed for this specific item
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
