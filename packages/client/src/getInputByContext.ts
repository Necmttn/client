import { z } from 'zod';

export function getInputByContext(
	inputPlaceholders: Record<string, any> | z.ZodEffects<any>,
	values: Record<string, any>
) {
	if (typeof inputPlaceholders === 'string') {
		return handleSingleValue(inputPlaceholders);
	}

	const input: Record<string, any> = { ...inputPlaceholders };

	return getInputContextInner(input);

	function getInputContextInner(input: Record<string, any>) {
		for (const key in input) {
			input[key] = handleSingleValue(input[key]);
		}
		return input;
	}

	function handleSingleValue(value) {
		if (Array.isArray(value)) {
			return value.map((item) => getInputContextInner(item));
		}
		if (typeof value === 'object' && value !== null) {
			return getInputContextInner(value);
		}

		let newValue: any = value;
		const contextReferences = getContextReferences(value);

		for (let ref of contextReferences) {
			const contextValue = values[ref.nodeId];
			const propertyValue = contextValue[ref.property];
			if (propertyValue instanceof ArrayBuffer) {
				newValue = propertyValue;
				continue;
			}
			newValue = (newValue as string)?.replace(new RegExp(escapeRegExp(ref.value)), propertyValue);

			if (newValue === 'undefined') {
				newValue = undefined;
			} else if (newValue !== propertyValue && newValue === propertyValue.toString()) {
				newValue = propertyValue;
			}
		}

		return newValue;
	}

	function getContextReferences(value: string) {
		const contextRegex = /\$context\.(\d+|input)\.(\w+)\$/g;
		const matches = value.matchAll(contextRegex);
		const references: any[] = [];

		for (let match of matches) {
			references.push({
				value: match[0],
				nodeId: match[1],
				property: match[2],
			});
		}

		return references;
	}

	function escapeRegExp(string: string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}
}
