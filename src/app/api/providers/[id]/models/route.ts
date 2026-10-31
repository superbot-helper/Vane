import ModelRegistry from '@/lib/models/registry';
import { Model } from '@/lib/models/types';
import { NextRequest } from 'next/server';

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const body: Partial<Model> & { type: 'embedding' | 'chat' } =
      await req.json();

    if (!body.key || !body.name) {
      return Response.json(
        {
          message: 'Key and name must be provided',
        },
        {
          status: 400,
        },
      );
    }

    if (body.type !== 'embedding' && body.type !== 'chat') {
      return Response.json(
        {
          message: "Type must be 'embedding' or 'chat'",
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();
    const provider = (await registry.getActiveProviders()).find(
      (entry) => entry.id === id,
    );

    if (!provider) {
      return Response.json(
        {
          message: 'Provider not found',
        },
        {
          status: 404,
        },
      );
    }

    // Only a model the provider already lists may be added. An arbitrary key
    // makes the next upload or search download that Hugging Face repository,
    // parse its ONNX weights and persist its vector space; the registry's own
    // loaders already reject a key outside this list, so accepting one here
    // only stores a model that can never load.
    const knownModels =
      body.type === 'chat' ? provider.chatModels : provider.embeddingModels;

    if (!knownModels.some((model) => model.key === body.key)) {
      return Response.json(
        {
          message: `Unknown model key: ${body.key}. This provider lists: ${knownModels
            .map((model) => model.key)
            .join(', ')}`,
        },
        {
          status: 400,
        },
      );
    }

    await registry.addProviderModel(id, body.type, body);

    return Response.json(
      {
        message: 'Model added successfully',
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error('An error occurred while adding provider model', err);
    return Response.json(
      {
        message: 'An error has occurred.',
      },
      {
        status: 500,
      },
    );
  }
};

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const body: { key: string; type: 'embedding' | 'chat' } = await req.json();

    if (!body.key) {
      return Response.json(
        {
          message: 'Key and name must be provided',
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();

    await registry.removeProviderModel(id, body.type, body.key);

    return Response.json(
      {
        message: 'Model added successfully',
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error('An error occurred while deleting provider model', err);
    return Response.json(
      {
        message: 'An error has occurred.',
      },
      {
        status: 500,
      },
    );
  }
};
