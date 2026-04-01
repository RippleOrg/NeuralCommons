import { useEffect, useRef, useCallback, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import {
  applyGradients,
  createFlowStateModel,
  evaluateModel,
  serializeGradients,
  trainLocalEpoch,
} from '../lib/federated/model';
import { applyDifferentialPrivacy, computePrivacyBudget } from '../lib/federated/differentialPrivacy';
import { FederatedAggregator } from '../lib/federated/aggregator';
import { createLocalCoordinationReceipt, fetchNearCoordinationState } from '../lib/coordination/near';
import { useFederatedStore } from '../store/federatedStore';
import { useEEGStore } from '../store/eegStore';
import { useUIStore } from '../store/uiStore';
import type { FeatureVector, FlowStateMode, NeuralSession } from '../types/eeg';
import type { DPGradients } from '../types/federated';

const EPSILON = 0.1;
const DELTA = 1e-5;
const SENSITIVITY = 1.0;
const AUTO_AGGREGATE_THRESHOLD = 1;

function getTrainingSet(sessions: NeuralSession[]): { features: FeatureVector[]; labels: FlowStateMode[] } {
  const features: FeatureVector[] = [];
  const labels: FlowStateMode[] = [];

  for (const session of sessions) {
    if (!session.features.length || !session.endTime) continue;
    for (const feature of session.features) {
      features.push(feature);
      labels.push(session.dominantState);
    }
  }

  return { features, labels };
}

export function useFederated() {
  const store = useFederatedStore();
  const sessions = useEEGStore((state) => state.sessions);
  const uiStore = useUIStore();
  const modelRef = useRef<tf.Sequential | null>(null);
  const aggregatorRef = useRef<FederatedAggregator | null>(null);
  const [accuracyHistory, setAccuracyHistory] = useState<Array<{ round: number; local: number; global: number }>>([]);
  const pendingGradients = useRef<DPGradients[]>([]);

  useEffect(() => {
    const model = createFlowStateModel();
    modelRef.current = model;
    store.setModel(model);

    const aggregator = new FederatedAggregator();
    aggregatorRef.current = aggregator;

    const cleanup = aggregator.onGradients(async (dpGradients, contributorId) => {
      pendingGradients.current.push(dpGradients);
      store.addContribution(contributorId, dpGradients.datasetSize);
      store.setPeers(Array.from(new Set([...store.peers, contributorId])));

      if (pendingGradients.current.length >= AUTO_AGGREGATE_THRESHOLD && modelRef.current) {
        const aggregated = aggregator.aggregateFedAvg(pendingGradients.current);
        pendingGradients.current = [];
        applyGradients(modelRef.current, aggregated);
        store.incrementRound();

        const trainingSet = getTrainingSet(useEEGStore.getState().sessions);
        if (trainingSet.features.length > 0) {
          const globalAccuracy = await evaluateModel(modelRef.current, trainingSet.features, trainingSet.labels);
          store.updateAccuracy(store.localAccuracy, globalAccuracy);
        }
      }
    });

    void (async () => {
      const nearState = await fetchNearCoordinationState();
      if (nearState?.latestRound?.participants) {
        store.setPeers(nearState.latestRound.participants);
      }
    })();

    return () => {
      cleanup();
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
  }, [store]);

  const trainLocal = useCallback(async () => {
    if (!modelRef.current) return null;

    const trainingSet = getTrainingSet(sessions);
    if (trainingSet.features.length === 0) {
      throw new Error('No sealed EEG sessions are available for training yet.');
    }

    store.setTraining(true);

    try {
      const result = await trainLocalEpoch(modelRef.current, trainingSet.features, trainingSet.labels);
      const globalAccuracy = await evaluateModel(modelRef.current, trainingSet.features, trainingSet.labels);

      store.updateAccuracy(result.accuracy, globalAccuracy);
      store.setLocalLoss(result.loss);
      store.updatePrivacyBudget(computePrivacyBudget(store.rounds + 1, EPSILON, DELTA));

      setAccuracyHistory((previous) => [
        ...previous.slice(-49),
        { round: store.rounds + 1, local: result.accuracy, global: globalAccuracy },
      ]);

      uiStore.logActivity({
        title: 'Local training complete',
        message: `Trained on ${trainingSet.features.length} feature vectors with ${(result.accuracy * 100).toFixed(1)}% local accuracy.`,
        tone: 'info',
      });

      return result;
    } finally {
      store.setTraining(false);
    }
  }, [sessions, store, uiStore]);

  const broadcastGradients = useCallback(async () => {
    if (!modelRef.current || !aggregatorRef.current) return null;

    const trainingSet = getTrainingSet(sessions);
    if (trainingSet.features.length === 0) {
      throw new Error('No recorded sessions are available to broadcast.');
    }

    const gradients = serializeGradients(modelRef.current);
    gradients.datasetSize = trainingSet.features.length;
    gradients.round = store.rounds;

    const dpGradients = applyDifferentialPrivacy(gradients, EPSILON, DELTA, SENSITIVITY);
    await aggregatorRef.current.broadcastGradients(dpGradients, `local-${Date.now()}`);

    const receipt = await createLocalCoordinationReceipt(store.rounds + 1, crypto.randomUUID().replace(/-/g, ''));
    uiStore.logActivity({
      title: 'Round anchored',
      message: `Broadcast round ${receipt.roundId} anchored at ${receipt.anchor}.`,
      tone: 'success',
    });

    return dpGradients;
  }, [sessions, store, uiStore]);

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
