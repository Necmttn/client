export async function vercelGenericEdge(pipelines, req) {
	const input = await req.json();
	const { searchParams } = new URL(req.url);
	if (!searchParams.has('id')) {
		return new Response('Missing id', { status: 400 });
	}
	const id = searchParams.get('id') as string;
	const pipeline = (pipelines as any)[id];
	console.log(`***pipeline`, pipeline.conf.stream);
	const output = await pipeline.invoke(input);
	return { output, pipeline };
}
