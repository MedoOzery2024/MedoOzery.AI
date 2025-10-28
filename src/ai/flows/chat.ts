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
  task: z.enum(['explain', 'solve', 'generate', 'summarize']).describe('The task for the AI to perform.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('The difficulty level for generating questions.'),
  message: z.string().describe('The user\'s text message.'),
  fileDataUri: z.string().optional().describe("A file (image or PDF) as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
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
    input: { schema: ChatInputSchema },
    output: { schema: ChatOutputSchema },
    prompt: `You are an expert AI assistant specialized in various fields including accounting, mathematics, programming, and general sciences. Your task is to process user requests based on the provided text and optional file.

Task: {{task}}
{{#if difficulty}}
Difficulty: {{difficulty}}
{{/if}}

User Message:
{{{message}}}

{{#if fileDataUri}}
Attached File:
{{media url=fileDataUri}}
{{/if}}

Instructions:
- If the task is 'explain', provide a clear and concise explanation of the content in the message or the attached file.
- If the task is 'solve', solve the complex question provided. If it's a code snippet, debug it, correct it, and provide an organized, well-formatted version with explanations.
- If the task is 'generate', create questions (easy, medium, or hard based on the difficulty level) from the content of the message or file.
- If the task is 'summarize', provide a concise summary of the content in the message or the attached file.
- Respond in Arabic.
`
});


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        return { response: 'عذراً، لم أتمكن من معالجة طلبك.' };
    }
    return output;
  }
);
