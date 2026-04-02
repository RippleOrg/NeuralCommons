import Fastify from 'fastify';
import cors from '@fastify/cors';
import * as Client from '@storacha/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';
import { inferWithHeuristic } from './heuristic.js';

const port = Number(process.env.PORT ?? 4100);
const host = process.env.HOST ?? '0.0.0.0';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

type DatasetPayload = {
  sessionId: string;
  createdAt: number;
  datasetHash: string;
};

type InferenceRequestBody = {
  deployment_id?: string;
  input: Record<string, unknown>;
};

type ProviderHealth = {
  configured: boolean;
  available: boolean;
  fallback: boolean;
  detail: string;
};

let storachaClientPromise: Promise<Awaited<ReturnType<typeof Client.create>>> | null = null;

async function getStorachaClient() {
  if (!process.env.STORACHA_KEY || !process.env.STORACHA_PROOF) {
    throw new Error('Storacha is not configured');
  }

  if (!storachaClientPromise) {
    storachaClientPromise = (async () => {
      const principal = Signer.parse(process.env.STORACHA_KEY!);
      const store = new StoreMemory();
      const client = await Client.create({ principal, store });
      const proof = await Proof.parse(process.env.STORACHA_PROOF!);
      const space = await client.addSpace(proof);
      await client.setCurrentSpace(space.did());
      return client;
    })();
  }

  return storachaClientPromise;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseOpenRouterContent(content: unknown) {
  if (typeof content === 'string') {
    return stripCodeFence(content);
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (isObject(item) && typeof item.text === 'string') return item.text;
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function getProviderHealth() {
  const storachaConfigured = Boolean(process.env.STORACHA_KEY && process.env.STORACHA_PROOF);
  const impulseConfigured = Boolean(process.env.IMPULSE_API_KEY);
  const impulseDeploymentConfigured = Boolean(
    process.env.IMPULSE_DEPLOYMENT_ID || process.env.IMPULSE_API_URL
  );
  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY);

  return {
    storacha: {
      configured: storachaConfigured,
      available: storachaConfigured,
      fallback: true,
      detail: storachaConfigured
        ? 'Encrypted datasets can be replicated to Storacha.'
        : 'Frontend local archive remains available when Storacha credentials are not configured.',
    } satisfies ProviderHealth,
    impulse: {
      configured: impulseConfigured && impulseDeploymentConfigured,
      available: impulseConfigured && impulseDeploymentConfigured,
      fallback: true,
      detail:
        impulseConfigured && impulseDeploymentConfigured
          ? 'Impulse AI is configured as the primary inference provider.'
          : 'Impulse AI is optional and falls through to OpenRouter or the local heuristic model.',
    } satisfies ProviderHealth,
    openrouter: {
      configured: openRouterConfigured,
      available: openRouterConfigured,
      fallback: true,
      detail: openRouterConfigured
        ? 'OpenRouter is configured as the secondary inference provider.'
        : 'If OpenRouter is not configured, the API still serves heuristic cognitive inference.',
    } satisfies ProviderHealth,
    heuristic: {
      configured: true,
      available: true,
      fallback: false,
      detail: 'A built-in heuristic classifier keeps inference available even when remote AI providers fail.',
    } satisfies ProviderHealth,
  };
}

async function inferWithImpulse(body: InferenceRequestBody) {
  if (!process.env.IMPULSE_API_KEY) {
    throw new Error('Impulse AI is not configured');
  }

  const deploymentId = body.deployment_id ?? process.env.IMPULSE_DEPLOYMENT_ID;
  if (!deploymentId) {
    throw new Error('Impulse deployment_id is required');
  }

  const inferenceUrl = `${process.env.IMPULSE_API_URL ?? 'https://inference.impulselabs.ai'}/infer`;

  const response = await fetch(inferenceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.IMPULSE_API_KEY,
    },
    body: JSON.stringify({
      deployment_id: deploymentId,
      input: body.input,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Impulse inference failed: ${response.status} ${response.statusText}`);
  }

  return payload;
}

async function inferWithOpenRouter(body: InferenceRequestBody) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter is not configured');
  }

  const model = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash-lite-preview-06-17';
  const endpoint = process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions';
  const referer = process.env.OPENROUTER_HTTP_REFERER ?? 'https://neuralcommons.local';
  const title = process.env.OPENROUTER_APP_NAME ?? 'NeuralCommons';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
      'X-Title': title,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You classify EEG-derived cognitive feature windows into exactly one label from: flow, focus, relaxed, stressed, neutral. Return strict JSON with keys label, confidence, rationale. Confidence must be a number between 0 and 1.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Classify the current EEG feature window.',
            input: body.input,
          }),
        },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const errorPayload = isObject(payload) && isObject(payload.error) ? payload.error : null;
    const message = errorPayload && typeof errorPayload.message === 'string' ? errorPayload.message : response.statusText;
    throw new Error(`OpenRouter inference failed: ${response.status} ${message}`);
  }

  const content = parseOpenRouterContent(
    isObject(payload) && Array.isArray(payload.choices) ? payload.choices[0]?.message?.content : ''
  );

  let parsed: Record<string, unknown> = {};
  try {
    parsed = content ? (JSON.parse(content) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }

  const label = typeof parsed.label === 'string' ? parsed.label : 'unknown';
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
  const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : undefined;

  return {
    model,
    label,
    confidence,
    rationale,
    provider: 'openrouter',
    raw: payload,
  };
}

app.get('/health', async () => ({
  ok: true,
  timestamp: new Date().toISOString(),
  providers: getProviderHealth(),
  fallbacks: {
    ai: 'local-heuristic',
    storage: 'frontend-local-archive',
  },
}));

app.post<{ Body: Record<string, unknown> }>('/datasets', async (request, reply) => {
  try {
    const client = await getStorachaClient();
    const body = request.body as DatasetPayload & Record<string, unknown>;
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
    const file = new File([blob], `${body.sessionId}.json`, { type: 'application/json' });
    const cid = await client.uploadFile(file);
    return reply.send({
      cid: String(cid),
      uri: `${process.env.PUBLIC_IPFS_GATEWAY ?? 'https://w3s.link/ipfs/'}${cid}`,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(503).send({
      error: error instanceof Error ? error.message : 'Dataset upload failed',
    });
  }
});

app.post<{ Body: InferenceRequestBody }>('/ai/infer', async (request, reply) => {
  const body = request.body;

  if (!body || !isObject(body.input)) {
    return reply.status(400).send({ error: 'input is required' });
  }

  try {
    if (process.env.IMPULSE_API_KEY) {
      try {
        const payload = await inferWithImpulse(body);
        return reply.send(payload);
      } catch (error) {
        request.log.warn(
          { err: error },
          'Impulse inference failed, attempting OpenRouter fallback'
        );
      }
    }

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const payload = await inferWithOpenRouter(body);
        return reply.send(payload);
      } catch (error) {
        request.log.warn(
          { err: error },
          'OpenRouter inference failed, using heuristic fallback'
        );
      }
    }

    return reply.send(inferWithHeuristic(body.input));
  } catch (error) {
    request.log.error(error);
    return reply.send(inferWithHeuristic(body.input));
  }
});

app.listen({ host, port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
