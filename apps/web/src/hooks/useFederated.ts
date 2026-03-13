import { useEffect, useRef, useCallback, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { createFlowStateModel, trainLocalEpoch, serializeGradients, applyGradients } from '../lib/federated/model';
import { applyDifferentialPrivacy, computePrivacyBudget } from '../lib/federated/differentialPrivacy';
import { FederatedAggregator } from '../lib/federated/aggregator';
import { useFederatedStore } from '../store/federatedStore';
import type { FeatureVector, FlowStateMode } from '../types/eeg';
import type { DPGradients } from '../types/federated';

const EPSILON = 0.1;
const DELTA = 1e-5;
const SENSITIVITY = 1.0;
const AUTO_AGGREGATE_THRESHOLD = 3;

export function useFederated() {
  const store = useFederatedStore();
  const modelRef = useRef<tf.Sequential | null>(null);
  const aggregatorRef = useRef<FederatedAggregator | null>(null);
  const [accuracyHistory, setAccuracyHistory] = useState<{ round: number; local: number; global: number }[]>([]);
  const pendingGradients = useRef<DPGradients[]>([]);

  useEffect(() => {
    // Initialize model and aggregator
    const model = createFlowStateModel();
    modelRef.current = model;
    store.setModel(model);

    const aggregator = new FederatedAggregator();
    aggregatorRef.current = aggregator;

    // Handle incoming gradients from peers
    const cleanup = aggregator.onGradients((dpGradients, contributorId) => {
      pendingGradients.current.push(dpGradients);
      store.addContribution(contributorId, dpGradients.datasetSize * 0.1);

      // Auto-aggregate when enough peers have contributed
      if (pendingGradients.current.length >= AUTO_AGGREGATE_THRESHOLD) {
        const toAggregate = [...pendingGradients.current];
        pendingGradients.current = [];

        try {
          const aggregated = aggregator.aggregateFedAvg(toAggregate);
          if (modelRef.current) {
            applyGradients(modelRef.current, aggregated);
            store.incrementRound();
          }
        } catch {
          // Aggregation failed
        }
      }
    });

    // Simulate some peer activity
    const peerSimInterval = setInterval(() => {
      const mockPeers = Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, i) =>
        `12D3Koo${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      );
      store.setPeers(mockPeers);
    }, 10000);

    return () => {
      cleanup();
      clearInterval(peerSimInterval);
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
  }, [store]);

  const trainLocal = useCallback(
    async (features: FeatureVector[], labels: FlowStateMode[]) => {
      if (!modelRef.current) return;

      store.setTraining(true);

      try {
        const result = await trainLocalEpoch(modelRef.current, features, labels);
        store.updateAccuracy(result.accuracy);
        store.setLocalLoss(result.loss);

        // Update privacy budget
        const newBudget = computePrivacyBudget(
          store.rounds + 1,
          EPSILON,
          DELTA
        );
        store.updatePrivacyBudget(newBudget);

        // Update accuracy history
        setAccuracyHistory((prev) => [
          ...prev.slice(-49),
          { round: store.rounds + 1, local: result.accuracy, global: store.globalAccuracy },
        ]);

        return result;
      } finally {
        store.setTraining(false);
      }
    },
    [store]
  );

  const broadcastGradients = useCallback(
    async (datasetSize = 100) => {
      if (!modelRef.current || !aggregatorRef.current) return;

      const gradients = serializeGradients(modelRef.current);
      gradients.datasetSize = datasetSize;
      gradients.round = store.rounds;

      const dpGradients = applyDifferentialPrivacy(
        gradients,
        EPSILON,
        DELTA,
        SENSITIVITY
      );

      await aggregatorRef.current.broadcastGradients(dpGradients, `local-${Date.now()}`);
      store.incrementRound();

      return dpGradients;
    },
    [store]
  );

  return {
    model: store.model,
    training: store.training,
    trainLocal,
    broadcastGradients,
    globalAccuracy: store.globalAccuracy,
    localAccuracy: store.localAccuracy,
    localLoss: store.localLoss,
    contributions: store.contributions,
    privacyBudget: store.privacyBudget,
    rounds: store.rounds,
    peers: store.peers,
    accuracyHistory,
  };
}
