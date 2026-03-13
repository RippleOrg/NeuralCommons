import * as tf from '@tensorflow/tfjs';
import type { SerializedGradients, TrainingResult, ModelWeights } from '../../types/federated';
import type { FeatureVector, FlowStateMode } from '../../types/eeg';

const FLOW_STATE_CLASSES: FlowStateMode[] = ['flow', 'focus', 'relaxed', 'stressed', 'neutral'];
const NUM_CLASSES = FLOW_STATE_CLASSES.length;
const INPUT_DIM = 12; // 5 band powers + 5 ratios + variance + zero-crossing rate

/**
 * Create the flow state classification model
 * Input(12) → Dense(32, relu) → Dropout(0.2) → Dense(16, relu) → Dense(5, softmax)
 */
export function createFlowStateModel(): tf.Sequential {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [INPUT_DIM],
      units: 32,
      activation: 'relu',
      kernelInitializer: 'glorotUniform',
    })
  );

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(
    tf.layers.dense({
      units: 16,
      activation: 'relu',
      kernelInitializer: 'glorotUniform',
    })
  );

  model.add(
    tf.layers.dense({
      units: NUM_CLASSES,
      activation: 'softmax',
    })
  );

  model.compile({
    optimizer: tf.train.sgd(0.01),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

/**
 * Convert a FeatureVector to a flat tensor input
 */
export function featureVectorToTensor(feature: FeatureVector): Float32Array {
  const { bandPowers, ratios, variance, zeroCrossings } = feature;
  return new Float32Array([
    bandPowers.delta,
    bandPowers.theta,
    bandPowers.alpha,
    bandPowers.beta,
    bandPowers.gamma,
    ratios['theta_alpha'] ?? 0,
    ratios['beta_alpha'] ?? 0,
    ratios['theta_beta'] ?? 0,
    ratios['alpha_delta'] ?? 0,
    ratios['gamma_theta'] ?? 0,
    variance,
    zeroCrossings,
  ]);
}

/**
 * Train the model for one local epoch
 */
export async function trainLocalEpoch(
  model: tf.Sequential,
  features: FeatureVector[],
  labels: FlowStateMode[],
  epochs = 5
): Promise<TrainingResult> {
  if (features.length === 0) {
    return {
      loss: 0,
      accuracy: 0,
      gradients: serializeGradients(model),
      epochs,
      duration: 0,
    };
  }

  const startTime = Date.now();

  // Build tensors
  const xs = tf.tensor2d(
    features.map((f) => Array.from(featureVectorToTensor(f))),
    [features.length, INPUT_DIM]
  );

  const labelIndices = labels.map((l) => FLOW_STATE_CLASSES.indexOf(l));
  const ys = tf.oneHot(tf.tensor1d(labelIndices, 'int32'), NUM_CLASSES);

  let finalLoss = 0;
  let finalAccuracy = 0;

  try {
    const history = await model.fit(xs, ys, {
      epochs,
      batchSize: Math.min(32, features.length),
      shuffle: true,
      verbose: 0,
    });

    const lossHistory = history.history['loss'] as number[];
    const accHistory = history.history['acc'] as number[] | undefined;
    finalLoss = lossHistory[lossHistory.length - 1] ?? 0;
    finalAccuracy = accHistory ? (accHistory[accHistory.length - 1] ?? 0) : 0;
  } finally {
    xs.dispose();
    ys.dispose();
  }

  const gradients = serializeGradients(model);

  return {
    loss: finalLoss,
    accuracy: finalAccuracy,
    gradients,
    epochs,
    duration: Date.now() - startTime,
  };
}

/**
 * Serialize model gradients (weights) to named Float32Arrays
 */
export function serializeGradients(model: tf.Sequential): SerializedGradients {
  const weights: Record<string, Float32Array> = {};

  for (const layer of model.layers) {
    const layerWeights = layer.getWeights();
    layerWeights.forEach((weight, idx) => {
      const key = `${layer.name}/${idx}`;
      const data = weight.dataSync() as Float32Array;
      weights[key] = new Float32Array(data);
    });
  }

  return {
    weights,
    datasetSize: 1,
    round: 0,
    contributorId: 'local',
  };
}

/**
 * Deserialize gradients back to TensorMap
 */
export function deserializeGradients(
  serialized: SerializedGradients
): tf.NamedTensorMap {
  const tensorMap: tf.NamedTensorMap = {};
  for (const [name, data] of Object.entries(serialized.weights)) {
    tensorMap[name] = tf.tensor(Array.from(data));
  }
  return tensorMap;
}

/**
 * Apply serialized gradients to model
 */
export function applyGradients(
  model: tf.Sequential,
  gradients: SerializedGradients
): void {
  for (const layer of model.layers) {
    const currentWeights = layer.getWeights();
    const newWeights: tf.Tensor[] = [];

    currentWeights.forEach((weight, idx) => {
      const key = `${layer.name}/${idx}`;
      const gradData = gradients.weights[key];
      if (gradData) {
        const shape = weight.shape as number[];
        newWeights.push(tf.tensor(Array.from(gradData), shape));
      } else {
        newWeights.push(weight);
      }
    });

    if (newWeights.length > 0) {
      layer.setWeights(newWeights);
    }
  }
}

/**
 * Save model weights for storage/transmission
 */
export function saveModelWeights(model: tf.Sequential): ModelWeights {
  const weights: Record<string, Float32Array> = {};

  for (const layer of model.layers) {
    layer.getWeights().forEach((weight, idx) => {
      const key = `${layer.name}/${idx}`;
      weights[key] = new Float32Array(weight.dataSync() as Float32Array);
    });
  }

  return {
    weights,
    version: 1,
    round: 0,
  };
}

/**
 * Load model weights from storage
 */
export function loadModelWeights(model: tf.Sequential, saved: ModelWeights): void {
  applyGradients(model, {
    weights: saved.weights,
    datasetSize: 1,
    round: saved.round,
    contributorId: 'local',
  });
}

/**
 * Get model accuracy on a test set
 */
export async function evaluateModel(
  model: tf.Sequential,
  features: FeatureVector[],
  labels: FlowStateMode[]
): Promise<number> {
  if (features.length === 0) return 0;

  const xs = tf.tensor2d(
    features.map((f) => Array.from(featureVectorToTensor(f))),
    [features.length, INPUT_DIM]
  );

  const labelIndices = labels.map((l) => FLOW_STATE_CLASSES.indexOf(l));
  const ys = tf.oneHot(tf.tensor1d(labelIndices, 'int32'), NUM_CLASSES);

  try {
    const result = model.evaluate(xs, ys) as tf.Scalar[];
    const accuracy = (await result[1].data())[0];
    return accuracy ?? 0;
  } finally {
    xs.dispose();
    ys.dispose();
  }
}
