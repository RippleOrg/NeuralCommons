type InferenceInput = {
  band_powers?: Record<string, unknown>;
  ratios?: Record<string, unknown>;
  variance?: unknown;
  zero_crossings?: unknown;
};

type RankedState = {
  label: 'flow' | 'focus' | 'relaxed' | 'stressed' | 'neutral';
  score: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function scoreStates(input: InferenceInput): RankedState[] {
  const bandPowers = input.band_powers ?? {};
  const ratios = input.ratios ?? {};
  const alpha = toNumber(bandPowers.alpha);
  const beta = toNumber(bandPowers.beta);
  const theta = toNumber(bandPowers.theta);
  const gamma = toNumber(bandPowers.gamma);
  const delta = toNumber(bandPowers.delta);
  const thetaAlpha = toNumber(ratios.theta_alpha);
  const betaAlpha = toNumber(ratios.beta_alpha);
  const variance = toNumber(input.variance);
  const zeroCrossings = toNumber(input.zero_crossings);

  return [
    {
      label: 'flow' as const,
      score: alpha * 0.42 + theta * 0.24 + Math.max(0, 1.2 - betaAlpha) * 0.2 + (1 - Math.min(variance, 1)) * 0.14,
    },
    {
      label: 'focus' as const,
      score: beta * 0.38 + gamma * 0.18 + Math.max(0, 1.4 - thetaAlpha) * 0.26 + (1 - Math.min(zeroCrossings / 150, 1)) * 0.18,
    },
    {
      label: 'relaxed' as const,
      score: alpha * 0.46 + delta * 0.16 + Math.max(0, 1.1 - betaAlpha) * 0.24 + (1 - Math.min(variance, 1.2) / 1.2) * 0.14,
    },
    {
      label: 'stressed' as const,
      score: beta * 0.44 + gamma * 0.3 + betaAlpha * 0.18 + Math.min(variance, 1.5) * 0.08,
    },
    {
      label: 'neutral' as const,
      score: delta * 0.18 + theta * 0.18 + alpha * 0.18 + beta * 0.18 + gamma * 0.18 + (1 - Math.abs(betaAlpha - 1)) * 0.1,
    },
  ].sort((left, right) => right.score - left.score);
}

function buildRationale(label: RankedState['label'], input: InferenceInput): string {
  const bandPowers = input.band_powers ?? {};
  const alpha = toNumber(bandPowers.alpha);
  const beta = toNumber(bandPowers.beta);
  const theta = toNumber(bandPowers.theta);

  switch (label) {
    case 'flow':
      return `Alpha (${alpha.toFixed(2)}) and theta (${theta.toFixed(2)}) are elevated without beta overload.`;
    case 'focus':
      return `Beta (${beta.toFixed(2)}) leads the window with a controlled theta/alpha ratio.`;
    case 'relaxed':
      return `Alpha dominates the band profile and the overall variance stays relatively calm.`;
    case 'stressed':
      return `High beta (${beta.toFixed(2)}) with elevated variance indicates a stressed signature.`;
    default:
      return 'The spectrum remains relatively balanced, so the window is classified as neutral.';
  }
}

export function inferWithHeuristic(input: Record<string, unknown>) {
  const ranked = scoreStates(input as InferenceInput);
  const [best, secondBest] = ranked;
  const spread = Math.max(0, best.score - (secondBest?.score ?? 0));
  const total = Math.max(
    1e-6,
    ranked.reduce((sum, state) => sum + Math.max(state.score, 0), 0)
  );

  return {
    model: 'nc-api-heuristic-v1',
    label: best.label,
    confidence: Math.max(0.35, Math.min(0.93, 0.45 + spread / total)),
    rationale: buildRationale(best.label, input as InferenceInput),
    provider: 'local-heuristic',
    fallback: true,
    scores: ranked,
  };
}
