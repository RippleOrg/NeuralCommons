import type { SerializedGradients } from '../../types/federated';

// Minimal gradient inspection utilities

/**
 * Compute gradient statistics for visualization
 */
export function computeGradientStats(gradients: SerializedGradients): {
  layerStats: Record<string, { mean: number; std: number; max: number; min: number; norm: number }>;
} {
  const layerStats: Record<string, { mean: number; std: number; max: number; min: number; norm: number }> = {};

  for (const [name, grad] of Object.entries(gradients.weights)) {
    const n = grad.length;
    if (n === 0) continue;

    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let norm = 0;

    for (let i = 0; i < n; i++) {
      sum += grad[i];
      max = Math.max(max, grad[i]);
      min = Math.min(min, grad[i]);
      norm += grad[i] * grad[i];
    }

    const mean = sum / n;
    norm = Math.sqrt(norm);

    let variance = 0;
    for (let i = 0; i < n; i++) {
      variance += (grad[i] - mean) ** 2;
    }
    const std = Math.sqrt(variance / n);

    layerStats[name] = { mean, std, max, min, norm };
  }

  return { layerStats };
}
