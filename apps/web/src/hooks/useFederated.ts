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
  const sessions = useEEGStore((state) => state.sessions);
  const model = useFederatedStore((state) => state.model);
  const training = useFederatedStore((state) => state.training);
  const globalAccuracy = useFederatedStore((state) => state.globalAccuracy);
  const localAccuracy = useFederatedStore((state) => state.localAccuracy);
  const localLoss = useFederatedStore((state) => state.localLoss);
  const contributions = useFederatedStore((state) => state.contributions);
  const privacyBudget = useFederatedStore((state) => state.privacyBudget);
  const rounds = useFederatedStore((state) => state.rounds);
  const peers = useFederatedStore((state) => state.peers);
  const setModel = useFederatedStore((state) => state.setModel);
  const addContribution = useFederatedStore((state) => state.addContribution);
  const setPeers = useFederatedStore((state) => state.setPeers);
  const incrementRound = useFederatedStore((state) => state.incrementRound);
  const updateAccuracy = useFederatedStore((state) => state.updateAccuracy);
  const setLocalLoss = useFederatedStore((state) => state.setLocalLoss);
  const updatePrivacyBudget = useFederatedStore((state) => state.updatePrivacyBudget);
  const setTraining = useFederatedStore((state) => state.setTraining);
  const logActivity = useUIStore((state) => state.logActivity);
  const modelRef = useRef<tf.Sequential | null>(null);
  const aggregatorRef = useRef<FederatedAggregator | null>(null);
  const [accuracyHistory, setAccuracyHistory] = useState<Array<{ round: number; local: number; global: number }>>([]);
  const pendingGradients = useRef<DPGradients[]>([]);

  useEffect(() => {
    const model = createFlowStateModel();
    modelRef.current = model;
    setModel(model);

    const aggregator = new FederatedAggregator();
    aggregatorRef.current = aggregator;

    const cleanup = aggregator.onGradients(async (dpGradients, contributorId) => {
      pendingGradients.current.push(dpGradients);
      addContribution(contributorId, dpGradients.datasetSize);
      setPeers(Array.from(new Set([...useFederatedStore.getState().peers, contributorId])));

      if (pendingGradients.current.length >= AUTO_AGGREGATE_THRESHOLD && modelRef.current) {
        const aggregated = aggregator.aggregateFedAvg(pendingGradients.current);
        pendingGradients.current = [];
        applyGradients(modelRef.current, aggregated);
        incrementRound();

        const trainingSet = getTrainingSet(useEEGStore.getState().sessions);
        if (trainingSet.features.length > 0) {
          const globalAccuracy = await evaluateModel(modelRef.current, trainingSet.features, trainingSet.labels);
          updateAccuracy(useFederatedStore.getState().localAccuracy, globalAccuracy);
        }
      }
    });

    void (async () => {
      const nearState = await fetchNearCoordinationState();
      if (nearState?.latestRound?.participants) {
        setPeers(nearState.latestRound.participants);
      }
    })();

    return () => {
      cleanup();
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
  }, [addContribution, incrementRound, setModel, setPeers, updateAccuracy]);

  const trainLocal = useCallback(async () => {
    if (!modelRef.current) return null;

    const trainingSet = getTrainingSet(sessions);
    if (trainingSet.features.length === 0) {
      throw new Error('No sealed EEG sessions are available for training yet.');
    }

    setTraining(true);

    try {
      const result = await trainLocalEpoch(modelRef.current, trainingSet.features, trainingSet.labels);
      const globalAccuracy = await evaluateModel(modelRef.current, trainingSet.features, trainingSet.labels);

      updateAccuracy(result.accuracy, globalAccuracy);
      setLocalLoss(result.loss);
      updatePrivacyBudget(computePrivacyBudget(rounds + 1, EPSILON, DELTA));

      setAccuracyHistory((previous) => [
        ...previous.slice(-49),
        { round: rounds + 1, local: result.accuracy, global: globalAccuracy },
      ]);

      logActivity({
        title: 'Local training complete',
        message: `Trained on ${trainingSet.features.length} feature vectors with ${(result.accuracy * 100).toFixed(1)}% local accuracy.`,
        tone: 'info',
      });

      return result;
    } finally {
      setTraining(false);
    }
  }, [logActivity, rounds, sessions, setLocalLoss, setTraining, updateAccuracy, updatePrivacyBudget]);

  const broadcastGradients = useCallback(async () => {
    if (!modelRef.current || !aggregatorRef.current) return null;

    const trainingSet = getTrainingSet(sessions);
    if (trainingSet.features.length === 0) {
      throw new Error('No recorded sessions are available to broadcast.');
    }

    const gradients = serializeGradients(modelRef.current);
    gradients.datasetSize = trainingSet.features.length;
    gradients.round = rounds;

    const dpGradients = applyDifferentialPrivacy(gradients, EPSILON, DELTA, SENSITIVITY);
    await aggregatorRef.current.broadcastGradients(dpGradients, `local-${Date.now()}`);

    const receipt = await createLocalCoordinationReceipt(rounds + 1, crypto.randomUUID().replace(/-/g, ''));
    logActivity({
      title: 'Round anchored',
      message: `Broadcast round ${receipt.roundId} anchored at ${receipt.anchor}.`,
      tone: 'success',
    });

    return dpGradients;
  }, [logActivity, rounds, sessions]);

  return {
    model,
    training,
    trainLocal,
    broadcastGradients,
    globalAccuracy,
    localAccuracy,
    localLoss,
    contributions,
    privacyBudget,
    rounds,
    peers,
    accuracyHistory,
  };
}
