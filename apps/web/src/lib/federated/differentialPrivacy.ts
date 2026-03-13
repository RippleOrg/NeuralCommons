import type { SerializedGradients, DPGradients, PrivacyAccountant } from '../../types/federated';

/**
 * Clip gradients by L2 norm per layer
 */
export function clipGradients(
  gradients: SerializedGradients,
  maxNorm: number
): SerializedGradients {
  const clipped: Record<string, Float32Array> = {};

  for (const [name, grad] of Object.entries(gradients.weights)) {
    // Compute L2 norm
    let norm = 0;
    for (let i = 0; i < grad.length; i++) {
      norm += grad[i] * grad[i];
    }
    norm = Math.sqrt(norm);

    const scale = norm > maxNorm ? maxNorm / norm : 1.0;
    clipped[name] = new Float32Array(grad.length);
    for (let i = 0; i < grad.length; i++) {
      clipped[name][i] = grad[i] * scale;
    }
  }

  return { ...gradients, weights: clipped };
}

/**
 * Add calibrated Gaussian noise to gradients
 */
export function addGaussianNoise(
  gradients: SerializedGradients,
  sigma: number
): SerializedGradients {
  const noisy: Record<string, Float32Array> = {};

  for (const [name, grad] of Object.entries(gradients.weights)) {
    noisy[name] = new Float32Array(grad.length);
    for (let i = 0; i < grad.length; i++) {
      // Box-Muller transform for Gaussian noise
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      noisy[name][i] = grad[i] + sigma * gaussian;
    }
  }

  return { ...gradients, weights: noisy };
}

/**
 * Apply full differential privacy: clip + noise
 * @param epsilon - Privacy budget per round
 * @param delta - Failure probability
 * @param sensitivity - L2 sensitivity (clipping norm)
 */
export function applyDifferentialPrivacy(
  gradients: SerializedGradients,
  epsilon: number,
  delta: number,
  sensitivity: number
): DPGradients {
  // Compute noise multiplier using Gaussian mechanism
  // sigma = sensitivity * sqrt(2 * ln(1.25/delta)) / epsilon
  const noiseMultiplier =
    (sensitivity * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon;

  const clipped = clipGradients(gradients, sensitivity);
  const noisy = addGaussianNoise(clipped, noiseMultiplier);

  return {
    ...noisy,
    epsilon,
    delta,
    noiseMultiplier,
    clippingNorm: sensitivity,
  };
}

/**
 * Compute privacy budget accounting using RDP (Rényi Differential Privacy)
 * Simple composition: total epsilon grows roughly as epsilon * sqrt(numRounds)
 */
export function computePrivacyBudget(
  numRounds: number,
  epsilon: number,
  delta: number,
  maxEpsilon = 1.0
): PrivacyAccountant {
  // Advanced composition theorem approximation
  const totalEpsilon = epsilon * Math.sqrt(2 * numRounds * Math.log(1 / delta));
  const totalDelta = numRounds * delta;

  return {
    totalEpsilon: Math.min(totalEpsilon, maxEpsilon),
    totalDelta: Math.min(totalDelta, 1.0),
    rounds: numRounds,
    epsilonPerRound: epsilon,
    remainingBudget: Math.max(0, maxEpsilon - totalEpsilon),
    maxEpsilon,
  };
}
