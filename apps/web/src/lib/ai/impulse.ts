import { getRuntimeConfig } from '../runtime';
import type { FeatureVector } from '../../types/eeg';
import type { ImpulseInference } from '../../types/runtime';

export async function runImpulseInference(features: FeatureVector): Promise<ImpulseInference | null> {
  const config = getRuntimeConfig();

  const endpoint =
    config.impulseProxyUrl ||
    (config.impulseApiUrl && config.impulseDeploymentId
      ? `${config.impulseApiUrl.replace(/\/$/, '')}/infer`
      : null);

  if (!endpoint) {
    return null;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deployment_id: config.impulseDeploymentId,
      input: {
        band_powers: features.bandPowers,
        ratios: features.ratios,
        variance: features.variance,
        zero_crossings: features.zeroCrossings,
        timestamp: features.timestamp,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Impulse inference failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as {
    label?: string;
    confidence?: number;
    prediction?: { label?: string; confidence?: number };
    model?: string;
  };

  const label = payload.label ?? payload.prediction?.label ?? 'unknown';
  const confidence = payload.confidence ?? payload.prediction?.confidence ?? 0;

  return {
    model: payload.model ?? config.impulseDeploymentId ?? 'impulse',
    label,
    confidence,
    raw: payload,
    requestedAt: Date.now(),
  };
}
