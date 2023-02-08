import { z } from 'zod';

import {
	enhanceWithKeywordsNode,
	googleVisionNode,
	gpt3PredictionNode,
	simpleModificationNode,
	stabilityTextToImageNode,
	whisperNode,
} from './nodes/nodesDefinitions';
import { outputNode } from './nodes/output/output';
import { gpt3PredictionStreamNode } from './nodes/text/prediction/gpt3.stream';
import { ConcreteNode, NodeDefinition } from './types';

export class Builder<
	Input extends z.ZodObject<any, any, any>,
	Output extends z.ZodObject<any, any, any>,
	NodeDefinitions extends ConcreteNode<any, any>[]
> {
	constructor(private input: Input, private nodes: NodeDefinitions) {}

	static create<
		Input extends z.ZodObject<any, any, any>,
		Output extends z.ZodObject<any, any, any>
	>(input: Input) {
		return new Builder<Input, Output, []>(input, []);
	}

	private nodeFactory<NodeDef extends NodeDefinition<any, any>>(nodeDefinition: NodeDef) {
		return <NextNode extends ConcreteNode<NodeDef['schema']['input'], NodeDef['schema']['output']>>(
			getUserInput: (data: {
				nodes: NodeDefinitions;
				prev: NodeDefinitions[-1]['output'];
				input: z.output<Input>;
			}) => z.input<NextNode['schema']['input']>
		): Builder<Input, Output, [...NodeDefinitions, NextNode]> => {
			const input = this.setPlaceholderValues(this.input.keyof().options, 'input');
			const prev = this.nodes.length > 0 ? this.nodes[this.nodes.length - 1] : input;
			console.log(`***nodeDefinition`, nodeDefinition);
			const node = {
				...nodeDefinition,
				input: getUserInput({
					nodes: this.nodes,
					prev: prev.output,
					input,
				}),
				output: this.setPlaceholderValues<NextNode>(
					nodeDefinition.schema.output.keyof().options,
					this.nodes.length
				),
			} as ConcreteNode<NodeDef['schema']['input'], NodeDef['schema']['output']>;

			this.nodes.push(node);
			return this as any;
		};
	}

	private setPlaceholderValues<T extends ConcreteNode<any, any>>(
		outputKeys: string[],
		index: number | 'input'
	): T['output'] {
		const placeholderedOutput: T['output'] = {};
		for (let key of outputKeys) {
			// using nodes.length and not nodes.length - 1 because we haven't pushed the node yet
			placeholderedOutput[key] = `$context.${index}.${key}$`;
		}
		return placeholderedOutput;
	}

	custom<Input extends z.AnyZodObject, Output extends z.AnyZodObject>(
		node: NodeDefinition<Input, Output>
	) {
		return this.nodeFactory(node);
	}

	voice = {
		transcribe: {
			whisper: this.nodeFactory(whisperNode),
		},
	};

	text = {
		modify: {
			enhanceWithKeywords: this.nodeFactory(enhanceWithKeywordsNode),
			simple: this.nodeFactory(simpleModificationNode),
		},
		prediction: {
			gpt3: this.nodeFactory(gpt3PredictionNode),
			gpt3Stream: this.nodeFactory(gpt3PredictionStreamNode),
		},
	};

	image = {
		textToImage: {
			stableDiffusion: {
				stability: this.nodeFactory(stabilityTextToImageNode),
			},
		},
		labeling: {
			googleVision: this.nodeFactory(googleVisionNode),
		},
	};

	output = this.nodeFactory(outputNode<Output>());

	getNodes() {
		return this.nodes;
	}
}
