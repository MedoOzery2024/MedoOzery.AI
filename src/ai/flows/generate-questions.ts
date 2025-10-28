'use server';
/**
 * @fileOverview Flow to handle question generation from text or files.
 *
 * - generateQuestions - A function that handles the question generation process.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateQuestionsInputSchema = z.object({
  context: z.string().describe("The text content to generate questions from."),
  fileDataUri: z.string().optional().describe("An optional file (image or PDF) to extract context from. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  questionCount: z.number().int().min(1).max(20).describe("The number of questions to generate."),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level for the questions.'),
  language: z.enum(['ar', 'en']).optional().default('ar').describe('The language for the generated questions and answers.'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const QuestionSchema = z.object({
    question: z.string().describe("The generated question."),
    answer: z.string().describe("The correct answer to the question."),
    explanation: z.string().describe("An explanation for why the answer is correct.")
});

const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema).describe('An array of generated questions.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

// Exported wrapper function to be called from the client
export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return await generateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateQuestionsPrompt',
    input: { schema: GenerateQuestionsInputSchema },
    output: { schema: GenerateQuestionsOutputSchema },
    prompt: `You are an expert in creating educational content. Your task is to generate a specific number of questions based on the provided context (text or file).

Context:
{{{context}}}

{{#if fileDataUri}}
Attached File:
{{media url=fileDataUri}}
{{/if}}

Instructions:
- Generate exactly {{questionCount}} questions.
- The difficulty of the questions should be: {{difficulty}}.
- For each question, provide the question itself, the correct answer, and a brief explanation for the answer.
- The entire output (questions, answers, explanations) must be in {{#if (eq language "en")}}English{{else}}Arabic{{/if}}.
`
});


const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        return { questions: [] };
    }
    return output;
  }
);
