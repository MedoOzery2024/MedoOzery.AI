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

const QuestionTypeSchema = z.enum(['static', 'interactive']);

const GenerateQuestionsInputSchema = z.object({
  context: z.string().describe("The text content to generate questions from."),
  fileDataUri: z.string().optional().describe("An optional file (image or PDF) to extract context from. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  questionCount: z.number().min(1).describe("The number of questions to generate."),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level for the questions.'),
  language: z.enum(['ar', 'en']).optional().default('ar').describe('The language for the generated questions and answers.'),
  questionType: QuestionTypeSchema.describe("The type of questions to generate: 'static' (with answers) or 'interactive' (multiple choice)."),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const StaticQuestionSchema = z.object({
    question: z.string().describe("The generated question."),
    answer: z.string().describe("The correct answer to the question."),
    explanation: z.string().describe("An explanation for why the answer is correct.")
});

const InteractiveQuestionSchema = z.object({
    question: z.string().describe("The generated question."),
    options: z.array(z.string()).length(4).describe("An array of 4 distinct options (multiple choice)."),
    correctAnswerIndex: z.number().int().min(0).max(3).describe("The index (0-3) of the correct answer in the options array."),
    explanation: z.string().describe("An explanation for why the chosen answer is correct.")
});

const GenerateQuestionsOutputSchema = z.object({
  staticQuestions: z.array(StaticQuestionSchema).optional().describe('An array of generated questions with direct answers.'),
  interactiveQuestions: z.array(InteractiveQuestionSchema).optional().describe('An array of generated multiple-choice questions for a quiz.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

// Exported wrapper function to be called from the client
export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return await generateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateQuestionsPrompt',
    input: { schema: GenerateQuestionsInputSchema.extend({ isEnglish: z.boolean().optional(), isStatic: z.boolean().optional() }) },
    output: { schema: GenerateQuestionsOutputSchema },
    prompt: `You are an expert in creating high-quality educational content. Your task is to generate questions based on the provided context (text or file).

Context:
{{{context}}}

{{#if fileDataUri}}
Attached File:
{{media url=fileDataUri}}
{{/if}}

Instructions:
- Generate up to {{questionCount}} questions.
- The difficulty of the questions should be: {{difficulty}}.
- The entire output must be in {{#if isEnglish}}English{{else}}Arabic{{/if}}.

{{#if isStatic}}
- Generate static questions.
- For each question, provide the question itself, the correct answer, and a brief, clear explanation for the answer.
- The output should be in the 'staticQuestions' array.
{{else}}
- Generate an interactive multiple-choice quiz.
- For each question, provide the question, an array of 4 distinct options, the index of the correct option, and an explanation.
- Ensure one option is clearly correct and the others are plausible but incorrect distractors, relevant to the context.
- The output should be in the 'interactiveQuestions' array.
{{/if}}
`
});


const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async (input) => {
    const isEnglish = input.language === 'en';
    const isStatic = input.questionType === 'static';
    const { output } = await prompt({ ...input, isEnglish, isStatic });
    if (!output) {
        return { staticQuestions: [], interactiveQuestions: [] };
    }
    return output;
  }
);
