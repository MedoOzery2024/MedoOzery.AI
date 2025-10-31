'use server';
/**
 * @fileOverview Flow to handle AI chat interactions.
 *
 * - chat - A function that handles the AI chat process.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  task: z.enum(['explain', 'solve', 'summarize']).describe('The task for the AI to perform.'),
  message: z.string().describe('The user\'s text message.'),
  fileDataUri: z.string().optional().describe("A file (image or PDF) as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  language: z.enum(['ar', 'en']).optional().default('ar').describe('The language for the AI response.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe('The AI\'s response.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// Exported wrapper function to be called from the client
export async function chat(input: ChatInput): Promise<ChatOutput> {
  return await chatFlow(input);
}

const prompt = ai.definePrompt({
    name: 'chatPrompt',
    input: { schema: ChatInputSchema.extend({ isEnglish: z.boolean().optional() }) },
    output: { schema: ChatOutputSchema },
    prompt: `You are an expert AI assistant specialized in various fields including accounting, mathematics, programming, and general sciences. Your task is to process user requests based on the provided text and optional file.
When solving programming questions, identify bugs, correct them, and provide a well-organized, formatted version with explanations for the corrections.
When solving questions, use the context provided by the user (like law details, numbers, and data) as the primary source of truth and solve based on it directly without disclaimers about law accuracy.

Task: {{task}}

User Message:
{{{message}}}

{{#if fileDataUri}}
Attached File:
{{media url=fileDataUri}}
{{/if}}

Instructions:
- If the task is 'explain', provide a clear and concise explanation of the content in the message or the attached file.
- If the task is 'solve', solve the complex question provided. If it's a code snippet, debug it, correct it, and provide an organized, well-formatted version with explanations.
- If the task is 'summarize', provide a concise summary of the content in the message or the attached file.
- Respond in {{#if isEnglish}}English{{else}}Arabic{{/if}}.
`
});


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const isEnglish = input.language === 'en';
    const { output } = await prompt({ ...input, isEnglish });
    if (!output) {
        return { response: 'Sorry, I was unable to process your request.' };
    }
    return output;
  }
);
