'use server';
/**
 * @fileOverview Flow to handle audio transcription and summarization.
 *
 * - transcribe - A function that handles the audio transcription process.
 * - TranscribeInput - The input type for the transcribe function.
 * - TranscribeOutput - The return type for the transcribe function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const TranscribeInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio to transcribe, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeInput = z.infer<typeof TranscribeInputSchema>;

export const TranscribeOutputSchema = z.object({
  text: z.string().describe('The transcribed text.'),
});
export type TranscribeOutput = z.infer<typeof TranscribeOutputSchema>;


export const SummarizeTranscribedInputSchema = z.object({
    text: z.string().describe('The text to summarize.'),
});
export type SummarizeTranscribedInput = z.infer<typeof SummarizeTranscribedInputSchema>;

export const SummarizeTranscribedOutputSchema = z.object({
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
     const { output } = await ai.generate({
      prompt: `قم بتلخيص النص التالي باللغة العربية. اجعل الملخص موجزًا وواضحًا. النص الأصلي: \n\n${input.text}`,
      output: {
        schema: SummarizeTranscribedOutputSchema
      }
    });

    if (!output) {
      return { summary: 'عذراً، لم أتمكن من تلخيص النص.' };
    }
    return output;
  }
);
