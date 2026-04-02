import type { FeatureVector, FlowStateMode } from '../../types/eeg';
import type { ImpulseInference } from '../../types/runtime';

type RankedState = {
  label: FlowStateMode;
  score: number;
};

function rankStates(features: FeatureVector): RankedState[] {
  const alpha = features.bandPowers.alpha ?? 0;
  const beta = features.bandPowers.beta ?? 0;
  const theta = features.bandPowers.theta ?? 0;
  const gamma = features.bandPowers.gamma ?? 0;
  const delta = features.bandPowers.delta ?? 0;
  const thetaAlpha = features.ratios['theta_alpha'] ?? 0;
  const betaAlpha = features.ratios['beta_alpha'] ?? 0;

  const candidates: RankedState[] = [
    {
      label: 'flow',
      score: alpha * 0.42 + theta * 0.24 + Math.max(0, 1.2 - betaAlpha) * 0.2 + (1 - Math.min(features.variance, 1)) * 0.14,
    },
    {
      label: 'focus',
      score: beta * 0.38 + gamma * 0.18 + Math.max(0, 1.4 - thetaAlpha) * 0.26 + (1 - Math.min(features.zeroCrossings / 150, 1)) * 0.18,
    },
    {
      label: 'relaxed',
      score: alpha * 0.46 + delta * 0.16 + Math.max(0, 1.1 - betaAlpha) * 0.24 + (1 - Math.min(features.variance, 1.2) / 1.2) * 0.14,
    },
    {
      label: 'stressed',
      score: beta * 0.44 + gamma * 0.3 + betaAlpha * 0.18 + Math.min(features.variance, 1.5) * 0.08,
    },
    {
      label: 'neutral',
      score: delta * 0.18 + theta * 0.18 + alpha * 0.18 + beta * 0.18 + gamma * 0.18 + (1 - Math.abs(betaAlpha - 1)) * 0.1,
    },
  ];

  return candidates.sort((left, right) => right.score - left.score);
}

function buildRationale(label: FlowStateMode, features: FeatureVector): string {
  const alpha = features.bandPowers.alpha ?? 0;
  const beta = features.bandPowers.beta ?? 0;
  const theta = features.bandPowers.theta ?? 0;

  switch (label) {
    case 'flow':
      return `Alpha (${alpha.toFixed(2)}) and theta (${theta.toFixed(2)}) remain elevated while beta stays comparatively restrained.`;
    case 'focus':
      return `Beta (${beta.toFixed(2)}) dominates with controlled variance, consistent with directed cognitive effort.`;
    case 'relaxed':
      return `Alpha leads the spectrum and the feature window stays stable, which matches a relaxed signature.`;
    case 'stressed':
      return `High beta (${beta.toFixed(2)}) and elevated variance suggest a stressed or overloaded state.`;
    default:
      return 'No single rhythm band dominates strongly, so the window is treated as cognitively neutral.';
  }
}

export function runHeuristicInference(features: FeatureVector): ImpulseInference {
  const ranked = rankStates(features);
  const [best, secondBest] = ranked;
  const spread = Math.max(0, best.score - (secondBest?.score ?? 0));
  const total = Math.max(
    1e-6,
    ranked.reduce((sum, item) => sum + Math.max(item.score, 0), 0)
  );
  const normalized = Math.max(0.35, Math.min(0.93, 0.45 + spread / total));

  return {
    model: 'nc-browser-heuristic-v1',
    label: best.label,
    confidence: normalized,
    provider: 'browser-heuristic',
    rationale: buildRationale(best.label, features),
    fallback: true,
    raw: {
      scores: ranked,
    },
    requestedAt: Date.now(),
  };
}
