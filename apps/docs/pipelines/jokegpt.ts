import { aigur } from '#/services/aigur';
import { z } from 'zod';

export const jokeGptPipeline = aigur.pipeline.create({
	id: 'jokegpt',
	input: z.object({
		subject: z.string(),
	}),
	output: z.object({
		text: z.string(),
	}),
	flow: (flow) =>
		flow.text.modify
			.simple(({ input }) => ({
				text: input.subject,
				modifier: 'tell me a joke about $(text)$',
			}))
			.text.prediction.gpt3(({ prev }) => ({
				prompt: prev.text,
			}))
			.output(({ prev }) => ({
				text: prev.text,
			})),
});
