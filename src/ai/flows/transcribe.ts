'use server';
/**
 * @fileOverview Flow to handle audio transcription and summarization.
 *
 * - transcribe - A function that handles the audio transcription process.
 * - summarizeTranscribedText - A function that handles summarizing the transcribed text.
 * - TranscribeInput - The input type for the transcribe function.
 * - TranscribeOutput - The return type for the transcribe function.
 * - SummarizeTranscribedInput - The input type for the summarizeTranscribedText function.
 * - SummarizeTranscribedOutput - The return type for the summarizeTranscribedText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranscribeInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio to transcribe, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeInput = z.infer<typeof TranscribeInputSchema>;

const TranscribeOutputSchema = z.object({
  text: z.string().describe('The transcribed text.'),
});
export type TranscribeOutput = z.infer<typeof TranscribeOutputSchema>;


const SummarizeTranscribedInputSchema = z.object({
    text: z.string().describe('The text to summarize.'),
    language: z.enum(['ar', 'en']).optional().default('ar').describe('The language for the summary.'),
});
export type SummarizeTranscribedInput = z.infer<typeof SummarizeTranscribedInputSchema>;

const SummarizeTranscribedOutputSchema = z.object({
    summary: z.string().describe('The summarized text.'),
});
export type SummarizeTranscribedOutput = z.infer<typeof SummarizeTranscribedOutputSchema>;


export async function transcribe(input: TranscribeInput): Promise<TranscribeOutput> {
    return await transcribeFlow(input);
}

export async function summarizeTranscribedText(input: SummarizeTranscribedInput): Promise<SummarizeTranscribedOutput> {
    return await summarizeFlow(input);
}

const transcribeFlow = ai.defineFlow(
  {
    name: 'transcribeFlow',
    inputSchema: TranscribeInputSchema,
    outputSchema: TranscribeOutputSchema,
  },
  async (input) => {
    const { text } = await ai.generate({
      prompt: [{ media: { url: input.audioDataUri } }],
    });
    return { text };
  }
);


const summarizeFlow = ai.defineFlow(
  {
    name: 'summarizeTranscribedTextFlow',
    inputSchema: SummarizeTranscribedInputSchema,
    outputSchema: SummarizeTranscribedOutputSchema,
  },
  async (input) => {
     const promptText = input.language === 'en'
        ? `Summarize the following text in English. The summary should be concise, clear, and capture the main points. Original text: \n\n${input.text}`
        : `لخّص النص التالي باللغة العربية. يجب أن يكون الملخص موجزًا وواضحًا ويبرز النقاط الأساسية. النص الأصلي: \n\n${input.text}`;

     const { output } = await ai.generate({
      prompt: promptText,
      output: {
        schema: SummarizeTranscribedOutputSchema
      }
    });

    if (!output) {
      return { summary: 'Sorry, I was unable to summarize the text.' };
    }
    return output;
  }
);
