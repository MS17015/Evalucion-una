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

export async function extractAndValidateFeedback(
  input: ExtractAndValidateFeedbackInput
): Promise<ExtractAndValidateFeedbackOutput> {
  return extractAndValidateFeedbackFlow(input);
}

const extractFeedbackPrompt = ai.definePrompt({
  name: 'extractFeedbackPrompt',
  input: {schema: ExtractAndValidateFeedbackInputSchema},
  output: {schema: z.string()},
  prompt: `{{{systemInstruction}}}\n\nExtract the following JSON structure from the text content:\n\n{ \n  "entidad": "Nombre del servicio/persona",\n  "polaridad": (Amor/Odio),\n  "categoria": ["Atención", "App", "Cajeros"],\n  "urgencia": boolean\n}\n\nText Content: {{{textContent}}}`,
});

const extractAndValidateFeedbackFlow = ai.defineFlow(
  {
    name: 'extractAndValidateFeedbackFlow',
    inputSchema: ExtractAndValidateFeedbackInputSchema,
    outputSchema: ExtractAndValidateFeedbackOutputSchema,
  },
  async input => {
    const {output: rawResponse} = await extractFeedbackPrompt(input);

    const textLines = input.textContent.split('\n');

    let jsonResults: any[] = [];
    try {
      jsonResults = JSON.parse(rawResponse!).map((item: any) => {
        try {
          return FeedbackSchema.parse(item);
        } catch (e) {
          return null;
        }
      });
    } catch (e) {
      // If the entire response is not valid JSON, attempt to parse each line individually
      console.warn('Raw response is not valid JSON, attempting to parse line by line.', e);
      try {
        jsonResults = textLines.map(line => {
          try {
            const parsed = JSON.parse(line);
            try {
              return FeedbackSchema.parse(parsed);
            } catch (e) {
              return null;
            }
          } catch (e) {
            return null;
          }
        });
      } catch (e) {
        console.error('Failed to parse individual lines.', e);
        jsonResults = textLines.map(() => null);
      }
    }

    const validatedResults = textLines.map((line, index) => {
      const parsedResult = jsonResults[index] || null;
      const validationStatus = parsedResult ? 'Success' : 'Failure';
      return {
        originalText: line,
        parsedResult,
        validationStatus: validationStatus as 'Success' | 'Failure',
      };
    });

    return {
      rawResponse: rawResponse!,
      validatedResults,
    };
  }
);
